// Configuración de conexión.
// - La configuración del usuario se guarda en %APPDATA%\<app>\conexion.json, con la contraseña
//   cifrada mediante safeStorage (DPAPI de Windows) cuando está disponible.
// - Si aún no existe, se toma como valor inicial config.json (raíz del proyecto en desarrollo,
//   o junto al .exe en la app instalada).
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

const POR_DEFECTO = {
  server: 'localhost',
  port: 1433,
  database: '',
  user: 'sa',
  password: '',
  encrypt: true,
  trustServerCertificate: true,
};

const rutaUsuario = () => path.join(app.getPath('userData'), 'conexion.json');
const rutaInicial = () =>
  app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'config.json')
    : path.join(__dirname, '..', 'config.json');

function normalizar(c) {
  // Acepta también el formato antiguo con { options: { encrypt, trustServerCertificate } }.
  const o = c.options ?? {};
  return {
    server: String(c.server ?? POR_DEFECTO.server).trim(),
    port: Number(c.port) || POR_DEFECTO.port,
    database: String(c.database ?? '').trim(),
    user: String(c.user ?? '').trim(),
    password: String(c.password ?? ''),
    encrypt: c.encrypt ?? o.encrypt ?? POR_DEFECTO.encrypt,
    trustServerCertificate: c.trustServerCertificate ?? o.trustServerCertificate ?? POR_DEFECTO.trustServerCertificate,
  };
}

function leerConfig() {
  const usuario = rutaUsuario();
  if (fs.existsSync(usuario)) {
    const raw = JSON.parse(fs.readFileSync(usuario, 'utf8'));
    if (raw.passwordCifrada) {
      try {
        raw.password = safeStorage.decryptString(Buffer.from(raw.passwordCifrada, 'base64'));
      } catch {
        raw.password = '';
      }
    }
    return normalizar(raw);
  }
  const inicial = rutaInicial();
  if (fs.existsSync(inicial)) return normalizar(JSON.parse(fs.readFileSync(inicial, 'utf8')));
  return { ...POR_DEFECTO };
}

function guardarConfig(c) {
  const { password, ...resto } = normalizar(c);
  const datos = { ...resto };
  if (safeStorage.isEncryptionAvailable()) {
    datos.passwordCifrada = safeStorage.encryptString(password).toString('base64');
  } else {
    datos.password = password;
  }
  fs.mkdirSync(path.dirname(rutaUsuario()), { recursive: true });
  fs.writeFileSync(rutaUsuario(), JSON.stringify(datos, null, 2), 'utf8');
}

// Completa una configuración enviada desde la interfaz: si la contraseña viene vacía,
// se conserva la guardada.
function completar(candidata) {
  const c = normalizar(candidata ?? {});
  if (!c.password) c.password = leerConfig().password;
  if (!c.server) throw new Error('Indica el servidor.');
  if (!c.user) throw new Error('Indica el usuario.');
  return c;
}

const descripcionHost = (c) => (c.server.includes('\\') ? c.server : `${c.server},${c.port}`);

module.exports = { leerConfig, guardarConfig, completar, descripcionHost, rutaUsuario };
