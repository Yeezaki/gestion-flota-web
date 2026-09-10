import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export default function TabAgenda() {
  const [citas, setCitas] = useState<any[]>([]);
  const [otSeleccionada, setOtSeleccionada] = useState<any | null>(null);

  const logAccion = async (accion: string, detalles: string) => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: user?.email || 'Desconocido',
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error("Error al guardar en el historial", e);
    }
  };

  const cargarCitas = async () => {
    try {
      const q = query(collection(db, 'citas_taller'), orderBy('fecha', 'desc'));
      const querySnapshot = await getDocs(q);
      setCitas(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    }
  };

  const actualizarEstadoCita = async (idCita: string, nuevoEstado: string, patente: string) => {
    try {
      await updateDoc(doc(db, 'citas_taller', idCita), { estado: nuevoEstado });
      await logAccion('ACTUALIZAR_CITA', `Se cambió a '${nuevoEstado}' la cita del vehículo: ${patente}`);
      cargarCitas();
    } catch (error) {
      console.error("Error actualizando cita:", error);
    }
  };

  const eliminarCita = async (idCita: string, patente: string) => {
    const confirmar = window.confirm("¿Seguro que deseas eliminar esta cita permanentemente?");
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'citas_taller', idCita));
      await logAccion('ELIMINAR_CITA', `Se eliminó la cita médica del vehículo: ${patente}`);
      cargarCitas();
    } catch (error) {
      console.error("Error borrando cita:", error);
    }
  };

  const verOrdenTrabajo = async (idCita: string) => {
    try {
      const q = query(collection(db, 'ordenes_trabajo'), where('idCita', '==', idCita));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setOtSeleccionada(snap.docs[0].data());
      } else {
        alert("No se encontró ninguna Orden de Trabajo asociada a esta cita.");
      }
    } catch (error) {
      console.error(error);
      alert("Error al obtener la Orden de Trabajo.");
    }
  };

  useEffect(() => {
    cargarCitas();
  }, []);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Citas Agendadas y OTs</h2>
          <p className="text-sm text-slate-500 mt-1">Administra las horas reservadas y revisa las Órdenes de Trabajo.</p>
        </div>
        
        {/* VISTA PC */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white text-slate-600 text-sm uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-bold">Fecha / Hora</th>
                <th className="p-4 font-bold">Vehiculo</th>
                <th className="p-4 font-bold">Taller Destino</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {citas.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay citas agendadas.</td></tr>
              ) : (
                citas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{cita.fecha}</span>
                      <span className="text-sm font-medium text-slate-500">{cita.hora}</span>
                    </td>
                    <td className="p-4 font-black text-blue-600 text-lg">{cita.patente}</td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-700">{cita.nombreTallerDestino || cita.tipoTaller || 'Taller Externo'}</div>
                      {cita.direccionCompletaTaller && (
                        <a 
                          href={`https://www.google.com/maps/search/taller+${encodeURIComponent(cita.direccionCompletaTaller)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-blue-500 font-bold hover:text-blue-700 hover:underline flex items-center gap-1 mt-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                          Ubicar en Mapa
                        </a>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        cita.estado === 'pendiente' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                        cita.estado === 'completada' ? 'bg-green-100 text-green-700 border-green-200' : 
                        'bg-red-100 text-red-700 border-red-200'
                      }`}>
                        {cita.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        {cita.estado === 'completada' && (
                          <button onClick={() => verOrdenTrabajo(cita.id)} className="text-xs font-bold px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-200">Ver OT</button>
                        )}
                        {cita.estado === 'pendiente' && (
                          <>
                            <button onClick={() => actualizarEstadoCita(cita.id, 'completada', cita.patente)} className="text-xs font-bold px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200">Completar</button>
                            <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada', cita.patente)} className="text-xs font-bold px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Cancelar</button>
                          </>
                        )}
                        <button onClick={() => eliminarCita(cita.id, cita.patente)} className="text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MOVIL */}
        <div className="flex flex-col md:hidden gap-4 p-4">
          {citas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No hay citas agendadas.</div>
          ) : (
            citas.map((cita) => (
              <div key={cita.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-700">Fecha / Hora</span>
                    <span className="text-right text-slate-800 font-bold">{cita.fecha}<br />{cita.hora}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-700">Vehiculo</span>
                    <span className="font-black text-blue-600 text-lg text-right">{cita.patente}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-700">Taller Destino</span>
                    <span className="text-right text-sm font-bold text-slate-700">
                      {cita.nombreTallerDestino || cita.tipoTaller || 'Taller Externo'}
                      {cita.direccionCompletaTaller && (
                        <a href={`https://www.google.com/maps/search/taller+${encodeURIComponent(cita.direccionCompletaTaller)}`} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-blue-500 font-bold hover:text-blue-700 hover:underline flex items-center justify-end gap-1 mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                          Ubicar en Mapa
                        </a>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-700">Estado</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      cita.estado === 'pendiente' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                      cita.estado === 'completada' ? 'bg-green-100 text-green-700 border-green-200' : 
                      'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {cita.estado.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <span className="font-bold text-slate-700">Acciones</span>
                    <div className="flex flex-wrap justify-end gap-2">
                      {cita.estado === 'completada' && (
                        <button onClick={() => verOrdenTrabajo(cita.id)} className="text-xs font-bold px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-200">Ver OT</button>
                      )}
                      {cita.estado === 'pendiente' && (
                        <>
                          <button onClick={() => actualizarEstadoCita(cita.id, 'completada', cita.patente)} className="text-xs font-bold px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200">Completar</button>
                          <button onClick={() => actualizarEstadoCita(cita.id, 'cancelada', cita.patente)} className="text-xs font-bold px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 border border-slate-200">Cancelar</button>
                        </>
                      )}
                      <button onClick={() => eliminarCita(cita.id, cita.patente)} className="text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200">Eliminar</button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL ORDEN DE TRABAJO */}
      {otSeleccionada && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-800">Orden de Trabajo Guardada</h3>
              <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full">SOLO LECTURA</span>
            </div>
            <p className="text-sm text-slate-500 mb-6">Vehiculo: <span className="font-black text-blue-600 text-lg">{otSeleccionada.patente}</span></p>

            {otSeleccionada.tipoVehiculo === 'Camioneta' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700">Tipo: <span className="font-normal">{otSeleccionada.datos.tipoMantenimiento}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['cambioAceiteGeneral', 'cambioAceiteMotor', 'cambioAceiteTransmision', 'cambioFiltro', 'suspension', 'frenos', 'embrague', 'cajaCambios'].map((item) => {
                    if (!otSeleccionada.datos[item]) return null;
                    return (
                      <div key={item} className="text-xs bg-blue-50 text-blue-700 font-bold p-2 rounded-lg border border-blue-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        {item.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Descripción</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{otSeleccionada.datos.descripcionTrabajo || 'Sin descripción'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{otSeleccionada.datos.observaciones || 'Sin observaciones'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700">Taller/Técnico: <span className="font-normal">{otSeleccionada.datos.empresaTecnico}</span></p>
                  <p className="text-sm font-bold text-slate-700">Horas Parada: <span className="font-normal">{otSeleccionada.datos.horasParada}</span></p>
                </div>
                
                {otSeleccionada.datos.tareas && otSeleccionada.datos.tareas.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tareas Realizadas</h4>
                    <table className="w-full text-left border-collapse text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr><th className="p-2 border border-slate-200">Descripción</th><th className="p-2 border border-slate-200 text-center">Horas</th><th className="p-2 border border-slate-200 text-center">Inicio</th><th className="p-2 border border-slate-200 text-center">Fin</th></tr>
                      </thead>
                      <tbody>
                        {otSeleccionada.datos.tareas.map((t: any, i: number) => (
                          <tr key={i}><td className="p-2 border border-slate-200">{t.descripcion}</td><td className="p-2 border border-slate-200 text-center">{t.horas}</td><td className="p-2 border border-slate-200 text-center">{t.fInicio}</td><td className="p-2 border border-slate-200 text-center">{t.fFin}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {otSeleccionada.datos.repuestos && otSeleccionada.datos.repuestos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Repuestos</h4>
                    <table className="w-full text-left border-collapse text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr><th className="p-2 border border-slate-200 text-center">Cant.</th><th className="p-2 border border-slate-200 text-center">Unidad</th><th className="p-2 border border-slate-200">Descripción</th></tr>
                      </thead>
                      <tbody>
                        {otSeleccionada.datos.repuestos.map((r: any, i: number) => (
                          <tr key={i}><td className="p-2 border border-slate-200 text-center">{r.cant}</td><td className="p-2 border border-slate-200 text-center">{r.unidad}</td><td className="p-2 border border-slate-200">{r.descripcion}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{otSeleccionada.datos.observaciones || 'Sin observaciones'}</p>
                </div>
              </div>
            )}

            <button onClick={() => setOtSeleccionada(null)} className="mt-8 w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}