export type Clasificacion = 'Factura Cashea' | 'Facturas Comunes';

export interface FilaVenta {
  CodigoEmpresa: string | null;
  IDEmpresa: string | null;
  NombreEmpresa: string | null;
  NumeroFactura: number;
  Serie: string;
  Fecha: string; // 'YYYY-MM-DD HH:mm:ss'
  Vendedor: string | null;
  Cliente: string | null;
  FormaPago: number | null;
  TotalMercancia: number | null;
  TotalDescuento: number | null;
  Usuario: string | null;
  Status: number | null;
  NumeroOrden: number | null;
  TotalPago: number | null;
  TotalDolares: number | null;
  TasaCambio: number | null;
  Estacion: string | null;
  TotalDolaresE: number | null;
  TasaIGTF: number | null;
  MontoIGTF: number | null;
  BaseImponibleIGTF: number | null;
  FormaPagoPago: number | null;
  NombreFormaPago: string | null;
  Documento: string | null;
  Aprobacion: string | null;
  Banco: string | null;
  NombreBanco: string | null;
  PuntoVenta: string | null;
  NombrePuntoVenta: string | null;
  Monto: number | null;
  MontoDivisa: number | null;
  ClasificacionFactura: Clasificacion;
}

export interface Filtro {
  anioDesde: number;
  mesDesde: number;
  anioHasta: number;
  mesHasta: number;
}

export interface InfoConexion {
  baseDatos: string;
  servidor: string;
  version: string;
  host: string;
  faltantes: string[]; // tablas requeridas que no existen en la base
}

export interface ConfigConexion {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string; // vacío = conservar la guardada
  encrypt: boolean;
  trustServerCertificate: boolean;
}

export interface BaseDisponible {
  nombre: string;
  compatible: boolean | null; // null = no se pudo revisar
}

export type Nivel = 'admin' | 'consulta';

export interface Grupo {
  grupo: string;
  nombre: string;
}

export interface Vistas {
  dashboard: boolean;
  detalle: boolean;
}

export type VistaPermiso = 'ninguno' | 'ambos' | 'dashboard' | 'detalle';

export interface PermisoGrupo {
  grupo: string;
  nombre: string;
  permiso: VistaPermiso;
  admin: boolean;
}

export interface Sesion {
  codigo: string;
  nombre: string;
  nivel: Nivel;
  grupos: Grupo[];
  vistas: Vistas;
}

export type RespuestaEntrar = { estado: 'ok'; sesion: Sesion };

export interface UsuarioSistema {
  codigo: string;
  nombre: string;
  status: number;
  grupos: Grupo[];
  nivel: Nivel | null;
  tieneClave: boolean;
  vistas: Vistas;
}

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

declare global {
  interface Window {
    api: {
      sesion: () => Promise<Resultado<Sesion | null>>;
      entrar: (usuario: string, clave: string) => Promise<Resultado<RespuestaEntrar>>;
      cambiarClave: (actual: string, nueva: string) => Promise<Resultado<true>>;
      salir: () => Promise<Resultado<true>>;
      listarUsuarios: () => Promise<Resultado<UsuarioSistema[]>>;
      establecerClave: (codigo: string, clave: string) => Promise<Resultado<true>>;
      restablecerClave: (codigo: string) => Promise<Resultado<true>>;
      obtenerPermisosGrupos: () => Promise<Resultado<PermisoGrupo[]>>;
      guardarPermisoGrupo: (grupo: string, valor: VistaPermiso) => Promise<Resultado<VistaPermiso>>;
      probarConexion: () => Promise<Resultado<InfoConexion>>;
      obtenerVentas: (f: Filtro) => Promise<Resultado<FilaVenta[]>>;
      exportarExcel: (
        filas: FilaVenta[],
        nombre: string,
        meta?: { rango: string },
      ) => Promise<Resultado<{ guardado: boolean; ruta?: string }>>;
      obtenerConfig: () => Promise<Resultado<ConfigConexion & { tienePassword: boolean }>>;
      listarBases: (c: ConfigConexion) => Promise<Resultado<BaseDisponible[]>>;
      probarConfig: (c: ConfigConexion) => Promise<Resultado<InfoConexion>>;
      guardarConfig: (c: ConfigConexion) => Promise<Resultado<true>>;
    };
  }
}
