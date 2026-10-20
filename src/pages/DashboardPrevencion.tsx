import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import type {
  EvidenciaEvalProcedimiento,
  EvaluacionEmergenciaRegistro,
  RegistroAlcoholDrogas
} from '../constants';

interface PreguntaPrevencionAdmin {
  id: string;
  texto: string;
  esCritica: boolean;
  activa: boolean;
}

export default function DashboardPrevencion() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState<'kpi' | 'preguntas' | 'alcohol' | 'procedimiento'>('kpi');

  const [alcoholList, setAlcoholList] = useState<RegistroAlcoholDrogas[]>([]);
  const [procList, setProcList] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [emergenciasList, setEmergenciasList] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [preguntasPrevencion, setPreguntasPrevencion] = useState<PreguntaPrevencionAdmin[]>([]);

  // Formulario nueva pregunta
  const [nuevaPreguntaTexto, setNuevaPreguntaTexto] = useState('');
  const [nuevaPreguntaCritica, setNuevaPreguntaCritica] = useState(true);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);

  useEffect(() => {
    const unsubA = onSnapshot(query(collection(db, 'controles_alcohol_drogas'), orderBy('fechaControl', 'desc')), (s) => {
      setAlcoholList(s.docs.map((d) => ({ id: d.id, ...d.data() } as RegistroAlcoholDrogas)));
    });

    const unsubP = onSnapshot(query(collection(db, 'evaluaciones_procedimiento'), orderBy('fechaEvaluacion', 'desc')), (s) => {
      setProcList(s.docs.map((d) => ({ id: d.id, ...d.data() } as EvidenciaEvalProcedimiento)));
    });

    const unsubE = onSnapshot(query(collection(db, 'evaluaciones_emergencia'), orderBy('creadoEn', 'desc')), (s) => {
      setEmergenciasList(s.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluacionEmergenciaRegistro)));
    });

    const unsubPreguntas = onSnapshot(query(collection(db, 'preguntas_prevencion'), orderBy('creadoEn', 'asc')), (s) => {
      setPreguntasPrevencion(s.docs.map((d) => ({ id: d.id, ...d.data() } as PreguntaPrevencionAdmin)));
    });

    return () => {
      unsubA();
      unsubP();
      unsubE();
      unsubPreguntas();
    };
  }, []);

  const totalAlcohol = alcoholList.length;
  const positivosAlcohol = alcoholList.filter((a) => a.resultado === 'positivo').length;
  const tasaAptitudAlcohol = totalAlcohol > 0 ? Math.round(((totalAlcohol - positivosAlcohol) / totalAlcohol) * 100) : 100;

  const totalProc = procList.length;
  const aprobadosProc = procList.filter((p) => p.aprobado).length;
  const tasaAprobacionProc = totalProc > 0 ? Math.round((aprobadosProc / totalProc) * 100) : 100;

  const totalEmerg = emergenciasList.length;
  const aprobadasEmerg = emergenciasList.filter((e) => e.aprobado).length;
  const tasaEmerg = totalEmerg > 0 ? Math.round((aprobadasEmerg / totalEmerg) * 100) : 100;

  const salir = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const formatearFecha = (fecha: any) => {
    if (!fecha) return '-';
    if (typeof fecha === 'string') return new Date(fecha).toLocaleDateString();
    if (fecha.toDate && typeof fecha.toDate === 'function') return fecha.toDate().toLocaleDateString();
    if (fecha.seconds) return new Date(fecha.seconds * 1000).toLocaleDateString();
    return '-';
  };

  const handleCrearPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPreguntaTexto.trim()) return;
    try {
      setGuardandoPregunta(true);
      await addDoc(collection(db, 'preguntas_prevencion'), {
        texto: nuevaPreguntaTexto.trim(),
        esCritica: nuevaPreguntaCritica,
        activa: true,
        creadoEn: serverTimestamp()
      });
      setNuevaPreguntaTexto('');
      setNuevaPreguntaCritica(true);
    } catch (err) {
      console.error(err);
      alert('Error al agregar la pregunta.');
    } finally {
      setGuardandoPregunta(false);
    }
  };

  const alternarEstadoPregunta = async (p: PreguntaPrevencionAdmin) => {
    try {
      await updateDoc(doc(db, 'preguntas_prevencion', p.id), {
        activa: !p.activa
      });
    } catch (err) {
      console.error(err);
    }
  };

  const eliminarPregunta = async (id: string) => {
    if (!window.confirm('¿Desea eliminar esta pregunta del checklist?')) return;
    try {
      await deleteDoc(doc(db, 'preguntas_prevencion', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGuardarAlcohol = async (reg: RegistroAlcoholDrogas) => {
    const { id, ...datosSinId } = reg;
    await addDoc(collection(db, 'controles_alcohol_drogas'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSeccion('kpi');
  };

  const handleGuardarProcedimiento = async (reg: EvidenciaEvalProcedimiento) => {
    const { id, ...datosSinId } = reg;
    await addDoc(collection(db, 'evaluaciones_procedimiento'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSeccion('kpi');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Departamento de Seguridad y Salud Ocupacional
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">Portal de Prevención de Riesgos</h1>
          </div>
          <button
            onClick={salir}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Aptitud Alcohol / Drogas</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">{tasaAptitudAlcohol}%</div>
            <p className="text-[11px] text-slate-500 mt-1">{positivosAlcohol} no aptos de {totalAlcohol}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Cumplimiento Procedimientos</span>
            <div className="text-3xl font-black text-blue-600 mt-1">{tasaAprobacionProc}%</div>
            <p className="text-[11px] text-slate-500 mt-1">{aprobadosProc} aprobados de {totalProc}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Checklists Emergencia</span>
            <div className="text-3xl font-black text-indigo-600 mt-1">{tasaEmerg}%</div>
            <p className="text-[11px] text-slate-500 mt-1">{aprobadasEmerg} aprobados de {totalEmerg}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Preguntas Activas Checklist</span>
            <div className="text-3xl font-black text-amber-600 mt-1">
              {preguntasPrevencion.filter(p => p.activa).length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{preguntasPrevencion.length} configuradas en total</p>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setSeccion('kpi')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              seccion === 'kpi' ? 'bg-amber-600 text-white shadow' : 'bg-white text-slate-600 border'
            }`}
          >
            Historial de Evaluaciones
          </button>
          <button
            onClick={() => setSeccion('preguntas')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              seccion === 'preguntas' ? 'bg-amber-600 text-white shadow' : 'bg-white text-slate-600 border'
            }`}
          >
            Configurar Checklist Prevención ({preguntasPrevencion.filter(p => p.activa).length})
          </button>
          <button
            onClick={() => setSeccion('alcohol')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              seccion === 'alcohol' ? 'bg-amber-600 text-white shadow' : 'bg-white text-slate-600 border'
            }`}
          >
            + Registrar Alcohol y Drogas
          </button>
          <button
            onClick={() => setSeccion('procedimiento')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              seccion === 'procedimiento' ? 'bg-amber-600 text-white shadow' : 'bg-white text-slate-600 border'
            }`}
          >
            + Cargar Evidencia Procedimiento
          </button>
        </div>

        {/* Sección de Creación y Edición de Preguntas Dinámicas */}
        {seccion === 'preguntas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2">
                Agregar Pregunta al Checklist del Conductor
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Estas preguntas aparecerán al inicio del checklist en la vista del conductor justo después de aprobar las pruebas PVT.
              </p>

              <form onSubmit={handleCrearPregunta} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Texto de la Pregunta / Inspección
                  </label>
                  <input
                    type="text"
                    value={nuevaPreguntaTexto}
                    onChange={(e) => setNuevaPreguntaTexto(e.target.value)}
                    placeholder="Ej: ¿Porta chaleco reflectante con norma de alta visibilidad en cabina?"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nuevaPreguntaCritica}
                      onChange={(e) => setNuevaPreguntaCritica(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>¿Es Falla Crítica? (Si el conductor marca NO, el vehículo se bloqueará automáticamente)</span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={guardandoPregunta}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                  >
                    {guardandoPregunta ? 'Agregando...' : '+ Guardar Pregunta'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Preguntas Configuradas para la Flota ({preguntasPrevencion.length})
              </h3>

              {preguntasPrevencion.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay preguntas de prevención creadas aún.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {preguntasPrevencion.map((p, idx) => (
                    <div key={p.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800">{idx + 1}. {p.texto}</span>
                        <div className="flex items-center gap-2">
                          {p.esCritica ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Crítica (Bloquea)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              Informativa
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {p.activa ? 'Activa en Terreno' : 'Pausada'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alternarEstadoPregunta(p)}
                          className="text-xs font-semibold px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                        >
                          {p.activa ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarPregunta(p.id)}
                          className="text-xs font-semibold px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {seccion === 'alcohol' && (
          <FormAlcoholDrogas
            evaluadorUid={auth.currentUser?.uid || 'prevencion-uid'}
            evaluadorNombre={auth.currentUser?.email || 'Experto en Prevención'}
            onGuardar={handleGuardarAlcohol}
          />
        )}

        {seccion === 'procedimiento' && (
          <FormEvidenciaProcedimiento
            evaluadorUid={auth.currentUser?.uid || 'prevencion-uid'}
            evaluadorNombre={auth.currentUser?.email || 'Experto en Prevención'}
            onGuardar={handleGuardarProcedimiento}
          />
        )}

        {seccion === 'kpi' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Últimos Controles Registrados en Terreno
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Tipo Control</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {alcoholList.slice(0, 5).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">Alcohol/Drogas ({a.tipoExamen})</td>
                      <td className="p-3">{a.conductorNombre}</td>
                      <td className="p-3 font-mono">{a.conductorRut}</td>
                      <td className="p-3 text-slate-500">{formatearFecha(a.fechaControl)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.resultado === 'negativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {a.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {procList.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">Evaluación de Procedimiento</td>
                      <td className="p-3">{p.conductorNombre}</td>
                      <td className="p-3 font-mono">{p.conductorRut}</td>
                      <td className="p-3 text-slate-500">{formatearFecha(p.fechaEvaluacion)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.aprobado ? 'Aprobado' : 'Rechazado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}