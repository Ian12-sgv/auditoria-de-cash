import { ChevronDown, Database, LogOut, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { InfoConexion, Sesion } from '../types';
import { Boton, cx } from './ui';

function MenuUsuario({ sesion, onSalir }: { sesion: Sesion; onSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('mousedown', fuera);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('mousedown', fuera); window.removeEventListener('keydown', esc); };
  }, [abierto]);

  const iniciales = sesion.nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const elegir = (fn: () => void) => () => { setAbierto(false); fn(); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex h-9 items-center gap-2 rounded-lg border border-line pr-2 pl-1 text-left hover:bg-surface-hover"
      >
        <span className="grid size-7 place-items-center rounded-md bg-accent-soft text-[11px] font-semibold text-accent">{iniciales}</span>
        <span className="leading-tight">
          <span className="block max-w-40 truncate text-[12.5px] font-medium text-ink">{sesion.nombre}</span>
          <span className="block text-[11px] text-muted">{sesion.nivel === 'admin' ? 'Administrador' : 'Consulta'}</span>
        </span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {abierto && (
        <div role="menu" className="absolute top-11 right-0 z-40 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="text-[13px] font-medium text-ink">{sesion.nombre}</p>
            <p className="text-[12px] text-muted">Usuario {sesion.codigo}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {sesion.grupos.map((g) => (
                <span key={g.grupo} title={g.nombre} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-2">{g.grupo}</span>
              ))}
            </div>
          </div>
          <div className="p-1">
            <button role="menuitem" onClick={elegir(onSalir)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-ink hover:bg-surface-hover">
              <LogOut className="size-4 text-muted" /> Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type EstadoConexion =
  | { estado: 'probando' }
  | { estado: 'ok'; info: InfoConexion }
  | { estado: 'error'; mensaje: string };

export function Encabezado({
  conexion,
  tema,
  onTema,
  onConexion,
  sesion,
  onSalir,
}: {
  conexion: EstadoConexion;
  tema: 'light' | 'dark';
  onTema: () => void;
  onConexion?: () => void; // solo administradores
  sesion: Sesion;
  onSalir: () => void;
}) {
  const incompleta = conexion.estado === 'ok' && conexion.info.faltantes.length > 0;
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-ink">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V5" /><path d="M4 19h16" /><path d="m8 15 4-5 3 3 5-6" />
          </svg>
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold">Auditoría Cash</h1>
          <p className="text-[12px] text-muted">Facturas Cashea vs. comunes</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onConexion}
          disabled={!onConexion}
          title={
            conexion.estado === 'error'
              ? conexion.mensaje
              : incompleta
                ? `Faltan tablas: ${conexion.info.faltantes.join(', ')}`
                : onConexion ? 'Configurar la conexión' : 'Base de datos conectada'
          }
          className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[12.5px] text-ink-2 enabled:hover:bg-surface-hover disabled:cursor-default"
        >
          <Database className="size-4 text-muted" />
          <span
            className={cx(
              'size-2 rounded-full',
              conexion.estado === 'ok' && (incompleta ? 'bg-[#fab219]' : 'bg-good'),
              conexion.estado === 'error' && 'bg-critical',
              conexion.estado === 'probando' && 'animate-pulse bg-muted',
            )}
          />
          {conexion.estado === 'ok' && (
            <span>
              <span className="font-medium text-ink">{conexion.info.baseDatos}</span>
              <span className="text-muted"> · {conexion.info.host}</span>
            </span>
          )}
          {conexion.estado === 'probando' && <span>Conectando…</span>}
          {conexion.estado === 'error' && <span className="text-critical">Sin conexión</span>}
          {onConexion && <Settings2 className="ml-1 size-4 text-muted" />}
        </button>
        <MenuUsuario sesion={sesion} onSalir={onSalir} />
        <Boton onClick={onTema} title={tema === 'dark' ? 'Tema claro' : 'Tema oscuro'} aria-label="Cambiar tema" className="w-9 justify-center px-0!">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {tema === 'dark' ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </>
            ) : (
              <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
            )}
          </svg>
        </Boton>
      </div>
    </header>
  );
}
