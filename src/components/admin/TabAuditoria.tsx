import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface RegistroAuditoria {
  id: string;
  usuario?: string;
  rol?: 'taller' | 'prevencion' | 'torre' | 'admin' | string;
  accion: string;
  detalles: string;
  fecha?: any;
}

export default function TabAuditoria() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  // Filtros de Auditoría
  const [filtroRol, setFiltroRol] = useState<string>('todos');
  const [busquedaTexto, setBusquedaTexto] = useState<string>('');

  // Paginación progresiva (inicia en 20 y suma de a 20)
  const [limiteVisible, setLimiteVisible] = useState<number>(20);

  useEffect(() => {
    // Escucha en tiempo real los últimos registros
    const q = query(
      collection(db, 'historial_acciones'),
      orderBy('fecha', 'desc'),
      limit(300)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as RegistroAuditoria[];
        setRegistros(data);
        setCargando(false);
      },
      (error) => {
        console.error('Error al escuchar auditoria:', error);
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Determinar rol si no viene explícito en el registro para clasificarlo
  const inferirRol = (reg: RegistroAuditoria): string => {
    if (reg.rol) return reg.rol.toLowerCase();
    const texto = `${reg.accion} ${reg.detalles} ${reg.usuario}`.toLowerCase();
    if (texto.includes('taller') || texto.includes('mantenimiento') || texto.includes('torque') || texto.includes('cita')) return 'taller';
    if (texto.includes('alcotest') || texto.includes('droga') || texto.includes('procedimiento') || texto.includes('fatiga') || texto.includes('pvt') || texto.includes('prevencion')) return 'prevencion';
    if (texto.includes('gps') || texto.includes('velocidad') || texto.includes('telemetria') || texto.includes('torre')) return 'torre';
    return 'admin';
  };

  const registrosFiltrados = registros.filter((reg) => {
    const rolDetectado = inferirRol(reg);
    
    // El conductor se excluye de la auditoría de modificaciones
    if (rolDetectado === 'conductor') return false;

    const cumpleRol = filtroRol === 'todos' || rolDetectado === filtroRol.toLowerCase();
    const queryStr = busquedaTexto.toLowerCase();
    const cumpleTexto =
      !queryStr ||
      (reg.usuario && reg.usuario.toLowerCase().includes(queryStr)) ||
      (reg.accion && reg.accion.toLowerCase().includes(queryStr)) ||
      (reg.detalles && reg.detalles.toLowerCase().includes(queryStr));

    return cumpleRol && cumpleTexto;
  });

  // Rebanada actual según el límite visible (20, 40, 60...)
  const registrosVisibles = registrosFiltrados.slice(0, limiteVisible);
  const quedanMasRegistros = registrosFiltrados.length > limiteVisible;

  const handleMostrarMas = () => {
    setLimiteVisible((prev) => prev + 20);
  };

  const getBadgeRol = (rol: string) => {
    switch (rol) {
      case 'taller':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'prevencion':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'torre':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Registro General de Auditoría
            </h2>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200">
              {registrosFiltrados.length} eventos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Trazabilidad de modificaciones y operaciones de Taller, Prevención, Torre y Administración.
          </p>
        </div>

        {/* Controles de filtrado y búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            placeholder="Buscar por usuario, acción o detalle..."
            value={busquedaTexto}
            onChange={(e) => {
              setBusquedaTexto(e.target.value);
              setLimiteVisible(20); // Reiniciar a 20 al realizar búsquedas
            }}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
          />

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="select-filtro-auditoria" className="text-xs font-bold text-slate-600">
              Vista:
            </label>
            <select
              id="select-filtro-auditoria"
              value={filtroRol}
              onChange={(e) => {
                setFiltroRol(e.target.value);
                setLimiteVisible(20); // Reiniciar a 20 al cambiar de vista
              }}
              className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todas las Vistas Operativas</option>
              <option value="taller">Taller Mecánico</option>
              <option value="prevencion">Prevención de Riesgos</option>
              <option value="torre">Torre de Control</option>
              <option value="admin">Administración Central</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3.5">Fecha y Hora</th>
              <th className="p-3.5">Módulo / Rol</th>
              <th className="p-3.5">Usuario Responsable</th>
              <th className="p-3.5">Acción Ejecutada</th>
              <th className="p-3.5">Detalles del Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cargando ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400">
                  Cargando eventos de auditoría...
                </td>
              </tr>
            ) : registrosVisibles.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500 font-medium">
                  No se encontraron acciones registradas para los filtros aplicados.
                </td>
              </tr>
            ) : (
              registrosVisibles.map((item) => {
                const rolCalculado = inferirRol(item);
                const fechaFormateada = item.fecha?.toDate
                  ? item.fecha.toDate().toLocaleString('es-CL')
                  : item.fecha
                  ? new Date(item.fecha).toLocaleString('es-CL')
                  : 'Fecha no registrada';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {fechaFormateada}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${getBadgeRol(rolCalculado)}`}>
                        {rolCalculado === 'admin' ? 'Administración' : rolCalculado}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {item.usuario || 'Sistema / Anónimo'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-700 font-semibold">
                      {item.accion}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-md break-words leading-relaxed">
                      {item.detalles}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Botón Mostrar Más y contador de visualización */}
      {!cargando && registrosFiltrados.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando <strong>{registrosVisibles.length}</strong> de <strong>{registrosFiltrados.length}</strong> registros
          </span>

          {quedanMasRegistros && (
            <button
              type="button"
              onClick={handleMostrarMas}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all shadow-sm"
            >
              Mostrar más (+20)
            </button>
          )}
        </div>
      )}
    </div>
  );
}