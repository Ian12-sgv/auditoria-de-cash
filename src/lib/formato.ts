import type { FilaVenta } from '../types';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmtMonto = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtEntero = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 });
const fmtCompacto = new Intl.NumberFormat('es-VE', { notation: 'compact', maximumFractionDigits: 1 });

export const monto = (v: number | null | undefined) => (v == null ? '—' : fmtMonto.format(v));
export const entero = (v: number) => fmtEntero.format(v);
export const compacto = (v: number) => fmtCompacto.format(v);
export const porcentaje = (v: number) =>
  `${(v * 100).toLocaleString('es-VE', { maximumFractionDigits: 1 })}%`;

export function fecha(v: string) {
  // 'YYYY-MM-DD HH:mm:ss' -> 'DD/MM/YYYY HH:mm'
  const [d, t] = v.split(' ');
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y} ${t?.slice(0, 5) ?? ''}`.trim();
}

export const claveFactura = (f: FilaVenta) =>
  `${f.NumeroFactura}|${f.Serie}|${f.Fecha.slice(0, 10)}|${f.Cliente ?? ''}`;

export const esPagoCashea = (f: FilaVenta) =>
  (f.NombreFormaPago ?? '').trim().toUpperCase().includes('CASHEA');
