import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TabEstadisticas() {
  const [reportes, setReportes] = useState<any[]>([]);
  const [vehiculoEstadistica, setVehiculoEstadistica] = useState<string>('');
  const [cargando, setCargando] = useState(true);

  // Cargar los reportes necesarios para armar la estadística localmente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const q = query(collection(db, 'reportes'), orderBy('fecha', 'asc'));
        const querySnapshot = await getDocs(q);
        const reportesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const limiteDias = new Date();
        limiteDias.setDate(limiteDias.getDate() - 15);
        
        const reportesValidos = reportesData.filter((rep: any) => {
          if (rep.fecha && typeof rep.fecha.toDate === 'function') {
            return rep.fecha.toDate().getTime() >= limiteDias.getTime();
          }
          return true;
        });
        
        setReportes(reportesValidos.reverse());
      } catch (error) {
        console.error(error);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  const estadisticas = useMemo(() => {
    if (!vehiculoEstadistica) return { datos: [], kpis: null };

    const reportesVehiculo = [...reportes]
      .filter(r => r.vehiculoId === vehiculoEstadistica && r.kilometraje !== "No ingresado")
      .sort((a, b) => {
        const fechaA = a.fecha?.toMillis() || 0;
        const fechaB = b.fecha?.toMillis() || 0;
        return fechaA - fechaB;
      });

    if (reportesVehiculo.length < 2) return { datos: [], kpis: null };

    const registroPorDia: Record<string, { maxKm: number, timestamp: number }> = {};
    
    reportesVehiculo.forEach(rep => {
      const fechaObj = rep.fecha?.toDate();
      if (!fechaObj) return;
      
      const fechaStr = `${fechaObj.getDate()}/${fechaObj.getMonth() + 1}`;
      const kms = Number(rep.kilometraje);

      if (!isNaN(kms)) {
        if (!registroPorDia[fechaStr] || kms > registroPorDia[fechaStr].maxKm) {
          registroPorDia[fechaStr] = { maxKm: kms, timestamp: fechaObj.getTime() };
        }
      }
    });

    const diasOrdenados = Object.keys(registroPorDia)
      .map(fecha => ({
        fecha,
        maxKm: registroPorDia[fecha].maxKm,
        timestamp: registroPorDia[fecha].timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const datos = [];
    let totalKms = 0;
    let maxDia = { fecha: '-', kms: 0 };

    for (let i = 1; i < diasOrdenados.length; i++) {
      let diferencia = diasOrdenados[i].maxKm - diasOrdenados[i - 1].maxKm;
      if (diferencia < 0) diferencia = 0; 

      datos.push({
        fecha: diasOrdenados[i].fecha,
        kmsRecorridos: diferencia,
        kilometrajeTotal: diasOrdenados[i].maxKm
      });
    }

    const ultimos15 = datos.slice(-15);

    ultimos15.forEach(d => {
      totalKms += d.kmsRecorridos;
      if (d.kmsRecorridos > maxDia.kms) {
        maxDia = { fecha: d.fecha, kms: d.kmsRecorridos };
      }
    });

    const promedio = ultimos15.length > 0 ? Math.round(totalKms / ultimos15.length) : 0;

    return {
      datos: ultimos15,
      kpis: {
        total: totalKms,
        promedio: promedio,
        maximo: maxDia
      }
    };
  }, [reportes, vehiculoEstadistica]);

  const vehiculosConReportes = Array.from(new Set(reportes.filter(r => r.vehiculoId).map(r => r.vehiculoId)));

  useEffect(() => {
    if (vehiculosConReportes.length > 0 && !vehiculoEstadistica) {
      setVehiculoEstadistica(vehiculosConReportes[0]);
    }
  }, [vehiculosConReportes, vehiculoEstadistica]);

  if (cargando) {
    return <div className="p-8 text-center text-slate-400 bg-white rounded-3xl shadow-lg border border-slate-100">Cargando datos estadísticos...</div>;
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Variacion de Kilometraje</h2>
          <p className="text-sm text-slate-500 mt-1">Ultimos 15 dias de registro</p>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Seleccionar Vehiculo</label>
          <select value={vehiculoEstadistica} onChange={(e) => setVehiculoEstadistica(e.target.value)} className="w-full sm:w-64 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold text-slate-700">
            {vehiculosConReportes.length === 0 ? (<option value="">Sin registros</option>) : (vehiculosConReportes.map(v => (<option key={v} value={v}>{v}</option>)))}
          </select>
        </div>
      </div>

      {estadisticas.datos.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">Necesitas reportes en al menos 2 dias distintos para generar la grafica.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={estadisticas.datos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="fecha" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} km`} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`${value} km recorridos`, 'Variacion']} labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="kmsRecorridos" name="Kms Recorridos por Dia" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 8, fill: '#1d4ed8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Periodo</p>
              <p className="text-3xl font-black text-slate-800">{estadisticas.kpis?.total.toLocaleString()} <span className="text-base font-medium text-slate-500">km</span></p>
            </div>
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Promedio Diario</p>
              <p className="text-3xl font-black text-blue-700">{estadisticas.kpis?.promedio.toLocaleString()} <span className="text-base font-medium text-blue-500">km</span></p>
            </div>
            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Pico Maximo</p>
              <p className="text-3xl font-black text-orange-700">{estadisticas.kpis?.maximo.kms.toLocaleString()} <span className="text-base font-medium text-orange-500">km</span></p>
              <p className="text-sm font-medium text-orange-600 mt-2">Registrado el {estadisticas.kpis?.maximo.fecha}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}