import type { Resumen } from '../lib/resumen';
import { entero, monto, porcentaje } from '../lib/formato';
import { Punto, Tarjeta, TituloTarjeta } from './ui';

function BarraDividida({
  titulo,
  cashea,
  comunes,
  fmt,
}: {
  titulo: string;
  cashea: number;
  comunes: number;
  fmt: (v: number) => string;
}) {
  const total = cashea + comunes;
  const pc = total ? cashea / total : 0;
  const segmentos = [
    { nombre: 'Cashea', valor: cashea, pct: pc, color: 'var(--s2)' },
    { nombre: 'Comunes', valor: comunes, pct: total ? 1 - pc : 0, color: 'var(--s1)' },
  ].filter((s) => s.valor > 0);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-ink-2">{titulo}</span>
        <span className="tabular text-[12px] text-muted">Total {fmt(total)}</span>
      </div>
      <div className="flex h-7 gap-[2px] overflow-hidden rounded-md bg-surface-2">
        {segmentos.map((s) => (
          <div
            key={s.nombre}
            title={`${s.nombre}: ${fmt(s.valor)} (${porcentaje(s.pct)})`}
            className="h-full first:rounded-l-md last:rounded-r-md"
            style={{ width: `${s.pct * 100}%`, background: s.color, minWidth: 4 }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[12.5px]">
        <div className="flex items-center gap-2">
          <Punto color="var(--s2)" />
          <span className="text-ink-2">Cashea</span>
          <span className="tabular ml-auto font-medium text-ink">{fmt(cashea)}</span>
          <span className="tabular w-12 text-right text-muted">{porcentaje(pc)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Punto color="var(--s1)" />
          <span className="text-ink-2">Comunes</span>
          <span className="tabular ml-auto font-medium text-ink">{fmt(comunes)}</span>
          <span className="tabular w-12 text-right text-muted">{porcentaje(total ? 1 - pc : 0)}</span>
        </div>
      </div>
    </div>
  );
}

export function Distribucion({ r }: { r: Resumen }) {
  return (
    <Tarjeta>
      <TituloTarjeta titulo="Cashea vs. comunes" subtitulo="Clasificación a nivel de factura" />
      <div className="space-y-6 px-5 pb-5 pt-1">
        <BarraDividida titulo="Cantidad de facturas" cashea={r.facturasCashea} comunes={r.facturasComunes} fmt={entero} />
        <BarraDividida
          titulo="Monto pagado de las facturas"
          cashea={r.montoFacturasCashea}
          comunes={r.montoFacturasComunes}
          fmt={monto}
        />
        <p className="text-[11.5px] leading-relaxed text-muted">
          Una factura es <span className="text-ink-2">Cashea</span> si al menos uno de sus pagos se hizo con la forma
          de pago CASHEA. El monto de una factura Cashea incluye todos sus pagos (también los no Cashea).
        </p>
      </div>
    </Tarjeta>
  );
}
