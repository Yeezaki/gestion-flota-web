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
      setTimeout(limpiarCanvas, 50);
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

  // Cálculo proporcional exacto para touch en iPad/iPhone (evita desfases en pantallas Retina)
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const iniciarDibujo = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    setDibujando(true);
  };

  const trazar = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneTrazos(true);
  };

  const terminarDibujo = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-sm antialiased">
      <div className="relative flex flex-col max-h-[92vh] w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-4 bg-slate-50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">{docConfig.titulo}</h3>
            <p className="text-xs text-slate-500">
              Versión {docConfig.version} — Documentación Operativa Obligatoria
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del Documento */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 scroll-touch">
          
          {/* Selector de Páginas */}
          <div className="flex items-center justify-between bg-slate-100 rounded-xl p-2 border border-slate-200">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Hoja {paginaActual + 1} de {docConfig.paginas.length}
            </span>
            <div className="flex gap-1.5">
              {docConfig.paginas.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPaginaActual(idx)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    paginaActual === idx
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  Página {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Texto Oficial */}
          <div className="min-h-[140px] p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/60 font-mono text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            <div className="mb-2 font-sans font-bold text-slate-900 border-b border-slate-200 pb-1">
              Contenido oficial — Hoja {paginaActual + 1}
            </div>
            {docConfig.paginas[paginaActual]}
          </div>

          {/* Declaración */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={haLeido}
                onChange={(e) => setHaLeido(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-800 leading-normal">
                Declaro que he leído, comprendido y tomado conocimiento cabal de las disposiciones, riesgos y protocolos descritos en este documento ({docConfig.titulo}).
              </span>
            </label>
          </div>

          {/* Canvas de Firma */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Firma Digital del Conductor ({conductorNombre} — {conductorRut})
              </label>
              <button
                type="button"
                onClick={limpiarCanvas}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold"
              >
                Limpiar firma
              </button>
            </div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-draw">
              <canvas
                ref={canvasRef}
                width={650}
                height={150}
                className="w-full h-[150px] cursor-crosshair bg-white touch-draw block"
                onMouseDown={iniciarDibujo}
                onMouseMove={trazar}
                onMouseUp={terminarDibujo}
                onMouseLeave={terminarDibujo}
                onTouchStart={iniciarDibujo}
                onTouchMove={trazar}
                onTouchEnd={terminarDibujo}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Firme con su dedo o lápiz óptico dentro del recuadro.
            </p>
          </div>

          {errorFirma && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold text-center">
              {errorFirma}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 sm:px-6 py-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando || !haLeido || !tieneTrazos}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          >
            {guardando ? 'Guardando Registro...' : 'Confirmar y Guardar Firma'}
          </button>
        </div>

      </div>
    </div>
  );
};