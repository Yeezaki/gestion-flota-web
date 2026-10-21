import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp, where, runTransaction } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';

export default function DashboardTaller() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<any[]>([]);
  const [citaSeleccionada, setCitaSeleccionada] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any | null>(null);
  const [otExistente, setOtExistente] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vehiculoData, setVehiculoData] = useState<any>(null);
  const [proxMantenimiento, setProxMantenimiento] = useState<string>('');
  
  // Parámetros de Faena / Seguridad en Taller
  const [torqueRealizado, setTorqueRealizado] = useState(false);
  const [valorTorque, setValorTorque] = useState('');
  const [vencimientoTorque, setVencimientoTorque] = useState('');
  const [sistemasSeguridadOperativos, setSistemasSeguridadOperativos] = useState(true);

  const [perfilTaller, setPerfilTaller] = useState<any>(null);

  const [formCamioneta, setFormCamioneta] = useState({
    tipoMantenimiento: 'Preventivo',
    cambioAceiteGeneral: false,
    cambioAceiteMotor: false,
    cambioAceiteTransmision: false,
    cambioFiltro: false,
    suspension: false,
    frenos: false,
    embrague: false,
    cajaCambios: false,
    observaciones: '',
    descripcionTrabajo: ''
  });

  const [formPesado, setFormPesado] = useState({
    tipoMtto: 'Preventivo',
    empresaTecnico: '',
    ruc: '',
    horasParada: '',
    tareas: [{ descripcion: '', horas: '', fInicio: '', fFin: '' }],
    repuestos: [{ cant: '', unidad: '', descripcion: '' }],
    observaciones: ''
  });

  const logAccion = async (accion: string, detalles: string) => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: user?.email || 'Taller Desconocido',
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const manejarCerrarSesion = async () => {
    await logAccion('CIERRE_SESION_TALLER', 'Un taller cerró su sesión');
    await signOut(auth);
    navigate('/login');
  };

  const cargarCitasYPerfil = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
      if (userDoc.exists()) {
        setPerfilTaller(userDoc.data());
      }
      
      const q = query(collection(db, 'citas_taller'), where('tallerId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const citasData: any[] = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      citasData.sort((a: any, b: any) => {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
      
      setCitas(citasData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarCitasYPerfil();
  }, []);

  const seleccionarCita = async (cita: any) => {
    setCitaSeleccionada(cita);
    setChecklist(null);
    setOtExistente(null);
    setVehiculoData(null);
    setProxMantenimiento('');
    setTorqueRealizado(false);
    setValorTorque('');
    setSistemasSeguridadOperativos(true);

    // Sugerencia de vigencia de torque (por defecto 3 meses / 90 días para faena)
    const fechaHoy = new Date();
    fechaHoy.setMonth(fechaHoy.getMonth() + 3);
    setVencimientoTorque(fechaHoy.toISOString().split('T')[0]);

    try {
      const qVehiculo = query(collection(db, 'vehiculos'), where('patente', '==', cita.patente));
      const snapVehiculo = await getDocs(qVehiculo);
      if (!snapVehiculo.empty) {
        const vDoc = snapVehiculo.docs[0];
        const vData = vDoc.data();
        setVehiculoData({ id: vDoc.id, ...vData });
        
        const kmActual = Number(vData.kilometrajeActual) || 0;
        setProxMantenimiento(String(kmActual + 10000));

        if (vData.vencimientoTorque) {
          setVencimientoTorque(vData.vencimientoTorque);
        }
      }

      const qOT = query(collection(db, 'ordenes_trabajo'), where('idCita', '==', cita.id));
      const snapOT = await getDocs(qOT);
      if (!snapOT.empty) {
        setOtExistente(snapOT.docs[0].data());
      }

      const qReporte = query(collection(db, 'reportes'), where('vehiculoId', '==', cita.patente));
      const snapReporte = await getDocs(qReporte);
      if (!snapReporte.empty) {
        const reportes: any[] = snapReporte.docs.map(d => d.data());
        reportes.sort((a: any, b: any) => {
          const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : 0;
          const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : 0;
          return timeB - timeA;
        });
        setChecklist(reportes[0]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const agregarFilaTarea = () => setFormPesado(p => ({ ...p, tareas: [...p.tareas, { descripcion: '', horas: '', fInicio: '', fFin: '' }] }));
  const agregarFilaRepuesto = () => setFormPesado(p => ({ ...p, repuestos: [...p.repuestos, { cant: '', unidad: '', descripcion: '' }] }));

  const obtenerSiguienteNumeroOT = async (): Promise<{ numeroStr: string; numeroInt: number }> => {
    const contadorRef = doc(db, 'configuracion', 'contadores_ot');
    return await runTransaction(db, async (transaction) => {
      const snapContador = await transaction.get(contadorRef);
      let valorActual = 0;

      if (snapContador.exists()) {
        valorActual = snapContador.data().ultimoNumero || 0;
      }

      let siguiente = valorActual + 1;
      if (siguiente > 1000) {
        siguiente = 1;
      }

      transaction.set(contadorRef, { ultimoNumero: siguiente, actualizado: serverTimestamp() }, { merge: true });
      return {
        numeroInt: siguiente,
        numeroStr: `OT-${String(siguiente).padStart(4, '0')}`
      };
    });
  };

  const guardarOT = async () => {
    if (!citaSeleccionada || !vehiculoData) return;
    const confirmar = window.confirm("¿Confirmar y cerrar la Orden de Trabajo? Una vez guardada no podrás modificarla.");
    if (!confirmar) return;

    setGuardando(true);
    const tipo = vehiculoData.tipo === 'Camioneta' ? 'camioneta' : 'pesado';
    const datosOT = tipo === 'camioneta' ? formCamioneta : formPesado;

    try {
      const nombreCreador = perfilTaller ? perfilTaller.nombreTaller : 'Taller Asociado';
      const correlativo = await obtenerSiguienteNumeroOT();

      await addDoc(collection(db, 'ordenes_trabajo'), {
        numeroOT: correlativo.numeroStr,
        correlativoInt: correlativo.numeroInt,
        idCita: citaSeleccionada.id,
        patente: citaSeleccionada.patente,
        tipoVehiculo: vehiculoData.tipo,
        datos: datosOT,
        certificacionTorque: {
          realizado: torqueRealizado,
          valor: valorTorque || 'Estándar Fabricante',
          vencimiento: vencimientoTorque
        },
        sistemasSeguridadOperativos,
        fechaCreacion: serverTimestamp(),
        creadoPor: nombreCreador,
        tallerId: auth.currentUser?.uid || ''
      });

      await updateDoc(doc(db, 'citas_taller', citaSeleccionada.id), {
        estado: 'completada',
        numeroOT: correlativo.numeroStr
      });

      const vehiculoUpdatePayload: any = {};
      if (proxMantenimiento) {
        vehiculoUpdatePayload.kilometrajeTaller = proxMantenimiento;
      }
      if (torqueRealizado && vencimientoTorque) {
        vehiculoUpdatePayload.vencimientoTorque = vencimientoTorque;
      }

      if (Object.keys(vehiculoUpdatePayload).length > 0) {
        await updateDoc(doc(db, 'vehiculos', vehiculoData.id), vehiculoUpdatePayload);
      }

      await logAccion('CREAR_OT', `El taller ${nombreCreador} generó la ${correlativo.numeroStr} para el vehículo ${citaSeleccionada.patente}`);

      alert(`Orden de Trabajo ${correlativo.numeroStr} guardada exitosamente.`);
      seleccionarCita(citaSeleccionada);
      cargarCitasYPerfil();
    } catch (error) {
      console.error(error);
      alert("Error al generar la Orden de Trabajo correlativa.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ResponsiveLayout
      badge="Área de Mantenimiento y Taller"
      titulo="Portal Taller Asociado"
      subtitulo={
        perfilTaller ? (
          <span className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-bold text-slate-700">{perfilTaller.nombreTaller}</span>
            <span className="text-slate-300">|</span>
            <a 
              href={`https://www.google.com/maps/search/taller+${encodeURIComponent(perfilTaller.ciudadTaller ? perfilTaller.direccionTaller + ', ' + perfilTaller.ciudadTaller : perfilTaller.ubicacionTaller)}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {perfilTaller.ciudadTaller ? `${perfilTaller.direccionTaller}, ${perfilTaller.ciudadTaller}` : perfilTaller.ubicacionTaller}
            </a>
          </span>
        ) : 'Gestión de Órdenes de Trabajo'
      }
      acciones={
        <button 
          onClick={manejarCerrarSesion} 
          className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-all text-xs sm:text-sm text-center"
        >
          Salir
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Lista de Vehículos Asignados */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="p-4 bg-slate-800 text-white font-bold text-xs sm:text-sm uppercase tracking-wide">
            Vehículos Asignados
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] lg:max-h-[650px] overflow-y-auto scroll-touch">
            {citas.length === 0 && (
              <p className="p-6 text-center text-xs sm:text-sm text-slate-400">
                No hay vehículos asignados a este taller aún.
              </p>
            )}
            {citas.map(cita => (
              <button 
                key={cita.id} 
                onClick={() => seleccionarCita(cita)}
                className={`w-full text-left p-4 hover:bg-blue-50/60 transition-colors ${citaSeleccionada?.id === cita.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-base sm:text-lg text-slate-800 font-mono">{cita.patente}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${cita.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {cita.estado}
                  </span>
                </div>
                <span className="text-xs text-slate-500 block mt-1">Ingreso: {cita.fecha} {cita.hora}</span>
                <span className="text-xs text-slate-600 font-medium truncate block mt-0.5">Motivo: {cita.motivo}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Detalle de Checklist y Formulario de OT */}
        <div className="lg:col-span-2 space-y-6">
          {!citaSeleccionada ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 sm:p-12 text-center border border-slate-200 text-slate-400 font-medium text-xs sm:text-sm">
              Selecciona un vehículo de la lista para ver su estado y crear la Orden de Trabajo.
            </div>
          ) : (
            <>
              {/* Checklist Previo */}
              <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 pb-3 gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-800">Checklist Previo (Reporte Conductor)</h2>
                  {vehiculoData && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 w-fit">
                      KM Actual: {vehiculoData.kilometrajeActual || 'No registrado'}
                    </span>
                  )}
                </div>
                {checklist ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scroll-touch">
                    {Object.entries(checklist.respuestas || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-600 capitalize truncate w-3/4">{k.replace(/_/g, ' ')}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${String(v).toLowerCase() === 'no' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {String(v).toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-500">No hay checklist registrado para este ingreso.</p>
                )}
              </div>

              {/* Formulario / Detalle de la Orden de Trabajo */}
              <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-slate-100 pb-3 gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-800">
                    Orden de Trabajo (OT) {otExistente?.numeroOT && <span className="text-blue-600 font-mono font-black ml-2">[{otExistente.numeroOT}]</span>}
                  </h2>
                  {otExistente && <span className="bg-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded-full w-fit">SOLO LECTURA</span>}
                </div>

                {otExistente ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-600 text-xs sm:text-sm space-y-2 border border-slate-200">
                    <p>La <strong>{otExistente.numeroOT || 'Orden de Trabajo'}</strong> ya fue completada y registrada en el sistema de administración.</p>
                    <p className="text-xs text-slate-500">Creado por: {otExistente.creadoPor || 'Taller'}</p>
                    {otExistente.certificacionTorque?.realizado && (
                      <div className="mt-2 text-xs text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        Torre/Torque verificado: {otExistente.certificacionTorque.valor} (Vence: {otExistente.certificacionTorque.vencimiento || 'No informada'})
                      </div>
                    )}
                  </div>
                ) : !vehiculoData ? (
                  <p className="text-xs sm:text-sm text-slate-500">Cargando datos del vehículo...</p>
                ) : (
                  <>
                    {/* Próximo Kilometraje y Mantenimiento */}
                    <div className="mb-6 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                      <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider mb-2">Programar Próximo Mantenimiento (KM)</label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <input 
                          type="number" 
                          value={proxMantenimiento} 
                          onChange={(e) => setProxMantenimiento(e.target.value)} 
                          className="p-2.5 border border-indigo-200 rounded-xl font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-48 text-xs sm:text-sm bg-white"
                        />
                        <span className="text-xs text-indigo-700 font-medium">Calculado automáticamente a +10.000 km</span>
                      </div>
                    </div>

                    {/* Protocolo de Torque y Sistemas de Seguridad */}
                    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Protocolo de Torque y Sistemas de Seguridad (Faena)
                      </h3>
                      
                      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={torqueRealizado} 
                            onChange={(e) => setTorqueRealizado(e.target.checked)} 
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          Realicé verificación de apriete / torque de tuercas de ruedas
                        </label>

                        {torqueRealizado && (
                          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                            <input 
                              type="text" 
                              placeholder="Valor (ej: 140 lb-ft)" 
                              value={valorTorque} 
                              onChange={(e) => setValorTorque(e.target.value)} 
                              className="p-2 border border-slate-300 rounded-lg text-xs font-bold w-full sm:w-40 bg-white"
                            />
                            <input 
                              type="date" 
                              value={vencimientoTorque} 
                              onChange={(e) => setVencimientoTorque(e.target.value)} 
                              className="p-2 border border-slate-300 rounded-lg text-xs font-bold w-full sm:w-auto bg-white"
                            />
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-3 border-t border-slate-200">
                        <input 
                          type="checkbox" 
                          checked={sistemasSeguridadOperativos} 
                          onChange={(e) => setSistemasSeguridadOperativos(e.target.checked)} 
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        Certifico operatividad de sistemas de seguridad (Frenos, Dirección, Suspensión y Luces)
                      </label>
                    </div>

                    {/* Formulario según tipo de vehículo */}
                    {vehiculoData.tipo === 'Camioneta' ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 mb-2">
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer">
                            <input type="radio" name="tipoM" checked={formCamioneta.tipoMantenimiento === 'Preventivo'} onChange={() => setFormCamioneta({...formCamioneta, tipoMantenimiento: 'Preventivo'})} /> 
                            Preventivo
                          </label>
                          <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer">
                            <input type="radio" name="tipoM" checked={formCamioneta.tipoMantenimiento === 'Correctivo'} onChange={() => setFormCamioneta({...formCamioneta, tipoMantenimiento: 'Correctivo'})} /> 
                            Correctivo
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {['cambioAceiteGeneral', 'cambioAceiteMotor', 'cambioAceiteTransmision', 'cambioFiltro', 'suspension', 'frenos', 'embrague', 'cajaCambios'].map((item) => (
                            <label key={item} className="flex items-center gap-2 text-xs font-medium text-slate-700 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                              <input type="checkbox" checked={(formCamioneta as any)[item]} onChange={(e) => setFormCamioneta({...formCamioneta, [item]: e.target.checked})} />
                              {item.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </label>
                          ))}
                        </div>

                        <textarea 
                          placeholder="Descripción del trabajo realizado..." 
                          value={formCamioneta.descripcionTrabajo} 
                          onChange={e => setFormCamioneta({...formCamioneta, descripcionTrabajo: e.target.value})} 
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm mt-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          rows={3}
                        />
                        <textarea 
                          placeholder="Observaciones adicionales..." 
                          value={formCamioneta.observaciones} 
                          onChange={e => setFormCamioneta({...formCamioneta, observaciones: e.target.value})} 
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            placeholder="Empresa / Técnico a cargo" 
                            value={formPesado.empresaTecnico} 
                            onChange={e => setFormPesado({...formPesado, empresaTecnico: e.target.value})} 
                            className="p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm w-full" 
                          />
                          <input 
                            type="number" 
                            placeholder="Horas de Parada de la máquina" 
                            value={formPesado.horasParada} 
                            onChange={e => setFormPesado({...formPesado, horasParada: e.target.value})} 
                            className="p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm w-full" 
                          />
                        </div>
                        
                        {/* Tareas dinámicas adaptables */}
                        <div>
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Descripción de Tareas</h3>
                          <div className="space-y-2">
                            {formPesado.tareas.map((tarea, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <input 
                                  type="text" 
                                  placeholder="Detalle de tarea" 
                                  value={tarea.descripcion} 
                                  onChange={e => { const n = [...formPesado.tareas]; n[idx].descripcion = e.target.value; setFormPesado({...formPesado, tareas: n}); }} 
                                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                />
                                <div className="flex gap-2">
                                  <input 
                                    type="number" 
                                    placeholder="Hrs" 
                                    value={tarea.horas} 
                                    onChange={e => { const n = [...formPesado.tareas]; n[idx].horas = e.target.value; setFormPesado({...formPesado, tareas: n}); }} 
                                    className="w-16 sm:w-20 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                  />
                                  <input 
                                    type="date" 
                                    value={tarea.fInicio} 
                                    onChange={e => { const n = [...formPesado.tareas]; n[idx].fInicio = e.target.value; setFormPesado({...formPesado, tareas: n}); }} 
                                    className="flex-1 sm:w-32 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                  />
                                  <input 
                                    type="date" 
                                    value={tarea.fFin} 
                                    onChange={e => { const n = [...formPesado.tareas]; n[idx].fFin = e.target.value; setFormPesado({...formPesado, tareas: n}); }} 
                                    className="flex-1 sm:w-32 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <button 
                            type="button" 
                            onClick={agregarFilaTarea} 
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 mt-2 block"
                          >
                            + Agregar Tarea
                          </button>
                        </div>

                        {/* Repuestos dinámicos adaptables */}
                        <div>
                          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Repuestos / Consumibles</h3>
                          <div className="space-y-2">
                            {formPesado.repuestos.map((rep, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <div className="flex gap-2">
                                  <input 
                                    type="number" 
                                    placeholder="Cant." 
                                    value={rep.cant} 
                                    onChange={e => { const n = [...formPesado.repuestos]; n[idx].cant = e.target.value; setFormPesado({...formPesado, repuestos: n}); }} 
                                    className="w-20 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Unidad (ej: L, Un)" 
                                    value={rep.unidad} 
                                    onChange={e => { const n = [...formPesado.repuestos]; n[idx].unidad = e.target.value; setFormPesado({...formPesado, repuestos: n}); }} 
                                    className="w-28 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                  />
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="Descripción Repuesto o Insumo" 
                                  value={rep.descripcion} 
                                  onChange={e => { const n = [...formPesado.repuestos]; n[idx].descripcion = e.target.value; setFormPesado({...formPesado, repuestos: n}); }} 
                                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs bg-white" 
                                />
                              </div>
                            ))}
                          </div>
                          <button 
                            type="button" 
                            onClick={agregarFilaRepuesto} 
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 mt-2 block"
                          >
                            + Agregar Repuesto
                          </button>
                        </div>

                        <textarea 
                          placeholder="Observaciones generales de mantenimiento..." 
                          value={formPesado.observaciones} 
                          onChange={e => setFormPesado({...formPesado, observaciones: e.target.value})} 
                          className="w-full p-3 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          rows={2}
                        />
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={guardarOT} 
                      disabled={guardando} 
                      className="mt-6 w-full bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-bold py-3.5 sm:py-4 rounded-xl transition-all text-xs sm:text-sm shadow-md"
                    >
                      {guardando ? 'Generando correlativo y guardando OT...' : 'Generar y Cerrar OT'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}