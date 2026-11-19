// Contraseñas propias de Auditoría Cash (independientes de la clave del punto de venta).
// Se guardan en %APPDATA%\<app>\claves.json como hash scrypt con sal aleatoria por usuario.
const { app } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const LARGO_MINIMO = 6;
const ruta = () => path.join(app.getPath('userData'), 'claves.json');
const clave = (codigo) => String(codigo ?? '').trim().toUpperCase();

function leer() {
  try {
    return JSON.parse(fs.readFileSync(ruta(), 'utf8'));
  } catch {
    return {};
  }
}

function escribir(datos) {
  fs.mkdirSync(path.dirname(ruta()), { recursive: true });
  fs.writeFileSync(ruta(), JSON.stringify(datos, null, 2), 'utf8');
}

const derivar = (texto, sal) => crypto.scryptSync(texto, sal, 64, { N: 16384, r: 8, p: 1 });

function tieneClave(codigo) {
  return !!leer()[clave(codigo)];
}

function verificar(codigo, texto) {
  const reg = leer()[clave(codigo)];
  if (!reg || typeof texto !== 'string') return false;
  const esperado = Buffer.from(reg.hash, 'base64');
  const obtenido = derivar(texto, Buffer.from(reg.sal, 'base64'));
  return esperado.length === obtenido.length && crypto.timingSafeEqual(esperado, obtenido);
}

function validarNueva(texto) {
  if (typeof texto !== 'string' || texto.length < LARGO_MINIMO) {
    throw new Error(`La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.`);
  }
}

function establecer(codigo, texto) {
  validarNueva(texto);
  const sal = crypto.randomBytes(16);
  const datos = leer();
  datos[clave(codigo)] = {
    hash: derivar(texto, sal).toString('base64'),
    sal: sal.toString('base64'),
    creada: new Date().toISOString(),
  };
  escribir(datos);
}

function borrar(codigo) {
  const datos = leer();
  delete datos[clave(codigo)];
  escribir(datos);
}

function conClave() {
  return new Set(Object.keys(leer()));
}

module.exports = { tieneClave, verificar, establecer, borrar, conClave, validarNueva, LARGO_MINIMO };
