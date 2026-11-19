import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FilaVenta } from '../types';
import { entero, fecha, monto } from '../lib/formato';
import { Boton, Punto, Segmentado, Selector, Tarjeta, TituloTarjeta, cx } from './ui';

export type FiltroClase = 'todas' | 'cashea' | 'comunes';

const num = (v: unknown) => <span className="tabular">{monto(v as number | null)}</span>;
const txt = (v: unknown) => (v == null || v === '' ? <span className="text-muted">—</span> : String(v));

const COLUMNAS: ColumnDef<FilaVenta>[] = [
  { accessorKey: 'Fecha', header: 'Fecha', cell: (c) => <span className="tabular whitespace-nowrap">{fecha(c.getValue<string>())}</span> },
  { accessorKey: 'NumeroFactura', header: 'Factura', cell: (c) => <span className="tabular font-medium">{c.getValue<number>()}</span> },
  { accessorKey: 'Serie', header: 'Serie', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Cliente', header: 'Cliente', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Vendedor', header: 'Vendedor', cell: (c) => txt(c.getValue()) },
  {
    accessorKey: 'NombreFormaPago',
    header: 'Forma de pago',
    cell: (c) => txt(c.getValue()),
  },
  { accessorKey: 'NombreBanco', header: 'Banco', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'NombrePuntoVenta', header: 'Punto de venta', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Documento', header: 'Documento', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Aprobacion', header: 'Aprobación', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Monto', header: 'Monto', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'MontoDivisa', header: 'Monto divisa', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'TotalPago', header: 'Total factura', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'TasaCambio', header: 'Tasa', cell: (c) => num(c.getValue()), meta: { num: true } },
  {
    accessorKey: 'ClasificacionFactura',
    header: 'Clasificación',
    cell: (c) => {
      const cashea = c.getValue<string>() === 'Factura Cashea';
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium text-ink">
          <Punto color={cashea ? 'var(--s2)' : 'var(--s1)'} />
          {cashea ? 'Cashea' : 'Común'}
        </span>
      );
    },
  },
  // Columnas adicionales (ocultas por defecto)
  { accessorKey: 'CodigoEmpresa', header: 'Código empresa', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'IDEmpresa', header: 'ID empresa', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'NombreEmpresa', header: 'Empresa', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'FormaPago', header: 'Forma pago venta', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'TotalMercancia', header: 'Total mercancía', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'TotalDescuento', header: 'Total descuento', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'Usuario', header: 'Usuario', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Status', header: 'Status', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'NumeroOrden', header: 'N° orden', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'TotalDolares', header: 'Total dólares', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'Estacion', header: 'Estación', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'TotalDolaresE', header: 'Total dólares E', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'TasaIGTF', header: 'Tasa IGTF', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'MontoIGTF', header: 'Monto IGTF', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'BaseImponibleIGTF', header: 'Base imp. IGTF', cell: (c) => num(c.getValue()), meta: { num: true } },
  { accessorKey: 'FormaPagoPago', header: 'Cód. forma pago', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'Banco', header: 'Cód. banco', cell: (c) => txt(c.getValue()) },
  { accessorKey: 'PuntoVenta', header: 'Cód. punto venta', cell: (c) => txt(c.getValue()) },
];

const OCULTAS: VisibilityState = Object.fromEntries(
  COLUMNAS.slice(15).map((c) => [(c as { accessorKey: string }).accessorKey, false]),
);

export function TablaVentas({
  className,
  filas,
  clase,
  onClase,
  onFilasVisibles,
}: {
  className?: string;
  filas: FilaVenta[];
  clase: FiltroClase;
  onClase: (c: FiltroClase) => void;
  onFilasVisibles: (f: FilaVenta[]) => void;
}) {
  const [orden, setOrden] = useState<SortingState>([]);
  const [busqueda, setBusqueda] = useState('');
  const [todas, setTodas] = useState(false);

  const datos = useMemo(
    () =>
      clase === 'todas'
        ? filas
        : filas.filter((f) => (clase === 'cashea') === (f.ClasificacionFactura === 'Factura Cashea')),
    [filas, clase],
  );

  const tabla = useReactTable({
    data: datos,
    columns: COLUMNAS,
    state: { sorting: orden, globalFilter: busqueda, columnVisibility: todas ? {} : OCULTAS },
    onSortingChange: setOrden,
    onGlobalFilterChange: setBusqueda,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const filtradas = tabla.getPrePaginationRowModel().rows;
  useEffect(() => {
    onFilasVisibles(filtradas.map((r) => r.original));
  }, [filtradas, onFilasVisibles]);

  const { pageIndex, pageSize } = tabla.getState().pagination;

  // Al cambiar de página, de filtro o de datos, volver arriba de la tabla.
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contenedor.current?.scrollTo({ top: 0 });
  }, [pageIndex, pageSize, filtradas]);
  const desde = filtradas.length ? pageIndex * pageSize + 1 : 0;
  const hasta = Math.min((pageIndex + 1) * pageSize, filtradas.length);

  return (
    <Tarjeta className={cx('flex min-h-0 flex-col overflow-hidden', className)}>
      <TituloTarjeta
        titulo="Detalle de pagos por factura"
        subtitulo="Una fila por cada pago registrado en la factura"
        extra={
          <div className="flex items-center gap-2">
            <Segmentado<FiltroClase>
              valor={clase}
              onCambio={onClase}
              opciones={[
                { valor: 'todas', etiqueta: 'Todas' },
                { valor: 'cashea', etiqueta: <><Punto color="var(--s2)" />Cashea</> },
                { valor: 'comunes', etiqueta: <><Punto color="var(--s1)" />Comunes</> },
              ]}
            />
            <label className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar factura, cliente, documento…"
                className="h-9 w-72 rounded-lg border border-line bg-surface pr-3 pl-9 text-[13px] text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
              />
            </label>
            <Boton onClick={() => setTodas((t) => !t)} className={cx(todas && 'bg-accent-soft')}>
              <Columns3 className="size-4" />
              {todas ? 'Columnas principales' : 'Todas las columnas'}
            </Boton>
          </div>
        }
      />

      {/* Contenedor con scroll propio (vertical y horizontal): las barras quedan siempre a la vista. */}
      <div ref={contenedor} className="seleccionable min-h-0 flex-1 overflow-auto border-t border-line">
        <table className="w-full border-separate border-spacing-0 text-[12.5px]">
          <thead className="sticky top-0 z-10">
            {tabla.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const esNum = (h.column.columnDef.meta as { num?: boolean } | undefined)?.num;
                  const dir = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cx(
                        'cursor-pointer whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2.5 font-medium text-ink-2 select-none hover:text-ink',
                        esNum ? 'text-right' : 'text-left',
                      )}
                    >
                      <span className={cx('inline-flex items-center gap-1', esNum && 'flex-row-reverse')}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === 'asc' && <ArrowUp className="size-3.5" />}
                        {dir === 'desc' && <ArrowDown className="size-3.5" />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tabla.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-hover">
                {row.getVisibleCells().map((cell) => {
                  const esNum = (cell.column.columnDef.meta as { num?: boolean } | undefined)?.num;
                  return (
                    <td
                      key={cell.id}
                      className={cx('whitespace-nowrap border-b border-line px-3 py-2 text-ink', esNum && 'text-right')}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={tabla.getVisibleLeafColumns().length} className="px-3 py-12 text-center text-muted">
                  {filas.length === 0 ? 'No hay ventas en el rango seleccionado.' : 'Ningún registro coincide con el filtro.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-line px-5 py-2 text-[12px] text-ink-2">
        <div className="flex items-center gap-4">
          <span className="tabular">
            {filtradas.length ? `${entero(desde)}–${entero(hasta)} de ${entero(filtradas.length)} registros` : '0 registros'}
          </span>
          <label className="flex items-center gap-2">
            Filas por página
            <Selector
              value={pageSize}
              onChange={(e) => tabla.setPageSize(Number(e.target.value))}
              className="h-8 w-20 text-[12px]"
            >
              {[50, 100, 200, 500].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Selector>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Boton variante="fantasma" className="h-8 w-8 justify-center px-0!" onClick={() => tabla.previousPage()} disabled={!tabla.getCanPreviousPage()} aria-label="Página anterior">
            <ChevronLeft className="size-4" />
          </Boton>
          <span className="tabular px-2">
            Página {pageIndex + 1} de {Math.max(1, tabla.getPageCount())}
          </span>
          <Boton variante="fantasma" className="h-8 w-8 justify-center px-0!" onClick={() => tabla.nextPage()} disabled={!tabla.getCanNextPage()} aria-label="Página siguiente">
            <ChevronRight className="size-4" />
          </Boton>
        </div>
      </footer>
    </Tarjeta>
  );
}
