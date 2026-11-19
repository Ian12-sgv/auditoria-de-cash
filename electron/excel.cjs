const ExcelJS = require('exceljs');

const COLUMNAS = [
  ['CodigoEmpresa', 'Código empresa', 14],
  ['IDEmpresa', 'ID empresa', 14],
  ['NombreEmpresa', 'Empresa', 30],
  ['NumeroFactura', 'Factura', 10],
  ['Serie', 'Serie', 12],
  ['Fecha', 'Fecha', 18],
  ['Vendedor', 'Vendedor', 12],
  ['Cliente', 'Cliente', 12],
  ['FormaPago', 'Forma pago (venta)', 10],
  ['TotalMercancia', 'Total mercancía', 14, 'n'],
  ['TotalDescuento', 'Total descuento', 14, 'n'],
  ['Usuario', 'Usuario', 12],
  ['Status', 'Status', 8],
  ['NumeroOrden', 'N° orden', 10],
  ['TotalPago', 'Total pago', 14, 'n'],
  ['TotalDolares', 'Total dólares', 14, 'n'],
  ['TasaCambio', 'Tasa cambio', 12, 'n'],
  ['Estacion', 'Estación', 12],
  ['TotalDolaresE', 'Total dólares E', 14, 'n'],
  ['TasaIGTF', 'Tasa IGTF', 10, 'n'],
  ['MontoIGTF', 'Monto IGTF', 12, 'n'],
  ['BaseImponibleIGTF', 'Base imponible IGTF', 16, 'n'],
  ['FormaPagoPago', 'Cód. forma pago', 10],
  ['NombreFormaPago', 'Forma de pago', 20],
  ['Documento', 'Documento', 14],
  ['Aprobacion', 'Aprobación', 12],
  ['Banco', 'Cód. banco', 10],
  ['NombreBanco', 'Banco', 22],
  ['PuntoVenta', 'Cód. punto venta', 14],
  ['NombrePuntoVenta', 'Punto de venta', 22],
  ['Monto', 'Monto', 14, 'n'],
  ['MontoDivisa', 'Monto divisa', 14, 'n'],
  ['ClasificacionFactura', 'Clasificación', 18],
];

function estilizarEncabezado(hoja) {
  const fila = hoja.getRow(1);
  fila.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF256ABF' } };
  fila.alignment = { vertical: 'middle' };
  fila.height = 20;
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
}

async function exportarExcel(filas, ruta, meta) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Auditoría Cash';
  libro.created = new Date();

  // Hoja de detalle
  const detalle = libro.addWorksheet('Detalle');
  detalle.columns = COLUMNAS.map(([key, header, width, tipo]) => ({
    key, header, width, style: tipo === 'n' ? { numFmt: '#,##0.00' } : {},
  }));
  for (const f of filas) detalle.addRow(f);
  estilizarEncabezado(detalle);
  detalle.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

  // Hoja de resumen por forma de pago
  const resumen = libro.addWorksheet('Resumen');
  resumen.columns = [
    { key: 'forma', header: 'Forma de pago', width: 26 },
    { key: 'pagos', header: 'Pagos', width: 10 },
    { key: 'monto', header: 'Monto', width: 18, style: { numFmt: '#,##0.00' } },
  ];
  const grupos = new Map();
  for (const f of filas) {
    const k = f.NombreFormaPago ?? 'Sin pago registrado';
    const g = grupos.get(k) ?? { forma: k, pagos: 0, monto: 0 };
    g.pagos += f.NombreFormaPago ? 1 : 0;
    g.monto += Number(f.Monto) || 0;
    grupos.set(k, g);
  }
  [...grupos.values()].sort((a, b) => b.monto - a.monto).forEach((g) => resumen.addRow(g));
  const total = resumen.addRow({
    forma: 'TOTAL',
    pagos: [...grupos.values()].reduce((s, g) => s + g.pagos, 0),
    monto: [...grupos.values()].reduce((s, g) => s + g.monto, 0),
  });
  total.font = { bold: true };
  estilizarEncabezado(resumen);
  if (meta?.rango) {
    resumen.getCell('E1').value = 'Rango';
    resumen.getCell('E1').font = { bold: true };
    resumen.getCell('F1').value = meta.rango;
  }

  await libro.xlsx.writeFile(ruta);
}

module.exports = { exportarExcel };
