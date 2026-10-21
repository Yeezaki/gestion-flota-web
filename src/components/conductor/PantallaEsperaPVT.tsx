import React, { useEffect, useState } from "react";

interface Props {
  bloqueadoHasta: number;
  nivelRiesgo: string;
  rut: string;
  onExpirado: () => void;
}

export const PantallaEsperaPVT: React.FC<Props> = ({
  bloqueadoHasta,
  nivelRiesgo,
  rut,
  onExpirado
}) => {
  const calcularSegundos = () =>
    Math.max(0, Math.floor((bloqueadoHasta - Date.now()) / 1000));

  const [segundosRestantes, setSegundosRestantes] = useState<number>(calcularSegundos);

  useEffect(() => {
    const intervalo = setInterval(() => {
      const restantes = calcularSegundos();
      setSegundosRestantes(restantes);

      if (restantes <= 0) {
        clearInterval(intervalo);
        onExpirado();
      }
    }, 1000);

    return () => clearInterval(intervalo);
  }, [bloqueadoHasta, onExpirado]);

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;

  return (
    <div className="max-w-xl mx-auto my-8 p-6 bg-amber-50 border border-amber-300 rounded-2xl shadow-sm text-center">
      <div className="inline-block px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
        Protocolo de Seguridad y Fatiga
      </div>

      <h2 className="text-2xl font-bold text-neutral-900 mb-2">
        Tiempo de Espera Obligatorio
      </h2>

      <p className="text-sm text-neutral-700 mb-4 leading-relaxed">
        El conductor con RUT <span className="font-semibold">{rut}</span> obtuvo un resultado{" "}
        <span className="font-bold text-amber-800 uppercase">{nivelRiesgo}</span> en la prueba psicomotriz.
        Por regulaciones de seguridad vial interna, debe realizar una pausa antes de volver a repetir el test.
      </p>

      <div className="my-6">
        <span className="text-xs text-neutral-500 uppercase tracking-widest block mb-1">
          Tiempo restante para repeticion
        </span>
        <div className="inline-block text-4xl font-mono font-extrabold text-amber-800 bg-white border border-amber-300 px-6 py-3 rounded-xl shadow-inner">
          {String(minutos).padStart(2, "0")}:{String(segundos).padStart(2, "0")}
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Mantengase en descanso. Una vez terminado el contador, podra reintentar la evaluacion.
      </p>
    </div>
  );
};