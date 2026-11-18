type VistaFiscalizadorProps = {
  idPatente: string;
  vehiculo: any;
  ultimoReporte: any;
  cargandoReporte: boolean;
  forzarDescarga: (url: string, nombreArchivo: string) => void;
  calcularEstadoVencimiento: (fecha: string) => { texto: string; clase: string };
  onVolverMenu: () => void;
};

export default function VistaFiscalizador({
  idPatente,
  vehiculo,
  ultimoReporte,
  cargandoReporte,
  forzarDescarga,
  calcularEstadoVencimiento,
  onVolverMenu
}: VistaFiscalizadorProps) {
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

  const formatearFechaRegistro = (timestamp: any) => {
    if (!timestamp) return 'Sin registro';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Sin registro';
    }
  };

  const vehiculoBloqueado = Boolean(
    ultimoReporte?.fallaCritica ||
    ultimoReporte?.bloqueoPorTestCognitivo ||
    ultimoReporte?.motivoBloqueo
  );

  const estadoLicencia = ultimoReporte?.vencimientoLicencia
    ? calcularEstadoVencimiento(ultimoReporte.vencimientoLicencia)
    : null;

  const fechaLicenciaFormateada = ultimoReporte?.vencimientoLicencia
    ? ultimoReporte.vencimientoLicencia.split('-').reverse().join('-')
    : 'No registrada';

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-xl border border-white/40 space-y-5 max-w-lg w-full animate-fade-in relative z-10">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
          Modo Fiscalización
        </span>
        <button
          type="button"
          onClick={onVolverMenu}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Volver al menú
        </button>
      </div>

      {/* Datos del Conductor y Patente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Último Conductor Registrado</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            {cargandoReporte ? 'Cargando...' : ultimoReporte?.conductorNombre || 'Sin registros'}
          </h2>
          <p className="text-xs font-mono text-slate-500">
            {ultimoReporte?.conductorRut || 'Sin RUT'}
          </p>
          {ultimoReporte?.fecha && (
            <p className="text-[11px] text-slate-400 mt-1">
              Inspección: {formatearFechaRegistro(ultimoReporte.fecha)}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patente</span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-600 uppercase">{idPatente}</div>
          {(ultimoReporte?.kilometraje || vehiculo?.kilometrajeActual) && (
            <p className="text-xs font-semibold text-slate-500">
              {Number(ultimoReporte?.kilometraje || vehiculo?.kilometrajeActual).toLocaleString('es-CL')} km
            </p>
          )}
        </div>
      </div>

      {/* Estado Operativo */}
      {!cargandoReporte && ultimoReporte && (
        vehiculoBloqueado ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center space-y-1">
            <div className="text-xs font-black uppercase text-rose-700 tracking-wide">Unidad con Bloqueo Activo</div>
            <p className="text-xs text-rose-600 font-medium">
              El último checklist o evaluación psicomotora registró una observación crítica.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center space-y-1">
            <div className="text-xs font-black uppercase text-emerald-700 tracking-wide">Unidad Habilitada</div>
            <p className="text-xs text-emerald-600">Checklist diario y evaluación PVT aprobados.</p>
          </div>
        )
      )}

      {/* Licencia de Conducir del Conductor */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
          Licencia Municipal del Conductor
        </h3>
        {cargandoReporte ? (
          <p className="text-xs text-slate-500 italic text-center py-4">Consultando licencia...</p>
        ) : ultimoReporte ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            {ultimoReporte.licenciaUrl ? (
              <div className="flex flex-col items-center">
                <a
                  href={ultimoReporte.licenciaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={ultimoReporte.licenciaUrl}
                    alt="Licencia Municipal del Conductor"
                    className="w-full max-h-56 object-contain mx-auto"
                  />
                </a>
                <span className="text-[10px] text-slate-400 mt-1.5">
                  Toca la imagen para ampliar en pantalla completa
                </span>
              </div>
            ) : (
              <div className="text-center py-4 text-xs font-bold text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                No se adjuntó fotografía de licencia en el último registro
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
              <div>
                <span className="block text-[10px] font-black uppercase text-slate-400">
                  Fecha de Vencimiento
                </span>
                <span className="text-sm font-black text-slate-800">
                  {fechaLicenciaFormateada}
                </span>
              </div>
              {estadoLicencia && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${estadoLicencia.clase}`}>
                  {estadoLicencia.texto}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500 font-medium">
            Aún no existen registros de conductores para esta patente.
          </div>
        )}
      </div>

      {/* Documentación del Vehículo */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
          Documentación del Vehículo
        </h3>
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
          <p className="text-xs text-slate-500 italic text-center">Cargando documentos del vehículo...</p>
        )}
      </div>
    </div>
  );
}