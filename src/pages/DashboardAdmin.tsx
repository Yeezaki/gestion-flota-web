import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

import TabReportes from '../components/admin/TabReportes';
import TabFlota from '../components/admin/TabFlota';
import TabQRs from '../components/admin/TabQRs';
import TabAgenda from '../components/admin/TabAgenda';
import TabEstadisticas from '../components/admin/TabEstadisticas';
import TabUsuarios from '../components/admin/TabUsuarios';
import TabAuditoria from '../components/admin/TabAuditoria';

import { TabAuditoriaSeguridad } from '../components/admin/TabAuditoriaSeguridad';
import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import { ModuloTorreControl } from '../components/torreControl/ModuloTorreControl';

import type {
  FirmaDocumento,
  RegistroAlcoholDrogas,
  EvidenciaEvalProcedimiento,
  EvaluacionEmergenciaRegistro,
  ReporteVelocidadGPS
} from '../constants';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [pestanaActiva, setPestanaActiva] = useState('reportes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState('todos');

  const [firmasDocumentos, setFirmasDocumentos] = useState<FirmaDocumento[]>([]);
  const [registrosAlcohol, setRegistrosAlcohol] = useState<RegistroAlcoholDrogas[]>([]);
  const [evidenciasProcedimiento, setEvidenciasProcedimiento] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [evaluacionesEmergencia, setEvaluacionesEmergencia] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [reportesGPS, setReportesGPS] = useState<ReporteVelocidadGPS[]>([]);

  const [subPestanaSeguridad, setSubPestanaSeguridad] = useState<'auditoria' | 'nuevo_alcohol' | 'nuevo_procedimiento' | 'nuevo_gps'>('auditoria');

  useEffect(() => {
    const qFirmas = query(collection(db, 'firmas_documentos'), orderBy('creadoEn', 'desc'));
    const unsubFirmas = onSnapshot(qFirmas, (snap) => {
      setFirmasDocumentos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirmaDocumento)));
    }, () => {});

    const qAlcohol = query(collection(db, 'controles_alcohol_drogas'), orderBy('fechaControl', 'desc'));
    const unsubAlcohol = onSnapshot(qAlcohol, (snap) => {
      setRegistrosAlcohol(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RegistroAlcoholDrogas)));
    }, () => {});

    const qProc = query(collection(db, 'evaluaciones_procedimiento'), orderBy('fechaEvaluacion', 'desc'));
    const unsubProc = onSnapshot(qProc, (snap) => {
      setEvidenciasProcedimiento(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvidenciaEvalProcedimiento)));
    }, () => {});

    const qEmerg = query(collection(db, 'evaluaciones_emergencia'), orderBy('creadoEn', 'desc'));
    const unsubEmerg = onSnapshot(qEmerg, (snap) => {
      setEvaluacionesEmergencia(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluacionEmergenciaRegistro)));
    }, () => {});

    const qGPS = query(collection(db, 'reportes_gps_velocidad'), orderBy('fechaRecorrido', 'desc'));
    const unsubGPS = onSnapshot(qGPS, (snap) => {
      setReportesGPS(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReporteVelocidadGPS)));
    }, () => {});

    return () => {
      unsubFirmas();
      unsubAlcohol();
      unsubProc();
      unsubEmerg();
      unsubGPS();
    };
  }, []);

  const manejarCerrarSesion = async () => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: user?.email || 'Desconocido',
        accion: 'CIERRE_SESION',
        detalles: 'El administrador cerró su sesión',
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error("Error al guardar en el historial", e);
    }
    await signOut(auth);
    navigate('/login');
  };

  const handleGuardarAlcohol = async (nuevoRegistro: RegistroAlcoholDrogas) => {
    const { id, ...datosSinId } = nuevoRegistro;
    await addDoc(collection(db, 'controles_alcohol_drogas'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSubPestanaSeguridad('auditoria');
  };

  const handleGuardarProcedimiento = async (nuevoRegistro: EvidenciaEvalProcedimiento) => {
    const { id, ...datosSinId } = nuevoRegistro;
    await addDoc(collection(db, 'evaluaciones_procedimiento'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSubPestanaSeguridad('auditoria');
  };

  const handleGuardarReporteGPS = async (reporte: ReporteVelocidadGPS) => {
    const { id, ...datosSinId } = reporte;
    await addDoc(collection(db, 'reportes_gps_velocidad'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSubPestanaSeguridad('auditoria');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 z-10 relative overflow-hidden">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-6">
          <div><h1 className="text-3xl font-black text-slate-800">Panel de Control</h1></div>
          
          <div className="w-full md:w-auto flex-1 max-w-2xl mx-auto md:mx-4 flex gap-2">
            <input type="text" placeholder="Buscar patente... Ej: AB12" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white shadow-sm" />
            <select 
              value={filtroTipoVehiculo} 
              onChange={(e) => setFiltroTipoVehiculo(e.target.value)} 
              className="p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white shadow-sm font-bold text-slate-600 min-w-[150px]"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Tracto camión">Tracto camión</option>
              <option value="Semirremolque">Semirremolque</option>
              <option value="Camioneta">Camioneta</option>
            </select>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Link to="/generador" className="flex-1 bg-white text-blue-600 border-2 border-blue-600 font-bold py-3 px-6 rounded-xl hover:bg-blue-50 transition-all text-center">Agregar Vehículo</Link>
            <button onClick={manejarCerrarSesion} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-300 transition-all text-center">Salir</button>
          </div>
        </div>

        <div className="flex space-x-4 mb-8 overflow-x-auto pb-2 scrollbar-none">
          <button onClick={() => setPestanaActiva('reportes')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'reportes' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Historial</button>
          <button onClick={() => setPestanaActiva('vehiculos')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'vehiculos' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Flota</button>
          <button onClick={() => setPestanaActiva('qrs')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'qrs' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Códigos QR</button>
          <button onClick={() => setPestanaActiva('agenda')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'agenda' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Agenda Taller</button>
          <button onClick={() => setPestanaActiva('estadisticas')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'estadisticas' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Estadísticas</button>
          <button onClick={() => setPestanaActiva('usuarios')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'usuarios' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Usuarios</button>
          <button onClick={() => setPestanaActiva('auditoria')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'auditoria' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Auditoría</button>
          <button onClick={() => setPestanaActiva('seguridad')} className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${pestanaActiva === 'seguridad' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>Seguridad y Torre de Control</button>
        </div>

        {pestanaActiva === 'reportes' && <TabReportes busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'vehiculos' && <TabFlota busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'qrs' && <TabQRs busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'agenda' && <TabAgenda />}
        {pestanaActiva === 'estadisticas' && <TabEstadisticas />}
        {pestanaActiva === 'usuarios' && <TabUsuarios />}
        {pestanaActiva === 'auditoria' && <TabAuditoria />}

        {pestanaActiva === 'seguridad' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Gestión Operativa de Prevención y Telemática
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSubPestanaSeguridad('auditoria')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    subPestanaSeguridad === 'auditoria'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Panel de Auditoría
                </button>
                <button
                  type="button"
                  onClick={() => setSubPestanaSeguridad('nuevo_alcohol')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    subPestanaSeguridad === 'nuevo_alcohol'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + Cargar Control Alcohol/Drogas
                </button>
                <button
                  type="button"
                  onClick={() => setSubPestanaSeguridad('nuevo_procedimiento')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    subPestanaSeguridad === 'nuevo_procedimiento'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + Cargar Evidencia Procedimiento
                </button>
                <button
                  type="button"
                  onClick={() => setSubPestanaSeguridad('nuevo_gps')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    subPestanaSeguridad === 'nuevo_gps'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  + Cargar Archivo GPS (Torre Control)
                </button>
              </div>
            </div>

            {subPestanaSeguridad === 'auditoria' && (
              <TabAuditoriaSeguridad
                firmasDocumentos={firmasDocumentos}
                registrosAlcohol={registrosAlcohol}
                evidenciasProcedimiento={evidenciasProcedimiento}
                evaluacionesEmergencia={evaluacionesEmergencia}
                reportesGPS={reportesGPS}
              />
            )}

            {subPestanaSeguridad === 'nuevo_alcohol' && (
              <FormAlcoholDrogas
                evaluadorUid={auth.currentUser?.uid || 'admin-uid'}
                evaluadorNombre={auth.currentUser?.email || 'Administrador'}
                onGuardar={handleGuardarAlcohol}
              />
            )}

            {subPestanaSeguridad === 'nuevo_procedimiento' && (
              <FormEvidenciaProcedimiento
                evaluadorUid={auth.currentUser?.uid || 'admin-uid'}
                evaluadorNombre={auth.currentUser?.email || 'Administrador'}
                onGuardar={handleGuardarProcedimiento}
              />
            )}

            {subPestanaSeguridad === 'nuevo_gps' && (
              <ModuloTorreControl
                usuarioUid={auth.currentUser?.uid || 'torre-uid'}
                usuarioNombre={auth.currentUser?.email || 'Torre de Control'}
                onGuardarReporte={handleGuardarReporteGPS}
              />
            )}
          </div>
        )}

      </div>
    </div>
  );
}