// Lanza el script de contraseña temporal bajo Electron, quitando la variable
// ELECTRON_RUN_AS_NODE (que algunas terminales de VS Code dejan puesta).
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const proc = spawn(
  electron,
  [path.join(__dirname, 'clave-temporal.main.cjs'), ...process.argv.slice(2)],
  { stdio: 'inherit', env },
);
proc.on('exit', (codigo) => process.exit(codigo ?? 0));
