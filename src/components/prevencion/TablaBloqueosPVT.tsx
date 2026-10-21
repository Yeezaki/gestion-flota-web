import React, { useEffect, useState } from "react";
import {
  obtenerBloqueosActivos,
  liberarBloqueoPVT
} from "../../services/pvtLockService";
import type {
  BloqueoPVT
} from "../../services/pvtLockService";

interface Props {
  permitirLiberar?: boolean;
}

export const TablaBloqueosPVT: React.FC<Props> = ({ permitirLiberar = true }) => {
  const [bloqueos, setBloqueos] = useState<BloqueoPVT[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [ahora, setAhora] = useState<number>(Date.now());

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const datos = await obtenerBloqueosActivos();
      setBloqueos(datos);
    } catch (err) {
      console.error("Error al obtener bloqueos PVT:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    const intervalTick = setInterval(() => setAhora(Date.now()), 5000);
    const intervalFetch = setInterval(cargarDatos, 30000);

    return () => {
      clearInterval(intervalTick);
      clearInterval(intervalFetch);
    };
  }, []);

  const handleLiberar = async (rut: string) => {
    const confirmar = window.confirm(
      `Desea levantar anticipadamente el reposo obligatorio para el RUT ${rut}?`
    );
    if (!confirmar) return;

    try {
      await liberarBloqueoPVT(rut);
      await cargarDatos();
    } catch (error) {
      console.error("Error al liberar bloqueo:", error);
      alert("No se pudo levantar el bloqueo. Verifique su conexion.");
    }
  };

  const getBadgesColor = (nivel: string) => {
    switch (nivel.toLowerCase()) {
      case "alto":
        return "bg-red-100 text-red-800 border-red-300";
      case "medio-alto":
      case "medio_alto":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medio":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-300";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden my-6">
      <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-neutral-50">
        <div>
          <h3 className="text-base font-bold text-neutral-800">
            Control de Reposos por Fatiga (PVT)
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Conductores restringidos temporalmente por evaluacion psicomotriz
          </p>
        </div>
        <button
          onClick={cargarDatos}
          className="text-xs font-semibold bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Actualizar Lista
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] tracking-wider border-b border-neutral-200">
            <tr>
              <th className="py-3 px-4">RUT</th>
              <th className="py-3 px-4">Conductor</th>
              <th className="py-3 px-4">Patente</th>
              <th className="py-3 px-4">Nivel Fatiga</th>
              <th className="py-3 px-4">Tiempo Total</th>
              <th className="py-3 px-4">Tiempo Restante</th>
              {permitirLiberar && <th className="py-3 px-4 text-center">Accion</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {cargando ? (
              <tr>
                <td colSpan={permitirLiberar ? 7 : 6} className="py-6 text-center text-neutral-400">
                  Cargando bloqueos activos...
                </td>
              </tr>
            ) : bloqueos.length === 0 ? (
              <tr>
                <td colSpan={permitirLiberar ? 7 : 6} className="py-6 text-center text-neutral-500">
                  No hay conductores en estado de reposo actualmente.
                </td>
              </tr>
            ) : (
              bloqueos.map((item) => {
                const minutosRestantes = Math.max(0, Math.ceil((item.bloqueadoHasta - ahora) / (1000 * 60)));
                return (
                  <tr key={item.rut} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-800">{item.rut}</td>
                    <td className="py-3 px-4 text-neutral-700">{item.nombreConductor || "No especificado"}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">{item.patente || "N/A"}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[11px] font-semibold border rounded-md uppercase ${getBadgesColor(item.nivelRiesgo)}`}>
                        {item.nivelRiesgo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{item.tiempoEsperaMinutos} min</td>
                    <td className="py-3 px-4 font-semibold text-amber-800">
                      {minutosRestantes > 0 ? `${minutosRestantes} min` : "Expirando..."}
                    </td>
                    {permitirLiberar && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleLiberar(item.rut)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs px-2.5 py-1 rounded transition-colors"
                        >
                          Liberar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};