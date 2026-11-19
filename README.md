# auditoria-de-cash

Auditoría Cash — aplicación de escritorio (Electron + React) para auditar facturas
**Cashea vs. comunes** a partir de la base de datos del punto de venta (SQL Server).

## Características

- **Dashboard**: indicadores y gráficos (monto por forma de pago, Cashea vs. comunes).
- **Detalle de pagos**: tabla con la consulta de ventas + pagos, filtros, búsqueda y exportación a Excel.
- **Inicio de sesión** con los usuarios y contraseñas del sistema del POS (tablas `USUARIOS` / `USUARIOGRUPO`).
- **Permisos por grupo**: un administrador decide qué grupo ve Dashboard, Detalle o ambos.
- **Configuración de conexión** dentro de la app (servidor, base, usuario; contraseña cifrada por equipo).

## Requisitos

- Node.js 18+ (desarrollo).
- Acceso de red a un SQL Server con la base del POS.

## Desarrollo

```bash
npm install
npm run dev     # app en modo desarrollo
npm start       # compila y abre la app
```

La conexión se configura dentro de la app (se guarda cifrada en `%APPDATA%`), o como
punto de partida en un `config.json` en la raíz (no versionado).

## Generar el instalador (.exe)

```bash
npm run dist
```

Genera el instalador NSIS en `release/`. Al instalarlo en otra PC, se configura la
conexión en el primer uso.

## Estructura

- `electron/` — proceso principal: conexión SQL, login, permisos, codificación de claves del POS.
- `src/` — interfaz (React + Tailwind).
- `build/config.dist.json` — plantilla de conexión incluida en el instalador.
