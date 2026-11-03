import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type ResumenConductorProps = {
  idPatente: string;
  nombreConductor: string;
  rutConductor: string;
  bloqueado: boolean;
  kilometrajeActual: number | null;
  vehiculo: any;
  forzarDescarga: (url: string, nombreArchivo: string) => void;
  calcularEstadoVencimiento: (fecha: string) => { texto: string; clase: string };
  onFinalizarJornada: () => void;
  onRehacerChecklist?: () => void;
};

interface TallerItem {
  id: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  especialidad?: string;
  email?: string;
  telefono?: string;
}

const BLOQUES_HORAS_PREDETERMINADAS = [
  '08:30',
  '09:30',
  '10:30',
  '11:30',
  '14:00',
  '15:00',
  '16:00',
  '17:00'
];

export default function ResumenConductor({
  idPatente,
  nombreConductor,
  rutConductor,
  bloqueado,
  kilometrajeActual,
  vehiculo,
  forzarDescarga,
  calcularEstadoVencimiento,
  onFinalizarJornada,
  onRehacerChecklist
}: ResumenConductorProps) {
  const [talleres, setTalleres] = useState<TallerItem[]>([]);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<string>('');
  const [cargandoTalleres, setCargandoTalleres] = useState(false);
  const [errorTalleres, setErrorTalleres] = useState<string | null>(null);

  const [mostrarModalAgendar, setMostrarModalAgendar] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    return manana.toISOString().slice(0, 10);
  });
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('09:30');
  const [motivoIngreso, setMotivoIngreso] = useState<string>('Falla crítica detectada en checklist diario');
  const [guardandoCita, setGuardandoCita] = useState(false);
  const [citaAgendada, setCitaAgendada] = useState<{ fecha: string; hora: string; taller: string } | null>(null);

  useEffect(() => {
    const cargarUsuariosTaller = async () => {
      setCargandoTalleres(true);
      setErrorTalleres(null);
      try {
        const qUsuariosTaller = query(
          collection(db, 'usuarios'),
          where('rol', '==', 'taller')
        );
        const snap = await getDocs(qUsuariosTaller);
        
        const lista: TallerItem[] = snap.docs.map((d) => {
          const data = d.data();
          const nombre = data.nombreTaller || data.razonSocial || data.nombre || data.email || 'Taller';
          const direccion = data.direccionTaller || data.direccion || '';
          const ciudad = data.ciudadTaller || '';
          const especialidad = data.especialidadTaller || '';

          return {
            id: d.id,
            nombre,
            direccion,
            ciudad,
            especialidad,
            email: data.email || '',
            telefono: data.telefono || ''
          };
        });

        setTalleres(lista);
        if (lista.length > 0) {
          setTallerSeleccionado(lista[0].id);
        }
      } catch (err: any) {
        console.error('Error cargando usuarios con rol taller:', err);
        setErrorTalleres(err?.message || 'Error de permisos en Firestore al consultar usuarios');
      } finally {
        setCargandoTalleres(false);
      }
    };

    cargarUsuariosTaller();
  }, [bloqueado]);

  const handleConfirmarCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaSeleccionada || !horaSeleccionada) {
      alert('Por favor selecciona una fecha y una hora.');
      return;
    }

    if (!tallerSeleccionado) {
      alert('Por favor selecciona un taller de la lista.');
      return;
    }

    setGuardandoCita(true);
    try {
      const tallerObj = talleres.find((t) => t.id === tallerSeleccionado);
      const tallerNombreFinal = tallerObj?.nombre || 'Taller Asignado';

      const payloadCita = {
        patente: (idPatente || '').toUpperCase(),
        conductorNombre: nombreConductor || 'Conductor',
        conductorRut: rutConductor || 'Sin RUT',
        kilometraje: kilometrajeActual ?? (vehiculo?.kilometrajeActual ? Number(vehiculo.kilometrajeActual) : 0),
        tallerId: tallerSeleccionado,
        tallerNombre: tallerNombreFinal,
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        motivo: motivoIngreso || 'Falla crítica detectada en checklist diario',
        estado: 'pendiente',
        creadoEn: serverTimestamp(),
        origen: 'bloqueo_checklist_conductor'
      };

      // Guardar en citas_taller (colección leída por DashboardTaller)
      await addDoc(collection(db, 'citas_taller'), payloadCita);

      // Copia auxiliar en agenda_taller
      try {
        await addDoc(collection(db, 'agenda_taller'), {
          ...payloadCita,
          fechaCita: fechaSeleccionada,
          horaCita: horaSeleccionada
        });
      } catch (eAux) {
        console.warn('agenda_taller auxiliar:', eAux);
      }

      // Registro en historial
      try {
        await addDoc(collection(db, 'historial_acciones'), {
          usuario: `${nombreConductor || 'Conductor'} (${rutConductor || 'Sin RUT'})`,
          accion: 'AGENDAMIENTO_TALLER_CONDUCTOR',
          detalles: `Vehículo ${(idPatente || '').toUpperCase()} agendado en ${tallerNombreFinal} para el ${fechaSeleccionada} a las ${horaSeleccionada} hrs.`,
          fecha: serverTimestamp()
        });
      } catch (eHist) {
        console.warn('historial_acciones auxiliar:', eHist);
      }

      setCitaAgendada({
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        taller: tallerNombreFinal
      });
      setMostrarModalAgendar(false);
    } catch (err: any) {
      console.error('Error agendando cita en citas_taller:', err);
      alert(`No se pudo agendar la hora: ${err?.message || 'Error de conexión con Firebase'}`);
    } finally {
      setGuardandoCita(false);
    }
  };

  const renderDocInfo = (titulo: string, fecha: string, url: string, nombreArchivo: string) => {
    const estado = calcularEstadoVencimiento(fecha);
    const fechaFormateada = fecha ? fecha.split('-').reverse().join('-') : 'Sin fecha';

    return (
      <div className={`p-3 rounded-2xl border backdrop-blur-sm flex flex-col justify-between items-center shadow-sm ${estado.clase}`}>
        <div className="flex flex-col items-center w-full mb-2">
          <span className="text-[10px] uppercase font-black opacity-80 mb-1 text-center">{titulo}</span>
          <span className="text-xs font-black text-slate-800">{fechaFormateada}</span>
          <span className="text-[10px] font-bold leading-tight mt-1 text-center">{estado.texto}</span>
        </div>
        {url && (
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
              if (!esApple) {
                e.preventDefault();
                forzarDescarga(url, nombreArchivo);
              }
            }}
            className="mt-auto w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95 text-center cursor-pointer no-underline"
          >
            Ver / Descargar
          </a>
        )}
      </div>
    );
  };

  const renderPautaInfo = (url: string, nombreArchivo: string) => (
    <div className="p-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 backdrop-blur-sm flex flex-col justify-between items-center shadow-sm">
      <div className="flex flex-col items-center w-full mb-2">
        <span className="text-[10px] uppercase font-black text-blue-900 mb-1 text-center">Pauta Mantención</span>
        <span className="text-xs font-black text-blue-950">Oficial Flota</span>
        <span className="text-[10px] font-bold text-blue-700 leading-tight mt-1 text-center">Vigente</span>
      </div>
      {url && (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (!esApple) {
              e.preventDefault();
              forzarDescarga(url, nombreArchivo);
            }
          }}
          className="mt-auto w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95 text-center cursor-pointer no-underline"
        >
          Ver Pauta
        </a>
      )}
    </div>
  );

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-white/40 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Panel del Conductor</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">{nombreConductor}</h2>
          <p className="text-xs font-mono text-slate-500">{rutConductor}</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patente Asignada</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 uppercase">{idPatente}</div>
          {kilometrajeActual !== null && (
            <p className="text-xs font-semibold text-slate-500">{kilometrajeActual.toLocaleString('es-CL')} km registrados</p>
          )}
        </div>
      </div>

      {bloqueado ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-black uppercase text-rose-700 tracking-wide">
                Vehículo Bloqueado para Operación
              </div>
              <p className="text-xs text-rose-600 font-medium mt-0.5">
                Se registraron observaciones críticas en el checklist del vehículo. Debe ser coordinado su ingreso a taller.
              </p>
            </div>
          </div>

          <div className="bg-white/90 rounded-2xl p-4 border border-rose-200/80 space-y-3">
            {citaAgendada ? (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-center space-y-1">
                <div className="text-xs font-black uppercase text-emerald-800 tracking-wide">
                  Hora Agendada con Éxito
                </div>
                <p className="text-xs text-emerald-700 font-bold">
                  {citaAgendada.taller} — {citaAgendada.fecha} a las {citaAgendada.hora} hrs.
                </p>
                <p className="text-[10px] text-emerald-600">
                  El equipo de taller ha recibido la solicitud y la unidad queda programada.
                </p>
              </div>
            ) : (
              <>
                <label className="block text-xs font-black uppercase text-slate-700">
                  Seleccionar Taller Asociado
                </label>

                {cargandoTalleres ? (
                  <p className="text-xs text-slate-500">Cargando talleres registrados...</p>
                ) : errorTalleres ? (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {errorTalleres}
                  </div>
                ) : talleres.length === 0 ? (
                  <p className="text-xs text-rose-600 font-bold">
                    No se encontraron usuarios con rol taller activos en Firestore.
                  </p>
                ) : (
                  <select
                    value={tallerSeleccionado}
                    onChange={(e) => setTallerSeleccionado(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {talleres.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.ciudad ? `- ${t.ciudad}` : ''} {t.direccion ? `(${t.direccion})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  disabled={talleres.length === 0}
                  onClick={() => setMostrarModalAgendar(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-black py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-95 text-xs flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Seleccionar Fecha y Hora de Taller
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
          <div className="text-xs font-black uppercase text-emerald-700 tracking-wide">Vehículo Habilitado</div>
          <p className="text-xs text-emerald-600">Checklist y pruebas validadas correctamente para la jornada.</p>
        </div>
      )}

      {/* Grid de documentos */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Documentación del Vehículo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {renderDocInfo('Permiso Circulación', vehiculo?.fechaPermisoCirculacion, vehiculo?.urlPermisoCirculacion, `Permiso_${idPatente}.pdf`)}
          {renderDocInfo('Revisión Técnica', vehiculo?.fechaRevisionTecnica, vehiculo?.urlRevisionTecnica, `Revision_${idPatente}.pdf`)}
          {renderDocInfo('Seguro Obligatorio', vehiculo?.fechaSeguroObligatorio, vehiculo?.urlSeguroObligatorio, `Seguro_${idPatente}.pdf`)}
          {renderPautaInfo(vehiculo?.urlPautaMantenimiento, `Pauta_${idPatente}.pdf`)}
        </div>
      </div>

      {/* Botones de Acción Final */}
      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        {onRehacerChecklist && (
          <button
            type="button"
            onClick={onRehacerChecklist}
            className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-95 text-xs sm:text-sm text-center flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Volver a hacer Checklist
          </button>
        )}

        <button
          type="button"
          onClick={onFinalizarJornada}
          className={`w-full ${onRehacerChecklist ? 'sm:w-1/2' : ''} bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-95 text-xs sm:text-sm text-center`}
        >
          Finalizar Jornada
        </button>
      </div>

      {/* Modal de Agendamiento */}
      {mostrarModalAgendar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 p-4 backdrop-blur-sm flex justify-center items-center">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800">Agendar Ingreso a Taller</h3>
                <p className="text-xs font-mono text-slate-500">Patente: {idPatente.toUpperCase()}</p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalAgendar(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarCita} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  1. Taller Receptor
                </label>
                <select
                  value={tallerSeleccionado}
                  onChange={(e) => setTallerSeleccionado(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {talleres.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.ciudad ? `- ${t.ciudad}` : ''} {t.direccion ? `(${t.direccion})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  2. Fecha de Ingreso
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-2">
                  3. Bloques Horarios Disponibles
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOQUES_HORAS_PREDETERMINADAS.map((bloque) => (
                    <button
                      key={bloque}
                      type="button"
                      onClick={() => setHoraSeleccionada(bloque)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                        horaSeleccionada === bloque
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {bloque}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Motivo / Observación
                </label>
                <textarea
                  value={motivoIngreso}
                  onChange={(e) => setMotivoIngreso(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalAgendar(false)}
                  className="w-1/2 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCita}
                  className="w-1/2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition-all disabled:opacity-50"
                >
                  {guardandoCita ? 'Guardando...' : 'Confirmar Hora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}