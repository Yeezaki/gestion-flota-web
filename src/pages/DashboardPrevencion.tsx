import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import { TablaBloqueosPVT } from '../components/prevencion/TablaBloqueosPVT';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
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
  const [seccion, setSeccion] = useState<'kpi' | 'planilla' | 'bloqueos_pvt' | 'preguntas' | 'alcohol' | 'procedimiento'>('kpi');

  const [alcoholList, setAlcoholList] = useState<RegistroAlcoholDrogas[]>([]);
  const [procList, setProcList] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [emergenciasList, setEmergenciasList] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [preguntasPrevencion, setPreguntasPrevencion] = useState<PreguntaPrevencionAdmin[]>([]);

  const [nuevaPreguntaTexto, setNuevaPreguntaTexto] = useState('');
  const [nuevaPreguntaCritica, setNuevaPreguntaCritica] = useState(true);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);
  const [modalFoto, setModalFoto] = useState<{ url: string; titulo: string } | null>(null);

  const ahora = Date.now();
  const MILIS_DIA = 24 * 60 * 60 * 1000;
  const RETENCION_VISTA_DIAS = 30;
  const GRACIA_DESCARGA_DIAS = 7;
  const LIMITE_TOTAL_DIAS = RETENCION_VISTA_DIAS + GRACIA_DESCARGA_DIAS; // 37 días

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

  // Filtrado de retención para la planilla de 30 días + 7 días de gracia (37 días totales)
  const controlesVigentes = alcoholList.filter((c) => {
    const fechaBase = c.fechaTimestamp || new Date(c.fechaControl).getTime() || ahora;
    const diasTranscurridos = (ahora - fechaBase) / MILIS_DIA;
    return diasTranscurridos <= LIMITE_TOTAL_DIAS;
  });

  const exportarPlanillaExcel = () => {
    if (controlesVigentes.length === 0) {
      alert('No hay registros disponibles para exportar.');
      return;
    }

    const encabezados = [
      'Conductor',
      'RUT',
      'Patente',
      'Tipo Examen',
      'Resultado',
      'Fecha Control',
      'Dias Restantes Descarga',
      'Observaciones',
      'Evaluador'
    ];

    const filas = controlesVigentes.map((c) => {
      const fechaBase = c.fechaTimestamp || new Date(c.fechaControl).getTime() || ahora;
      const diasTranscurridos = Math.floor((ahora - fechaBase) / MILIS_DIA);
      const diasRestantesDescarga = Math.max(0, LIMITE_TOTAL_DIAS - diasTranscurridos);

      return [
        `"${c.conductorNombre}"`,
        `"${c.conductorRut}"`,
        `"${c.patente || 'N/A'}"`,
        `"${c.tipoExamen.toUpperCase()}"`,
        `"${c.resultado.toUpperCase()}"`,
        `"${new Date(c.fechaControl).toLocaleString('es-CL')}"`,
        `"${diasRestantesDescarga} dias"`,
        `"${(c.observaciones || '').replace(/"/g, '""')}"`,
        `"${c.creadoPorNombre}"`
      ].join(';');
    });

    const contenidoCSV = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Planilla_Controles_Drogas_Alcohol_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTablaPlanilla = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Planilla de Evaluaciones Realizadas
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Retención de 30 días activa + 7 días para descarga por Excel. Foto de prueba visible por 24 horas.
          </p>
        </div>
        <button
          type="button"
          onClick={exportarPlanillaExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-end sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar Planilla Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Conductor</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Patente</th>
              <th className="p-3">Tipo / Resultado</th>
              <th className="p-3">Fecha Control</th>
              <th className="p-3 text-center">Credencial</th>
              <th className="p-3 text-center">Foto Prueba (24h)</th>
              <th className="p-3 text-center">Vigencia Registro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {controlesVigentes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                  No hay conductores registrados dentro del periodo activo de 30 + 7 días.
                </td>
              </tr>
            ) : (
              controlesVigentes.map((item) => {
                const fechaBase = item.fechaTimestamp || new Date(item.fechaControl).getTime() || ahora;
                const diasTranscurridos = Math.floor((ahora - fechaBase) / MILIS_DIA);
                const enPeriodoGracia = diasTranscurridos > RETENCION_VISTA_DIAS;
                const pruebaVencida24h = item.fotoPruebaExpiraEn ? ahora > item.fotoPruebaExpiraEn : false;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{item.conductorNombre}</td>
                    <td className="p-3 font-mono">{item.conductorRut}</td>
                    <td className="p-3 font-mono text-slate-600">{item.patente || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.resultado === 'negativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.tipoExamen}: {item.resultado}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(item.fechaControl).toLocaleDateString('es-CL')}
                    </td>
                    <td className="p-3 text-center">
                      {item.fotoCredencialUrl ? (
                        <button
                          type="button"
                          onClick={() => setModalFoto({ url: item.fotoCredencialUrl!, titulo: `Credencial - ${item.conductorNombre}` })}
                          className="text-amber-600 hover:underline font-bold text-[11px]"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-slate-400">Sin foto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {item.fotoPruebaUrl ? (
                        pruebaVencida24h ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Expirada (&gt;24h)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalFoto({ url: item.fotoPruebaUrl!, titulo: `Prueba Reactiva - ${item.conductorNombre}` })}
                            className="text-blue-600 hover:underline font-bold text-[11px]"
                          >
                            Ver Prueba
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400">Sin foto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {enPeriodoGracia ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                          Gracia ({LIMITE_TOTAL_DIAS - diasTranscurridos}d descarga)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-[11px]">
                          {RETENCION_VISTA_DIAS - diasTranscurridos} días activos
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
          onClick={() => setSeccion('planilla')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            seccion === 'planilla'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Planilla Tests (30d + Excel)
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

          {renderTablaPlanilla()}
        </div>
      )}

      {seccion === 'planilla' && (
        <div className="space-y-4">
          {renderTablaPlanilla()}
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
              setSeccion('planilla');
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

      {/* Modal para ver fotos de credencial o prueba reactiva */}
      {modalFoto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="text-xs font-bold text-slate-800">{modalFoto.titulo}</h4>
              <button
                type="button"
                onClick={() => setModalFoto(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-200">
              <img src={modalFoto.url} alt="Evidencia" className="max-h-72 object-contain rounded-lg" />
            </div>
            <button
              type="button"
              onClick={() => setModalFoto(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </ResponsiveLayout>
  );
}