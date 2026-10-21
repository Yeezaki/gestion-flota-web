import { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { ModuloTorreControl } from '../components/torreControl/ModuloTorreControl';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';
import { ResponsiveTable } from '../components/common/ResponsiveTable';
import type { ReporteVelocidadGPS } from '../constants';

export default function DashboardTorreControl() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState<ReporteVelocidadGPS[]>([]);
  const [modoCarga, setModoCarga] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'reportes_gps_velocidad'), orderBy('fechaRecorrido', 'desc')),
      (s) => {
        setReportes(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReporteVelocidadGPS)));
      }
    );
    return () => unsub();
  }, []);

  const totalExcesos = reportes.reduce((acc, r) => acc + (r.excesosVelocidadDetectados || 0), 0);
  const totalKm = Math.round(reportes.reduce((acc, r) => acc + (r.kilometrajeTotalKm || 0), 0));
  const velPromedioGlobal =
    reportes.length > 0
      ? Math.round((reportes.reduce((acc, r) => acc + r.velocidadMediaKmh, 0) / reportes.length) * 10) / 10
      : 0;

  const salir = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <ResponsiveLayout
      badge="Centro Telemático y Tráfico de Ruta"
      titulo="Torre de Control"
      subtitulo="Monitoreo de velocidades GPS, análisis de trayectos y excesos de velocidad"
      acciones={
        <>
          <button
            type="button"
            onClick={() => setModoCarga(!modoCarga)}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all text-center"
          >
            {modoCarga ? 'Ver Monitoreo' : '+ Cargar Archivo GPS'}
          </button>
          <button
            type="button"
            onClick={salir}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-center"
          >
            Cerrar Sesión
          </button>
        </>
      }
    >
      {/* Tarjetas KPI de Ruta adaptables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Velocidad Promedio Flota</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">{velPromedioGlobal} km/h</div>
          <p className="text-[11px] text-slate-400 mt-1">Calculado sobre {reportes.length} recorridos registrados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Eventos de Exceso</span>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${totalExcesos > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalExcesos}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Superaciones de límite reglamentario</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Distancia Monitoreada</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">{totalKm} km</div>
          <p className="text-[11px] text-slate-400 mt-1">Trayectos analizados mediante GPS</p>
        </div>
      </div>

      {modoCarga ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
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
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Historial de Recorridos y Velocidades
          </h3>

          <ResponsiveTable minWidth="min-w-[700px]">
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
                {reportes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400">
                      No hay registros telemáticos GPS almacenados.
                    </td>
                  </tr>
                ) : (
                  reportes.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{r.vehiculoPatente}</td>
                      <td className="p-3 text-slate-800">{r.conductorNombre || 'Sin asignar'}</td>
                      <td className="p-3 text-slate-600">{r.origen} → {r.destino}</td>
                      <td className="p-3 font-mono">{r.velocidadMediaKmh} km/h</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{r.velocidadMaximaKmh} km/h</td>
                      <td className="p-3 font-mono">{r.kilometrajeTotalKm} km</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.excesosVelocidadDetectados > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {r.excesosVelocidadDetectados} excesos
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      )}
    </ResponsiveLayout>
  );
}