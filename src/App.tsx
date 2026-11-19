import { CircleAlert, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarraFiltros } from './components/BarraFiltros';
import { DialogoConexion } from './components/DialogoConexion';
import { MenuLateral, type Vista } from './components/MenuLateral';
import { PantallaLogin } from './components/PantallaLogin';
import { VistaUsuarios } from './components/VistaUsuarios';
import { Boton } from './components/ui';
import { Distribucion } from './components/Distribucion';
import { Encabezado, type EstadoConexion } from './components/Encabezado';
import { GraficoFormasPago } from './components/GraficoFormasPago';
import { Indicadores, IndicadoresCargando } from './components/Indicadores';
import { TablaVentas, type FiltroClase } from './components/TablaVentas';
import { MESES } from './lib/formato';
import { calcularResumen } from './lib/resumen';
import type { FilaVenta, Filtro, Sesion } from './types';

const hoy = new Date();
const FILTRO_INICIAL: Filtro = {
  anioDesde: hoy.getFullYear(),
  mesDesde: 1,
  anioHasta: hoy.getFullYear(),
  mesHasta: hoy.getMonth() + 1,
};

const etiquetaRango = (f: Filtro) =>
  `${MESES[f.mesDesde - 1]} ${f.anioDesde} – ${MESES[f.mesHasta - 1]} ${f.anioHasta}`;

export default function App() {
  const [tema, setTema] = useState<'light' | 'dark'>(
    () => (document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light',
  );
  const [conexion, setConexion] = useState<EstadoConexion>({ estado: 'probando' });
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL);
  const [consultado, setConsultado] = useState<Filtro | null>(null);
  const [filas, setFilas] = useState<FilaVenta[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState<string | null>(null);
  const [clase, setClase] = useState<FiltroClase>('todas');
  const [visibles, setVisibles] = useState<FilaVenta[]>([]);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [dialogoConexion, setDialogoConexion] = useState(false);
  const cerrarDialogo = useCallback(() => setDialogoConexion(false), []);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [vista, setVista] = useState<Vista>(() => {
    try {
      const v = localStorage.getItem('vista');
      return v === 'detalle' || v === 'usuarios' ? v : 'dashboard';
    } catch { return 'dashboard'; }
  });
  const cambiarVista = (v: Vista) => {
    setVista(v);
    try { localStorage.setItem('vista', v); } catch { /* sin almacenamiento */ }
  };

  const errorFiltro =
    filtro.anioDesde * 12 + filtro.mesDesde > filtro.anioHasta * 12 + filtro.mesHasta
      ? 'El mes "Desde" no puede ser posterior al mes "Hasta".'
      : null;

  const cambiarTema = () => {
    const t = tema === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('tema', t); } catch { /* sin almacenamiento */ }
    setTema(t);
  };

  const probarConexion = useCallback(async () => {
    setConexion({ estado: 'probando' });
    const r = await window.api.probarConexion();
    setConexion(r.ok ? { estado: 'ok', info: r.data } : { estado: 'error', mensaje: r.error });
    return r.ok && r.data.faltantes.length === 0;
  }, []);

  const consultar = useCallback(async (f: Filtro) => {
    setCargando(true);
    setErrorConsulta(null);
    const r = await window.api.obtenerVentas(f);
    setCargando(false);
    if (r.ok) {
      setFilas(r.data);
      setConsultado(f);
    } else {
      setErrorConsulta(r.error);
    }
  }, []);

  // Al abrir: probar la conexión y recuperar la sesión (si la ventana se recargó).
  useEffect(() => {
    (async () => {
      const ok = await probarConexion();
      const r = await window.api.sesion();
      const s = r.ok ? r.data : null;
      setSesion(s);
      setSesionLista(true);
      if (ok && s) consultar(FILTRO_INICIAL);
    })();
  }, [probarConexion, consultar]);

  const limpiarDatos = () => {
    setFilas([]);
    setVisibles([]);
    setConsultado(null);
    setErrorConsulta(null);
  };

  const alGuardarConexion = async () => {
    setDialogoConexion(false);
    limpiarDatos();
    if ((await probarConexion()) && sesion) consultar(filtro);
  };

  const alEntrar = (s: Sesion) => {
    setSesion(s);
    if (s.nivel !== 'admin' && vista === 'usuarios') cambiarVista('dashboard');
    if (conexion.estado === 'ok' && conexion.info.faltantes.length === 0) consultar(filtro);
  };

  const salir = async () => {
    await window.api.salir();
    setSesion(null);
    limpiarDatos();
  };

  const refrescarSesion = useCallback(async () => {
    const r = await window.api.sesion();
    if (r.ok && r.data) setSesion(r.data);
  }, []);

  const exportar = async () => {
    if (!consultado) return;
    setExportando(true);
    const nombre = `Auditoria_Cashea_${consultado.anioDesde}-${String(consultado.mesDesde).padStart(2, '0')}_a_${consultado.anioHasta}-${String(consultado.mesHasta).padStart(2, '0')}.xlsx`;
    const r = await window.api.exportarExcel(visibles, nombre, { rango: etiquetaRango(consultado) });
    setExportando(false);
    if (!r.ok) setAviso(`No se pudo exportar: ${r.error}`);
    else if (r.data.guardado) setAviso(`Exportado: ${r.data.ruta}`);
    if (r.ok && r.data.guardado) setTimeout(() => setAviso(null), 6000);
  };

  const resumen = useMemo(() => calcularResumen(filas), [filas]);

  // Sin sesión: pantalla de inicio de sesión (con acceso a configurar la conexión si falla).
  if (!sesionLista) return <div className="h-full bg-page" />;
  if (!sesion) {
    return (
      <>
        <PantallaLogin conexion={conexion} onConfigurar={() => setDialogoConexion(true)} onEntrar={alEntrar} />
        <DialogoConexion abierto={dialogoConexion} onCerrar={cerrarDialogo} onGuardado={alGuardarConexion} />
      </>
    );
  }

  const esAdmin = sesion.nivel === 'admin';
  const puedeVer = (v: Vista) =>
    v === 'usuarios' ? esAdmin : v === 'dashboard' ? sesion.vistas.dashboard : sesion.vistas.detalle;
  const ordenVistas: Vista[] = ['dashboard', 'detalle', 'usuarios'];
  const vistaActual: Vista = puedeVer(vista) ? vista : ordenVistas.find(puedeVer) ?? 'dashboard';

  return (
    <div className="flex h-full flex-col">
      <Encabezado
        conexion={conexion}
        tema={tema}
        onTema={cambiarTema}
        onConexion={esAdmin ? () => setDialogoConexion(true) : undefined}
        sesion={sesion}
        onSalir={salir}
      />
      {esAdmin && <DialogoConexion abierto={dialogoConexion} onCerrar={cerrarDialogo} onGuardado={alGuardarConexion} />}

      <div className="flex min-h-0 flex-1">
        <MenuLateral vista={vistaActual} onVista={cambiarVista} registros={filas.length} esAdmin={esAdmin} vistas={sesion.vistas} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {vistaActual === 'usuarios' && (
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <VistaUsuarios sesion={sesion} className="min-h-0 flex-1" onPermisos={refrescarSesion} />
          </div>
        )}

        {/* Zona común de Dashboard y Detalle: filtros y avisos */}
        <div className={vistaActual === 'usuarios' ? 'hidden' : 'flex shrink-0 flex-col gap-4 px-6 pt-6'}>
          <BarraFiltros
            filtro={filtro}
            onFiltro={setFiltro}
            onConsultar={() => consultar(filtro)}
            puedeConsultar={conexion.estado === 'ok' && conexion.info.faltantes.length === 0}
            onExportar={exportar}
            cargando={cargando}
            exportando={exportando}
            puedeExportar={visibles.length > 0}
            error={errorFiltro}
          />

          {(conexion.estado === 'error' || (conexion.estado === 'ok' && conexion.info.faltantes.length > 0)) && (
            <div className="flex items-center gap-3 rounded-xl border border-critical/40 bg-critical-soft px-4 py-3 text-[13px] text-ink">
              <CircleAlert className="size-4 shrink-0 text-critical" />
              <div className="flex-1">
                <p className="font-medium">
                  {conexion.estado === 'error' ? 'No se pudo conectar a la base de datos' : `La base ${conexion.info.baseDatos} no tiene las tablas necesarias`}
                </p>
                <p className="mt-0.5 text-ink-2">
                  {conexion.estado === 'error' ? conexion.mensaje : `Faltan: ${conexion.info.faltantes.join(', ')}`}
                </p>
              </div>
              {esAdmin ? (
                <Boton variante="primario" onClick={() => setDialogoConexion(true)}>
                  <Settings2 className="size-4" />
                  Configurar conexión
                </Boton>
              ) : (
                <span className="text-[12px] text-ink-2">Avisa a un administrador.</span>
              )}
            </div>
          )}

          {errorConsulta && (
            <div className="flex items-start gap-3 rounded-xl border border-critical/40 bg-critical-soft px-4 py-3 text-[13px] text-ink">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical" />
              <div>
                <p className="font-medium">No se pudo consultar la base de datos</p>
                <p className="mt-0.5 text-ink-2">{errorConsulta}</p>
              </div>
            </div>
          )}

          {consultado && (
            <p className="text-[12.5px] text-ink-2">
              Mostrando <span className="font-medium text-ink">{etiquetaRango(consultado)}</span>
              {filas[0]?.NombreEmpresa && <> · {filas[0].NombreEmpresa}</>}
              {conexion.estado === 'ok' && <span className="text-muted"> · base {conexion.info.baseDatos}</span>}
              {cargando && <span className="text-muted"> · actualizando…</span>}
            </p>
          )}
        </div>

        {/* Apartado: Dashboard (se desplaza como página) */}
        {vistaActual === 'dashboard' && (
          <div className="min-h-0 flex-1 overflow-auto px-6 pt-4 pb-6">
            <div className="flex flex-col gap-4">
              {cargando && !consultado ? <IndicadoresCargando /> : <Indicadores r={resumen} />}
              <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <GraficoFormasPago r={resumen} />
                <Distribucion r={resumen} />
              </div>
            </div>
          </div>
        )}

        {/* Apartado: Detalle (la tabla ocupa el alto disponible y se desplaza por dentro).
            Se mantiene montado para que "Exportar a Excel" use los filtros de la tabla. */}
        <div className={vistaActual === 'detalle' ? 'flex min-h-0 flex-1 flex-col px-6 pt-4 pb-6' : 'hidden'}>
          <TablaVentas
            className="min-h-0 flex-1"
            filas={filas}
            clase={clase}
            onClase={setClase}
            onFilasVisibles={setVisibles}
          />
        </div>
      </main>
      </div>

      {aviso && (
        <div className="fixed right-6 bottom-6 max-w-md rounded-lg border border-line bg-surface px-4 py-3 text-[12.5px] text-ink shadow-xl">
          {aviso}
          <button className="ml-3 text-muted hover:text-ink" onClick={() => setAviso(null)}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
