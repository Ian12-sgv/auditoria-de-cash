import { CreditCard, Receipt, ShoppingBag, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Resumen } from '../lib/resumen';
import { entero, monto, porcentaje } from '../lib/formato';
import { Tarjeta } from './ui';

function Indicador({
  icono,
  etiqueta,
  valor,
  detalle,
  marca,
}: {
  icono: ReactNode;
  etiqueta: string;
  valor: string;
  detalle: ReactNode;
  marca?: string;
}) {
  return (
    <Tarjeta className="relative overflow-hidden px-5 py-4">
      {marca && <span className="absolute inset-y-0 left-0 w-1" style={{ background: marca }} />}
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
        <span className="text-muted">{icono}</span>
        {etiqueta}
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-tight text-ink">{valor}</div>
      <div className="mt-2 text-[12px] text-muted">{detalle}</div>
    </Tarjeta>
  );
}

export function Indicadores({ r }: { r: Resumen }) {
  const pctCashea = r.facturas ? r.facturasCashea / r.facturas : 0;
  const pctMontoCashea = r.totalCobrado ? r.cobradoCashea / r.totalCobrado : 0;
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Indicador
        icono={<Receipt className="size-4" />}
        etiqueta="Facturas"
        valor={entero(r.facturas)}
        detalle={`${entero(r.pagos)} pagos registrados`}
      />
      <Indicador
        icono={<ShoppingBag className="size-4" />}
        etiqueta="Facturas Cashea"
        valor={entero(r.facturasCashea)}
        detalle={`${porcentaje(pctCashea)} del total · ${entero(r.facturasComunes)} comunes`}
        marca="var(--s2)"
      />
      <Indicador
        icono={<Wallet className="size-4" />}
        etiqueta="Total cobrado"
        valor={monto(r.totalCobrado)}
        detalle="Suma de todos los pagos"
      />
      <Indicador
        icono={<CreditCard className="size-4" />}
        etiqueta="Cobrado con Cashea"
        valor={monto(r.cobradoCashea)}
        detalle={`${porcentaje(pctMontoCashea)} del total cobrado`}
        marca="var(--s2)"
      />
    </div>
  );
}

export function IndicadoresCargando() {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Tarjeta key={i} className="px-5 py-4">
          <div className="esqueleto h-4 w-24" />
          <div className="esqueleto mt-3 h-7 w-32" />
          <div className="esqueleto mt-3 h-3 w-40" />
        </Tarjeta>
      ))}
    </div>
  );
}
