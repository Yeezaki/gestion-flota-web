import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import { TablaBloqueosPVT } from '../components/prevencion/TablaBloqueosPVT';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
import { ResponsiveTable } from '../components/common/ResponsiveTable';
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
  const [seccion, setSeccion] = useState<'kpi' | 'bloqueos_pvt' | 'preguntas' | 'alcohol' | 'procedimiento'>('kpi');

  const [alcoholList, setAlcoholList] = useState<RegistroAlcoholDrogas[]>([]);
  const [procList, setProcList] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [emergenciasList, setEmergenciasList] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [preguntasPrevencion, setPreguntasPrevencion] = useState<PreguntaPrevencionAdmin[]>([]);

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

  const handleCrearPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPreguntaTexto.trim()) return;
    setGuardandoPregunta(true);
    try {
      await addDoc(collection(db, 'preguntas_prevencion'), {
        texto: nuevaPreguntaTexto.trim(),
        esCritica: nuevaPreguntaCritica,
        activa: true,
        creadoEn: serverTimestamp()
      });
      setNuevaPreguntaTexto('');
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoPregunta(false);
    }
  };

  const handleTogglePregunta = async (id: string, activa: boolean) => {
    await updateDoc(doc(db, 'preguntas_prevencion', id), { activa: !activa });
  };

  const handleEliminarPregunta = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta pregunta?')) {
      await deleteDoc(doc(db, 'preguntas_prevencion', id));
    }
  };

  const salir = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <ResponsiveLayout
      badge="Seguridad y Salud Ocupacional"
      titulo="Prevención de Riesgos"
      subtitulo="Controles preventivos, fatiga PVT, alcotest, narcotest y auditorías en terreno"
      acciones={
        <button
          type="button"
          onClick={salir}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
        >
          Cerrar Sesión
        </button>
      }
    >
      {/* Navegación horizontal táctil de submódulos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scroll-touch">
        <button
          type="button"
          onClick={() => setSeccion('kpi')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'kpi'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Resumen General
        </button>
        <button
          type="button"
          onClick={() => setSeccion('bloqueos_pvt')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'bloqueos_pvt'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Reposos por Fatiga (PVT)
        </button>
        <button
          type="button"
          onClick={() => setSeccion('preguntas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'preguntas'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Preguntas de Checklist
        </button>
        <button
          type="button"
          onClick={() => setSeccion('alcohol')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'alcohol'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          + Control Alcohol / Drogas
        </button>
        <button
          type="button"
          onClick={() => setSeccion('procedimiento')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'procedimiento'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          + Evidencia Procedimiento
        </button>
      </div>

      {seccion === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Controles Alcohol/Drogas</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{alcoholList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Evaluaciones registradas</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Evidencias Procedimiento</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{procList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Supervisiones completadas</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Checklists de Emergencia</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{emergenciasList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Activaciones en ruta</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Últimos Controles de Alcohol y Drogas
            </h3>
            <ResponsiveTable minWidth="min-w-[650px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Tipo Control</th>
                    <th className="p-3">Resultado</th>
                    <th className="p-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {alcoholList.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin registros aún.</td></tr>
                  ) : (
                    alcoholList.slice(0, 10).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{a.conductorNombre}</td>
                        <td className="p-3 font-mono">{a.conductorRut}</td>
                        <td className="p-3 uppercase font-medium">{a.tipoExamen}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.resultado === 'negativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {a.resultado.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{a.fechaControl}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTable>
          </div>
        </div>
      )}

      {seccion === 'bloqueos_pvt' && (
        <div className="space-y-4">
          <TablaBloqueosPVT permitirLiberar={true} />
        </div>
      )}

      {seccion === 'preguntas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Añadir Pregunta Crítica al Checklist
            </h3>
            <form onSubmit={handleCrearPregunta} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Escribe el texto de la verificación..."
                value={nuevaPreguntaTexto}
                onChange={(e) => setNuevaPreguntaTexto(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
                <input
                  type="checkbox"
                  checked={nuevaPreguntaCritica}
                  onChange={(e) => setNuevaPreguntaCritica(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Es Crítica (Bloquea)
              </label>
              <button
                type="submit"
                disabled={guardandoPregunta}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {guardandoPregunta ? 'Guardando...' : 'Agregar'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Preguntas Configuradas
            </h3>
            <div className="space-y-2">
              {preguntasPrevencion.length === 0 ? (
                <p className="text-xs text-slate-400">No hay preguntas personalizadas añadidas.</p>
              ) : (
                preguntasPrevencion.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        p.esCritica ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {p.esCritica ? 'Crítica' : 'Informativa'}
                      </span>
                      <span className="text-xs font-medium text-slate-800">{p.texto}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleTogglePregunta(p.id, p.activa)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${
                          p.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.activa ? 'Activa' : 'Inactiva'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarPregunta(p.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {seccion === 'alcohol' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <FormAlcoholDrogas
            evaluadorUid={auth.currentUser?.uid || 'prev-uid'}
            evaluadorNombre={auth.currentUser?.email || 'Prevencionista'}
            onGuardar={async (registro) => {
              const { id, ...datosSinId } = registro;
              await addDoc(collection(db, 'controles_alcohol_drogas'), {
                ...datosSinId,
                creadoEn: serverTimestamp()
              });
              setSeccion('kpi');
            }}
          />
        </div>
      )}

      {seccion === 'procedimiento' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <FormEvidenciaProcedimiento
            evaluadorUid={auth.currentUser?.uid || 'prev-uid'}
            evaluadorNombre={auth.currentUser?.email || 'Prevencionista'}
            onGuardar={async (registro) => {
              const { id, ...datosSinId } = registro;
              await addDoc(collection(db, 'evaluaciones_procedimiento'), {
                ...datosSinId,
                creadoEn: serverTimestamp()
              });
              setSeccion('kpi');
            }}
          />
        </div>
      )}
    </ResponsiveLayout>
  );
}