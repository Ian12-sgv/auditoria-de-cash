import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Resumen } from '../lib/resumen';
import { compacto, entero, monto, porcentaje } from '../lib/formato';
import { Punto, Tarjeta, TituloTarjeta } from './ui';

type Dato = Resumen['porFormaPago'][number];

function Globo({ active, payload, total }: { active?: boolean; payload?: { payload: Dato }[]; total: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[12px] shadow-lg">
      <div className="flex items-center gap-2 font-medium text-ink">
        <Punto color={d.cashea ? 'var(--s2)' : 'var(--s1)'} />
        {d.nombre}
      </div>
      <div className="tabular mt-1 grid grid-cols-[auto_auto] gap-x-4 text-ink-2">
        <span>Monto</span><span className="text-right font-medium text-ink">{monto(d.monto)}</span>
        <span>Pagos</span><span className="text-right">{entero(d.pagos)}</span>
        <span>Participación</span><span className="text-right">{porcentaje(total ? d.monto / total : 0)}</span>
      </div>
    </div>
  );
}

export function GraficoFormasPago({ r }: { r: Resumen }) {
  const datos = r.porFormaPago;
  const alto = Math.max(240, datos.length * 40 + 40);
  return (
    <Tarjeta className="flex flex-col">
      <TituloTarjeta
        titulo="Monto cobrado por forma de pago"
        subtitulo="Suma de pagos en el rango seleccionado"
        extra={
          <div className="flex items-center gap-3 text-[12px] text-ink-2">
            <span className="flex items-center gap-1.5"><Punto color="var(--s1)" />Otras formas</span>
            <span className="flex items-center gap-1.5"><Punto color="var(--s2)" />Cashea</span>
          </div>
        }
      />
      <div className="flex-1 px-3 pb-4" style={{ minHeight: alto }}>
        {datos.length === 0 ? (
          <p className="px-2 py-10 text-center text-[13px] text-muted">No hay pagos en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={alto}>
            <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis
                type="number"
                tickFormatter={compacto}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--axis)' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="nombre"
                width={170}
                interval={0}
                tick={{ fill: 'var(--ink-2)', fontSize: 11.5 }}
                axisLine={{ stroke: 'var(--axis)' }}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--surface-hover)' }}
                content={<Globo total={r.totalCobrado} />}
                isAnimationActive={false}
              />
              <Bar
                dataKey="monto"
                radius={[0, 4, 4, 0]}
                maxBarSize={20}
                label={{ position: 'right', fill: 'var(--ink-2)', fontSize: 11, formatter: (v: unknown) => compacto(Number(v)) }}
              >
                {datos.map((d) => (
                  <Cell key={d.nombre} fill={d.cashea ? 'var(--s2)' : 'var(--s1)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Tarjeta>
  );
}
