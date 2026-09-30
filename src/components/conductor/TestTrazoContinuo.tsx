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
  const [rondaActual, setRondaActual] = useState(1);
  const [progresoRonda, setProgresoRonda] = useState(0);

  const duracionRondaMs = 5000;
  const totalRondas = 3;
  const animacionRef = useRef<number | null>(null);
  const tiempoInicioRonda = useRef<number>(0);
  const ultimoFrame = useRef<number>(0);

  const radioPuntos = 24;
  const puntosRef = useRef({
    p1: { x: 75, y: 150, vy: 1.1, dir: 1, colorBase: '#2563eb', estatico: false, tocado: false },
    p2: { x: 225, y: 150, vy: 1.1, dir: -1, colorBase: '#9333ea', estatico: false, tocado: false }
  });

  const tiemposContacto = useRef<number[]>([]);
  const contactoAcumuladoRonda = useRef<number>(0);

  const configurarRonda = (ronda: number) => {
    contactoAcumuladoRonda.current = 0;
    tiempoInicioRonda.current = Date.now();
    ultimoFrame.current = Date.now();

    if (ronda === 1) {
      puntosRef.current.p1 = { x: 75, y: 160, vy: 0, dir: 0, colorBase: '#2563eb', estatico: true, tocado: false };
      puntosRef.current.p2 = { x: 225, y: 80, vy: 1.1, dir: 1, colorBase: '#9333ea', estatico: false, tocado: false };
    } else if (ronda === 2) {
      puntosRef.current.p1 = { x: 75, y: 80, vy: 1.2, dir: 1, colorBase: '#2563eb', estatico: false, tocado: false };
      puntosRef.current.p2 = { x: 225, y: 240, vy: 1.2, dir: -1, colorBase: '#9333ea', estatico: false, tocado: false };
    } else {
      puntosRef.current.p1 = { x: 75, y: 200, vy: 1.4, dir: -1, colorBase: '#2563eb', estatico: false, tocado: false };
      puntosRef.current.p2 = { x: 225, y: 100, vy: 0.9, dir: 1, colorBase: '#9333ea', estatico: false, tocado: false };
    }
  };

  const actualizarPuntos = (factorDelta: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { p1, p2 } = puntosRef.current;

    if (!p1.estatico) {
      p1.y += p1.vy * p1.dir * factorDelta;
      if (p1.y - radioPuntos <= 12) {
        p1.y = radioPuntos + 12;
        p1.dir = 1;
      } else if (p1.y + radioPuntos >= canvas.height - 12) {
        p1.y = canvas.height - radioPuntos - 12;
        p1.dir = -1;
      }
    }

    if (!p2.estatico) {
      p2.y += p2.vy * p2.dir * factorDelta;
      if (p2.y - radioPuntos <= 12) {
        p2.y = radioPuntos + 12;
        p2.dir = 1;
      } else if (p2.y + radioPuntos >= canvas.height - 12) {
        p2.y = canvas.height - radioPuntos - 12;
        p2.dir = -1;
      }
    }
  };

  const dibujar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(75, 10);
    ctx.lineTo(75, canvas.height - 10);
    ctx.moveTo(225, 10);
    ctx.lineTo(225, canvas.height - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    const { p1, p2 } = puntosRef.current;

    ctx.beginPath();
    ctx.arc(p1.x, p1.y, radioPuntos, 0, Math.PI * 2);
    ctx.fillStyle = p1.tocado ? '#16a34a' : p1.colorBase;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p2.x, p2.y, radioPuntos, 0, Math.PI * 2);
    ctx.fillStyle = p2.tocado ? '#16a34a' : p2.colorBase;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  const bucleJuego = () => {
    const ahora = Date.now();
    const deltaMs = ahora - ultimoFrame.current;
    ultimoFrame.current = ahora;

    const factorDelta = Math.min(Math.max(deltaMs / 16.67, 0.5), 2.5);

    const transcurrido = ahora - tiempoInicioRonda.current;
    setProgresoRonda(Math.min(100, Math.round((transcurrido / duracionRondaMs) * 100)));

    if (puntosRef.current.p1.tocado && puntosRef.current.p2.tocado) {
      contactoAcumuladoRonda.current += deltaMs;
    }

    actualizarPuntos(factorDelta);
    dibujar();

    if (transcurrido < duracionRondaMs) {
      animacionRef.current = requestAnimationFrame(bucleJuego);
    } else {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
      tiemposContacto.current.push(contactoAcumuladoRonda.current);

      setRondaActual((prevRonda) => {
        if (prevRonda >= totalRondas) {
          finalizarEvaluacion();
          return prevRonda;
        }
        const siguiente = prevRonda + 1;
        setTimeout(() => {
          configurarRonda(siguiente);
          bucleJuego();
        }, 800);
        return siguiente;
      });
    }
  };

  const iniciarPrueba = () => {
    setFase('prueba');
    setRondaActual(1);
    tiemposContacto.current = [];
    configurarRonda(1);
    bucleJuego();
  };

  const finalizarEvaluacion = () => {
    setFase('resultado');
    setTimeout(() => {
      const tiempoTotalEsperado = duracionRondaMs * totalRondas;
      const tiempoTotalContacto = tiemposContacto.current.reduce((a, b) => a + b, 0);
      const porcentajeContacto = Math.round((tiempoTotalContacto / tiempoTotalEsperado) * 100);
      const aprobado = porcentajeContacto >= 50;

      onFinalizado({
        aprobado,
        promedioMs: porcentajeContacto,
        erroresComision: 0,
        erroresOmision: 100 - porcentajeContacto,
        tipoTest: 'Trazo Bimanual Vertical'
      });
    }, 1000);
  };

  const verificarContacto = (puntosEntrada: { clientX: number; clientY: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { p1, p2 } = puntosRef.current;

    p1.tocado = false;
    p2.tocado = false;

    for (let i = 0; i < puntosEntrada.length; i++) {
      const punto = puntosEntrada[i];
      const x = punto.clientX - rect.left;
      const y = punto.clientY - rect.top;

      const d1 = Math.sqrt((p1.x - x) ** 2 + (p1.y - y) ** 2);
      if (d1 <= radioPuntos * 1.8) {
        p1.tocado = true;
      }

      const d2 = Math.sqrt((p2.x - x) ** 2 + (p2.y - y) ** 2);
      if (d2 <= radioPuntos * 1.8) {
        p2.tocado = true;
      }
    }
  };

  const manejarTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touchList = Array.from(e.touches).map(t => ({ clientX: t.clientX, clientY: t.clientY }));
    verificarContacto(touchList);
  };

  const manejarMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) {
      verificarContacto([{ clientX: e.clientX, clientY: e.clientY }]);
    }
  };

  const manejarMouseUp = () => {
    puntosRef.current.p1.tocado = false;
    puntosRef.current.p2.tocado = false;
  };

  useEffect(() => {
    return () => {
      if (animacionRef.current) cancelAnimationFrame(animacionRef.current);
    };
  }, []);

  return (
    <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10 text-center select-none">
      <div className="mb-4">
        <span className="bg-indigo-100 text-indigo-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
          Coordinación Visomotora
        </span>
        <h2 className="text-xl font-black text-slate-800 mt-2">Trazo Vertical Bimanual</h2>
      </div>

      {fase === 'instrucciones' && (
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/60 p-4 rounded-2xl border border-slate-200">
            1. Usa <strong>ambos pulgares o dedos índices</strong> en la pantalla.<br />
            2. Mantén un dedo en el círculo azul y otro en el morado.<br />
            3. Síguelos verticalmente mientras se desplazan. Si estás en contacto correcto, se iluminarán en <strong>VERDE</strong>.
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
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2 px-1">
            <span>Ronda {rondaActual} de {totalRondas}</span>
            <span className="text-indigo-600 font-black">
              {rondaActual === 1 ? 'Uno fijo, uno móvil' : rondaActual === 2 ? 'Direcciones opuestas' : 'Velocidades distintas'}
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-indigo-600 h-full transition-all duration-100"
              style={{ width: `${progresoRonda}%` }}
            />
          </div>

          <div className="border-2 border-slate-300 rounded-3xl bg-white/80 overflow-hidden shadow-inner flex justify-center touch-none">
            <canvas
              ref={canvasRef}
              width={300}
              height={320}
              onTouchStart={manejarTouch}
              onTouchMove={manejarTouch}
              onTouchEnd={manejarTouch}
              onMouseDown={(e) => verificarContacto([{ clientX: e.clientX, clientY: e.clientY }])}
              onMouseMove={manejarMouseMove}
              onMouseUp={manejarMouseUp}
              onMouseLeave={manejarMouseUp}
              className="cursor-crosshair"
            />
          </div>

          <p className="text-[11px] text-slate-500 mt-3 font-medium">
            Mantén ambos dedos sobre los círculos verticalmente sin soltarlos.
          </p>
        </div>
      )}

      {fase === 'resultado' && (
        <div className="py-8 space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-indigo-600 animate-spin mx-auto"></div>
          <p className="text-sm font-black text-slate-700">Analizando estabilidad bimanual y reflejos...</p>
        </div>
      )}
    </div>
  );
}