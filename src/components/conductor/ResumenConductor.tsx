import { Link } from 'react-router-dom';

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
    <div className="w-full max-w-md mx-auto bg-white/60 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/50 animate-fade-in my-auto relative z-10">
      <div className={`p-6 text-white text-center ${bloqueado ? 'bg-red-600/80' : 'bg-blue-600/80'} backdrop-blur-sm`}>
        <h1 className="text-2xl font-black">Resumen de Jornada</h1>
        <p className="text-blue-100 font-mono text-lg mt-1 tracking-widest">{idPatente}</p>
        <p className="text-xs font-bold mt-1 opacity-90">{nombreConductor} (RUT: {rutConductor})</p>
        <p className={`text-xs font-black uppercase mt-2 inline-block px-3 py-1 rounded-full ${bloqueado ? 'bg-red-800/90 text-white' : 'bg-blue-800/90 text-white'}`}>
          {bloqueado ? 'VEHICULO BLOQUEADO' : 'VEHICULO APROBADO'}
        </p>
      </div>

      <div className="p-6">
        <div className="bg-white/50 backdrop-blur-sm p-5 rounded-2xl border border-white/60 mb-6 shadow-sm">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Registro de Kilometraje</h2>
          <div className="flex justify-between items-stretch px-2">
            <div className="text-center flex-1 flex flex-col justify-center">
              <p className="text-xs text-slate-500 font-bold mb-1">Actual</p>
              <p className="text-xl font-black text-slate-800">
                {kilometrajeActual ? `${kilometrajeActual.toLocaleString('es-CL')} km` : 'Por foto'}
              </p>
            </div>
            <div className="w-px bg-slate-300 mx-2"></div>
            <Link to={`/agendar/${idPatente}`} className="text-center flex-1 block hover:bg-blue-50/60 p-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-200 group">
              <p className="text-xs text-blue-600 font-bold mb-1">Próximo Taller</p>
              <p className="text-xl font-black text-blue-700">
                {vehiculo?.kilometrajeTaller ? `${Number(vehiculo.kilometrajeTaller).toLocaleString('es-CL')} km` : 'Pendiente'}
              </p>
              <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors">
                Agendar Hora
              </div>
            </Link>
          </div>
        </div>

        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Estado de Documentación</h2>
        {vehiculo ? (
          <div className="grid grid-cols-2 gap-3 text-center mb-6">
            {renderDocInfo('Rev. Técnica', vehiculo.vencimientoRevision, vehiculo.urlRevision, `Revision_${idPatente}.pdf`)}
            {renderDocInfo('Permiso Circ.', vehiculo.vencimientoCirculacion, vehiculo.urlCirculacion, `Circulacion_${idPatente}.pdf`)}
            {renderDocInfo('Certificado', vehiculo.vencimientoCertificado, vehiculo.urlCertificado, `Certificado_${idPatente}.pdf`)}
            {renderDocInfo('SOAP', vehiculo.vencimientoSoap, vehiculo.urlSoap, `SOAP_${idPatente}.pdf`)}
            <div className="col-span-2">
              {renderPautaInfo(vehiculo.urlPauta, `PautaMantencion_${idPatente}.pdf`)}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 mb-6">Documentos no disponibles en este momento.</p>
        )}

        <button onClick={onFinalizarJornada} className="mt-2 w-full bg-slate-800/90 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-md transition-colors active:scale-[0.98]">
          Finalizar Jornada
        </button>
      </div>
    </div>
  );
}