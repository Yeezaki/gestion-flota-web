import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function TabAuditoria() {
  const [historialAcciones, setHistorialAcciones] = useState<any[]>([]);

  const cargarHistorial = async () => {
    try {
      const q = query(collection(db, 'historial_acciones'), orderBy('fecha', 'desc'), limit(100));
      const snap = await getDocs(q);
      setHistorialAcciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error al cargar historial:", error);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
      <div className="p-6 bg-slate-50 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Historial de Auditoría</h2>
        <p className="text-sm text-slate-500 mt-1">Registro inmutable de todas las acciones importantes realizadas en la plataforma.</p>
      </div>

      <div className="hidden md:block overflow-x-auto w-full max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider sticky top-0 shadow-sm">
              <th className="p-4 font-bold">Fecha / Hora</th>
              <th className="p-4 font-bold">Usuario</th>
              <th className="p-4 font-bold">Acción</th>
              <th className="p-4 font-bold">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historialAcciones.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No hay registros de auditoría.</td></tr>
            ) : (
              historialAcciones.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                    {log.fecha ? log.fecha.toDate().toLocaleString() : 'Reciente'}
                  </td>
                  <td className="p-4 font-bold text-slate-700 text-sm">{log.usuario}</td>
                  <td className="p-4">
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-2 py-1 rounded">
                      {log.accion.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{log.detalles}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:hidden gap-4 p-4">
        {historialAcciones.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-slate-400 text-center">No hay registros de auditoría.</div>
        ) : (
          historialAcciones.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-slate-500">{log.fecha ? log.fecha.toDate().toLocaleString() : 'Reciente'}</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-2 py-1 rounded">
                  {log.accion.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-sm font-black text-slate-800">Usuario: {log.usuario}</p>
                <p className="text-sm text-slate-600 mt-1">Detalles: {log.detalles}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}