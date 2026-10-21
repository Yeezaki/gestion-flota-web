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

import { FormAlcoholDrogas } from '../components/prevencion/FormAlcoholDrogas';
import { FormEvidenciaProcedimiento } from '../components/prevencion/FormEvidenciaProcedimiento';
import { TablaBloqueosPVT } from '../components/prevencion/TablaBloqueosPVT';
import { ModuloTorreControl } from '../components/torreControl/ModuloTorreControl';
import DashboardTaller from './DashboardTaller';
import GeneradorQR from './GeneradorQR';

import type {
  FirmaDocumento,
  RegistroAlcoholDrogas,
  EvidenciaEvalProcedimiento,
  EvaluacionEmergenciaRegistro,
  ReporteVelocidadGPS
} from '../constants';
import { SAFETY_DOCUMENTS } from '../constants';

interface UsuarioPlataforma {
  id: string;
  email?: string;
  nombre?: string;
  rol?: string;
  activo?: boolean;
  ultimoAcceso?: any;
}

export default function DashboardAdmin() {
  const navigate = useNavigate();

  // Pestanas de gestion general del Admin
  const [pestanaActiva, setPestanaActiva] = useState<
    'reportes' | 'vehiculos' | 'qrs' | 'agenda' | 'estadisticas' | 'usuarios' | 'auditoria' | 'vistas_roles'
  >('reportes');

  // Selector de lista desplegable para las vistas por rol
  const [vistaRolSeleccionada, setVistaRolSeleccionada] = useState<
    'resumen' | 'prevencion' | 'torre' | 'taller' | 'generador'
  >('resumen');

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState('todos');

  // Datos en tiempo real
  const [reportesDiarios, setReportesDiarios] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [citasTaller, setCitasTaller] = useState<any[]>([]);
  const [firmasDocumentos, setFirmasDocumentos] = useState<FirmaDocumento[]>([]);
  const [registrosAlcohol, setRegistrosAlcohol] = useState<RegistroAlcoholDrogas[]>([]);
  const [evidenciasProcedimiento, setEvidenciasProcedimiento] = useState<EvidenciaEvalProcedimiento[]>([]);
  const [evaluacionesEmergencia, setEvaluacionesEmergencia] = useState<EvaluacionEmergenciaRegistro[]>([]);
  const [reportesGPS, setReportesGPS] = useState<ReporteVelocidadGPS[]>([]);
  const [usuariosSistema, setUsuariosSistema] = useState<UsuarioPlataforma[]>([]);

  // Filtro de usuarios en el visor general
  const [filtroRolUsuarios, setFiltroRolUsuarios] = useState<string>('todos');
  const [busquedaUsuario, setBusquedaUsuario] = useState<string>('');

  // Sub-estados internos para Prevencion y Torre
  const [subPestanaPrevencion, setSubPestanaPrevencion] = useState<
    'bloqueos_pvt' | 'documentos' | 'alcohol' | 'procedimientos' | 'emergencias' | 'nuevo_alcohol' | 'nuevo_procedimiento'
  >('bloqueos_pvt');

  const [modoTorre, setModoTorre] = useState<'historial' | 'cargar_gps'>('historial');
  const [modalFirmaPreview, setModalFirmaPreview] = useState<string | null>(null);

  useEffect(() => {
    const unsubReportes = onSnapshot(query(collection(db, 'reportes'), orderBy('fecha', 'desc')), (snap) => {
      setReportesDiarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubVehiculos = onSnapshot(collection(db, 'vehiculos'), (snap) => {
      setVehiculos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubCitas = onSnapshot(query(collection(db, 'citas_taller'), orderBy('fecha', 'desc')), (snap) => {
      setCitasTaller(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});

    const unsubFirmas = onSnapshot(query(collection(db, 'firmas_documentos'), orderBy('creadoEn', 'desc')), (snap) => {
      setFirmasDocumentos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirmaDocumento)));
    }, () => {});

    const unsubAlcohol = onSnapshot(query(collection(db, 'controles_alcohol_drogas'), orderBy('fechaControl', 'desc')), (snap) => {
      setRegistrosAlcohol(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RegistroAlcoholDrogas)));
    }, () => {});

    const unsubProc = onSnapshot(query(collection(db, 'evaluaciones_procedimiento'), orderBy('fechaEvaluacion', 'desc')), (snap) => {
      setEvidenciasProcedimiento(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvidenciaEvalProcedimiento)));
    }, () => {});

    const unsubEmerg = onSnapshot(query(collection(db, 'evaluaciones_emergencia'), orderBy('creadoEn', 'desc')), (snap) => {
      setEvaluacionesEmergencia(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EvaluacionEmergenciaRegistro)));
    }, () => {});

    const unsubGPS = onSnapshot(query(collection(db, 'reportes_gps_velocidad'), orderBy('fechaRecorrido', 'desc')), (snap) => {
      setReportesGPS(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReporteVelocidadGPS)));
    }, () => {});

    const unsubUsuarios = onSnapshot(collection(db, 'usuarios'), (snap) => {
      setUsuariosSistema(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UsuarioPlataforma)));
    }, () => {});

    return () => {
      unsubReportes();
      unsubVehiculos();
      unsubCitas();
      unsubFirmas();
      unsubAlcohol();
      unsubProc();
      unsubEmerg();
      unsubGPS();
      unsubUsuarios();
    };
  }, []);

  const manejarCerrarSesion = async () => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: user?.email || 'Desconocido',
        rol: 'admin',
        accion: 'CIERRE_SESION',
        detalles: 'El administrador cerro su sesion',
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error('Error al guardar en el historial', e);
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
    setSubPestanaPrevencion('alcohol');
  };

  const handleGuardarProcedimiento = async (nuevoRegistro: EvidenciaEvalProcedimiento) => {
    const { id, ...datosSinId } = nuevoRegistro;
    await addDoc(collection(db, 'evaluaciones_procedimiento'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setSubPestanaPrevencion('procedimientos');
  };

  const handleGuardarReporteGPS = async (reporte: ReporteVelocidadGPS) => {
    const { id, ...datosSinId } = reporte;
    await addDoc(collection(db, 'reportes_gps_velocidad'), {
      ...datosSinId,
      creadoEn: serverTimestamp()
    });
    setModoTorre('historial');
  };

  // Metricas calculadas
  const totalExcesosGPS = reportesGPS.reduce((acc, r) => acc + (r.excesosVelocidadDetectados || 0), 0);
  const totalKmGPS = Math.round(reportesGPS.reduce((acc, r) => acc + (r.kilometrajeTotalKm || 0), 0));
  const velPromedioGPS = reportesGPS.length > 0
    ? Math.round((reportesGPS.reduce((acc, r) => acc + r.velocidadMediaKmh, 0) / reportesGPS.length) * 10) / 10
    : 0;

  const totalBloqueados = reportesDiarios.filter((r) => r.bloqueado).length;
  const citasPendientes = citasTaller.filter((c) => c.estado === 'pendiente').length;

  // Filtrado de usuarios por rol y busqueda de texto
  const usuariosFiltrados = usuariosSistema.filter((u) => {
    const rolTexto = (u.rol || '').toLowerCase();
    let cumpleRol = false;

    if (filtroRolUsuarios === 'todos') {
      cumpleRol = true;
    } else if (filtroRolUsuarios === 'generador') {
      cumpleRol = rolTexto.includes('generador') || rolTexto.includes('qr');
    } else {
      cumpleRol = rolTexto.includes(filtroRolUsuarios.toLowerCase());
    }

    const queryStr = busquedaUsuario.toLowerCase();
    const cumpleBusqueda =
      !queryStr ||
      (u.nombre && u.nombre.toLowerCase().includes(queryStr)) ||
      (u.email && u.email.toLowerCase().includes(queryStr));

    return cumpleRol && cumpleBusqueda;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        
        {/* Encabezado General */}
        <header className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Consola Central Multi-Rol
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-1.5">
                Panel de Control Administrador
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Supervision global de flota, operaciones, seguridad y telematica
              </p>
            </div>

            {/* Busqueda y Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:max-w-xl">
              <input
                type="text"
                placeholder="Buscar patente (Ej: AB12)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-3.5 py-2.5 sm:py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50/50 hover:bg-white text-xs sm:text-sm transition-all"
              />
              <select
                value={filtroTipoVehiculo}
                onChange={(e) => setFiltroTipoVehiculo(e.target.value)}
                className="py-2.5 sm:py-3 px-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-semibold text-xs sm:text-sm text-slate-700 shadow-sm cursor-pointer"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="Tracto camión">Tracto camion</option>
                <option value="Semirremolque">Semirremolque</option>
                <option value="Camioneta">Camioneta</option>
              </select>
            </div>

            {/* Botones de Cabecera */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto">
              <Link
                to="/generador"
                className="flex-1 lg:flex-none text-center bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-2.5 sm:py-3 px-4 rounded-2xl transition-all shadow-sm text-xs sm:text-sm"
              >
                + Agregar Vehiculo
              </Link>
              <button
                type="button"
                onClick={manejarCerrarSesion}
                className="flex-1 lg:flex-none text-center bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold py-2.5 sm:py-3 px-4 rounded-2xl transition-all text-xs sm:text-sm"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* Tarjetas KPI de Resumen General */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Flota Total</span>
            <div className="text-xl sm:text-3xl font-black text-slate-800 mt-1">{vehiculos.length}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Vehiculos en plataforma</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Bloqueos Checklists</span>
            <div className={`text-xl sm:text-3xl font-black mt-1 ${totalBloqueados > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalBloqueados}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Alertas criticas detectadas</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Excesos GPS</span>
            <div className={`text-xl sm:text-3xl font-black mt-1 ${totalExcesosGPS > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {totalExcesosGPS}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{totalKmGPS.toLocaleString('es-CL')} km monitoreados</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">OTs Taller Pendientes</span>
            <div className="text-xl sm:text-3xl font-black text-indigo-600 mt-1">{citasPendientes}</div>
            <p className="text-[10px] text-slate-400 mt-0.5">Ingresos en espera</p>
          </div>
        </section>

        {/* Barra de Pestanas con Navegacion Adaptativa */}
        <nav aria-label="Navegacion principal" className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 touch-pan-x">
            <button
              type="button"
              onClick={() => setPestanaActiva('reportes')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'reportes' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('vehiculos')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'vehiculos' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Flota
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('qrs')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'qrs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Codigos QR
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('agenda')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'agenda' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Agenda Taller
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('estadisticas')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'estadisticas' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Estadisticas
            </button>

            {/* Conmutador de Vistas por Rol */}
            <button
              type="button"
              onClick={() => setPestanaActiva('vistas_roles')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                pestanaActiva === 'vistas_roles'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Visor de Vistas por Rol
            </button>

            <button
              type="button"
              onClick={() => setPestanaActiva('usuarios')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'usuarios' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => setPestanaActiva('auditoria')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                pestanaActiva === 'auditoria' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Auditoria
            </button>
          </div>
        </nav>

        {/* Contenido Principal */}
        <main className="space-y-6">
          {pestanaActiva === 'reportes' && <TabReportes busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
          {pestanaActiva === 'vehiculos' && <TabFlota busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
          {pestanaActiva === 'qrs' && <TabQRs busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
          {pestanaActiva === 'agenda' && <TabAgenda />}
          {pestanaActiva === 'estadisticas' && <TabEstadisticas />}
          {pestanaActiva === 'usuarios' && <TabUsuarios />}
          {pestanaActiva === 'auditoria' && <TabAuditoria />}

          {/* VISOR DE VISTAS POR ROL CON LISTA DESPLEGABLE */}
          {pestanaActiva === 'vistas_roles' && (
            <div className="space-y-6">
              
              <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Explorador de Vistas de Modulos
                    </h2>
                    <p className="text-xs text-slate-500">
                      Selecciona desde la lista que vista operativa deseas inspeccionar o gestionar directamente.
                    </p>
                  </div>
                  
                  {/* Selector de lista desplegable para las vistas */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="select-vista-rol" className="text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">
                      Vista activa:
                    </label>
                    <select
                      id="select-vista-rol"
                      value={vistaRolSeleccionada}
                      onChange={(e) => setVistaRolSeleccionada(e.target.value as any)}
                      className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="resumen">Resumen General y Usuarios</option>
                      <option value="torre">Torre de Control (Telematica GPS)</option>
                      <option value="prevencion">Prevencion de Riesgos (Fatiga PVT y Alcohol)</option>
                      <option value="taller">Taller Mecanico (Mantenimiento y OTs)</option>
                      <option value="generador">Generador QR (Ingreso de Vehiculos)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* VISTA 1: MATRIZ RESUMEN Y DIRECTORIO CENTRALIZADO DE USUARIOS */}
              {vistaRolSeleccionada === 'resumen' && (
                <div className="space-y-6">
                  {/* Tarjetas resumen de metricas operativas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">Torre de Control</span>
                        <button type="button" onClick={() => setVistaRolSeleccionada('torre')} className="text-xs font-bold text-indigo-600 hover:underline">Ir a vista</button>
                      </div>
                      <div className="text-2xl font-black text-slate-800">{reportesGPS.length}</div>
                      <p className="text-xs text-slate-500">Recorridos telemetricos registrados</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">Prevencion</span>
                        <button type="button" onClick={() => setVistaRolSeleccionada('prevencion')} className="text-xs font-bold text-amber-600 hover:underline">Ir a vista</button>
                      </div>
                      <div className="text-2xl font-black text-slate-800">{registrosAlcohol.length + evidenciasProcedimiento.length}</div>
                      <p className="text-xs text-slate-500">Controles preventivos efectuados</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">Taller Mecanico</span>
                        <button type="button" onClick={() => setVistaRolSeleccionada('taller')} className="text-xs font-bold text-blue-600 hover:underline">Ir a vista</button>
                      </div>
                      <div className="text-2xl font-black text-slate-800">{citasTaller.length}</div>
                      <p className="text-xs text-slate-500">Ordenes de trabajo en sistema</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Generador QR</span>
                        <button type="button" onClick={() => setVistaRolSeleccionada('generador')} className="text-xs font-bold text-emerald-600 hover:underline">Ir a vista</button>
                      </div>
                      <div className="text-2xl font-black text-slate-800">{vehiculos.length}</div>
                      <p className="text-xs text-slate-500">Vehiculos con pauta QR activa</p>
                    </div>
                  </div>

                  {/* Panel Centralizado de Usuarios de Roles y Vistas */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800">
                          Directorio de Usuarios de las Vistas y Modulos
                        </h3>
                        <p className="text-xs text-slate-500">
                          Visualiza los usuarios registrados en cada area operativa (Taller, Prevencion, Torre y Generador QR).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          placeholder="Buscar usuario o correo..."
                          value={busquedaUsuario}
                          onChange={(e) => setBusquedaUsuario(e.target.value)}
                          className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full sm:w-48"
                        />
                        <select
                          value={filtroRolUsuarios}
                          onChange={(e) => setFiltroRolUsuarios(e.target.value)}
                          className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 bg-white cursor-pointer"
                        >
                          <option value="todos">Todos los Roles</option>
                          <option value="taller">Taller Mecanico</option>
                          <option value="prevencion">Prevencion de Riesgos</option>
                          <option value="torre">Torre de Control</option>
                          <option value="generador">Generador QR</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[600px]">
                        <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-3">Nombre / Identificador</th>
                            <th className="p-3">Correo Electronico</th>
                            <th className="p-3">Rol Asignado</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3 text-center">Acceso Rapido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {usuariosFiltrados.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400">
                                No se encontraron usuarios para los filtros seleccionados.
                              </td>
                            </tr>
                          ) : (
                            usuariosFiltrados.map((u) => {
                              const rolTexto = (u.rol || 'Sin Rol').toLowerCase();
                              return (
                                <tr key={u.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-slate-800">{u.nombre || 'Usuario sin nombre'}</td>
                                  <td className="p-3 font-mono text-slate-600">{u.email || 'N/A'}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                      {u.rol || 'Sin Rol'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      u.activo !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {u.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {rolTexto.includes('taller') && (
                                      <button onClick={() => setVistaRolSeleccionada('taller')} className="text-blue-600 hover:underline font-bold text-[11px]">Ver Taller</button>
                                    )}
                                    {rolTexto.includes('prevencion') && (
                                      <button onClick={() => setVistaRolSeleccionada('prevencion')} className="text-amber-600 hover:underline font-bold text-[11px]">Ver Prevencion</button>
                                    )}
                                    {rolTexto.includes('torre') && (
                                      <button onClick={() => setVistaRolSeleccionada('torre')} className="text-indigo-600 hover:underline font-bold text-[11px]">Ver Torre</button>
                                    )}
                                    {(rolTexto.includes('generador') || rolTexto.includes('qr')) && (
                                      <button onClick={() => setVistaRolSeleccionada('generador')} className="text-emerald-600 hover:underline font-bold text-[11px]">Ver Generador</button>
                                    )}
                                    {!rolTexto.includes('taller') && !rolTexto.includes('prevencion') && !rolTexto.includes('torre') && !rolTexto.includes('generador') && !rolTexto.includes('qr') && (
                                      <span className="text-slate-400 text-[11px]">General</span>
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
                </div>
              )}

              {/* VISTA 2: TORRE DE CONTROL */}
              {vistaRolSeleccionada === 'torre' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Vista de Torre de Control (Monitoreo Telematico)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Revision de velocidades, excesos de velocidad y carga de telemetria GPS.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoTorre(modoTorre === 'historial' ? 'cargar_gps' : 'historial')}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                      >
                        {modoTorre === 'historial' ? '+ Cargar Archivo GPS' : 'Ver Historial GPS'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Velocidad Promedio</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{velPromedioGPS} km/h</div>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Excesos Detectados</span>
                        <div className={`text-xl sm:text-2xl font-black mt-0.5 ${totalExcesosGPS > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {totalExcesosGPS}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Distancia GPS</span>
                        <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-0.5">{totalKmGPS} km</div>
                      </div>
                    </div>
                  </div>

                  {modoTorre === 'cargar_gps' ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <ModuloTorreControl
                        usuarioUid={auth.currentUser?.uid || 'admin-uid'}
                        usuarioNombre={auth.currentUser?.email || 'Administrador'}
                        onGuardarReporte={handleGuardarReporteGPS}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                        Historial Telematico GPS
                      </h4>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs min-w-[680px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-3">Patente</th>
                              <th className="p-3">Conductor</th>
                              <th className="p-3">Ruta</th>
                              <th className="p-3">Vel. Media</th>
                              <th className="p-3">Vel. Maxima</th>
                              <th className="p-3">Excesos</th>
                              <th className="p-3">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reportesGPS.length === 0 ? (
                              <tr><td colSpan={7} className="p-4 text-center text-slate-400">Sin reportes telematicos registrados.</td></tr>
                            ) : (
                              reportesGPS.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-slate-900">{r.vehiculoPatente}</td>
                                  <td className="p-3">{r.conductorNombre || 'Sin asignar'}</td>
                                  <td className="p-3 text-slate-600">{r.origen} → {r.destino}</td>
                                  <td className="p-3 font-mono">{r.velocidadMediaKmh} km/h</td>
                                  <td className="p-3 font-mono font-bold">{r.velocidadMaximaKmh} km/h</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      (r.excesosVelocidadDetectados || 0) > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {r.excesosVelocidadDetectados || 0}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500">{r.fechaRecorrido}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 3: PREVENCION DE RIESGOS */}
              {vistaRolSeleccionada === 'prevencion' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          Vista de Prevencion de Riesgos y Seguridad
                        </h3>
                        <p className="text-xs text-slate-500">
                          Fatiga PVT, alcotest, narcotest, procedimientos y firmas electronicas.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSubPestanaPrevencion('nuevo_alcohol')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
                        >
                          + Control Alcohol/Drogas
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubPestanaPrevencion('nuevo_procedimiento')}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl"
                        >
                          + Evidencia Procedimiento
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => setSubPestanaPrevencion('bloqueos_pvt')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subPestanaPrevencion === 'bloqueos_pvt' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Reposos PVT
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubPestanaPrevencion('documentos')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subPestanaPrevencion === 'documentos' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Firmas ({firmasDocumentos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubPestanaPrevencion('alcohol')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subPestanaPrevencion === 'alcohol' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Alcohol/Drogas ({registrosAlcohol.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubPestanaPrevencion('procedimientos')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subPestanaPrevencion === 'procedimientos' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Procedimientos ({evidenciasProcedimiento.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubPestanaPrevencion('emergencias')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          subPestanaPrevencion === 'emergencias' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Emergencias ({evaluacionesEmergencia.length})
                      </button>
                    </div>
                  </div>

                  {subPestanaPrevencion === 'bloqueos_pvt' && (
                    <TablaBloqueosPVT permitirLiberar={true} />
                  )}

                  {subPestanaPrevencion === 'nuevo_alcohol' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <FormAlcoholDrogas
                        evaluadorUid={auth.currentUser?.uid || 'admin-uid'}
                        evaluadorNombre={auth.currentUser?.email || 'Administrador'}
                        onGuardar={handleGuardarAlcohol}
                      />
                    </div>
                  )}

                  {subPestanaPrevencion === 'nuevo_procedimiento' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <FormEvidenciaProcedimiento
                        evaluadorUid={auth.currentUser?.uid || 'admin-uid'}
                        evaluadorNombre={auth.currentUser?.email || 'Administrador'}
                        onGuardar={handleGuardarProcedimiento}
                      />
                    </div>
                  )}

                  {subPestanaPrevencion === 'documentos' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Firmas de Documentos Registradas</h4>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs min-w-[650px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-3">Conductor</th>
                              <th className="p-3">RUT</th>
                              <th className="p-3">Documento</th>
                              <th className="p-3">Fecha</th>
                              <th className="p-3 text-center">Firma</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {firmasDocumentos.length === 0 ? (
                              <tr><td colSpan={5} className="p-4 text-center text-slate-400">Sin firmas registradas.</td></tr>
                            ) : (
                              firmasDocumentos.map((f) => (
                                <tr key={f.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-slate-800">{f.conductorNombre}</td>
                                  <td className="p-3 font-mono">{f.conductorRut}</td>
                                  <td className="p-3 font-semibold text-amber-800">{SAFETY_DOCUMENTS[f.documentoId]?.titulo}</td>
                                  <td className="p-3 text-slate-500">
                                    {f.creadoEn?.toDate
                                      ? f.creadoEn.toDate().toLocaleString('es-CL')
                                      : new Date(f.fechaLectura).toLocaleString('es-CL')}
                                  </td>
                                  <td className="p-3 text-center">
                                    {f.firmaBase64 && (
                                      <button
                                        type="button"
                                        onClick={() => setModalFirmaPreview(f.firmaBase64)}
                                        className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200"
                                      >
                                        Ver
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {subPestanaPrevencion === 'alcohol' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Controles de Alcohol y Drogas</h4>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs min-w-[650px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-3">Conductor</th>
                              <th className="p-3">RUT</th>
                              <th className="p-3">Control</th>
                              <th className="p-3">Resultado</th>
                              <th className="p-3">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {registrosAlcohol.length === 0 ? (
                              <tr><td colSpan={5} className="p-4 text-center text-slate-400">No hay controles registrados.</td></tr>
                            ) : (
                              registrosAlcohol.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-slate-800">{a.conductorNombre}</td>
                                  <td className="p-3 font-mono">{a.conductorRut}</td>
                                  <td className="p-3 uppercase">{a.tipoExamen}</td>
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
                      </div>
                    </div>
                  )}

                  {subPestanaPrevencion === 'procedimientos' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Evaluaciones de Procedimiento</h4>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs min-w-[650px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-3">Conductor</th>
                              <th className="p-3">Procedimiento</th>
                              <th className="p-3">Resultado</th>
                              <th className="p-3">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {evidenciasProcedimiento.length === 0 ? (
                              <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin procedimientos registrados.</td></tr>
                            ) : (
                              evidenciasProcedimiento.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-slate-800">{p.conductorNombre}</td>
                                  <td className="p-3">Evaluacion de procedimiento</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      p.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {p.aprobado ? 'APROBADO' : 'OBSERVADO'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500">{p.fechaEvaluacion}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {subPestanaPrevencion === 'emergencias' && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Checklists de Emergencia</h4>
                      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs min-w-[650px]">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="p-3">Patente</th>
                              <th className="p-3">Conductor</th>
                              <th className="p-3">Estado</th>
                              <th className="p-3">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {evaluacionesEmergencia.length === 0 ? (
                              <tr><td colSpan={4} className="p-4 text-center text-slate-400">Sin checklists de emergencia registrados.</td></tr>
                            ) : (
                              evaluacionesEmergencia.map((e) => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-slate-900">{e.patente}</td>
                                  <td className="p-3">{e.conductorNombre || 'Conductor'}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      e.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {e.aprobado ? 'OPERATIVO' : 'CRITICO'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500">
                                    {e.creadoEn?.toDate
                                      ? e.creadoEn.toDate().toLocaleString('es-CL')
                                      : new Date(e.fecha).toLocaleString('es-CL')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 4: TALLER MECANICO */}
              {vistaRolSeleccionada === 'taller' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-2 sm:p-4 shadow-sm">
                  <div className="p-3 border-b border-slate-100 mb-4 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      Entorno de Trabajo de Taller y OTs
                    </span>
                    <button
                      type="button"
                      onClick={() => setVistaRolSeleccionada('resumen')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cerrar Vista ×
                    </button>
                  </div>
                  <DashboardTaller />
                </div>
              )}

              {/* VISTA 5: GENERADOR QR */}
              {vistaRolSeleccionada === 'generador' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-2 sm:p-4 shadow-sm">
                  <div className="p-3 border-b border-slate-100 mb-4 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Entorno de Creacion de Vehiculos y Codigos QR
                    </span>
                    <button
                      type="button"
                      onClick={() => setVistaRolSeleccionada('resumen')}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cerrar Vista ×
                    </button>
                  </div>
                  <GeneradorQR />
                </div>
              )}

            </div>
          )}
        </main>

        {/* Modal de Firma */}
        {modalFirmaPreview && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-xs font-black uppercase text-slate-700">Firma Registrada</h4>
                <button
                  type="button"
                  onClick={() => setModalFirmaPreview(null)}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="border border-slate-200 rounded-2xl bg-slate-50 p-2 flex items-center justify-center">
                <img src={modalFirmaPreview} alt="Firma Conductor" className="max-h-48 object-contain" />
              </div>
              <button
                type="button"
                onClick={() => setModalFirmaPreview(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}