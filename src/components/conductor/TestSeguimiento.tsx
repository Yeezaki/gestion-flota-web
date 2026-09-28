import { useState, useEffect, useRef } from 'react';

type ResultadoTest = {
  aprobado: boolean;
  promedioMs: number;
  erroresComision: number;
  erroresOmision: number;
  tipoTest: string;
};

type TestSeguimientoProps = {
  onFinalizado: (resultado: ResultadoTest) => void;
};

type Pelota = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radio: number;
  esObjetivo: boolean;
  seleccionada: boolean;
};

export default function TestSeguimiento({ onFinalizado }: TestSeguimientoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fase, setFase] = useState<'instrucciones' | 'memorizar' | 'movimiento' | 'seleccion' | 'resultado'>('instrucciones');
  const [aciertos, setAciertos] = useState(0);
  const [errores, setErrores] = useState(0);
  const [rondaActual, setRondaActual] = useState(1);
  const totalRondas = 3;

  const pelotasRef = useRef<Pelota[]>([]);
  const animacionRef = useRef<number | null>(null);
  const tiempoInicioRonda = useRef<number>(0);
  const tiemposRespuesta = useRef<number[]>([]);
  const faseRef = useRef<'instrucciones' | 'memorizar' | 'movimiento' | 'seleccion' | 'resultado'>('instrucciones');

  useEffect(() => {
    faseRef.current = fase;
  }, [fase]);

  const inicializarPelotas = () => {
    const ancho = 320;
    const alto = 240;
    const totalPelotas = 5;
    const objetivosIndices = [0, 1];

    const nuevasPelotas: Pelota[] = [];
    for (let i = 0; i < totalPelotas; i++) {
      const radio = 18;
      const x = Math.random() * (ancho - radio * 4) + radio * 2;
      const y = Math.random() * (alto - radio * 4) + radio * 2;
      const velocidad = 1.9;
      const angulo = Math.random() * Math.PI * 2;

      nuevasPelotas.push({
        id: i,
        x,
        y,
        vx: Math.cos(angulo) * velocidad,
        vy: Math.sin(angulo) * velocidad,
        radio,
        esObjetivo: objetivosIndices.includes(i),
        seleccionada: false
      });
    }

    pelotasRef.current = nuevasPelotas;
  };

  const dibujar = (faseVisual?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const estado = faseVisual || faseRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pelotasRef.current.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);

      if (estado === 'memorizar' && p.esObjetivo) {
        ctx.fillStyle = '#2563eb';
      } else if (estado === 'seleccion' && p.seleccionada) {
        ctx.fillStyle = '#0284c7';
      } else {
        ctx.fillStyle = '#94a3b8';
      }

      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.closePath();
    });
  };

  const actualizarPosiciones = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    pelotasRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x - p.radio <= 0 || p.x + p.radio >= canvas.width) {
        p.vx *= -1;
      }
      if (p.y - p.radio <= 0 || p.y + p.radio >= canvas.height) {
        p.vy *= -1;
      }
    });
  };

  const bucleAnimacion = () => {
    actualizarPosiciones();
    dibujar('movimiento');
    animacionRef.current = requestAnimationFrame(bucleAnimacion);
  };

  const iniciarRonda = () => {
    inicializarPelotas();
    setFase('memorizar');
    faseRef.current = 'memorizar';

    setTimeout(() => {
      dibujar('memorizar');
    }, 50);

    setTimeout(() => {
      setFase('movimiento');
      faseRef.current = 'movimiento';
      bucleAnimacion();

      setTimeout(() => {
        if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
        setFase('seleccion');
        faseRef.current = 'seleccion';
        tiempoInicioRonda.current = Date.now();
        dibujar('seleccion');
      }, 5000);
    }, 2200);
  };

  const manejarClickCanvas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (fase !== 'seleccion') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pelotaTocada = pelotasRef.current.find((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= p.radio;
    });

    if (pelotaTocada && !pelotaTocada.seleccionada) {
      pelotaTocada.seleccionada = true;
      dibujar('seleccion');

      const seleccionadas = pelotasRef.current.filter((p) => p.seleccionada);
      if (seleccionadas.length === 2) {
        const tiempoRespuesta = Date.now() - tiempoInicioRonda.current;
        tiemposRespuesta.current.push(tiempoRespuesta);

        const objetivosAcertados = seleccionadas.filter((p) => p.esObjetivo).length;
        if (objetivosAcertados === 2) {
          setAciertos((prev) => prev + 1);
        } else {
          setErrores((prev) => prev + (2 - objetivosAcertados));
        }

        if (rondaActual < totalRondas) {
          setRondaActual((prev) => prev + 1);
          setTimeout(() => iniciarRonda(), 800);
        } else {
          setFase('resultado');
          setTimeout(() => {
            const promedio = tiemposRespuesta.current.length > 0
              ? Math.round(tiemposRespuesta.current.reduce((a, b) => a + b, 0) / tiemposRespuesta.current.length)
              : 0;

            const aprobado = aciertos + (objetivosAcertados === 2 ? 1 : 0) >= 2;

            onFinalizado({
              aprobado,
              promedioMs: promedio,
              erroresComision: errores + (2 - objetivosAcertados),
              erroresOmision: 0,
              tipoTest: 'Seguimiento Multiple (MOT)'
            });
          }, 1000);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
    };
  }, []);

  return (
    <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10 text-center select-none">
      <div className="mb-4">
        <span className="bg-sky-100 text-sky-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
          Atencion Dividida y Seguimiento
        </span>
        <h2 className="text-xl font-black text-slate-800 mt-2">Seguimiento de Objetos</h2>
      </div>

      {fase === 'instrucciones' && (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-2xl border border-slate-200">
            1. Memoriza las <strong>2 bolitas azules</strong> que se iluminaran al inicio.<br />
            2. Siguelas visualmente mientras se mueven por la pantalla.<br />
            3. Al detenerse, toca las 2 bolitas que memorizaste.
          </p>
          <button
            type="button"
            onClick={iniciarRonda}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all"
          >
            Comenzar Prueba
          </button>
        </div>
      )}

      {(fase === 'memorizar' || fase === 'movimiento' || fase === 'seleccion') && (
        <div>
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-3 px-1">
            <span>Ronda {rondaActual} de {totalRondas}</span>
            <span className="text-blue-600 uppercase font-black">
              {fase === 'memorizar' ? 'Memoriza los 2 azules' : fase === 'movimiento' ? 'Siguelos con la vista' : 'Toca los 2 que eran azules'}
            </span>
          </div>

          <div className="border-2 border-slate-300 rounded-3xl bg-white/80 overflow-hidden shadow-inner flex justify-center">
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              onClick={manejarClickCanvas}
              onTouchStart={manejarClickCanvas}
              className="cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-3 font-medium">
            {fase === 'seleccion' ? 'Selecciona los 2 objetivos.' : 'Manten la mirada fija en los objetivos.'}
          </p>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto"></div>
          <p className="text-sm font-black text-slate-700">Analizando precision visual y atencion...</p>
        </div>
      )}
    </div>
  );
}