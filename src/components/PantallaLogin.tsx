import { CircleAlert, Database, Eye, EyeOff, LoaderCircle, LogIn, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Sesion } from '../types';
import type { EstadoConexion } from './Encabezado';
import { Boton, cx } from './ui';

const claseInput =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted ' +
  'focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';

function Campo({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink-2">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-[11.5px] text-muted">{ayuda}</span>}
    </label>
  );
}

function CampoClave({
  valor, onCambio, placeholder, autoFocus, autoComplete,
}: { valor: string; onCambio: (v: string) => void; placeholder?: string; autoFocus?: boolean; autoComplete?: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        className={cx(claseInput, 'pr-10')}
        type={ver ? 'text' : 'password'}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-hover hover:text-ink"
      >
        {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function PantallaLogin({
  conexion,
  onConfigurar,
  onEntrar,
}: {
  conexion: EstadoConexion;
  onConfigurar: () => void;
  onEntrar: (s: Sesion) => void;
}) {
  const [usuario, setUsuario] = useState(() => {
    try { return localStorage.getItem('ultimoUsuario') ?? ''; } catch { return ''; }
  });
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refUsuario = useRef<HTMLInputElement>(null);

  const lista = conexion.estado === 'ok' && conexion.info.faltantes.length === 0;
  useEffect(() => { if (lista && !usuario) refUsuario.current?.focus(); }, [lista, usuario]);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true); setError(null);
    const r = await window.api.entrar(usuario, clave);
    setEnviando(false);
    if (!r.ok) { setError(r.error); return; }
    try { localStorage.setItem('ultimoUsuario', r.data.sesion.codigo); } catch { /* */ }
    onEntrar(r.data.sesion);
  };

  return (
    <div className="grid h-full place-items-center overflow-auto bg-page p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-ink shadow-card">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19V5" /><path d="M4 19h16" /><path d="m8 15 4-5 3 3 5-6" />
            </svg>
          </div>
          <h1 className="mt-4 text-[20px] font-semibold">Auditoría Cash</h1>
          <p className="mt-1 text-[13px] text-muted">Facturas Cashea vs. comunes</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
          <form onSubmit={entrar} className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">Iniciar sesión</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Usa tu usuario y contraseña del sistema de la tienda.</p>
            </div>
            <Campo etiqueta="Usuario">
              <input
                ref={refUsuario}
                className={claseInput}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                spellCheck={false}
                disabled={!lista}
                autoFocus={!!usuario}
              />
            </Campo>
            <Campo etiqueta="Contraseña">
              <CampoClave valor={clave} onCambio={setClave} autoComplete="current-password" autoFocus={!!usuario} />
            </Campo>
            {error && <Error>{error}</Error>}
            <Boton type="submit" variante="primario" className="h-10 w-full justify-center" disabled={!lista || enviando || !usuario.trim() || !clave}>
              {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Entrar
            </Boton>
          </form>
        </div>

        {/* Estado de la conexión */}
        <div className="mt-4 flex items-center justify-between gap-3 px-1 text-[12px] text-ink-2">
          <span className="flex min-w-0 items-center gap-2">
            <Database className="size-3.5 shrink-0 text-muted" />
            <span
              className={cx(
                'size-2 shrink-0 rounded-full',
                conexion.estado === 'probando' && 'animate-pulse bg-muted',
                conexion.estado === 'ok' && (lista ? 'bg-good' : 'bg-[#fab219]'),
                conexion.estado === 'error' && 'bg-critical',
              )}
            />
            <span className="truncate">
              {conexion.estado === 'probando' && 'Conectando…'}
              {conexion.estado === 'ok' && `${conexion.info.baseDatos} · ${conexion.info.host}`}
              {conexion.estado === 'error' && 'Sin conexión a la base de datos'}
            </span>
          </span>
          {conexion.estado !== 'probando' && (
            <button onClick={onConfigurar} className="flex shrink-0 items-center gap-1 font-medium text-accent hover:underline">
              <Settings2 className="size-3.5" /> {lista ? 'Cambiar conexión' : 'Configurar conexión'}
            </button>
          )}
        </div>
        {conexion.estado === 'error' && <p className="mt-2 px-1 text-[11.5px] text-critical">{conexion.mensaje}</p>}
        {conexion.estado === 'ok' && !lista && (
          <p className="mt-2 px-1 text-[11.5px] text-critical">Faltan tablas en la base: {conexion.info.faltantes.join(', ')}</p>
        )}
      </div>
    </div>
  );
}

function Error({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2 text-[12.5px] text-ink">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />
      <span>{children}</span>
    </div>
  );
}
