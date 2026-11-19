import { CircleAlert, LayoutDashboard, LoaderCircle, RefreshCw, Search, Settings2, ShieldCheck, TableProperties } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Nivel, PermisoGrupo, Sesion, UsuarioSistema, Vistas, VistaPermiso } from '../types';
import { Boton, Segmentado, Tarjeta, TituloTarjeta, cx } from './ui';

const OPCIONES_GRUPO = [
  { valor: 'ninguno' as const, etiqueta: 'Sin acceso' },
  { valor: 'dashboard' as const, etiqueta: <><LayoutDashboard className="size-3.5" />Dashboard</> },
  { valor: 'detalle' as const, etiqueta: <><TableProperties className="size-3.5" />Detalle</> },
  { valor: 'ambos' as const, etiqueta: 'Ambos' },
];

function textoVistas(v: Vistas): string {
  if (v.dashboard && v.detalle) return 'Dashboard + Detalle';
  if (v.dashboard) return 'Dashboard';
  if (v.detalle) return 'Detalle';
  return 'Sin vistas';
}

function PanelPermisosGrupos({ onCambio }: { onCambio?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [grupos, setGrupos] = useState<PermisoGrupo[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    const r = await window.api.obtenerPermisosGrupos();
    setCargando(false);
    if (r.ok) setGrupos(r.data); else setError(r.error);
  }, []);

  useEffect(() => { if (abierto && !grupos) cargar(); }, [abierto, grupos, cargar]);

  const fijar = async (g: PermisoGrupo, valor: VistaPermiso) => {
    const antes = g.permiso;
    setGrupos((l) => (l ?? []).map((x) => (x.grupo === g.grupo ? { ...x, permiso: valor } : x)));
    setGuardando(g.grupo);
    const r = await window.api.guardarPermisoGrupo(g.grupo, valor);
    setGuardando(null);
    if (!r.ok) { setError(r.error); setGrupos((l) => (l ?? []).map((x) => (x.grupo === g.grupo ? { ...x, permiso: antes } : x))); return; }
    onCambio?.();
  };

  return (
    <div className="mx-5 mb-3 overflow-hidden rounded-lg border border-line">
      <button
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-surface-hover"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          <Settings2 className="size-4 text-accent" /> Permisos por grupo
        </span>
        <span className="text-[12px] text-muted">{abierto ? 'Ocultar' : 'Elige qué ve cada grupo del sistema'}</span>
      </button>

      {abierto && (
        <div className="border-t border-line px-4 py-3">
          {cargando && <p className="py-4 text-center text-[12.5px] text-muted">Cargando grupos…</p>}
          {error && (
            <p className="mb-2 flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2 text-[12.5px]">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />{error}
            </p>
          )}
          {grupos && (
            <>
              <p className="mb-3 text-[11.5px] leading-relaxed text-muted">
                Define qué puede ver cada grupo del POS. <b className="text-ink-2">ADMI</b> y <b className="text-ink-2">SISTEMAS</b> administran
                siempre (conexión, usuarios y permisos), aunque les limites las vistas.
              </p>
              <div className="space-y-1.5">
                {grupos.map((g) => (
                  <div key={g.grupo} className="flex items-center justify-between gap-4 rounded-md px-1 py-1">
                    <div className="min-w-0 leading-tight">
                      <span className="text-[13px] font-medium text-ink">{g.grupo}</span>
                      {g.nombre && g.nombre !== g.grupo && <span className="ml-2 text-[11.5px] text-muted">{g.nombre}</span>}
                      {g.admin && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-accent">Administra</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {guardando === g.grupo && <LoaderCircle className="size-3.5 animate-spin text-muted" />}
                      <Segmentado<VistaPermiso> valor={g.permiso} onCambio={(v) => fijar(g, v)} opciones={OPCIONES_GRUPO} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type FiltroAcceso = 'todos' | 'con' | 'sin';

export function EtiquetaNivel({ nivel }: { nivel: Nivel | null }) {
  if (nivel === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium text-ink">
        <ShieldCheck className="size-3.5 text-accent" /> Administrador
      </span>
    );
  }
  if (nivel === 'consulta') {
    return <span className="inline-flex rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium text-ink-2">Consulta</span>;
  }
  return <span className="text-[12px] text-muted">Sin acceso</span>;
}

export function VistaUsuarios({ sesion, className, onPermisos }: { sesion: Sesion; className?: string; onPermisos?: () => void }) {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroAcceso>('con');

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    const r = await window.api.listarUsuarios();
    setCargando(false);
    if (r.ok) setUsuarios(r.data); else setError(r.error);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Al cambiar permisos de grupo, recargar la tabla (para recalcular qué ve cada uno)
  // y refrescar la sesión actual (para el menú).
  const alCambiarPermisos = useCallback(() => { cargar(); onPermisos?.(); }, [cargar, onPermisos]);

  // Puede entrar = está activo en el sistema y su grupo tiene acceso.
  const puedeEntrar = (u: UsuarioSistema) => !!u.nivel && Number(u.status) === 1;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (usuarios ?? []).filter((u) => {
      if (filtro === 'con' && !puedeEntrar(u)) return false;
      if (filtro === 'sin' && puedeEntrar(u)) return false;
      if (!q) return true;
      return [u.codigo, u.nombre, ...u.grupos.map((g) => `${g.grupo} ${g.nombre}`)].join(' ').toLowerCase().includes(q);
    });
  }, [usuarios, busqueda, filtro]);

  const conteo = useMemo(() => {
    const l = usuarios ?? [];
    const con = l.filter(puedeEntrar).length;
    return { con, sin: l.length - con, todos: l.length };
  }, [usuarios]);

  const yo = sesion.codigo.trim().toUpperCase();

  return (
    <Tarjeta className={cx('flex min-h-0 flex-col overflow-hidden', className)}>
      <TituloTarjeta
        titulo="Usuarios y roles"
        subtitulo="Del sistema de la tienda: tablas USUARIOS y USUARIOGRUPO"
        extra={
          <div className="flex items-center gap-2">
            <Segmentado<FiltroAcceso>
              valor={filtro}
              onCambio={setFiltro}
              opciones={[
                { valor: 'con', etiqueta: `Con acceso (${conteo.con})` },
                { valor: 'sin', etiqueta: `Sin acceso (${conteo.sin})` },
                { valor: 'todos', etiqueta: `Todos (${conteo.todos})` },
              ]}
            />
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar usuario o grupo…"
                className="h-9 w-60 rounded-lg border border-line bg-surface pr-3 pl-9 text-[13px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
              />
            </label>
            <Boton onClick={cargar} disabled={cargando} title="Recargar">
              {cargando ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Recargar
            </Boton>
          </div>
        }
      />

      <div className="mx-5 mb-3 rounded-lg bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
        Decides en <b className="text-ink">Permisos por grupo</b> qué puede ver cada grupo del sistema. Un usuario ve la suma de lo que
        permiten sus grupos. <b className="text-ink">ADMI</b> y <b className="text-ink">SISTEMAS</b> administran siempre (conexión, usuarios y
        permisos). Solo entran usuarios <b className="text-ink">activos</b>, con su propia contraseña del sistema de la tienda.
      </div>

      <PanelPermisosGrupos onCambio={alCambiarPermisos} />


      {error && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2 text-[12.5px]">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" /> {error}
        </div>
      )}

      <div className="seleccionable min-h-0 flex-1 overflow-auto border-t border-line">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {['Usuario', 'Nombre', 'Grupos', 'Acceso a Auditoría Cash', 'Estado en el sistema', 'Ve en la app'].map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2.5 text-left font-medium text-ink-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => {
              const esYo = u.codigo.trim().toUpperCase() === yo;
              return (
                <tr key={u.codigo} className="hover:bg-surface-hover">
                  <td className="whitespace-nowrap border-b border-line px-3 py-2 font-medium text-ink">
                    {u.codigo}
                    {esYo && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2">Tú</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-ink">{u.nombre}</td>
                  <td className="border-b border-line px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {u.grupos.length === 0 && <span className="text-muted">—</span>}
                      {u.grupos.map((g) => (
                        <span key={g.grupo} title={g.nombre} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-2">
                          {g.grupo}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {Number(u.status) === 1 ? <EtiquetaNivel nivel={u.nivel} /> : <span className="text-[12px] text-muted">Sin acceso (inactivo)</span>}
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 text-ink-2">
                      <span className={cx('size-2 rounded-full', Number(u.status) === 1 ? 'bg-good' : 'bg-muted')} />
                      {Number(u.status) === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line px-3 py-2">
                    {puedeEntrar(u) ? (
                      <span className="text-[12.5px] text-ink-2">{textoVistas(u.vistas)}</span>
                    ) : (
                      <span className="text-[12px] text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {usuarios && visibles.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-muted">Ningún usuario coincide con el filtro.</td></tr>
            )}
            {!usuarios && cargando && (
              <tr><td colSpan={6} className="px-3 py-12 text-center text-muted">Cargando usuarios…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

