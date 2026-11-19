const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Sesión
  sesion: () => ipcRenderer.invoke('auth:sesion'),
  entrar: (usuario, clave) => ipcRenderer.invoke('auth:entrar', { usuario, clave }),
  cambiarClave: (actual, nueva) => ipcRenderer.invoke('auth:cambiarClave', { actual, nueva }),
  salir: () => ipcRenderer.invoke('auth:salir'),
  // Usuarios (administradores)
  listarUsuarios: () => ipcRenderer.invoke('usuarios:listar'),
  establecerClave: (codigo, clave) => ipcRenderer.invoke('usuarios:establecerClave', { codigo, clave }),
  restablecerClave: (codigo) => ipcRenderer.invoke('usuarios:restablecer', codigo),
  obtenerPermisosGrupos: () => ipcRenderer.invoke('permisos:gruposObtener'),
  guardarPermisoGrupo: (grupo, valor) => ipcRenderer.invoke('permisos:guardarGrupo', { grupo, valor }),
  // Datos
  probarConexion: () => ipcRenderer.invoke('db:probar'),
  obtenerVentas: (filtro) => ipcRenderer.invoke('db:ventas', filtro),
  exportarExcel: (filas, nombre, meta) => ipcRenderer.invoke('excel:exportar', { filas, nombre, meta }),
  // Conexión
  obtenerConfig: () => ipcRenderer.invoke('config:obtener'),
  listarBases: (config) => ipcRenderer.invoke('config:listarBases', config),
  probarConfig: (config) => ipcRenderer.invoke('config:probar', config),
  guardarConfig: (config) => ipcRenderer.invoke('config:guardar', config),
});
