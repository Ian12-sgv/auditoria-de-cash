// Roles y permisos de Auditoría Cash, configurables POR GRUPO del sistema (GRUPOS).
//
// Cada grupo del POS tiene un permiso: 'ninguno' | 'dashboard' | 'detalle' | 'ambos'.
//   - 'ninguno'  -> ese grupo no puede entrar.
//   - 'dashboard'/'detalle'/'ambos' -> entra y ve esos apartados.
// Un usuario ve la UNIÓN de lo que permiten sus grupos.
//
// La ADMINISTRACIÓN (configurar conexión, usuarios y permisos) es siempre de los
// grupos ADMI y SISTEMAS, para que nunca nadie quede sin poder administrar. Esos
// grupos, por defecto, ven ambos apartados (se puede ajustar).

const GRUPOS_ADMIN = ['ADMI', 'SISTEMAS'];

const norm = (g) => String(g ?? '').trim().toUpperCase();
const lista = (grupos) => (grupos || []).map((g) => norm(typeof g === 'string' ? g : g.grupo));

const VALORES = ['ninguno', 'dashboard', 'detalle', 'ambos'];
const sanear = (v) => (VALORES.includes(v) ? v : 'ninguno');

const esAdmin = (grupos) => lista(grupos).some((g) => GRUPOS_ADMIN.includes(g));

// Permiso efectivo de un grupo según la config (con el valor por defecto).
function permisoGrupo(grupo, config) {
  const g = norm(grupo);
  if (config && config[g] != null) return sanear(config[g]);
  return GRUPOS_ADMIN.includes(g) ? 'ambos' : 'ninguno';
}

// Nivel de acceso y vistas de un usuario según sus grupos y la config.
function calcular(grupos, config) {
  const admin = esAdmin(grupos);
  let dashboard = false;
  let detalle = false;
  let acceso = admin;
  for (const g of lista(grupos)) {
    const p = permisoGrupo(g, config);
    if (p === 'ninguno') continue;
    acceso = true;
    if (p === 'ambos' || p === 'dashboard') dashboard = true;
    if (p === 'ambos' || p === 'detalle') detalle = true;
  }
  const nivel = admin ? 'admin' : acceso ? 'consulta' : null;
  return { nivel, vistas: { dashboard, detalle } };
}

module.exports = { calcular, permisoGrupo, sanear, esAdmin, VALORES, GRUPOS_ADMIN };
