import type { FilaVenta } from '../types';
import { claveFactura, esPagoCashea } from './formato';

export interface Resumen {
  facturas: number;
  facturasCashea: number;
  facturasComunes: number;
  pagos: number;
  totalCobrado: number;
  cobradoCashea: number;
  montoFacturasCashea: number;
  montoFacturasComunes: number;
  porFormaPago: { nombre: string; monto: number; pagos: number; cashea: boolean }[];
}

export function calcularResumen(filas: FilaVenta[]): Resumen {
  const facturas = new Set<string>();
  const cashea = new Set<string>();
  const formas = new Map<string, { nombre: string; monto: number; pagos: number; cashea: boolean }>();
  let pagos = 0, totalCobrado = 0, cobradoCashea = 0, montoFacturasCashea = 0, montoFacturasComunes = 0;

  for (const f of filas) {
    const k = claveFactura(f);
    facturas.add(k);
    const m = Number(f.Monto) || 0;
    if (f.ClasificacionFactura === 'Factura Cashea') {
      cashea.add(k);
      montoFacturasCashea += m;
    } else {
      montoFacturasComunes += m;
    }
    if (f.NombreFormaPago == null) continue; // venta sin pagos registrados
    pagos++;
    totalCobrado += m;
    const pc = esPagoCashea(f);
    if (pc) cobradoCashea += m;
    const nombre = f.NombreFormaPago.trim();
    const g = formas.get(nombre) ?? { nombre, monto: 0, pagos: 0, cashea: pc };
    g.monto += m;
    g.pagos++;
    formas.set(nombre, g);
  }

  return {
    facturas: facturas.size,
    facturasCashea: cashea.size,
    facturasComunes: facturas.size - cashea.size,
    pagos,
    totalCobrado,
    cobradoCashea,
    montoFacturasCashea,
    montoFacturasComunes,
    porFormaPago: [...formas.values()].sort((a, b) => b.monto - a.monto),
  };
}
