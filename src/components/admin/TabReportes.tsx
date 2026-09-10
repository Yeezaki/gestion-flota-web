import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../../lib/firebase';

type TabReportesProps = {
  busqueda: string;
  filtroTipoVehiculo: string;
};

export default function TabReportes({ busqueda, filtroTipoVehiculo }: TabReportesProps) {
  const [reportes, setReportes] = useState<any[]>([]);
  const [cargandoReportes, setCargandoReportes] = useState(true);
  const [limiteReportes, setLimiteReportes] = useState(10);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [reporteSeleccionado, setReporteSeleccionado] = useState<any | null>(null);

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

  useEffect(() => {
    const cargarReportesYLimpiar = async () => {
      try {
        const q = query(collection(db, 'reportes'), orderBy('fecha', 'asc'));
        const querySnapshot = await getDocs(q);
        const reportesData: any[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const limiteDias = new Date();
        limiteDias.setDate(limiteDias.getDate() - 15);
        
        const reportesValidos = [];

        for (const rep of reportesData) {
          if (rep.fecha && typeof rep.fecha.toDate === 'function') {
            if (rep.fecha.toDate().getTime() < limiteDias.getTime()) {
              try {
                if (rep.fotoPath && typeof rep.fotoPath === 'string' && !rep.fotoEliminada) {
                  const fotoRef = ref(storage, rep.fotoPath);
                  await deleteObject(fotoRef).catch(e => console.log("Foto ya no existe", e));
                }
                if (rep.firmaPath) {
                  const firmaRef = ref(storage, rep.firmaPath);
                  await deleteObject(firmaRef).catch(e => console.log("Firma ya no existe", e));
                }
                if (rep.licenciaPath) {
                  const licenciaRef = ref(storage, rep.licenciaPath);
                  await deleteObject(licenciaRef).catch(e => console.log("Licencia ya no existe", e));
                }
                await deleteDoc(doc(db, 'reportes', rep.id));
              } catch (e) {
                console.error("Error al borrar reporte antiguo:", e);
              }
            } else {
              if (rep.tipoVehiculo === 'Semi remolque') rep.tipoVehiculo = 'Semirremolque';
              reportesValidos.push(rep);
            }
          } else {
            if (rep.tipoVehiculo === 'Semi remolque') rep.tipoVehiculo = 'Semirremolque';
            reportesValidos.push(rep); 
          }
        }

        setReportes(reportesValidos.reverse());
      } catch (error) {
        console.error(error);
      } finally {
        setCargandoReportes(false);
      }
    };
    cargarReportesYLimpiar();
  }, []);

  // Reiniciar límite al buscar o filtrar
  useEffect(() => {
    setLimiteReportes(10);
  }, [busqueda, filtroEstado, filtroTipoVehiculo]);

  const eliminarReporteIndividual = async (id: string, fotoPath: string | null, patente: string, firmaPath?: string, licenciaPath?: string) => {
    const confirmar = window.confirm("¿Estás seguro de que deseas eliminar este registro de forma permanente?");
    if (!confirmar) return;

    try {
      if (fotoPath) {
        const fotoRef = ref(storage, fotoPath);
        await deleteObject(fotoRef).catch(e => console.log("Error o foto ya borrada:", e));
      }
      if (firmaPath) {
        const firmaRef = ref(storage, firmaPath);
        await deleteObject(firmaRef).catch(e => console.log("Error o firma ya borrada:", e));
      }
      if (licenciaPath) {
        const licenciaRef = ref(storage, licenciaPath);
        await deleteObject(licenciaRef).catch(e => console.log("Error o licencia ya borrada:", e));
      }
      await deleteDoc(doc(db, 'reportes', id));
      await logAccion('ELIMINAR_REPORTE', `Se eliminó el reporte diario del vehículo: ${patente}`);
      setReportes(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error(error);
      alert("Hubo un error al eliminar el registro.");
    }
  };

  const eliminarTodosLosReportes = async () => {
    const confirmar = window.confirm("ADVERTENCIA: Vas a eliminar TODOS los registros diarios almacenados en la base de datos. Esto no se puede deshacer. ¿Continuar?");
    if (!confirmar) return;

    try {
      for (const rep of reportes) {
        if (rep.fotoPath && !rep.fotoEliminada) {
          const fotoRef = ref(storage, rep.fotoPath);
          await deleteObject(fotoRef).catch(e => console.log(e));
        }
        if (rep.firmaPath) {
          const firmaRef = ref(storage, rep.firmaPath);
          await deleteObject(firmaRef).catch(e => console.log(e));
        }
        if (rep.licenciaPath) {
          const licenciaRef = ref(storage, rep.licenciaPath);
          await deleteObject(licenciaRef).catch(e => console.log(e));
        }
        await deleteDoc(doc(db, 'reportes', rep.id));
      }
      setReportes([]);
      await logAccion('ELIMINAR_TODOS_REPORTES', `Se vació completamente la base de datos de reportes`);
      alert("Todos los registros han sido eliminados correctamente.");
    } catch (error) {
      console.error(error);
      alert("Hubo un error durante la eliminación masiva.");
    }
  };

  const reportesFiltrados = reportes.filter(r => {
    const coincidePatente = r.vehiculoId?.toLowerCase().includes(busqueda.toLowerCase());
    let coincideEstado = true;
    if (filtroEstado === 'aprobados') coincideEstado = !r.fallaCritica;
    if (filtroEstado === 'bloqueados') coincideEstado = r.fallaCritica;
    const coincideTipo = filtroTipoVehiculo === 'todos' || r.tipoVehiculo === filtroTipoVehiculo;
    return coincidePatente && coincideEstado && coincideTipo;
  });

  const reportesPaginados = reportesFiltrados.slice(0, limiteReportes);

  return (
    <>
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Registros Diarios {filtroTipoVehiculo !== 'todos' && <span className="text-sm font-normal text-slate-500">({filtroTipoVehiculo}s)</span>}</h2>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button onClick={() => setFiltroEstado('todos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroEstado === 'todos' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Todos</button>
              <button onClick={() => setFiltroEstado('aprobados')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroEstado === 'aprobados' ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Aprobados</button>
              <button onClick={() => setFiltroEstado('bloqueados')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filtroEstado === 'bloqueados' ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Bloqueados</button>
            </div>
            {reportes.length > 0 && (
              <button onClick={eliminarTodosLosReportes} className="px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-600 text-white hover:bg-red-700 shadow-sm flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Borrar Todos
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-600 text-sm uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-bold">Fecha</th>
                <th className="p-4 font-bold">Patente</th>
                <th className="p-4 font-bold">Conductor</th>
                <th className="p-4 font-bold">Kilometraje</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargandoReportes ? (<tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando reportes...</td></tr>) 
              : reportesPaginados.length === 0 ? (<tr><td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron reportes.</td></tr>) 
              : reportesPaginados.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600 text-sm">{rep.fecha ? rep.fecha.toDate().toLocaleString() : 'Reciente'}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-800 block">{rep.vehiculoId}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{rep.tipoVehiculo || 'Desconocido'}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-700 block text-sm">{rep.conductorNombre || '---'}</span>
                    <span className="text-[10px] font-mono text-slate-500">{rep.conductorRut || '---'}</span>
                  </td>
                  <td className="p-4 text-slate-600 font-mono">{rep.kilometraje}</td>
                  <td className="p-4 text-center">{rep.fallaCritica ? <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">BLOQUEADO</span> : <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">APROBADO</span>}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => setReporteSeleccionado(rep)} className="text-xs font-bold px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100">Ver Detalles</button>
                      <button onClick={() => eliminarReporteIndividual(rep.id, rep.fotoPath, rep.vehiculoId, rep.firmaPath, rep.licenciaPath)} className="text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reportesFiltrados.length > limiteReportes && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setLimiteReportes(prev => prev + 10)} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-100 transition-colors">Mostrar mas registros</button>
            </div>
          )}
        </div>
      </div>

      {/* VENTANA MODAL PARA DETALLES DEL CHECKLIST */}
      {reporteSeleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-slate-800 mb-1 border-b border-slate-100 pb-4">Detalles del Checklist</h3>
            
            <div className="mt-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-sm text-slate-500">Vehículo: <span className="font-bold text-slate-800">{reporteSeleccionado.vehiculoId}</span></p>
              <p className="text-sm text-slate-500">Conductor: <span className="font-bold text-slate-800">{reporteSeleccionado.conductorNombre || 'No registrado'}</span></p>
              <p className="text-sm text-slate-500">RUT: <span className="font-bold text-slate-800">{reporteSeleccionado.conductorRut || 'No registrado'}</span></p>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar mb-6">
              {reporteSeleccionado.respuestas ? (
                Object.entries(reporteSeleccionado.respuestas).map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="capitalize text-slate-700 font-medium text-xs">{k.replace(/_/g, ' ')}</span>
                    <span className={`font-black text-xs px-3 py-1 rounded-lg border ${String(v).toLowerCase() === 'no' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                      {String(v).toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No hay respuestas registradas.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 border-t border-slate-100 pt-4">
              {reporteSeleccionado.fotoUrl && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Tablero (Km)</p>
                  <a href={reporteSeleccionado.fotoUrl} target="_blank" rel="noreferrer" className="block border border-slate-200 bg-slate-50 rounded-2xl p-2 flex justify-center hover:bg-slate-100 transition-colors">
                    <img src={reporteSeleccionado.fotoUrl} alt="Foto Tablero" className="h-20 object-contain" />
                  </a>
                </div>
              )}
              {reporteSeleccionado.licenciaUrl && (
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Licencia</p>
                  <a href={reporteSeleccionado.licenciaUrl} target="_blank" rel="noreferrer" className="block border border-slate-200 bg-slate-50 rounded-2xl p-2 flex justify-center hover:bg-slate-100 transition-colors">
                    <img src={reporteSeleccionado.licenciaUrl} alt="Foto Licencia" className="h-20 object-contain" />
                  </a>
                </div>
              )}
            </div>

            {reporteSeleccionado.firmaUrl && (
              <div className="mb-6">
                <p className="text-xs font-black text-slate-400 uppercase mb-2 text-center">Firma del Conductor</p>
                <div className="border border-slate-200 bg-slate-50 rounded-2xl p-2 flex justify-center">
                  <img src={reporteSeleccionado.firmaUrl} alt="Firma del conductor" className="h-24 object-contain" />
                </div>
              </div>
            )}

            <button onClick={() => setReporteSeleccionado(null)} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">Cerrar Detalles</button>
          </div>
        </div>
      )}
    </>
  );
}