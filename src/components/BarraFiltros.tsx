import { ArrowRight, FileSpreadsheet, LoaderCircle, Play } from 'lucide-react';
import type { Filtro } from '../types';
import { MESES } from '../lib/formato';
import { Boton, Selector, Tarjeta } from './ui';

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: anioActual - 2018 + 2 }, (_, i) => 2018 + i).reverse();

function SelectorMes({
  etiqueta,
  anio,
  mes,
  onCambio,
}: {
  etiqueta: string;
  anio: number;
  mes: number;
  onCambio: (anio: number, mes: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{etiqueta}</span>
      <div className="flex gap-1.5">
        <Selector value={mes} onChange={(e) => onCambio(anio, Number(e.target.value))} className="w-36" aria-label={`${etiqueta}: mes`}>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </Selector>
        <Selector value={anio} onChange={(e) => onCambio(Number(e.target.value), mes)} className="w-24" aria-label={`${etiqueta}: año`}>
          {ANIOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Selector>
      </div>
    </div>
  );
}

export function BarraFiltros({
  filtro,
  onFiltro,
  onConsultar,
  puedeConsultar,
  onExportar,
  cargando,
  exportando,
  puedeExportar,
  error,
}: {
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  onConsultar: () => void;
  puedeConsultar: boolean;
  onExportar: () => void;
  cargando: boolean;
  exportando: boolean;
  puedeExportar: boolean;
  error: string | null;
}) {
  return (
    <Tarjeta className="px-5 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <SelectorMes
            etiqueta="Desde"
            anio={filtro.anioDesde}
            mes={filtro.mesDesde}
            onCambio={(anioDesde, mesDesde) => onFiltro({ ...filtro, anioDesde, mesDesde })}
          />
          <ArrowRight className="mb-2.5 size-4 text-muted" />
          <SelectorMes
            etiqueta="Hasta"
            anio={filtro.anioHasta}
            mes={filtro.mesHasta}
            onCambio={(anioHasta, mesHasta) => onFiltro({ ...filtro, anioHasta, mesHasta })}
          />
          <Boton variante="primario" onClick={onConsultar} disabled={cargando || !!error || !puedeConsultar} className="ml-1">
            {cargando ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
            {cargando ? 'Consultando…' : 'Consultar'}
          </Boton>
        </div>
        <Boton onClick={onExportar} disabled={!puedeExportar || exportando}>
          {exportando ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
          Exportar a Excel
        </Boton>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-critical">{error}</p>}
    </Tarjeta>
  );
}
