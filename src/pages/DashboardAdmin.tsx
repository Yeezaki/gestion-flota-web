import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

// Componentes modulares
import TabReportes from '../components/admin/TabReportes';
import TabFlota from '../components/admin/TabFlota';
import TabQRs from '../components/admin/TabQRs';
import TabAgenda from '../components/admin/TabAgenda';
import TabEstadisticas from '../components/admin/TabEstadisticas';
import TabUsuarios from '../components/admin/TabUsuarios';
import TabAuditoria from '../components/admin/TabAuditoria';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [pestanaActiva, setPestanaActiva] = useState('reportes');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState('todos');

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
        </div>

        {/* Carga de Componentes Modulares */}
        {pestanaActiva === 'reportes' && <TabReportes busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'vehiculos' && <TabFlota busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'qrs' && <TabQRs busqueda={busqueda} filtroTipoVehiculo={filtroTipoVehiculo} />}
        {pestanaActiva === 'agenda' && <TabAgenda />}
        {pestanaActiva === 'estadisticas' && <TabEstadisticas />}
        {pestanaActiva === 'usuarios' && <TabUsuarios />}
        {pestanaActiva === 'auditoria' && <TabAuditoria />}

      </div>
    </div>
  );
}