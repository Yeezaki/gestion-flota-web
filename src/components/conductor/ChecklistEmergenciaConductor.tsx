import React, { useState, useEffect, useRef } from 'react';
import { BANCO_PREGUNTAS_EMERGENCIA } from '../../constants';
import type {
  EvaluacionEmergenciaRegistro,
  PreguntaEmergencia
} from '../../constants';

interface ChecklistEmergenciaConductorProps {
  conductorUid: string;
  conductorNombre: string;
  conductorRut: string;
  cantidadPreguntas?: number;
  onGuardarEvaluacion: (evaluacion: EvaluacionEmergenciaRegistro) => Promise<void>;
  onCerrar?: () => void;
}

export const ChecklistEmergenciaConductor: React.FC<ChecklistEmergenciaConductorProps> = ({
  conductorUid,
  conductorNombre,
  conductorRut,
  cantidadPreguntas = 3,
  onGuardarEvaluacion,
  onCerrar
}) => {
  const [preguntasSeleccionadas, setPreguntasSeleccionadas] = useState<PreguntaEmergencia[]>([]);
  const [respuestas, setRespuestas] = useState<{ [preguntaId: string]: number }>({});
  const [resultadoFinal, setResultadoFinal] = useState<{
    puntaje: number;
    aprobado: boolean;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dibujando, setDibujando] = useState<boolean>(false);
  const [tieneFirma, setTieneFirma] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    const barajadas = [...BANCO_PREGUNTAS_EMERGENCIA].sort(() => 0.5 - Math.random());
    setPreguntasSeleccionadas(barajadas.slice(0, cantidadPreguntas));
    setRespuestas({});
    setResultadoFinal(null);
    limpiarFirma();
  }, [cantidadPreguntas]);

  const seleccionarOpcion = (preguntaId: string, opcionIndex: number) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: opcionIndex
    }));
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const iniciarTrazo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setDibujando(true);
  };

  const moverTrazo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneFirma(true);
  };

  const finalizarTrazo = () => {
    setDibujando(false);
  };

  const handleEnviar = async () => {
    const faltantes = preguntasSeleccionadas.some((p) => respuestas[p.id] === undefined);
    if (faltantes) {
      setErrorValidacion('Debe responder todas las preguntas del checklist.');
      return;
    }

    if (!tieneFirma || !canvasRef.current) {
      setErrorValidacion('Debe estampar su firma digital en el recuadro para validar su respuesta.');
      return;
    }

    setErrorValidacion(null);

    let correctas = 0;
    const detalleRespuestas = preguntasSeleccionadas.map((p) => {
      const elegida = respuestas[p.id];
      const esCorrecta = elegida === p.respuestaCorrectaIndex;
      if (esCorrecta) correctas += 1;
      return {
        preguntaId: p.id,
        pregunta: p.pregunta,
        respuestaSeleccionadaIndex: elegida,
        esCorrecta
      };
    });

    const porcentaje = Math.round((correctas / preguntasSeleccionadas.length) * 100);
    const aprobado = porcentaje >= 66;

    setResultadoFinal({ puntaje: correctas, aprobado });

    try {
      setGuardando(true);
      const firmaBase64 = canvasRef.current.toDataURL('image/png');

      const registro: EvaluacionEmergenciaRegistro = {
        conductorUid,
        conductorNombre,
        conductorRut,
        fecha: new Date().toISOString(),
        preguntasRespondidas: detalleRespuestas,
        puntaje: correctas,
        totalPreguntas: preguntasSeleccionadas.length,
        aprobado,
        firmaBase64
      };

      await onGuardarEvaluacion(registro);
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error al almacenar el checklist de emergencia.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
      {/* Cabecera Fija */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center shrink-0">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-800">
            Evaluación de Emergencia (Cuestionario en Ruta)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Conductor: <span className="font-bold text-slate-700">{conductorNombre}</span> ({conductorRut})
          </p>
        </div>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs transition-colors shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Cuerpo Scrolleable Libremente */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
        {/* Preguntas */}
        <div className="space-y-4">
          {preguntasSeleccionadas.map((item, index) => (
            <div key={item.id} className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black mr-2">
                  #{index + 1}
                </span>
                {item.pregunta}
              </p>
              <div className="space-y-2 pt-1">
                {item.opciones.map((opcion, opcIdx) => (
                  <label
                    key={opcIdx}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      respuestas[item.id] === opcIdx
                        ? 'border-blue-500 bg-blue-50/80 font-bold text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pregunta_${item.id}`}
                      checked={respuestas[item.id] === opcIdx}
                      onChange={() => seleccionarOpcion(item.id, opcIdx)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="leading-tight">{opcion}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recuadro de Firma */}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wide">
              Firma de Conformidad del Conductor *
            </label>
            <button
              type="button"
              onClick={limpiarFirma}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline"
            >
              Limpiar firma
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              width={600}
              height={140}
              className="w-full h-[140px] touch-none cursor-crosshair bg-white block"
              onMouseDown={iniciarTrazo}
              onMouseMove={moverTrazo}
              onMouseUp={finalizarTrazo}
              onMouseLeave={finalizarTrazo}
              onTouchStart={iniciarTrazo}
              onTouchMove={moverTrazo}
              onTouchEnd={finalizarTrazo}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Dibuja tu firma con el dedo o mouse dentro del recuadro blanco.
          </p>
        </div>

        {errorValidacion && (
          <div className="p-3.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {errorValidacion}
          </div>
        )}

        {resultadoFinal && (
          <div
            className={`p-3.5 rounded-xl text-xs font-bold border ${
              resultadoFinal.aprobado
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            Resultado: {resultadoFinal.puntaje} de {preguntasSeleccionadas.length} correctas ({resultadoFinal.aprobado ? 'APROBADO' : 'NO APROBADO'}).
          </div>
        )}
      </div>

      {/* Pie Fijo con Botón de Envío */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleEnviar}
          disabled={guardando}
          className="px-6 py-2.5 text-xs font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
        >
          {guardando ? 'Guardando evaluación...' : 'Finalizar y Firmar Evaluación'}
        </button>
      </div>
    </div>
  );
};