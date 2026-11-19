// Hash de contraseña compatible con el backend de la app de inventario
// (WebServicesApiNetCor/Util/PasswordHasher.cs): PBKDF2-HMACSHA256, formato
// "iteraciones.salBase64.claveBase64". Así los hashes que escribe esta app sirven
// también para ese backend y viceversa.
const crypto = require('crypto');

const ITERACIONES = 100000;
const TAM_SAL = 16;
const TAM_CLAVE = 32;
const SEPARADOR = '.';

function hash(password) {
  const sal = crypto.randomBytes(TAM_SAL);
  const clave = crypto.pbkdf2Sync(password, sal, ITERACIONES, TAM_CLAVE, 'sha256');
  return [String(ITERACIONES), sal.toString('base64'), clave.toString('base64')].join(SEPARADOR);
}

function verificar(password, guardado) {
  if (!guardado || typeof guardado !== 'string') return false;
  const partes = guardado.split(SEPARADOR);
  if (partes.length !== 3) return false;
  const iteraciones = parseInt(partes[0], 10);
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) return false;
  let sal, esperada;
  try {
    sal = Buffer.from(partes[1], 'base64');
    esperada = Buffer.from(partes[2], 'base64');
  } catch {
    return false;
  }
  if (esperada.length === 0) return false;
  const actual = crypto.pbkdf2Sync(password, sal, iteraciones, esperada.length, 'sha256');
  return actual.length === esperada.length && crypto.timingSafeEqual(actual, esperada);
}

// ¿El valor guardado tiene el formato de hash de esta app? (para distinguir de texto plano)
const esHash = (v) => typeof v === 'string' && v.split(SEPARADOR).length === 3 && /^\d+$/.test(v.split(SEPARADOR)[0]);

module.exports = { hash, verificar, esHash };
