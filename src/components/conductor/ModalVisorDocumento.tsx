import React, { useState, useRef, useEffect } from 'react';
import { SAFETY_DOCUMENTS } from '../../constants';
import type { FirmaDocumento, SafetyDocumentType } from '../../constants';

interface ModalVisorDocumentoProps {
  documentoId: SafetyDocumentType;
  conductorUid: string;
  conductorNombre: string;
  conductorRut: string;
  isOpen: boolean;
  onClose: () => void;
  onGuardarFirma: (registro: FirmaDocumento) => Promise<void>;
}

export const ModalVisorDocumento: React.FC<ModalVisorDocumentoProps> = ({
  documentoId,
  conductorUid,
  conductorNombre,
  conductorRut,
  isOpen,
  onClose,
  onGuardarFirma
}) => {
  const docConfig = SAFETY_DOCUMENTS[documentoId];
  const [paginaActual, setPaginaActual] = useState<number>(0);
  const [haLeido, setHaLeido] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorFirma, setErrorFirma] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dibujando, setDibujando] = useState<boolean>(false);
  const [tieneTrazos, setTieneTrazos] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPaginaActual(0);
      setHaLeido(false);
      setTieneTrazos(false);
      setErrorFirma(null);
      limpiarCanvas();
    }
  }, [isOpen, documentoId]);

  const limpiarCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneTrazos(false);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const iniciarDibujo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
    ctx.strokeStyle = '#1e293b';
    setDibujando(true);
  };

  const trazar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dibujando) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneTrazos(true);
  };

  const terminarDibujo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setDibujando(false);
  };

  const handleSubmit = async () => {
    if (!haLeido) {
      setErrorFirma('Debe confirmar la lectura y toma de conocimiento del documento.');
      return;
    }
    if (!tieneTrazos || !canvasRef.current) {
      setErrorFirma('Debe registrar su firma en el recuadro antes de confirmar.');
      return;
    }

    try {
      setGuardando(true);
      setErrorFirma(null);
      const firmaBase64 = canvasRef.current.toDataURL('image/png');

      const registro: FirmaDocumento = {
        documentoId,
        conductorUid,
        conductorNombre,
        conductorRut,
        fechaLectura: new Date().toISOString(),
        firmaBase64,
        declaracionAceptada: true
      };

      await onGuardarFirma(registro);
      onClose();
    } catch (err: any) {
      setErrorFirma(err.message || 'Error al almacenar el registro de firma.');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen || !docConfig) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">{docConfig.titulo}</h3>
            <p className="text-xs text-slate-500">Versión {docConfig.version} - Documentación Operativa Obligatoria</p>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Documento */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          
          {/* Barra de Páginas */}
          <div className="flex items-center justify-between bg-slate-100 rounded-lg p-2 border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Hoja {paginaActual + 1} de {docConfig.paginas.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaginaActual(0)}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  paginaActual === 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Página 1
              </button>
              <button
                type="button"
                onClick={() => setPaginaActual(1)}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  paginaActual === 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Página 2
              </button>
            </div>
          </div>

          {/* Contenido de la Hoja Seleccionada */}
          <div className="min-h-[160px] p-5 rounded-lg border border-slate-300 bg-slate-50/50 shadow-inner font-mono text-sm leading-relaxed text-slate-700">
            <div className="mb-2 font-sans font-bold text-slate-900 border-b border-slate-200 pb-1">
              Contenido oficial - Hoja {paginaActual + 1}
            </div>
            {docConfig.paginas[paginaActual]}
          </div>

          {/* Declaracion de toma de conocimiento */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={haLeido}
                onChange={(e) => setHaLeido(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-800 leading-normal">
                Declaro que he leído, comprendido y tomado conocimiento cabal de las disposiciones, riesgos y protocolos descritos en este documento ({docConfig.titulo}).
              </span>
            </label>
          </div>

          {/* Recuadro de Firma */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Firma Digital del Conductor ({conductorNombre} - {conductorRut})
              </label>
              <button
                type="button"
                onClick={limpiarCanvas}
                className="text-xs text-red-600 hover:text-red-700 underline font-medium"
              >
                Limpiar firma
              </button>
            </div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
              <canvas
                ref={canvasRef}
                width={650}
                height={150}
                className="w-full h-[150px] touch-none cursor-crosshair bg-white"
                onMouseDown={iniciarDibujo}
                onMouseMove={trazar}
                onMouseUp={terminarDibujo}
                onMouseLeave={terminarDibujo}
                onTouchStart={iniciarDibujo}
                onTouchMove={trazar}
                onTouchEnd={terminarDibujo}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Dibuje su firma dentro del recuadro usando el dedo en pantallas táctiles o el puntero del mouse.
            </p>
          </div>

          {errorFirma && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200 font-medium">
              {errorFirma}
            </div>
          )}

        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando || !haLeido || !tieneTrazos}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {guardando ? 'Guardando Registro...' : 'He leído y tomado conocimiento'}
          </button>
        </div>

      </div>
    </div>
  );
};