import { useState } from 'react';

type FormChecklistProps = {
  idPatente: string;
  nombreConductor: string;
  vehiculo: any;
  cargandoVehiculo: boolean;
  kilometraje: string;
  setKilometraje: (val: string) => void;
  kilometrajeAnterior: number;
  fotoPreview: string | null;
  onCapturarFotoTablero: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preguntasDinamicas: Array<{ id: string; texto: string }>;
  respuestasChecklist: Record<string, string>;
  onCambioRespuesta: (id: string, valor: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  tieneFirma: boolean;
  setTieneFirma: (val: boolean) => void;
  subiendo: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  forzarDescarga: (url: string, nombreArchivo: string) => void;
  calcularEstadoVencimiento: (fecha: string) => { texto: string; clase: string };
};

export default function FormChecklist({
  idPatente,
  nombreConductor,
  vehiculo,
  cargandoVehiculo,
  kilometraje,
  setKilometraje,
  kilometrajeAnterior,
  fotoPreview,
  onCapturarFotoTablero,
  preguntasDinamicas,
  respuestasChecklist,
  onCambioRespuesta,
  canvasRef,
  setTieneFirma,
  subiendo,
  onSubmit,
  forzarDescarga,
  calcularEstadoVencimiento
}: FormChecklistProps) {
  const [firmando, setFirmando] = useState(false);

  const iniciarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setFirmando(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const dibujarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!firmando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneFirma(true);
  };

  const detenerFirma = () => setFirmando(false);

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
  };

  const renderDocInfo = (titulo: string, fecha: string, url: string, nombreArchivo: string) => {
    const estado = calcularEstadoVencimiento(fecha);
    const fechaFormateada = fecha ? fecha.split('-').reverse().join('-') : 'Sin fecha';

    return (
      <div className={`p-3 rounded-2xl border backdrop-blur-sm flex flex-col justify-between items-center shadow-sm ${estado.clase}`}>
        <div className="flex flex-col items-center w-full mb-2">
          <span className="text-[10px] uppercase font-black opacity-80 mb-1">{titulo}</span>
          <span className="text-xs font-black text-slate-800">{fechaFormateada}</span>
          <span className="text-[10px] font-bold leading-tight mt-1 text-center">{estado.texto}</span>
        </div>
        {url && (
          <button 
            type="button"
            onClick={() => forzarDescarga(url, nombreArchivo)} 
            className="mt-auto w-full flex items-center justify-center gap-1.5 bg-slate-800/85 hover:bg-slate-900 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95"
          >
            Descargar
          </button>
        )}
      </div>
    );
  };

  const renderPautaInfo = (url: string, nombreArchivo: string) => (
    <div className="p-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 backdrop-blur-sm flex flex-col justify-between items-center shadow-sm">
      <div className="flex flex-col items-center w-full mb-2">
        <span className="text-[10px] uppercase font-black text-blue-800 opacity-80 mb-1">Pauta de Mantención</span>
        <span className="text-xs font-black text-blue-950">Manual / Preventivo</span>
        <span className="text-[10px] font-bold text-blue-700 leading-tight mt-1 text-center">
          {url ? 'Vigente y Disponible' : 'No disponible'}
        </span>
      </div>
      {url && (
        <button 
          type="button"
          onClick={() => forzarDescarga(url, nombreArchivo)} 
          className="mt-auto w-full flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95"
        >
          Descargar Pauta
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/50 my-auto relative z-10">
      <div className="bg-blue-600/75 backdrop-blur-md p-6 text-white text-center shadow-inner border-b border-white/20">
        <h1 className="text-xl font-bold">Checklist Diario</h1>
        <p className="text-blue-100 font-mono text-lg mt-1 tracking-widest">{idPatente}</p>
        <div className="mt-2 text-xs font-semibold bg-blue-800/70 inline-block px-3 py-1 rounded-full shadow-sm">
          Conductor: {nombreConductor}
        </div>
        {!cargandoVehiculo && vehiculo?.tipo && (
          <div className="mt-1">
            <span className="text-white text-[10px] font-black uppercase bg-blue-900/70 inline-block px-2.5 py-0.5 rounded-full">{vehiculo.tipo}</span>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-6">
        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
          <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Estado de Documentación Vehicular</h2>
          {vehiculo ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              {renderDocInfo('Rev. Técnica', vehiculo.vencimientoRevision, vehiculo.urlRevision, `Revision_${idPatente}.pdf`)}
              {renderDocInfo('Permiso Circ.', vehiculo.vencimientoCirculacion, vehiculo.urlCirculacion, `Circulacion_${idPatente}.pdf`)}
              {renderDocInfo('Certificado', vehiculo.vencimientoCertificado, vehiculo.urlCertificado, `Certificado_${idPatente}.pdf`)}
              {renderDocInfo('SOAP', vehiculo.vencimientoSoap, vehiculo.urlSoap, `SOAP_${idPatente}.pdf`)}
              <div className="col-span-2 mt-1">
                {renderPautaInfo(vehiculo.urlPauta, `PautaMantencion_${idPatente}.pdf`)}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center">Cargando documentos...</p>
          )}
        </div>

        <div className="space-y-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
          <h2 className="font-bold text-slate-800 border-b border-slate-200/80 pb-2">Registro de Kilometraje</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Escribir Kilometraje
              {kilometrajeAnterior > 0 && (
                <span className="text-blue-600 font-bold ml-2">(Anterior: {kilometrajeAnterior.toLocaleString('es-CL')} km)</span>
              )}
            </label>
            <input 
              type="number" 
              value={kilometraje}
              onChange={(e) => setKilometraje(e.target.value)}
              min={kilometrajeAnterior > 0 ? kilometrajeAnterior : 0}
              className="w-full p-3 bg-white/70 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white/90 focus:outline-none font-bold text-slate-800 shadow-sm" 
            />
          </div>
          <div className="text-center text-slate-400 text-sm font-black uppercase tracking-widest">O</div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Foto del Tablero</label>
            <label className="block w-full cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={onCapturarFotoTablero} className="hidden" />
              <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-xl p-4 text-center hover:bg-white/80 transition-all shadow-sm">
                {fotoPreview ? (
                  <div className="flex flex-col items-center">
                    <img src={fotoPreview} className="mx-auto h-24 rounded-lg shadow-sm mb-1 object-cover" alt="Vista previa" />
                    <span className="text-[11px] font-bold text-blue-600">Presiona para cambiar foto</span>
                  </div>
                ) : (
                  <span className="text-slate-600 text-sm font-bold flex items-center justify-center gap-2 text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Tomar foto con la cámara
                  </span>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200/80">
          <h2 className="font-bold text-slate-800 mb-4 text-lg">Inspección Visual</h2>
          {preguntasDinamicas.map((p) => (
            <div key={p.id} className="space-y-2 mb-5">
              <p className="text-slate-800 font-medium text-sm leading-snug">{p.texto}</p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => onCambioRespuesta(p.id, 'si')}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all shadow-sm ${
                    respuestasChecklist[p.id] === 'si'
                      ? 'border-blue-600 bg-blue-50/90 text-blue-600'
                      : 'border-slate-300 bg-white/60 text-slate-500 hover:bg-white/80'
                  }`}
                >
                  SI
                </button>
                <button
                  type="button"
                  onClick={() => onCambioRespuesta(p.id, 'no')}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all shadow-sm ${
                    respuestasChecklist[p.id] === 'no'
                      ? 'border-red-600 bg-red-50/90 text-red-600'
                      : 'border-slate-300 bg-white/60 text-slate-500 hover:bg-white/80'
                  }`}
                >
                  NO
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200/80">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-bold text-slate-800">Firma del Conductor *</label>
            <button type="button" onClick={limpiarFirma} className="text-xs text-red-600 font-bold hover:underline">Limpiar firma</button>
          </div>
          <div className="border-2 border-slate-300 rounded-2xl bg-white/80 overflow-hidden shadow-sm touch-none">
            <canvas
              ref={canvasRef}
              width={350}
              height={150}
              onMouseDown={iniciarFirma}
              onMouseMove={dibujarFirma}
              onMouseUp={detenerFirma}
              onMouseLeave={detenerFirma}
              onTouchStart={iniciarFirma}
              onTouchMove={dibujarFirma}
              onTouchEnd={detenerFirma}
              className="w-full h-[150px] cursor-crosshair bg-white/50"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 italic text-center">Firme dentro del recuadro usando su dedo o el mouse.</p>
        </div>

        <button type="submit" disabled={subiendo} className={`w-full text-white font-black text-lg tracking-wide py-4 rounded-2xl shadow-xl transition-all mt-4 active:scale-[0.98] ${subiendo ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600/90 hover:bg-blue-700 hover:shadow-blue-500/30'}`}>
          {subiendo ? 'Enviando reporte...' : 'Finalizar Reporte'}
        </button>
      </form>
    </div>
  );
}