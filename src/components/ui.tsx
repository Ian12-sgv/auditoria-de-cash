import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface shadow-card', className)}>
      {children}
    </section>
  );
}

export function TituloTarjeta({ titulo, subtitulo, extra }: { titulo: string; subtitulo?: string; extra?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
      <div>
        <h2 className="text-[14px] font-semibold text-ink">{titulo}</h2>
        {subtitulo && <p className="mt-0.5 text-[12px] text-muted">{subtitulo}</p>}
      </div>
      {extra}
    </header>
  );
}

type Variante = 'primario' | 'secundario' | 'fantasma';

export function Boton({
  variante = 'secundario',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium transition-colors [&_svg]:shrink-0',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variante === 'primario' && 'bg-accent text-accent-ink hover:brightness-110',
        variante === 'secundario' && 'border border-line bg-surface text-ink hover:bg-surface-hover',
        variante === 'fantasma' && 'text-ink-2 hover:bg-surface-hover hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Selector({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        'h-9 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink',
        'hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent',
        className,
      )}
    />
  );
}

export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { valor: T; etiqueta: ReactNode }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <div className="inline-flex h-9 items-center rounded-lg border border-line bg-surface-2 p-0.5" role="tablist">
      {opciones.map((o) => (
        <button
          key={o.valor}
          role="tab"
          aria-selected={valor === o.valor}
          onClick={() => onCambio(o.valor)}
          className={cx(
            'inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium transition-colors',
            valor === o.valor ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Punto({ color }: { color: string }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

export { cx };
