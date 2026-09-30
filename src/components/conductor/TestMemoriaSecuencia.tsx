import { useState, useRef } from 'react';

type ResultadoTest = {
  aprobado: boolean;
  promedioMs: number;
  erroresComision: number;
  erroresOmision: number;
  tipoTest: string;
};

type TestMemoriaSecuenciaProps = {
  onFinalizado: (resultado: ResultadoTest) => void;
};

export default function TestMemoriaSecuencia({ onFinalizado }: TestMemoriaSecuenciaProps) {
  const [fase, setFase] = useState<'instrucciones' | 'memorizar' | 'reproducir' | 'resultado'>('instrucciones');
  const [botonActivo, setBotonActivo] = useState<number | null>(null);
  const [rondaActual, setRondaActual] = useState(1);
  const [secuenciaUsuario, setSecuenciaUsuario] = useState<number[]>([]);
  const totalRondas = 3;

  const secuenciasPorRonda = [
    [0, 2, 1],
    [3, 1, 0, 2],
    [2, 0, 3, 1]
  ];

  const aciertosRef = useRef(0);
  const erroresRef = useRef(0);
  const tiempoInicioReproduccion = useRef<number>(0);
  const tiemposRespuesta = useRef<number[]>([]);

  const reproducirSecuenciaVisual = (secuencia: number[]) => {
    setFase('memorizar');
    setSecuenciaUsuario([]);
    let paso = 0;

    const intervalo = setInterval(() => {
      if (paso < secuencia.length) {
        const idBoton = secuencia[paso];
        setBotonActivo(idBoton);
        setTimeout(() => setBotonActivo(null), 500);
        paso++;
      } else {
        clearInterval(intervalo);
        setBotonActivo(null);
        setFase('reproducir');
        tiempoInicioReproduccion.current = Date.now();
      }
    }, 850);
  };

  const iniciarPrueba = () => {
    aciertosRef.current = 0;
    erroresRef.current = 0;
    tiemposRespuesta.current = [];
    setRondaActual(1);
    reproducirSecuenciaVisual(secuenciasPorRonda[0]);
  };

  const siguientePaso = () => {
    setFase('memorizar');
    setRondaActual((prevRonda) => {
      if (prevRonda >= totalRondas) {
        finalizarEvaluacion();
        return prevRonda;
      }
      const siguiente = prevRonda + 1;
      setTimeout(() => {
        reproducirSecuenciaVisual(secuenciasPorRonda[siguiente - 1]);
      }, 900);
      return siguiente;
    });
  };

  const manejarPulsacionBoton = (idBoton: number) => {
    if (fase !== 'reproducir') return;

    setBotonActivo(idBoton);
    setTimeout(() => setBotonActivo(null), 250);

    const nuevaSecuencia = [...secuenciaUsuario, idBoton];
    setSecuenciaUsuario(nuevaSecuencia);

    const secuenciaEsperada = secuenciasPorRonda[rondaActual - 1];
    const indiceActual = nuevaSecuencia.length - 1;

    if (nuevaSecuencia[indiceActual] !== secuenciaEsperada[indiceActual]) {
      erroresRef.current += 1;
      siguientePaso();
      return;
    }

    if (nuevaSecuencia.length === secuenciaEsperada.length) {
      const tiempoUsado = Date.now() - tiempoInicioReproduccion.current;
      tiemposRespuesta.current.push(tiempoUsado);
      aciertosRef.current += 1;
      siguientePaso();
    }
  };

  const finalizarEvaluacion = () => {
    setFase('resultado');
    setTimeout(() => {
      const promedio = tiemposRespuesta.current.length > 0
        ? Math.round(tiemposRespuesta.current.reduce((a, b) => a + b, 0) / tiemposRespuesta.current.length)
        : 0;

      const aprobado = aciertosRef.current >= 2;

      onFinalizado({
        aprobado,
        promedioMs: promedio,
        erroresComision: erroresRef.current,
        erroresOmision: totalRondas - aciertosRef.current,
        tipoTest: 'Memoria de Secuencia Espacial'
      });
    }, 1000);
  };

  const botones = [
    { id: 0, color: 'bg-emerald-500' },
    { id: 1, color: 'bg-amber-500' },
    { id: 2, color: 'bg-blue-500' },
    { id: 3, color: 'bg-violet-500' }
  ];

  return (
    <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10 text-center select-none">
      <div className="mb-4">
        <span className="bg-purple-100 text-purple-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
          Memoria de Trabajo y Alerta
        </span>
        <h2 className="text-xl font-black text-slate-800 mt-2">Secuencia Visoespacial</h2>
      </div>

      {fase === 'instrucciones' && (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-2xl border border-slate-200">
            1. Observa el orden en que se iluminan los <strong>4 cuadrantes de colores</strong> con marco negro.<br />
            2. Una vez que termine la animación, presiona los botones en el <strong>mismo orden</strong> exacto.<br />
            3. Supera al menos 2 de las 3 rondas.
          </p>
          <button
            type="button"
            onClick={iniciarPrueba}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all"
          >
            Comenzar Prueba
          </button>
        </div>
      )}

      {(fase === 'memorizar' || fase === 'reproducir') && (
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-4 px-1">
            <span>Ronda {rondaActual} de {totalRondas}</span>
            <span className={`uppercase font-black ${fase === 'memorizar' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {fase === 'memorizar' ? 'Observa la secuencia...' : '¡Repite el patrón!'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-[270px] mx-auto p-4 bg-white/85 rounded-3xl border-2 border-slate-300 shadow-inner">
            {botones.map((btn) => {
              const estaActivo = botonActivo === btn.id;

              return (
                <button
                  key={btn.id}
                  type="button"
                  disabled={fase === 'memorizar'}
                  onClick={() => manejarPulsacionBoton(btn.id)}
                  className={`h-28 rounded-2xl transition-all duration-150 relative ${btn.color} ${
                    estaActivo
                      ? 'border-4 border-slate-950 scale-105 shadow-2xl shadow-black/50 brightness-110 z-10'
                      : 'border-2 border-slate-300/70 opacity-75 hover:opacity-90'
                  }`}
                >
                  {estaActivo && (
                    <span className="absolute inset-0 rounded-xl border-2 border-white/60 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 mt-4 font-medium">
            {fase === 'memorizar' ? 'Espera a que termine el destello...' : 'Toca los botones en el orden visto.'}
          </p>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-purple-600 animate-spin mx-auto"></div>
          <p className="text-sm font-black text-slate-700">Evaluando retención inmediata y claridad mental...</p>
        </div>
      )}
    </div>
  );
}