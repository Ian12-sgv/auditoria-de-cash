// Inicia Auditoría Cash con un solo comando: `npm start`.
// 1. Compila la interfaz (salvo con --dev, donde la sirve Vite).
// 2. Abre Electron sin la variable ELECTRON_RUN_AS_NODE, que algunas terminales
//    (p. ej. las abiertas desde VS Code) tienen definida y hace que Electron arranque como Node.
const { execSync, spawn } = require('child_process');
const path = require('path');

const raiz = path.join(__dirname, '..');
const dev = process.argv.includes('--dev');

if (!dev) {
  console.log('Compilando la interfaz…');
  execSync('npm run build', { cwd: raiz, stdio: 'inherit' });
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (dev) env.VITE_DEV_SERVER_URL = 'http://localhost:5173';

const electron = require('electron'); // desde Node devuelve la ruta al ejecutable
console.log('Abriendo Auditoría Cash…');
const proc = spawn(electron, ['.'], { cwd: raiz, env, stdio: 'inherit' });
proc.on('exit', (codigo) => process.exit(codigo ?? 0));
