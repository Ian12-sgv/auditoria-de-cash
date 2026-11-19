const sql = require('mssql');
const poshash = require('./poshash.cjs');
const poscodif = require('./poscodif.cjs');

const TABLAS_REQUERIDAS = [
  // Consulta de auditoría
  'VENTAS', 'PARAMETROS', 'PAGOSVENTA', 'FORMAPAGO', 'BANCOS', 'CTABANCOS',
  // Usuarios y grupos (inicio de sesión)
  'USUARIOS', 'GRUPOS', 'USUARIOGRUPO',
];

let pool = null;
let poolConfigKey = null;

// Convierte la configuración de la app ({ server, port, database, user, password, encrypt,
// trustServerCertificate }) en la configuración de mssql. Admite "SERVIDOR\INSTANCIA".
function construirConfig(c, baseDatos = c.database) {
  let server = String(c.server ?? '').trim();
  let instanceName;
  const barra = server.indexOf('\\');
  if (barra >= 0) {
    instanceName = server.slice(barra + 1);
    server = server.slice(0, barra);
  }
  return {
    server,
    ...(instanceName ? {} : { port: Number(c.port) || 1433 }),
    ...(baseDatos ? { database: baseDatos } : {}),
    user: c.user,
    password: c.password,
    options: {
      encrypt: !!c.encrypt,
      trustServerCertificate: !!c.trustServerCertificate,
      useUTC: false,
      ...(instanceName ? { instanceName } : {}),
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 8000,
    requestTimeout: 120000,
  };
}

async function obtenerPool(config) {
  const key = JSON.stringify(config);
  if (pool && poolConfigKey === key && pool.connected) return pool;
  await cerrar();
  pool = await new sql.ConnectionPool(construirConfig(config)).connect();
  poolConfigKey = key;
  return pool;
}

// Conexión de un solo uso (para probar configuraciones sin tocar la conexión activa).
async function conConexion(config, baseDatos, fn) {
  const p = await new sql.ConnectionPool(construirConfig(config, baseDatos)).connect();
  try {
    return await fn(p);
  } finally {
    try { await p.close(); } catch { /* ignorar */ }
  }
}

const CONSULTA_INFO = `
SELECT DB_NAME() AS baseDatos, @@SERVERNAME AS servidor,
       CAST(SERVERPROPERTY('ProductVersion') AS VARCHAR(30)) AS version;
SELECT t.n AS tabla
FROM (VALUES ${TABLAS_REQUERIDAS.map((t) => `('${t}')`).join(',')}) AS t(n)
WHERE OBJECT_ID(N'dbo.' + t.n, N'U') IS NULL;
`;

async function leerInfo(p) {
  const r = await p.request().query(CONSULTA_INFO);
  return { ...r.recordsets[0][0], faltantes: r.recordsets[1].map((x) => x.tabla) };
}

// Prueba la conexión activa (usa el pool persistente).
async function probarConexion(config) {
  return leerInfo(await obtenerPool(config));
}

// Prueba una configuración candidata sin reemplazar la conexión activa.
async function probarConfig(config) {
  if (!config.database) throw new Error('Indica la base de datos.');
  try {
    return await conConexion(config, config.database, leerInfo);
  } catch (err) {
    // SQL Server responde "Login failed" también cuando la base no existe: lo distinguimos.
    if (err?.code === 'ELOGIN') {
      let existe = null;
      try {
        existe = await conConexion(config, 'master', async (p) => {
          const r = await p.request().input('n', sql.NVarChar, config.database).query('SELECT DB_ID(@n) AS id');
          return r.recordset[0].id != null;
        });
      } catch { /* las credenciales tampoco sirven para master */ }
      if (existe === false) {
        throw new Error(`La base de datos "${config.database}" no existe en este servidor. Usa "Buscar bases" para ver las disponibles.`);
      }
      if (existe === true) {
        throw new Error(`El usuario "${config.user}" no tiene acceso a la base "${config.database}".`);
      }
    }
    throw err;
  }
}

// Mensajes de error comprensibles para los fallos de conexión más comunes.
function traducirError(err) {
  const msg = err?.message ?? String(err);
  switch (err?.code) {
    case 'ELOGIN':
      return /Login failed/i.test(msg) ? 'Usuario o contraseña incorrectos.' : msg;
    case 'ESOCKET':
    case 'ETIMEOUT':
      return `No se pudo llegar al servidor. Revisa el nombre, el puerto y que SQL Server esté encendido. (${msg})`;
    case 'EINSTLOOKUP':
      return `No se encontró la instancia de SQL Server. Revisa el nombre o usa el puerto directamente. (${msg})`;
    default:
      return msg;
  }
}

const corchetes = (n) => `[${n.replace(/]/g, ']]')}]`;
const literal = (n) => `N'${n.replace(/'/g, "''")}'`;

// Lista las bases de datos de usuario del servidor e indica si tienen las tablas de ventas.
async function listarBases(config) {
  return conConexion(config, 'master', async (p) => {
    const r = await p.request().query(
      'SELECT name FROM sys.databases WHERE database_id > 4 AND state = 0 AND HAS_DBACCESS(name) = 1 ORDER BY name',
    );
    const nombres = r.recordset.map((x) => x.name);
    if (nombres.length === 0) return [];
    const lista = TABLAS_REQUERIDAS.map((t) => `'${t}'`).join(',');
    const union = nombres
      .map(
        (n) =>
          `SELECT ${literal(n)} AS base, COUNT(*) AS tablas FROM ${corchetes(n)}.sys.tables t ` +
          `WHERE t.schema_id = SCHEMA_ID('dbo') AND t.name IN (${lista})`,
      )
      .join(' UNION ALL ');
    let conteos = new Map();
    try {
      const t = await p.request().query(union);
      conteos = new Map(t.recordset.map((x) => [x.base, x.tablas]));
    } catch {
      // Sin permiso para revisar alguna base: se listan igual, sin marcar compatibilidad.
    }
    return nombres.map((n) => ({
      nombre: n,
      compatible: conteos.has(n) ? conteos.get(n) === TABLAS_REQUERIDAS.length : null,
    }));
  });
}

// Consulta de auditoría: ventas + pagos, clasificadas en "Factura Cashea" / "Facturas Comunes".
// La base se toma de la conexión configurada, por eso no lleva prefijo de base de datos.
const CONSULTA_VENTAS = `
DECLARE @FechaInicio DATE = DATEFROMPARTS(@AnioDesde, @MesDesde, 1);
DECLARE @FechaFin DATE = DATEADD(MONTH, 1, DATEFROMPARTS(@AnioHasta, @MesHasta, 1));

SELECT
     P.[Codigo] AS [CodigoEmpresa]
    ,P.[IDEmpresa] AS [IDEmpresa]
    ,P.[Nombre] AS [NombreEmpresa]
    ,V.[NumeroFactura]
    ,V.[Serie]
    ,CONVERT(VARCHAR(19), V.[Fecha], 120) AS [Fecha]
    ,V.[Vendedor]
    ,V.[Cliente]
    ,V.[FormaPago]
    ,V.[TotalMercancia]
    ,V.[TotalDescuento]
    ,V.[Usuario]
    ,V.[Status]
    ,V.[NumeroOrden]
    ,V.[TotalPago]
    ,V.[TotalDolares]
    ,V.[TasaCambio]
    ,V.[Estacion]
    ,V.[TotalDolaresE]
    ,V.[TasaIGTF]
    ,V.[MontoIGTF]
    ,V.[BaseImponibleIGTF]
    ,PV.[FormaPago] AS [FormaPagoPago]
    ,FP.[Nombre] AS [NombreFormaPago]
    ,PV.[Documento]
    ,PV.[Aprobacion]
    ,PV.[Banco]
    ,B.[Nombre] AS [NombreBanco]
    ,PV.[PuntoVenta]
    ,CB.[Nombre] AS [NombrePuntoVenta]
    ,PV.[Monto]
    ,PV.[MontoDivisa]
    ,CASE
        WHEN MAX(CASE WHEN UPPER(LTRIM(RTRIM(FP.[Nombre]))) LIKE '%CASHEA%' THEN 1 ELSE 0 END)
             OVER (PARTITION BY V.[NumeroFactura], V.[Serie], CAST(V.[Fecha] AS DATE), V.[Cliente]) = 1
        THEN 'Factura Cashea'
        ELSE 'Facturas Comunes'
     END AS [ClasificacionFactura]
FROM [dbo].[VENTAS] AS V
CROSS JOIN [dbo].[PARAMETROS] AS P
LEFT JOIN [dbo].[PAGOSVENTA] AS PV
    ON V.[NumeroFactura] = PV.[NumeroFactura]
    AND V.[Serie] = PV.[Serie]
LEFT JOIN [dbo].[FORMAPAGO] AS FP
    ON PV.[FormaPago] = FP.[Codigo]
LEFT JOIN [dbo].[BANCOS] AS B
    ON PV.[Banco] = B.[Codigo]
LEFT JOIN [dbo].[CTABANCOS] AS CB
    ON CONVERT(VARCHAR(50), PV.[PuntoVenta]) = CONVERT(VARCHAR(50), CB.[Codigo])
WHERE V.[Fecha] >= @FechaInicio
  AND V.[Fecha] < @FechaFin
ORDER BY V.[Fecha] DESC, V.[NumeroFactura];
`;

async function obtenerVentas(config, f) {
  const p = await obtenerPool(config);
  const r = await p.request()
    .input('AnioDesde', sql.Int, f.anioDesde)
    .input('MesDesde', sql.Int, f.mesDesde)
    .input('AnioHasta', sql.Int, f.anioHasta)
    .input('MesHasta', sql.Int, f.mesHasta)
    .query(CONSULTA_VENTAS);
  return r.recordset;
}

// --- Usuarios y grupos del sistema (solo lectura) ---
const MISMO_CODIGO = (col) => `UPPER(LTRIM(RTRIM(${col}))) = UPPER(LTRIM(RTRIM(@cod)))`;

async function buscarUsuario(config, codigo) {
  const p = await obtenerPool(config);
  // Igual que el backend del compañero: se acepta el código O el nombre del usuario.
  const r = await p.request().input('cod', sql.VarChar(50), codigo).query(`
    DECLARE @codigo VARCHAR(50) = (
      SELECT TOP 1 CodUsuario FROM dbo.USUARIOS
      WHERE UPPER(LTRIM(RTRIM(CodUsuario)))   = UPPER(LTRIM(RTRIM(@cod)))
         OR UPPER(LTRIM(RTRIM(NombreUsuario))) = UPPER(LTRIM(RTRIM(@cod)))
      ORDER BY CodUsuario);
    SELECT TOP 1 RTRIM(CodUsuario) AS codigo, RTRIM(NombreUsuario) AS nombre, Status AS status
    FROM dbo.USUARIOS WHERE CodUsuario = @codigo;
    SELECT RTRIM(UG.CodGrupo) AS grupo, RTRIM(ISNULL(G.NombreGrupo, UG.CodGrupo)) AS nombre
    FROM dbo.USUARIOGRUPO AS UG LEFT JOIN dbo.GRUPOS AS G ON G.CodGrupo = UG.CodGrupo
    WHERE UG.CodUsuario = @codigo
    ORDER BY UG.CodGrupo;`);
  const u = r.recordsets[0][0];
  return u ? { ...u, grupos: r.recordsets[1] } : null;
}

async function listarUsuarios(config) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  const r = await p.request().query(`
    SELECT RTRIM(CodUsuario) AS codigo, RTRIM(NombreUsuario) AS nombre, Status AS status,
           CASE WHEN PasswordHash IS NOT NULL AND LTRIM(RTRIM(PasswordHash)) <> '' THEN 1 ELSE 0 END AS tieneClave
    FROM dbo.USUARIOS ORDER BY CodUsuario;
    SELECT UPPER(LTRIM(RTRIM(UG.CodUsuario))) AS codigo, RTRIM(UG.CodGrupo) AS grupo,
           RTRIM(ISNULL(G.NombreGrupo, UG.CodGrupo)) AS nombre
    FROM dbo.USUARIOGRUPO AS UG LEFT JOIN dbo.GRUPOS AS G ON G.CodGrupo = UG.CodGrupo
    ORDER BY UG.CodGrupo;`);
  const grupos = new Map();
  for (const g of r.recordsets[1]) {
    const lista = grupos.get(g.codigo) ?? [];
    lista.push({ grupo: g.grupo, nombre: g.nombre });
    grupos.set(g.codigo, lista);
  }
  return r.recordsets[0].map((u) => ({
    ...u,
    tieneClave: Number(u.tieneClave) === 1,
    grupos: grupos.get(u.codigo.trim().toUpperCase()) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Inicio de sesión contra USUARIOS, con el mismo método del backend de inventario:
//  - Si el usuario ya tiene PasswordHash -> se verifica con PBKDF2.
//  - Si no, se compara la clave escrita con USUARIOS.Pasword (la del POS) y, si
//    coincide, se migra: se guarda su hash en PasswordHash. La columna Pasword
//    del POS nunca se lee para mostrarla ni se modifica.
// ---------------------------------------------------------------------------

// Agrega la columna PasswordHash a USUARIOS si no existe. Requiere permiso para
// ALTER TABLE; si no lo hay, se avisa con un mensaje claro.
let columnaHashLista = false;
async function asegurarColumnaHash(p) {
  if (columnaHashLista) return;
  try {
    await p.request().query(
      "IF COL_LENGTH('dbo.USUARIOS','PasswordHash') IS NULL ALTER TABLE dbo.USUARIOS ADD PasswordHash NVARCHAR(200) NULL;",
    );
    columnaHashLista = true;
  } catch (err) {
    throw new Error(
      'No se pudo preparar la columna PasswordHash en USUARIOS (se necesita permiso para modificar la tabla). ' +
      `Detalle: ${err.message}`,
    );
  }
}

async function credencialDe(p, codigo) {
  const r = await p.request().input('cod', sql.VarChar(50), codigo).query(
    `SELECT TOP 1 RTRIM(CodUsuario) AS codigo, Pasword AS pasword, PasswordHash AS hash,
            CONVERT(VARBINARY(200), Pasword) AS paswordBin
     FROM dbo.USUARIOS WHERE ${MISMO_CODIGO('CodUsuario')};`,
  );
  return r.recordset[0] ?? null;
}

async function guardarHash(p, codigo, texto) {
  await p.request()
    .input('cod', sql.VarChar(50), codigo)
    .input('h', sql.NVarChar(200), poshash.hash(texto))
    .query(`UPDATE dbo.USUARIOS SET PasswordHash = @h WHERE ${MISMO_CODIGO('CodUsuario')};`);
}

// Valida usuario + clave. Devuelve { estado, usuario?, nivel? }.
// estado: 'ok' | 'credenciales' | 'inactivo' | 'sin-acceso'
async function validarAcceso(config, usuario, clave) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  const u = await buscarUsuario(config, usuario); // nombre, status, grupos
  if (!u) return { estado: 'credenciales' };
  const cred = await credencialDe(p, u.codigo);
  if (!cred) return { estado: 'credenciales' };

  let ok = false;
  let migrar = false;
  if (cred.hash && String(cred.hash).trim()) {
    ok = poshash.verificar(clave, cred.hash);
  } else if (cred.pasword != null && cred.pasword === clave) {
    // Clave guardada en texto plano
    ok = true;
    migrar = true;
  } else {
    // Clave guardada codificada (formato del POS): se codifica lo escrito y se
    // compara en bytes contra lo guardado.
    const enc = poscodif.codificar(clave);
    if (enc && Buffer.isBuffer(cred.paswordBin) && enc.equals(cred.paswordBin)) {
      ok = true;
      migrar = true;
    }
  }
  if (!ok) return { estado: 'credenciales' };
  if (Number(u.status) !== 1) return { estado: 'inactivo' };

  // El acceso según grupos lo decide quien tenga la config (main.cjs). Aquí solo se
  // verifica credencial + estado, y se informa si corresponde migrar a hash.
  return { estado: 'ok', usuario: { codigo: u.codigo, nombre: u.nombre, grupos: u.grupos }, migrar };
}

// Guarda el hash de la clave (migración desde la clave del POS).
async function migrarClave(config, codigo, clave) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  await guardarHash(p, codigo, clave);
  return true;
}

// Lista los grupos del sistema (para configurar permisos).
async function listarGrupos(config) {
  const p = await obtenerPool(config);
  const r = await p.request().query(
    'SELECT RTRIM(CodGrupo) AS codigo, RTRIM(ISNULL(NombreGrupo, CodGrupo)) AS nombre FROM dbo.GRUPOS ORDER BY CodGrupo;',
  );
  return r.recordset;
}

// Cambiar la propia contraseña: verifica la actual (hash o, si aún no migró, la del POS).
async function cambiarClave(config, codigo, actual, nueva) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  const cred = await credencialDe(p, codigo);
  if (!cred) throw new Error('Usuario no encontrado.');
  const ok = cred.hash && String(cred.hash).trim()
    ? poshash.verificar(actual, cred.hash)
    : cred.pasword != null && cred.pasword === actual;
  if (!ok) throw new Error('La contraseña actual no es correcta.');
  await guardarHash(p, cred.codigo, nueva);
  return true;
}

// Acción de administrador: fija una contraseña (temporal) conocida para un usuario.
async function establecerClave(config, codigo, nueva) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  const cred = await credencialDe(p, codigo);
  if (!cred) throw new Error('Usuario no encontrado.');
  await guardarHash(p, cred.codigo, nueva);
  return true;
}

// Acción de administrador: quita el hash para que el usuario vuelva a entrar con su clave del POS.
async function limpiarClave(config, codigo) {
  const p = await obtenerPool(config);
  await asegurarColumnaHash(p);
  const r = await p.request().input('cod', sql.VarChar(50), codigo)
    .query(`UPDATE dbo.USUARIOS SET PasswordHash = NULL WHERE ${MISMO_CODIGO('CodUsuario')};`);
  return r.rowsAffected[0] > 0;
}

async function cerrar() {
  if (pool) {
    const p = pool;
    pool = null;
    poolConfigKey = null;
    columnaHashLista = false; // la base puede cambiar; se revisa de nuevo
    try { await p.close(); } catch { /* ignorar */ }
  }
}

module.exports = {
  probarConexion, probarConfig, listarBases, obtenerVentas, buscarUsuario, listarUsuarios, listarGrupos,
  validarAcceso, migrarClave, cambiarClave, establecerClave, limpiarClave,
  cerrar, traducirError, TABLAS_REQUERIDAS,
};
