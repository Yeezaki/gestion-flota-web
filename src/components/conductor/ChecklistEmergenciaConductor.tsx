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
    // Barajar aleatoriamente y seleccionar cantidad configurada
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
    e.preventDefault();
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
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneFirma(true);
  };

  const finalizarTrazo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setDibujando(false);
  };

  const handleEnviar = async () => {
    // Validar que todas las preguntas tengan respuesta
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

    // Calificar
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
    const aprobado = porcentaje >= 66; // 2 de 3 aprobadas mínimo

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
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Evaluación de Emergencia (Checklist Rápido)
          </h3>
          <p className="text-xs text-slate-500">
            Conductor: {conductorNombre} ({conductorRut}) - Responda el cuestionario aleatorio y firme al finalizar.
          </p>
        </div>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Cerrar
          </button>
        )}
      </div>

      {/* Lista de Preguntas Aleatorias */}
      <div className="space-y-5">
        {preguntasSeleccionadas.map((item, index) => (
          <div key={item.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-800">
              {index + 1}. {item.pregunta}
            </p>
            <div className="space-y-2">
              {item.opciones.map((opcion, opcIdx) => (
                <label
                  key={opcIdx}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                    respuestas[item.id] === opcIdx
                      ? 'border-blue-500 bg-blue-50 font-medium text-blue-900'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`pregunta_${item.id}`}
                    checked={respuestas[item.id] === opcIdx}
                    onChange={() => seleccionarOpcion(item.id, opcIdx)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{opcion}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recuadro de Firma */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Firma de Conformidad del Conductor
          </label>
          <button
            type="button"
            onClick={limpiarFirma}
            className="text-xs text-red-600 hover:text-red-800 underline font-medium"
          >
            Limpiar firma
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={600}
            height={130}
            className="w-full h-[130px] touch-none cursor-crosshair bg-white"
            onMouseDown={iniciarTrazo}
            onMouseMove={moverTrazo}
            onMouseUp={finalizarTrazo}
            onMouseLeave={finalizarTrazo}
            onTouchStart={iniciarTrazo}
            onTouchMove={moverTrazo}
            onTouchEnd={finalizarTrazo}
          />
        </div>
      </div>

      {errorValidacion && (
        <div className="p-3 rounded-lg text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
          {errorValidacion}
        </div>
      )}

      {resultadoFinal && (
        <div
          className={`p-3 rounded-lg text-xs font-bold border ${
            resultadoFinal.aprobado
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          Resultado: {resultadoFinal.puntaje} de {preguntasSeleccionadas.length} correctas. ({resultadoFinal.aprobado ? 'APROBADO' : 'NO APROBADO'})
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleEnviar}
          disabled={guardando}
          className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {guardando ? 'Guardando...' : 'Finalizar y Firmar Evaluación'}
        </button>
      </div>
    </div>
  );
};