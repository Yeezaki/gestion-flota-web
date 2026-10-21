type ResumenConductorProps = {
  idPatente: string;
  nombreConductor: string;
  rutConductor: string;
  bloqueado: boolean;
  kilometrajeActual: number | null;
  vehiculo: any;
  forzarDescarga: (url: string, nombreArchivo: string) => void;
  calcularEstadoVencimiento: (fecha: string) => { texto: string; clase: string };
  onFinalizarJornada: () => void;
};

export default function ResumenConductor({
  idPatente,
  nombreConductor,
  rutConductor,
  bloqueado,
  kilometrajeActual,
  vehiculo,
  forzarDescarga,
  calcularEstadoVencimiento,
  onFinalizarJornada
}: ResumenConductorProps) {
  const renderDocInfo = (titulo: string, fecha: string, url: string, nombreArchivo: string) => {
    const estado = calcularEstadoVencimiento(fecha);
    const fechaFormateada = fecha ? fecha.split('-').reverse().join('-') : 'Sin fecha';

    return (
      <div className={`p-3 rounded-2xl border backdrop-blur-sm flex flex-col justify-between items-center shadow-sm ${estado.clase}`}>
        <div className="flex flex-col items-center w-full mb-2">
          <span className="text-[10px] uppercase font-black opacity-80 mb-1 text-center">{titulo}</span>
          <span className="text-xs font-black text-slate-800">{fechaFormateada}</span>
          <span className="text-[10px] font-bold leading-tight mt-1 text-center">{estado.texto}</span>
        </div>
        {url && (
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
              if (!esApple) {
                e.preventDefault();
                forzarDescarga(url, nombreArchivo);
              }
            }}
            className="mt-auto w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95 text-center cursor-pointer no-underline"
          >
            Ver / Descargar
          </a>
        )}
      </div>
    );
  };

  const renderPautaInfo = (url: string, nombreArchivo: string) => (
    <div className="p-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 backdrop-blur-sm flex flex-col justify-between items-center shadow-sm">
      <div className="flex flex-col items-center w-full mb-2">
        <span className="text-[10px] uppercase font-black text-blue-900 mb-1 text-center">Pauta Mantención</span>
        <span className="text-xs font-black text-blue-950">Oficial Flota</span>
        <span className="text-[10px] font-bold text-blue-700 leading-tight mt-1 text-center">Vigente</span>
      </div>
      {url && (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            if (!esApple) {
              e.preventDefault();
              forzarDescarga(url, nombreArchivo);
            }
          }}
          className="mt-auto w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all active:scale-95 text-center cursor-pointer no-underline"
        >
          Ver Pauta
        </a>
      )}
    </div>
  );

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-white/40 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Panel del Conductor</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">{nombreConductor}</h2>
          <p className="text-xs font-mono text-slate-500">{rutConductor}</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patente Asignada</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 uppercase">{idPatente}</div>
          {kilometrajeActual !== null && (
            <p className="text-xs font-semibold text-slate-500">{kilometrajeActual.toLocaleString('es-CL')} km registrados</p>
          )}
        </div>
      </div>

      {bloqueado ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-2">
          <div className="text-xs font-black uppercase text-rose-700 tracking-wide">Vehículo Bloqueado para Operación</div>
          <p className="text-xs text-rose-600">
            Se registraron observaciones críticas en el checklist inicial o test cognitivo. Contacte a Prevención o Taller.
          </p>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
          <div className="text-xs font-black uppercase text-emerald-700 tracking-wide">Vehículo Habilitado</div>
          <p className="text-xs text-emerald-600">Checklist y pruebas validadas correctamente para la jornada.</p>
        </div>
      )}

      {/* Grid de documentos con adaptación para móvil, tablet y PC */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">Documentación del Vehículo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {renderDocInfo('Permiso Circulación', vehiculo?.fechaPermisoCirculacion, vehiculo?.urlPermisoCirculacion, `Permiso_${idPatente}.pdf`)}
          {renderDocInfo('Revisión Técnica', vehiculo?.fechaRevisionTecnica, vehiculo?.urlRevisionTecnica, `Revision_${idPatente}.pdf`)}
          {renderDocInfo('Seguro Obligatorio', vehiculo?.fechaSeguroObligatorio, vehiculo?.urlSeguroObligatorio, `Seguro_${idPatente}.pdf`)}
          {renderPautaInfo(vehiculo?.urlPautaMantenimiento, `Pauta_${idPatente}.pdf`)}
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onFinalizarJornada}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-2xl transition-all shadow-md active:scale-95 text-xs sm:text-sm text-center"
        >
          Finalizar Jornada
        </button>
      </div>
    </div>
  );
}