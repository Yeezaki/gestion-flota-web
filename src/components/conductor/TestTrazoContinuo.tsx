import { useState, useEffect, useRef } from 'react';

type ResultadoTest = {
  aprobado: boolean;
  promedioMs: number;
  erroresComision: number;
  erroresOmision: number;
  tipoTest: string;
};

type TestTrazoContinuoProps = {
  onFinalizado: (resultado: ResultadoTest) => void;
};

export default function TestTrazoContinuo({ onFinalizado }: TestTrazoContinuoProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fase, setFase] = useState<'instrucciones' | 'prueba' | 'resultado'>('instrucciones');
  const [progreso, setProgreso] = useState(0);

  const duracionTotalMs = 7000;
  const tiempoInicio = useRef<number>(0);
  const animacionRef = useRef<number | null>(null);

  const puntosRef = useRef({
    p1: { x: 50, y: 70, dir: 1, velocidad: 2.2, tocado: false },
    p2: { x: 270, y: 170, dir: -1, velocidad: 2.2, tocado: false }
  });

  const tiempoEnContacto = useRef<number>(0);
  const ultimoFrame = useRef<number>(0);

  const radioPuntos = 24;

  const iniciarPrueba = () => {
    setFase('prueba');
    tiempoInicio.current = Date.now();
    ultimoFrame.current = Date.now();
    tiempoEnContacto.current = 0;
    bucleJuego();
  };

  const actualizarPuntos = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { p1, p2 } = puntosRef.current;

    p1.x += p1.velocidad * p1.dir;
    if (p1.x - radioPuntos <= 10 || p1.x + radioPuntos >= canvas.width - 10) {
      p1.dir *= -1;
    }

    p2.x += p2.velocidad * p2.dir;
    if (p2.x - radioPuntos <= 10 || p2.x + radioPuntos >= canvas.width - 10) {
      p2.dir *= -1;
    }
  };

  const dibujar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { p1, p2 } = puntosRef.current;

    ctx.beginPath();
    ctx.arc(p1.x, p1.y, radioPuntos, 0, Math.PI * 2);
    ctx.fillStyle = p1.tocado ? '#16a34a' : '#2563eb';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p2.x, p2.y, radioPuntos, 0, Math.PI * 2);
    ctx.fillStyle = p2.tocado ? '#16a34a' : '#2563eb';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  const bucleJuego = () => {
    const ahora = Date.now();
    const delta = ahora - ultimoFrame.current;
    ultimoFrame.current = ahora;

    const transcurrido = ahora - tiempoInicio.current;
    setProgreso(Math.min(100, Math.round((transcurrido / duracionTotalMs) * 100)));

    if (puntosRef.current.p1.tocado && puntosRef.current.p2.tocado) {
      tiempoEnContacto.current += delta;
    }

    actualizarPuntos();
    dibujar();

    if (transcurrido < duracionTotalMs) {
      animacionRef.current = requestAnimationFrame(bucleJuego);
    } else {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
      setFase('resultado');

      setTimeout(() => {
        const porcentajeContacto = Math.round((tiempoEnContacto.current / duracionTotalMs) * 100);
        const aprobado = porcentajeContacto >= 60;

        onFinalizado({
          aprobado,
          promedioMs: porcentajeContacto,
          erroresComision: 0,
          erroresOmision: 100 - porcentajeContacto,
          tipoTest: 'Coordinacion Motora Bimanual'
        });
      }, 1000);
    }
  };

  const verificarContacto = (touches: React.TouchList | { clientX: number; clientY: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { p1, p2 } = puntosRef.current;

    p1.tocado = false;
    p2.tocado = false;

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const d1 = Math.sqrt((p1.x - x) ** 2 + (p1.y - y) ** 2);
      if (d1 <= radioPuntos * 1.5) {
        p1.tocado = true;
      }

      const d2 = Math.sqrt((p2.x - x) ** 2 + (p2.y - y) ** 2);
      if (d2 <= radioPuntos * 1.5) {
        p2.tocado = true;
      }
    }
  };

  const manejarTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    verificarContacto(e.touches);
  };

  const manejarTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    verificarContacto(e.touches);
  };

  const manejarTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    verificarContacto(e.touches);
  };

  useEffect(() => {
    return () => {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
    };
  }, []);

  return (
    <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10 text-center select-none">
      <div className="mb-4">
        <span className="bg-indigo-100 text-indigo-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
          Coordinacion y Motricidad
        </span>
        <h2 className="text-xl font-black text-slate-800 mt-2">Seguimiento de Doble Trazo</h2>
      </div>

      {fase === 'instrucciones' && (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-2xl border border-slate-200">
            1. Usa dos dedos en la pantalla.<br />
            2. Presiona ambos circulos y siguelos mientras se mueven en sentidos contrarios.<br />
            3. Si estas en contacto correcto, se pondran de color <strong>VERDE</strong>. Manten el contacto el mayor tiempo posible.
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

      {fase === 'prueba' && (
        <div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-blue-600 h-full transition-all duration-100"
              style={{ width: `${progreso}%` }}
            />
          </div>

          <div className="border-2 border-slate-300 rounded-3xl bg-white/80 overflow-hidden shadow-inner flex justify-center touch-none">
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              onTouchStart={manejarTouchStart}
              onTouchMove={manejarTouchMove}
              onTouchEnd={manejarTouchEnd}
              className="cursor-crosshair"
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-3 font-medium">
            Manten dos dedos sobre los circulos en movimiento.
          </p>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-blue-600 animate-spin mx-auto"></div>
          <p className="text-sm font-black text-slate-700">Analizando estabilidad neuromuscular...</p>
        </div>
      )}
    </div>
  );
}