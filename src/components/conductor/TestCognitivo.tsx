import { useState, useEffect, useRef } from 'react';

type ResultadoTest = {
  aprobado: boolean;
  promedioMs: number;
  erroresComision: number;
  erroresOmision: number;
  tipoTest: string;
};

type TestCognitivoProps = {
  onFinalizado: (resultado: ResultadoTest) => void;
};

export default function TestCognitivo({ onFinalizado }: TestCognitivoProps) {
  const [fase, setFase] = useState<'instrucciones' | 'espera' | 'estimulo' | 'resultado'>('instrucciones');
  const [colorPelota, setColorPelota] = useState<'verde' | 'rojo'>('verde');
  const [rondaActual, setRondaActual] = useState(0);
  const totalRondas = 6;

  const secuenciaColores = useRef<Array<'verde' | 'rojo'>>([]);
  const [tiemposReaccion, setTiemposReaccion] = useState<number[]>([]);
  const [erroresComision, setErroresComision] = useState(0);
  const [erroresOmision, setErroresOmision] = useState(0);

  const tiempoInicioEstimulo = useRef<number>(0);
  const temporizadorEstimulo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const temporizadorOmision = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiarTemporizadores = () => {
    if (temporizadorEstimulo.current) clearTimeout(temporizadorEstimulo.current);
    if (temporizadorOmision.current) clearTimeout(temporizadorOmision.current);
  };

  useEffect(() => {
    return () => limpiarTemporizadores();
  }, []);

  const iniciarTest = () => {
    setTiemposReaccion([]);
    setErroresComision(0);
    setErroresOmision(0);

    const base: Array<'verde' | 'rojo'> = ['verde', 'verde', 'verde', 'rojo', 'rojo', 'rojo'];
    secuenciaColores.current = base.sort(() => Math.random() - 0.5);

    setRondaActual(1);
    prepararRonda(1);
  };

  const prepararRonda = (rondaIndex: number) => {
    limpiarTemporizadores();
    setFase('espera');

    const tiempoEsperaAleatorio = Math.floor(Math.random() * 2500) + 1000;

    temporizadorEstimulo.current = setTimeout(() => {
      const colorActual = secuenciaColores.current[rondaIndex - 1] || 'verde';
      setColorPelota(colorActual);
      setFase('estimulo');
      tiempoInicioEstimulo.current = Date.now();

      if (colorActual === 'verde') {
        temporizadorOmision.current = setTimeout(() => {
          setErroresOmision((prev) => prev + 1);
          siguienteRonda();
        }, 1200);
      } else {
        temporizadorOmision.current = setTimeout(() => {
          siguienteRonda();
        }, 1100);
      }
    }, tiempoEsperaAleatorio);
  };

  const manejarPulsacion = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevenir comportamientos por defecto
    if (fase === 'espera') {
      limpiarTemporizadores();
      setErroresComision((prev) => prev + 1);
      siguienteRonda();
      return;
    }

    if (fase === 'estimulo') {
      const tiempoReaccion = Date.now() - tiempoInicioEstimulo.current;
      limpiarTemporizadores();

      if (colorPelota === 'verde') {
        setTiemposReaccion((prev) => [...prev, tiempoReaccion]);
      } else {
        setErroresComision((prev) => prev + 1);
      }

      siguienteRonda();
    }
  };

  const siguienteRonda = () => {
    limpiarTemporizadores();
    setRondaActual((prevRonda) => {
      const proxima = prevRonda + 1;
      if (prevRonda >= totalRondas) {
        finalizarEvaluacion();
        return prevRonda;
      }
      setTimeout(() => prepararRonda(proxima), 600);
      return proxima;
    });
  };

  const finalizarEvaluacion = () => {
    setFase('resultado');
    setTimeout(() => {
      const promedio = tiemposReaccion.length > 0
        ? Math.round(tiemposReaccion.reduce((a, b) => a + b, 0) / tiemposReaccion.length)
        : 999;

      const aprobado = promedio <= 650 && erroresComision <= 1 && erroresOmision <= 1;

      onFinalizado({
        aprobado,
        promedioMs: promedio,
        erroresComision,
        erroresOmision,
        tipoTest: 'Reaccion e Inhibicion (Go/No-Go)'
      });
    }, 1200);
  };

  return (
    <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10 text-center select-none touch-none">
      <div className="mb-4">
        <span className="bg-amber-100 text-amber-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
          Evaluacion de Reflejos
        </span>
        <h2 className="text-xl font-black text-slate-800 mt-2">Test de Colores y Reaccion</h2>
      </div>

      {fase === 'instrucciones' && (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-2xl border border-slate-200">
            1. Presiona la pantalla unicamente cuando la esfera sea de color <strong>VERDE</strong>.<br />
            2. <strong>NO presiones</strong> si la esfera cambia a color <strong>ROJO</strong> ni antes de tiempo.<br />
            3. Los tiempos variaran aleatoriamente entre cada estimulo.
          </p>
          <button
            type="button"
            onPointerDown={iniciarTest}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all"
          >
            Comenzar Prueba
          </button>
        </div>
      )}

      {(fase === 'espera' || fase === 'estimulo') && (
        <div>
          <div className="text-xs font-bold text-slate-500 mb-4">
            Ronda {rondaActual} de {totalRondas}
          </div>

          <div
            onPointerDown={manejarPulsacion}
            className="w-full h-64 bg-white/70 border-2 border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.99] shadow-inner relative overflow-hidden touch-none"
          >
            {fase === 'espera' && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-4 border-slate-300 border-t-blue-500 animate-spin"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atento al cambio...</span>
              </div>
            )}

            {fase === 'estimulo' && (
              <div className="flex flex-col items-center gap-3 animate-scale-up">
                <div
                  className={`w-28 h-28 rounded-full shadow-2xl transition-transform ${
                    colorPelota === 'verde' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
                  }`}
                />
                <span className={`text-sm font-black uppercase tracking-wider ${colorPelota === 'verde' ? 'text-green-700' : 'text-red-700'}`}>
                  {colorPelota === 'verde' ? 'Presiona Ahora' : 'No Presiones'}
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-3 font-medium">Toca dentro del recuadro unicamente en verde.</p>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto"></div>
          <p className="text-sm font-black text-slate-700">Analizando metricas psicomotoras...</p>
        </div>
      )}
    </div>
  );
}