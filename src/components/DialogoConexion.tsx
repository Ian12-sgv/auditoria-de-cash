import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, Search, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BaseDisponible, ConfigConexion, InfoConexion } from '../types';
import { Boton, cx } from './ui';

type Prueba =
  | { estado: 'nada' }
  | { estado: 'probando' }
  | { estado: 'ok'; info: InfoConexion }
  | { estado: 'error'; mensaje: string };

const VACIA: ConfigConexion = {
  server: '', port: 1433, database: '', user: '', password: '', encrypt: true, trustServerCertificate: true,
};

function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-[12px] font-medium text-ink-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-[11.5px] text-muted">{ayuda}</span>}
    </label>
  );
}

const claseInput =
  'h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-muted ' +
  'focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';

function Casilla({ marcada, onCambio, children }: { marcada: boolean; onCambio: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
      <input type="checkbox" checked={marcada} onChange={(e) => onCambio(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      {children}
    </label>
  );
}

export function DialogoConexion({ abierto, onCerrar, onGuardado }: { abierto: boolean; onCerrar: () => void; onGuardado: () => void }) {
  const [c, setC] = useState<ConfigConexion>(VACIA);
  const [tienePassword, setTienePassword] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [bases, setBases] = useState<BaseDisponible[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBases, setErrorBases] = useState<string | null>(null);
  const [prueba, setPrueba] = useState<Prueba>({ estado: 'nada' });
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const primerCampo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) return;
    setBases(null); setErrorBases(null); setPrueba({ estado: 'nada' }); setErrorGuardar(null); setVerPassword(false);
    window.api.obtenerConfig().then((r) => {
      if (r.ok) {
        const { tienePassword: tp, ...cfg } = r.data;
        setC(cfg);
        setTienePassword(tp);
      }
      setTimeout(() => primerCampo.current?.focus(), 0);
    });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const cambiar = <K extends keyof ConfigConexion>(k: K, v: ConfigConexion[K]) => {
    setC((prev) => ({ ...prev, [k]: v }));
    setPrueba({ estado: 'nada' });
    // Cambiar servidor o credenciales invalida la lista de bases encontrada.
    if (k !== 'database') setBases(null);
  };

  const conInstancia = c.server.includes('\\');

  const buscarBases = async () => {
    setBuscando(true); setErrorBases(null);
    const r = await window.api.listarBases(c);
    setBuscando(false);
    if (r.ok) setBases(r.data);
    else { setBases(null); setErrorBases(r.error); }
  };

  const probar = async () => {
    setPrueba({ estado: 'probando' });
    const r = await window.api.probarConfig(c);
    setPrueba(r.ok ? { estado: 'ok', info: r.data } : { estado: 'error', mensaje: r.error });
  };

  const guardar = async () => {
    setGuardando(true); setErrorGuardar(null);
    const r = await window.api.guardarConfig(c);
    setGuardando(false);
    if (r.ok) onGuardado();
    else setErrorGuardar(r.error);
  };

  const faltaDato = !c.server.trim() || !c.user.trim() || !c.database.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-[2px]" onMouseDown={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-conexion"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-4">
          <div>
            <h2 id="titulo-conexion" className="text-[15px] font-semibold">Conexión a la base de datos</h2>
            <p className="mt-0.5 text-[12px] text-muted">SQL Server · la configuración se guarda en este equipo</p>
          </div>
          <Boton variante="fantasma" onClick={onCerrar} aria-label="Cerrar" className="-mr-2 w-9 justify-center px-0!">
            <X className="size-4" />
          </Boton>
        </header>

        <div className="space-y-5 overflow-auto px-6 py-5">
          {/* Servidor */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Servidor</h3>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Campo etiqueta="Servidor" ayuda={<>Nombre o IP. Para una instancia con nombre: <code>SERVIDOR\SQLEXPRESS</code></>}>
                <input ref={primerCampo} className={claseInput} value={c.server} onChange={(e) => cambiar('server', e.target.value)} placeholder="localhost" spellCheck={false} />
              </Campo>
              <Campo etiqueta="Puerto" ayuda={conInstancia ? 'Lo resuelve la instancia' : undefined}>
                <input
                  className={cx(claseInput, 'tabular')}
                  type="number"
                  min={1}
                  max={65535}
                  value={c.port}
                  disabled={conInstancia}
                  onChange={(e) => cambiar('port', Number(e.target.value))}
                />
              </Campo>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Usuario">
                <input className={claseInput} value={c.user} onChange={(e) => cambiar('user', e.target.value)} placeholder="sa" spellCheck={false} />
              </Campo>
              <Campo etiqueta="Contraseña" ayuda={tienePassword && !c.password ? 'Déjala vacía para conservar la guardada' : undefined}>
                <div className="relative">
                  <input
                    className={cx(claseInput, 'pr-10')}
                    type={verPassword ? 'text' : 'password'}
                    value={c.password}
                    onChange={(e) => cambiar('password', e.target.value)}
                    placeholder={tienePassword ? '••••••••  (guardada)' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
                  >
                    {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Campo>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
              <Casilla marcada={c.encrypt} onCambio={(v) => cambiar('encrypt', v)}>Cifrar la conexión</Casilla>
              <Casilla marcada={c.trustServerCertificate} onCambio={(v) => cambiar('trustServerCertificate', v)}>
                Confiar en el certificado del servidor
              </Casilla>
            </div>
          </section>

          {/* Base de datos */}
          <section className="space-y-3 border-t border-line pt-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Base de datos</h3>
            <div className="flex items-end gap-2">
              <Campo etiqueta="Nombre de la base" className="flex-1">
                <input
                  className={claseInput}
                  value={c.database}
                  onChange={(e) => cambiar('database', e.target.value)}
                  placeholder="Ej.: BD_SPDV"
                  spellCheck={false}
                />
              </Campo>
              <Boton onClick={buscarBases} disabled={buscando || !c.server.trim() || !c.user.trim()}>
                {buscando ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                Buscar bases
              </Boton>
            </div>

            {errorBases && <Mensaje tipo="error">{errorBases}</Mensaje>}

            {bases && (
              <div className="overflow-hidden rounded-lg border border-line">
                {bases.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[12.5px] text-muted">El servidor no tiene bases de usuario accesibles.</p>
                ) : (
                  <ul className="max-h-48 overflow-auto" role="listbox" aria-label="Bases de datos del servidor">
                    {bases.map((b) => {
                      const sel = b.nombre === c.database;
                      return (
                        <li key={b.nombre}>
                          <button
                            role="option"
                            aria-selected={sel}
                            onClick={() => cambiar('database', b.nombre)}
                            className={cx(
                              'flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-left text-[13px] last:border-b-0',
                              sel ? 'bg-accent-soft' : 'hover:bg-surface-hover',
                            )}
                          >
                            <span className={cx('font-medium', sel ? 'text-ink' : 'text-ink-2')}>{b.nombre}</span>
                            {b.compatible === true && (
                              <span className="flex items-center gap-1 text-[11.5px] text-good"><CircleCheck className="size-3.5" />Tiene las tablas necesarias</span>
                            )}
                            {b.compatible === false && <span className="text-[11.5px] text-muted">Le faltan tablas</span>}
                            {b.compatible === null && <span className="text-[11.5px] text-muted">No se pudo revisar</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Resultado de la prueba */}
          {prueba.estado === 'ok' && prueba.info.faltantes.length === 0 && (
            <Mensaje tipo="ok">
              Conectado a <b>{prueba.info.baseDatos}</b> en {prueba.info.host} · SQL Server {prueba.info.version}. Todas las tablas necesarias están disponibles.
            </Mensaje>
          )}
          {prueba.estado === 'ok' && prueba.info.faltantes.length > 0 && (
            <Mensaje tipo="aviso">
              La conexión funciona, pero en <b>{prueba.info.baseDatos}</b> faltan tablas: {prueba.info.faltantes.join(', ')}. La consulta de auditoría fallará con esta base.
            </Mensaje>
          )}
          {prueba.estado === 'error' && <Mensaje tipo="error">{prueba.mensaje}</Mensaje>}
          {errorGuardar && <Mensaje tipo="error">{errorGuardar}</Mensaje>}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line bg-surface-2 px-6 py-3.5">
          <Boton onClick={probar} disabled={faltaDato || prueba.estado === 'probando'}>
            {prueba.estado === 'probando' ? <LoaderCircle className="size-4 animate-spin" /> : <CircleCheck className="size-4" />}
            Probar conexión
          </Boton>
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" onClick={guardar} disabled={faltaDato || guardando}>
              {guardando && <LoaderCircle className="size-4 animate-spin" />}
              Guardar y conectar
            </Boton>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Mensaje({ tipo, children }: { tipo: 'ok' | 'aviso' | 'error'; children: ReactNode }) {
  const Icono = tipo === 'ok' ? CircleCheck : tipo === 'aviso' ? TriangleAlert : CircleAlert;
  return (
    <div
      className={cx(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed text-ink',
        tipo === 'ok' && 'border-good/30 bg-good/10',
        tipo === 'aviso' && 'border-[#fab219]/40 bg-[#fab219]/10',
        tipo === 'error' && 'border-critical/40 bg-critical-soft',
      )}
    >
      <Icono
        className={cx(
          'mt-0.5 size-4 shrink-0',
          tipo === 'ok' && 'text-good',
          tipo === 'aviso' && 'text-[#c98500]',
          tipo === 'error' && 'text-critical',
        )}
      />
      <div>{children}</div>
    </div>
  );
}
