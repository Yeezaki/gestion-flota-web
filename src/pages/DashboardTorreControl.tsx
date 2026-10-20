import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { ModuloTorreControl } from '../components/torreControl/ModuloTorreControl';
import type { ReporteVelocidadGPS } from '../constants';

export default function DashboardTorreControl() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState<ReporteVelocidadGPS[]>([]);
  const [modoCarga, setModoCarga] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'reportes_gps_velocidad'), orderBy('fechaRecorrido', 'desc')), (s) => {
      setReportes(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReporteVelocidadGPS)));
    });
    return () => unsub();
  }, []);

  const totalExcesos = reportes.reduce((acc, r) => acc + (r.excesosVelocidadDetectados || 0), 0);
  const totalKm = Math.round(reportes.reduce((acc, r) => acc + (r.kilometrajeTotalKm || 0), 0));
  const velPromedioGlobal = reportes.length > 0
    ? Math.round((reportes.reduce((acc, r) => acc + r.velocidadMediaKmh, 0) / reportes.length) * 10) / 10
    : 0;

  const salir = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Centro Telemático y Tráfico de Ruta
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">Torre de Control</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setModoCarga(!modoCarga)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
            >
              {modoCarga ? 'Ver Monitoreo' : '+ Cargar Archivo GPS'}
            </button>
            <button
              onClick={salir}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas de Ruta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Velocidad Promedio Flota</span>
            <div className="text-3xl font-black text-slate-800 mt-1">{velPromedioGlobal} km/h</div>
            <p className="text-[11px] text-slate-500 mt-1">Calculado sobre {reportes.length} recorridos registrados</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Eventos de Exceso</span>
            <div className={`text-3xl font-black mt-1 ${totalExcesos > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalExcesos}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Superaciones de límite reglamentario</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Distancia Total Monitoreada</span>
            <div className="text-3xl font-black text-indigo-600 mt-1">{totalKm} km</div>
            <p className="text-[11px] text-slate-500 mt-1">Trayectos analizados mediante GPS</p>
          </div>
        </div>

        {modoCarga ? (
          <ModuloTorreControl
            usuarioUid={auth.currentUser?.uid || 'torre-uid'}
            usuarioNombre={auth.currentUser?.email || 'Operador de Torre'}
            onGuardarReporte={async (rep) => {
              await addDoc(collection(db, 'reportes_gps_velocidad'), {
                ...rep,
                creadoEn: serverTimestamp()
              });
              setModoCarga(false);
            }}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Historial de Recorridos y Velocidades
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-3">Patente</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">Ruta</th>
                    <th className="p-3">Vel. Media</th>
                    <th className="p-3">Vel. Máxima</th>
                    <th className="p-3">Distancia</th>
                    <th className="p-3">Excesos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{r.vehiculoPatente}</td>
                      <td className="p-3">{r.conductorNombre || 'Sin asignar'}</td>
                      <td className="p-3 text-slate-600">{r.origen} → {r.destino}</td>
                      <td className="p-3 font-mono">{r.velocidadMediaKmh} km/h</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{r.velocidadMaximaKmh} km/h</td>
                      <td className="p-3 font-mono">{r.kilometrajeTotalKm} km</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.excesosVelocidadDetectados > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {r.excesosVelocidadDetectados} excesos
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