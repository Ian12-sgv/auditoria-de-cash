const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db.cjs');
const { exportarExcel } = require('./excel.cjs');

const { leerConfig, guardarConfig, completar, descripcionHost } = require('./config.cjs');
const permisos = require('./permisos.cjs');

// --- Permisos de vistas por grupo (configurable desde la app) ---
function rutaPermisos() {
  return path.join(app.getPath('userData'), 'permisos.json');
}
function leerVistasGrupos() {
  try {
    const raw = JSON.parse(fs.readFileSync(rutaPermisos(), 'utf8')).vistasPorGrupo || {};
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[String(k).trim().toUpperCase()] = permisos.sanear(v);
    return out;
  } catch {
    return {};
  }
}
function guardarVistaGrupo(grupo, valor) {
  const mapa = leerVistasGrupos();
  mapa[String(grupo).trim().toUpperCase()] = permisos.sanear(valor);
  fs.mkdirSync(path.dirname(rutaPermisos()), { recursive: true });
  fs.writeFileSync(rutaPermisos(), JSON.stringify({ vistasPorGrupo: mapa }, null, 2), 'utf8');
  return permisos.sanear(valor);
}

const DEV_URL = process.env.VITE_DEV_SERVER_URL;

// Envuelve cada handler para devolver { ok, data } o { ok:false, error } en vez de lanzar.
function manejar(canal, fn) {
  ipcMain.handle(canal, async (evento, ...args) => {
    try {
      return { ok: true, data: await fn(evento, ...args) };
    } catch (err) {
      return { ok: false, error: db.traducirError(err) };
    }
  });
}

function validarFiltro(f) {
  const entero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (!f || !entero(f.anioDesde, 2000, 2100) || !entero(f.anioHasta, 2000, 2100)
      || !entero(f.mesDesde, 1, 12) || !entero(f.mesHasta, 1, 12)) {
    throw new Error('Filtro de fechas inválido.');
  }
  if (f.anioDesde * 12 + f.mesDesde > f.anioHasta * 12 + f.mesHasta) {
    throw new Error('El mes "Desde" no puede ser posterior al mes "Hasta".');
  }
  return f;
}

// ---------------------------------------------------------------------------
// Sesión y permisos. La sesión vive en el proceso principal: la interfaz no puede
// saltarse los permisos aunque se modifique.
// ---------------------------------------------------------------------------
let sesion = null; // { codigo, nombre, nivel: 'admin' | 'consulta', grupos: [{ grupo, nombre }] }
let conexionLista = false; // la base configurada responde y tiene las tablas necesarias

function requiereSesion() {
  if (!sesion) throw new Error('Debes iniciar sesión.');
  return sesion;
}
function requiereAdmin() {
  if (requiereSesion().nivel !== 'admin') throw new Error('Tu usuario no tiene permiso para esta acción.');
}
// La conexión la configura un administrador. Excepción: si la base no responde no hay
// forma de iniciar sesión, así que desde la pantalla de inicio se permite configurarla.
function requiereConfigurar() {
  // Con sesión iniciada, solo administradores. Antes de iniciar sesión (pantalla de
  // login) cualquiera puede configurar la conexión: hay que poder elegir la base
  // correcta para poder entrar, aunque la actual ya conecte.
  if (sesion) return requiereAdmin();
}

// Freno ante intentos repetidos: 5 fallos por usuario bloquean 5 minutos.
const intentos = new Map();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function comprobarBloqueo(cod) {
  const i = intentos.get(cod);
  if (i && i.hasta > Date.now()) {
    const min = Math.ceil((i.hasta - Date.now()) / 60000);
    throw new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${min} min.`);
  }
}
async function falloDeAcceso(cod) {
  const i = intentos.get(cod) ?? { n: 0, hasta: 0 };
  i.n += 1;
  if (i.n >= 5) { i.n = 0; i.hasta = Date.now() + 5 * 60000; }
  intentos.set(cod, i);
  await espera(700);
  throw new Error('Usuario o contraseña incorrectos.');
}

const abrirSesion = (u, nivel, vistas) =>
  (sesion = { codigo: u.codigo, nombre: u.nombre, nivel, grupos: u.grupos, vistas });

manejar('auth:sesion', async () => sesion);

manejar('auth:entrar', async (_e, datos) => {
  const codigo = String(datos?.usuario ?? '').trim();
  const clave = String(datos?.clave ?? '');
  if (!codigo) throw new Error('Escribe tu usuario.');
  if (!clave) throw new Error('Escribe tu contraseña.');
  const k = codigo.toUpperCase();
  comprobarBloqueo(k);

  const r = await db.validarAcceso(leerConfig(), codigo, clave);
  if (r.estado === 'credenciales') return falloDeAcceso(k);
  if (r.estado === 'inactivo') throw new Error('Este usuario está inactivo en el sistema.');

  const { nivel, vistas } = permisos.calcular(r.usuario.grupos, leerVistasGrupos());
  if (!nivel) {
    const g = r.usuario.grupos.map((x) => x.grupo).join(', ') || 'ninguno';
    throw new Error(`Tu grupo no tiene acceso a Auditoría Cash (grupos: ${g}). Avisa a un administrador.`);
  }
  if (r.migrar) await db.migrarClave(leerConfig(), r.usuario.codigo, clave);
  intentos.delete(k);
  return { estado: 'ok', sesion: abrirSesion(r.usuario, nivel, vistas) };
});

manejar('auth:cambiarClave', async (_e, datos) => {
  const s = requiereSesion();
  const nueva = String(datos?.nueva ?? '');
  if (nueva.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  await db.cambiarClave(leerConfig(), s.codigo, String(datos?.actual ?? ''), nueva);
  return true;
});

manejar('auth:salir', async () => {
  sesion = null;
  return true;
});

// --- Usuarios (solo administradores) ---
manejar('usuarios:listar', async () => {
  requiereAdmin();
  const cfg = leerVistasGrupos();
  const lista = await db.listarUsuarios(leerConfig());
  return lista.map((u) => {
    const { nivel, vistas } = permisos.calcular(u.grupos, cfg);
    return { ...u, nivel, vistas };
  });
});

// Fija una contraseña temporal conocida para un usuario (para quien no recuerda su clave).
manejar('usuarios:establecerClave', async (_e, datos) => {
  requiereAdmin();
  const codigo = String(datos?.codigo ?? '').trim();
  const clave = String(datos?.clave ?? '');
  if (clave.length < 6) throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
  await db.establecerClave(leerConfig(), codigo, clave);
  return true;
});

// Quita el hash: el usuario vuelve a entrar con su contraseña del sistema (POS).
manejar('usuarios:restablecer', async (_e, codigo) => {
  requiereAdmin();
  await db.limpiarClave(leerConfig(), String(codigo).trim());
  return true;
});

// --- Permisos de vistas por grupo ---
manejar('permisos:gruposObtener', async () => {
  requiereAdmin();
  const cfg = leerVistasGrupos();
  const grupos = await db.listarGrupos(leerConfig());
  return grupos.map((g) => ({
    grupo: g.codigo,
    nombre: g.nombre,
    permiso: permisos.permisoGrupo(g.codigo, cfg),
    admin: permisos.GRUPOS_ADMIN.includes(g.codigo.trim().toUpperCase()),
  }));
});

manejar('permisos:guardarGrupo', async (_e, datos) => {
  requiereAdmin();
  const grupo = String(datos?.grupo ?? '').trim();
  if (!grupo) throw new Error('Falta el grupo.');
  const valor = guardarVistaGrupo(grupo, datos?.valor);
  // Refleja el cambio en la sesión actual si afecta sus grupos.
  if (sesion) {
    const { nivel, vistas } = permisos.calcular(sesion.grupos, leerVistasGrupos());
    if (nivel) sesion.vistas = vistas;
  }
  return valor;
});

// --- Conexión ---
manejar('db:probar', async () => {
  conexionLista = false;
  const cfg = leerConfig();
  if (!cfg.database) throw new Error('No hay una base de datos configurada.');
  const info = await db.probarConexion(cfg);
  conexionLista = info.faltantes.length === 0;
  return { ...info, host: descripcionHost(cfg) };
});

manejar('config:obtener', async () => {
  requiereConfigurar();
  const { password, ...resto } = leerConfig();
  return { ...resto, password: '', tienePassword: !!password };
});

manejar('config:listarBases', async (_e, candidata) => {
  requiereConfigurar();
  return db.listarBases(completar(candidata));
});

manejar('config:probar', async (_e, candidata) => {
  requiereConfigurar();
  const c = completar(candidata);
  return { ...(await db.probarConfig(c)), host: descripcionHost(c) };
});

manejar('config:guardar', async (_e, candidata) => {
  requiereConfigurar();
  const c = completar(candidata);
  if (!c.database) throw new Error('Indica la base de datos.');
  guardarConfig(c);
  await db.cerrar();
  conexionLista = false;
  return true;
});

// --- Datos ---
manejar('db:ventas', async (_e, filtro) => {
  requiereSesion();
  return db.obtenerVentas(leerConfig(), validarFiltro(filtro));
});

manejar('excel:exportar', async (e, { filas, nombre, meta }) => {
  requiereSesion();
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar a Excel',
    defaultPath: path.join(app.getPath('documents'), nombre),
    filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }],
  });
  if (canceled || !filePath) return { guardado: false };
  await exportarExcel(filas, filePath, meta);
  return { guardado: true, ruta: filePath };
});

function crearVentana() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: 'Auditoría Cash',
    backgroundColor: '#111110',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  if (!DEV_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"],
        },
      });
    });
  }
  crearVentana();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana();
  });
});

app.on('window-all-closed', async () => {
  await db.cerrar();
  if (process.platform !== 'darwin') app.quit();
});
