import { LayoutDashboard, TableProperties, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { entero } from '../lib/formato';
import { cx } from './ui';

export type Vista = 'dashboard' | 'detalle' | 'usuarios';

function Item({
  activo,
  icono,
  etiqueta,
  insignia,
  onClick,
}: {
  activo: boolean;
  icono: ReactNode;
  etiqueta: string;
  insignia?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
      className={cx(
        'relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition-colors [&_svg]:shrink-0',
        activo ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-surface-hover hover:text-ink',
      )}
    >
      {activo && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent" />}
      <span className={activo ? 'text-accent' : 'text-muted'}>{icono}</span>
      <span className="flex-1">{etiqueta}</span>
      {insignia && (
        <span className="tabular rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{insignia}</span>
      )}
    </button>
  );
}

export function MenuLateral({
  vista,
  onVista,
  registros,
  esAdmin,
  vistas,
}: {
  vista: Vista;
  onVista: (v: Vista) => void;
  registros: number;
  esAdmin: boolean;
  vistas: { dashboard: boolean; detalle: boolean };
}) {
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-line bg-surface px-3 py-4" aria-label="Apartados">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Auditoría Cashea</p>
      {vistas.dashboard && (
        <Item
          activo={vista === 'dashboard'}
          icono={<LayoutDashboard className="size-[18px]" />}
          etiqueta="Dashboard"
          onClick={() => onVista('dashboard')}
        />
      )}
      {vistas.detalle && (
        <Item
          activo={vista === 'detalle'}
          icono={<TableProperties className="size-[18px]" />}
          etiqueta="Detalle de pagos"
          insignia={registros ? entero(registros) : undefined}
          onClick={() => onVista('detalle')}
        />
      )}
      {esAdmin && (
        <>
          <p className="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Administración</p>
          <Item
            activo={vista === 'usuarios'}
            icono={<UsersRound className="size-[18px]" />}
            etiqueta="Usuarios"
            onClick={() => onVista('usuarios')}
          />
        </>
      )}
    </nav>
  );
}
