import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import { PlanillaControlesDrogas } from '../components/prevencion/PlanillaControlesDrogas';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
import { liberarBloqueoPVT } from '../services/pvtLockService';
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

interface CitacionControlDroga {
  id: string;
  conductorNombre?: string;
  conductorRut?: string;
  patente?: string;
  estado?: string;
  fechaSeleccion?: any;
  tipoSeleccion?: string;
}

interface ItemBloqueoUnificado {
  id: string;
  rut: string;
  nombre: string;
  patente: string;
  nivelRiesgo: string;
  minutosEspera: number;
  bloqueadoHasta: number;
  origen: 'bloqueos_pvt' | 'reportes';
  activo: boolean;
}

export default function DashboardPrevencion() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState<'kpi' | 'planilla' | 'bloqueos_pvt' | 'preguntas' | 'alcohol' | 'procedimiento'>('kpi');

  const [alcoholList, setAlcoholList] = useState<RegistroAlcoholDrogas[]>([]);
  const [citadosPendientes, setCitadosPendientes] = useState<CitacionControlDroga[]>([]);
  const [bloqueosUnificados, setBloqueosUnificados] = useState<ItemBloqueoUnificado[]>([]);
  const [procList, setProcList] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [emergenciasList, setEmergenciasList] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [preguntasPrevencion, setPreguntasPrevencion] = useState<PreguntaPrevencionAdmin[]>([]);

  const [nuevaPreguntaTexto, setNuevaPreguntaTexto] = useState('');
  const [nuevaPreguntaCritica, setNuevaPreguntaCritica] = useState(true);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);

  const [ahora, setAhora] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 1. Escuchar citaciones de Drogas y Controles completados
    const unsubControles = onSnapshot(collection(db, 'controles_alcohol_drogas'), (s) => {
      const docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));

      const pendientes = docs
        .filter((d: any) => d.estado === 'pendiente' || (!d.resultado && d.fechaSeleccion))
        .sort((a: any, b: any) => {
          const tA = a.fechaSeleccion?.toMillis?.() || 0;
          const tB = b.fechaSeleccion?.toMillis?.() || 0;
          return tB - tA;
        }) as CitacionControlDroga[];
      setCitadosPendientes(pendientes);

      const completados = docs
        .filter((d: any) => d.estado !== 'pendiente' && d.resultado)
        .sort((a: any, b: any) => {
          const tA = a.fechaTimestamp || (a.fechaControl ? new Date(a.fechaControl).getTime() : 0);
          const tB = b.fechaTimestamp || (b.fechaControl ? new Date(b.fechaControl).getTime() : 0);
          return tB - tA;
        }) as RegistroAlcoholDrogas[];
      setAlcoholList(completados);
    });

    // 2. Escuchar bloqueos PVT directos y reportes con fallo cognitivo para unificarlos
    let bloqueosDirectos: ItemBloqueoUnificado[] = [];
    let reportesBloqueados: ItemBloqueoUnificado[] = [];

    const combinarListas = () => {
      const mapa = new Map<string, ItemBloqueoUnificado>();
      [...bloqueosDirectos, ...reportesBloqueados].forEach((item) => {
        const clave = item.rut || item.id;
        if (!mapa.has(clave)) {
          mapa.set(clave, item);
        } else {
          // Mantener el que tenga mayor tiempo de bloqueo
          const existente = mapa.get(clave)!;
          if (item.bloqueadoHasta > existente.bloqueadoHasta) {
            mapa.set(clave, item);
          }
        }
      });
      setBloqueosUnificados(Array.from(mapa.values()));
    };

    const unsubBloqueos = onSnapshot(collection(db, 'bloqueos_pvt'), (s) => {
      bloqueosDirectos = s.docs.map((d) => {
        const data = d.data();
        const rut = data.rut || data.conductorRut || d.id;
        const nombre = data.nombreConductor || data.conductorNombre || data.nombre || 'Conductor';
        const patente = data.patente || 'N/A';
        const nivelRiesgo = data.nivelRiesgo || data.rangoRiesgo || 'medio';
        const minutosEspera = Number(data.tiempoEsperaMinutos || data.minutosEsperaPVT || 15);
        const hasta = typeof data.bloqueadoHasta === 'number'
          ? data.bloqueadoHasta
          : data.bloqueadoHasta?.toMillis?.() || (Date.now() + minutosEspera * 60000);

        return {
          id: d.id,
          rut,
          nombre,
          patente,
          nivelRiesgo,
          minutosEspera,
          bloqueadoHasta: hasta,
          origen: 'bloqueos_pvt' as const,
          activo: data.activo !== false
        };
      });
      combinarListas();
    });

    const qReportesPVT = query(
      collection(db, 'reportes'),
      where('bloqueoPorTestCognitivo', '==', true),
      orderBy('fecha', 'desc')
    );

    const unsubReportesPVT = onSnapshot(qReportesPVT, (s) => {
      reportesBloqueados = s.docs.map((d) => {
        const data = d.data();
        const rut = data.conductorRut || 'Sin RUT';
        const nombre = data.conductorNombre || 'Conductor';
        const patente = data.vehiculoId || 'N/A';
        const nivelRiesgo = data.nivelRiesgoPVT || 'medio';
        const minutos = Number(data.minutosEsperaPVT || 15);
        const fechaBase = data.fecha?.toMillis?.() || Date.now();
        const hasta = fechaBase + (minutos * 60 * 1000);

        return {
          id: d.id,
          rut,
          nombre,
          patente,
          nivelRiesgo,
          minutosEspera: minutos,
          bloqueadoHasta: hasta,
          origen: 'reportes' as const,
          activo: true
        };
      });
      combinarListas();
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
      unsubControles();
      unsubBloqueos();
      unsubReportesPVT();
      unsubP();
      unsubE();
      unsubPreguntas();
    };
  }, []);

  const conductoresEnReposoActivo = bloqueosUnificados.filter((item) => {
    return item.activo && item.bloqueadoHasta > ahora;
  });

  const handleLiberarPVT = async (item: ItemBloqueoUnificado) => {
    const confirmar = window.confirm(
      `¿Desea levantar anticipadamente el reposo obligatorio para ${item.nombre} (${item.rut})?`
    );
    if (!confirmar) return;

    try {
      if (item.origen === 'bloqueos_pvt') {
        await liberarBloqueoPVT(item.rut);
      } else {
        await updateDoc(doc(db, 'reportes', item.id), {
          bloqueoPorTestCognitivo: false,
          liberadoPorPrevencion: true
        });
      }

      await addDoc(collection(db, 'historial_acciones'), {
        usuario: auth.currentUser?.email || 'Prevencionista',
        accion: 'LIBERACION_PVT_MANUAL',
        detalles: `Prevención levantó el reposo de fatiga a ${item.nombre} (${item.rut})`,
        fecha: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al liberar bloqueo:', error);
      alert('No se pudo levantar el bloqueo. Verifique su conexión.');
    }
  };

  const handleEliminarCitacion = async (id: string) => {
    if (window.confirm('¿Desea descartar esta citación de control?')) {
      await deleteDoc(doc(db, 'controles_alcohol_drogas', id));
    }
  };

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

  const getBadgesColor = (nivel: string) => {
    switch ((nivel || '').toLowerCase()) {
      case 'alto':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medio-alto':
      case 'medio_alto':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  const renderTablaCitados = () => (
    <div className="bg-white rounded-2xl border border-amber-300 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Conductores Citados a Control de Alcohol y Drogas
            </h3>
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Conductores seleccionados en inicio de sesión que deben acudir a toma de muestra.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSeccion('alcohol')}
          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
        >
          + Registrar Control
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[650px]">
          <thead className="bg-amber-50 text-amber-900 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Conductor</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Patente</th>
              <th className="p-3">Fecha Citación</th>
              <th className="p-3">Motivo</th>
              <th className="p-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {citadosPendientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-5 text-center text-slate-400 font-medium">
                  No hay conductores pendientes de control en este momento.
                </td>
              </tr>
            ) : (
              citadosPendientes.map((item) => {
                const fechaTexto = item.fechaSeleccion?.toDate
                  ? item.fechaSeleccion.toDate().toLocaleString('es-CL')
                  : 'Reciente';

                return (
                  <tr key={item.id} className="hover:bg-amber-50/40">
                    <td className="p-3 font-bold text-slate-800">{item.conductorNombre || 'Conductor'}</td>
                    <td className="p-3 font-mono">{item.conductorRut || 'N/A'}</td>
                    <td className="p-3 font-mono text-slate-700">{item.patente || 'N/A'}</td>
                    <td className="p-3 text-slate-600">{fechaTexto}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        {item.tipoSeleccion || 'Obligatorio / Pruebas'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSeccion('alcohol')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors"
                        >
                          Aplicar Test
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminarCitacion(item.id)}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 text-[11px] font-semibold"
                        >
                          Descartar
                        </button>
                      </div>
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

  const renderTablaPVT = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Conductores en Reposo por Fatiga (Test PVT Fallido)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Conductores restringidos por evaluación psicomotriz con tiempo de reposo reglamentario en curso.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Conductor</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Patente</th>
              <th className="p-3">Nivel Riesgo</th>
              <th className="p-3">Tiempo Total</th>
              <th className="p-3 text-center">Estado / Restante</th>
              <th className="p-3 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bloqueosUnificados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                  No hay conductores en reposo por PVT actualmente.
                </td>
              </tr>
            ) : (
              bloqueosUnificados.map((item) => {
                const minutosRestantes = Math.max(0, Math.ceil((item.bloqueadoHasta - ahora) / (1000 * 60)));
                const enReposo = item.activo && minutosRestantes > 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{item.nombre}</td>
                    <td className="p-3 font-mono">{item.rut}</td>
                    <td className="p-3 font-mono text-slate-600">{item.patente}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgesColor(item.nivelRiesgo)}`}>
                        {item.nivelRiesgo}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{item.minutosEspera} min</td>
                    <td className="p-3 text-center">
                      {enReposo ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-100 text-rose-800 border-rose-300">
                          En Reposo ({minutosRestantes} min)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                          Reposo Cumplido
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleLiberarPVT(item)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded-lg transition-colors font-bold"
                      >
                        Liberar
                      </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className={`p-4 rounded-2xl border shadow-sm ${
              conductoresEnReposoActivo.length > 0 ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase">En Reposo (PVT)</span>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${
                conductoresEnReposoActivo.length > 0 ? 'text-rose-700' : 'text-slate-800'
              }`}>
                {conductoresEnReposoActivo.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Fatiga activa detectada</p>
            </div>

            <div className={`p-4 rounded-2xl border shadow-sm ${
              citadosPendientes.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase">Citados Drogas / Alc.</span>
              <div className={`text-2xl sm:text-3xl font-black mt-1 ${
                citadosPendientes.length > 0 ? 'text-amber-700' : 'text-slate-800'
              }`}>
                {citadosPendientes.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pendientes de examen</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tests Realizados</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{alcoholList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Evaluaciones registradas</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Supervisiones</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{procList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Evidencias en terreno</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Emergencias</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{emergenciasList.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Checklists en ruta</p>
            </div>
          </div>

          {citadosPendientes.length > 0 && renderTablaCitados()}

          {renderTablaPVT()}

          <PlanillaControlesDrogas controles={alcoholList} />
        </div>
      )}

      {seccion === 'planilla' && (
        <div className="space-y-4">
          {citadosPendientes.length > 0 && renderTablaCitados()}
          <PlanillaControlesDrogas controles={alcoholList} />
        </div>
      )}

      {seccion === 'bloqueos_pvt' && (
        <div className="space-y-4">
          {renderTablaPVT()}
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
    </ResponsiveLayout>
  );
}