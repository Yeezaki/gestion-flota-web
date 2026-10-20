import React, { useState } from 'react';
import type { PuntoGPS, ReporteVelocidadGPS } from '../../constants';

interface ModuloTorreControlProps {
  usuarioUid: string;
  usuarioNombre: string;
  onGuardarReporte: (reporte: ReporteVelocidadGPS) => Promise<void>;
}

export const ModuloTorreControl: React.FC<ModuloTorreControlProps> = ({
  usuarioUid,
  usuarioNombre,
  onGuardarReporte
}) => {
  const [patente, setPatente] = useState<string>('');
  const [conductor, setConductor] = useState<string>('');
  const [origen, setOrigen] = useState<string>('');
  const [destino, setDestino] = useState<string>('');
  const [limiteVelocidad, setLimiteVelocidad] = useState<number>(100);

  const [puntos, setPuntos] = useState<PuntoGPS[]>([]);
  const [metricas, setMetricas] = useState<{
    velocidadMedia: number;
    velocidadMaxima: number;
    excesos: number;
    distanciaKm: number;
  } | null>(null);

  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Distancia esferica entre dos puntos (formula de Haversine en KM)
  const calcularDistanciaKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const radioTierraKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radioTierraKm * c;
  };

  const procesarPuntosGPS = (rawPoints: PuntoGPS[], limite: number) => {
    if (!rawPoints || rawPoints.length === 0) return;

    let sumaVelocidad = 0;
    let maxVelocidad = 0;
    let contadorExcesos = 0;
    let distanciaTotal = 0;

    for (let i = 0; i < rawPoints.length; i++) {
      const p = rawPoints[i];
      sumaVelocidad += p.velocidadKmh;
      if (p.velocidadKmh > maxVelocidad) {
        maxVelocidad = p.velocidadKmh;
      }
      if (p.velocidadKmh > limite) {
        contadorExcesos += 1;
      }
      if (i > 0) {
        const prev = rawPoints[i - 1];
        distanciaTotal += calcularDistanciaKm(prev.lat, prev.lng, p.lat, p.lng);
      }
    }

    const velMedia = Math.round((sumaVelocidad / rawPoints.length) * 10) / 10;
    const distTotalRedondeada = Math.round(distanciaTotal * 100) / 100;

    setPuntos(rawPoints);
    setMetricas({
      velocidadMedia: velMedia,
      velocidadMaxima: Math.round(maxVelocidad * 10) / 10,
      excesos: contadorExcesos,
      distanciaKm: distTotalRedondeada
    });
  };

  // Carga e interpretacion de archivos JSON, GeoJSON o CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMensaje(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const nombreArchivo = file.name.toLowerCase();

        if (nombreArchivo.endsWith('.json') || nombreArchivo.endsWith('.geojson')) {
          const parsed = JSON.parse(content);
          let parsedPoints: PuntoGPS[] = [];

          if (Array.isArray(parsed)) {
            parsedPoints = parsed;
          } else if (parsed.features && Array.isArray(parsed.features)) {
            // Estructura GeoJSON
            parsedPoints = parsed.features.map((f: any) => ({
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              velocidadKmh: f.properties?.speed || f.properties?.velocidad || 0,
              timestamp: f.properties?.time || new Date().toISOString()
            }));
          } else if (parsed.puntos && Array.isArray(parsed.puntos)) {
            parsedPoints = parsed.puntos;
          }

          procesarPuntosGPS(parsedPoints, limiteVelocidad);
          setMensaje({ tipo: 'ok', texto: `Archivo ${file.name} procesado con ${parsedPoints.length} registros GPS.` });
        } else if (nombreArchivo.endsWith('.csv') || nombreArchivo.endsWith('.txt')) {
          // Parseo de CSV formato: lat,lng,velocidad,timestamp
          const lineas = content.split('\n').filter((l) => l.trim() !== '');
          const parsedPoints: PuntoGPS[] = [];

          // Saltamos cabecera si existe
          const startIndex = lineas[0].toLowerCase().includes('lat') ? 1 : 0;
          for (let i = startIndex; i < lineas.length; i++) {
            const columnas = lineas[i].split(',').map((c) => c.trim());
            if (columnas.length >= 3) {
              const lat = parseFloat(columnas[0]);
              const lng = parseFloat(columnas[1]);
              const vel = parseFloat(columnas[2]);
              const time = columnas[3] || new Date().toISOString();
              if (!isNaN(lat) && !isNaN(lng)) {
                parsedPoints.push({
                  lat,
                  lng,
                  velocidadKmh: isNaN(vel) ? 0 : vel,
                  timestamp: time
                });
              }
            }
          }

          procesarPuntosGPS(parsedPoints, limiteVelocidad);
          setMensaje({ tipo: 'ok', texto: `Archivo CSV procesado con ${parsedPoints.length} coordenadas.` });
        } else {
          setMensaje({ tipo: 'error', texto: 'Formato no soportado. Cargue un archivo .json, .geojson o .csv' });
        }
      } catch (err: any) {
        setMensaje({ tipo: 'error', texto: 'Error al interpretar el archivo GPS: ' + err.message });
      }
    };

    reader.readAsText(file);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patente.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingrese la patente del vehículo supervisado.' });
      return;
    }
    if (!metricas || puntos.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Debe cargar un archivo GPS con registros válidos antes de guardar.' });
      return;
    }

    try {
      setGuardando(true);
      setMensaje(null);

      const reporte: ReporteVelocidadGPS = {
        vehiculoPatente: patente.toUpperCase(),
        conductorNombre: conductor.trim() || undefined,
        fechaRecorrido: new Date().toISOString(),
        velocidadMediaKmh: metricas.velocidadMedia,
        velocidadMaximaKmh: metricas.velocidadMaxima,
        limiteVelocidadKmh: limiteVelocidad,
        excesosVelocidadDetectados: metricas.excesos,
        kilometrajeTotalKm: metricas.distanciaKm,
        origen: origen.trim() || 'No especificado',
        destino: destino.trim() || 'No especificado',
        puntosRuta: puntos,
        subidoPorUid: usuarioUid,
        subidoPorNombre: usuarioNombre
      };

      await onGuardarReporte(reporte);
      setMensaje({ tipo: 'ok', texto: 'Reporte de control de velocidad y GPS guardado exitosamente.' });

      setPatente('');
      setConductor('');
      setOrigen('');
      setDestino('');
      setPuntos([]);
      setMetricas(null);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar el reporte GPS.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-base font-bold text-slate-800">
          Torre de Control: Seguimiento GPS y Control de Velocidad
        </h3>
        <p className="text-xs text-slate-500">
          Análisis telemático de recorrido, cálculo de velocidad media, máxima, excesos y kilometraje de trayecto.
        </p>
      </div>

      <form onSubmit={handleGuardar} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patente del Vehículo
            </label>
            <input
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value)}
              placeholder="ABCD-12"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Conductor Asignado (Opcional)
            </label>
            <input
              type="text"
              value={conductor}
              onChange={(e) => setConductor(e.target.value)}
              placeholder="Ej: Carlos Muñoz"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Límite de Velocidad Normado (km/h)
            </label>
            <input
              type="number"
              value={limiteVelocidad}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLimiteVelocidad(val);
                if (puntos.length > 0) {
                  procesarPuntosGPS(puntos, val);
                }
              }}
              min={20}
              max={140}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Origen del Tramo
            </label>
            <input
              type="text"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              placeholder="Ej: Base Central / Faena"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destino del Tramo
            </label>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej: Punto de Entrega Norte"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Carga de Archivo GPS */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
            Cargar Archivo Telemático GPS (.json, .geojson, .csv)
          </label>
          <input
            type="file"
            accept=".json,.geojson,.csv,.txt"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Formato CSV sugerido: latitud, longitud, velocidad_kmh, fecha_hora (ej: -22.456, -68.923, 78.5, 2026-10-19T14:30:00Z)
          </p>
        </div>

        {/* Tarjetas de Metricas Telematicas */}
        {metricas && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-center">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase">Velocidad Media</span>
              <span className="text-lg font-extrabold text-slate-800">{metricas.velocidadMedia} km/h</span>
            </div>

            <div className={`p-3 rounded-lg border text-center ${
              metricas.velocidadMaxima > limiteVelocidad
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <span className="block text-[11px] font-semibold uppercase">Velocidad Máxima</span>
              <span className="text-lg font-extrabold">{metricas.velocidadMaxima} km/h</span>
            </div>

            <div className={`p-3 rounded-lg border text-center ${
              metricas.excesos > 0
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="block text-[11px] font-semibold uppercase">Excesos ({'>'}{limiteVelocidad} km/h)</span>
              <span className="text-lg font-extrabold">{metricas.excesos} eventos</span>
            </div>

            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-center">
              <span className="block text-[11px] font-semibold text-slate-500 uppercase">Distancia Total</span>
              <span className="text-lg font-extrabold text-slate-800">{metricas.distanciaKm} km</span>
            </div>
          </div>
        )}

        {/* Tabla resumen de los ultimos registros del recorrido */}
        {puntos.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Registro de puntos de la ruta ({puntos.length} puntos totales)</span>
              <span className="text-slate-500 text-[11px]">Mostrando primeros 5 registros</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Latitud</th>
                    <th className="p-2">Longitud</th>
                    <th className="p-2">Velocidad</th>
                    <th className="p-2">Fecha / Hora</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {puntos.slice(0, 5).map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-500">{i + 1}</td>
                      <td className="p-2 font-mono">{pt.lat.toFixed(5)}</td>
                      <td className="p-2 font-mono">{pt.lng.toFixed(5)}</td>
                      <td className="p-2 font-mono font-bold">{pt.velocidadKmh} km/h</td>
                      <td className="p-2 text-slate-600">{pt.timestamp}</td>
                      <td className="p-2">
                        {pt.velocidadKmh > limiteVelocidad ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Exceso
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mensaje && (
          <div
            className={`p-3 rounded-lg text-xs font-medium border ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={guardando || puntos.length === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {guardando ? 'Guardando...' : 'Guardar Reporte en Torre de Control'}
          </button>
        </div>
      </form>
    </div>
  );
};