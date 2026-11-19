// Fija una contraseña temporal para un usuario, usando la conexión guardada en la app.
// Sirve para dar el primer acceso cuando nadie recuerda su contraseña del sistema.
// Uso:  npm run clave-temporal -- <usuario> <contraseña> [baseDeDatos]
const { app } = require('electron');
const path = require('path');

app.setPath('userData', path.join(app.getPath('appData'), 'Auditoría Cash'));

app.whenReady().then(async () => {
  const { leerConfig, descripcionHost } = require('../electron/config.cjs');
  const db = require('../electron/db.cjs');

  const [usuario, clave, base] = process.argv.slice(2);
  if (!usuario || !clave) {
    console.error('Uso: npm run clave-temporal -- <usuario> <contraseña> [baseDeDatos]');
    app.exit(1);
    return;
  }
  if (clave.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    app.exit(1);
    return;
  }

  try {
    const cfg = leerConfig();
    if (base) cfg.database = base;
    if (!cfg.database) throw new Error('No hay base de datos configurada. Abre la app y configura la conexión primero.');
    console.log(`Conectando a "${cfg.database}" en ${descripcionHost(cfg)} ...`);
    await db.establecerClave(cfg, usuario, clave);
    console.log(`\nListo. El usuario "${usuario}" ya puede entrar en Auditoría Cash con esa contraseña temporal.`);
    console.log('Después podrá cambiarla desde su menú (arriba a la derecha).');
    await db.cerrar();
    app.exit(0);
  } catch (e) {
    console.error('\nError:', db.traducirError ? db.traducirError(e) : e.message);
    app.exit(1);
  }
});
