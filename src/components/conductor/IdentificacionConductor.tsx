import { useState } from 'react';

type UbicacionGPS = {
  latitud: number;
  longitud: number;
  precisionMetros: number;
  enlaceMapa: string;
};

type IdentificacionConductorProps = {
  patente: string;
  nombreConductor: string;
  setNombreConductor: (val: string) => void;
  rutConductor: string;
  setRutConductor: (val: string) => void;
  fotoLicenciaPreview: string | null;
  setFotoLicenciaPreview: (val: string | null) => void;
  setFotoLicencia: (val: File | null) => void;
  ubicacionGPS: UbicacionGPS | null;
  setUbicacionGPS: (val: UbicacionGPS | null) => void;
  vehiculo?: any;
  forzarDescarga?: (url: string, nombre: string) => void;
  calcularEstadoVencimiento?: (fecha: string) => { texto: string; clase: string };
  onContinuar: () => void;
};

const formatearRutChileno = (valor: string) => {
  const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length === 0) return '';
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);

  let cuerpoFormateado = '';
  let contador = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
    contador++;
    if (contador === 3 && i !== 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      contador = 0;
    }
  }

  return `${cuerpoFormateado}-${dv}`;
};

export default function IdentificacionConductor({
  patente,
  nombreConductor,
  setNombreConductor,
  rutConductor,
  setRutConductor,
  fotoLicenciaPreview,
  setFotoLicenciaPreview,
  setFotoLicencia,
  ubicacionGPS,
  setUbicacionGPS,
  vehiculo,
  forzarDescarga,
  calcularEstadoVencimiento,
  onContinuar
}: IdentificacionConductorProps) {
  const [error, setError] = useState<string | null>(null);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const [mostrarDocs, setMostrarDocs] = useState(true);

  const manejarCambioRut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formateado = formatearRutChileno(e.target.value);
    setRutConductor(formateado);
    if (error) setError(null);
  };

  const capturarLicencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoLicencia(file);
      const reader = new FileReader();
      reader.onload = (event) => setFotoLicenciaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
      if (error) setError(null);
    }
  };

  const capturarUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Tu dispositivo o navegador no soporta geolocalización GPS.');
      return;
    }

    setObteniendoGPS(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const precision = Math.round(pos.coords.accuracy);

        setUbicacionGPS({
          latitud: lat,
          longitud: lng,
          precisionMetros: precision,
          enlaceMapa: `https://www.google.com/maps?q=${lat},${lng}`
        });
        setObteniendoGPS(false);
      },
      (err) => {
        setObteniendoGPS(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permiso de GPS denegado. Concede permiso de ubicación en tu navegador para continuar.');
        } else {
          setError('No fue posible obtener señal GPS. Intenta nuevamente.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const validarFormulario = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreConductor.trim()) {
      setError('Falta ingresar el Nombre Completo del conductor.');
      return;
    }

    const rutLimpio = rutConductor.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 8) {
      setError('El RUT ingresado no es válido (ej: 12.345.678-9).');
      return;
    }

    if (!fotoLicenciaPreview) {
      setError('Falta subir la foto de la Licencia de Conducir.');
      return;
    }

    if (!ubicacionGPS) {
      setError('Es obligatorio capturar tu ubicación GPS actual antes de continuar.');
      return;
    }

    setError(null);
    onContinuar();
  };

  // Los 5 documentos exactos basados en la estructura de tu base de datos y FormChecklist
  const docsDisponibles = [
    {
      nombre: 'Permiso de Circulación',
      url: vehiculo?.urlCirculacion,
      fecha: vehiculo?.vencimientoCirculacion
    },
    {
      nombre: 'Revisión Técnica',
      url: vehiculo?.urlRevision,
      fecha: vehiculo?.vencimientoRevision
    },
    {
      nombre: 'Seguro Obligatorio (SOAP)',
      url: vehiculo?.urlSoap,
      fecha: vehiculo?.vencimientoSoap
    },
    {
      nombre: 'Certificado',
      url: vehiculo?.urlCertificado,
      fecha: vehiculo?.vencimientoCertificado
    },
    {
      nombre: 'Pauta de Mantención',
      url: vehiculo?.urlPauta,
      fecha: null // La pauta no maneja vencimiento en tu lógica actual
    }
  ];

  const descargarArchivo = (url: string, nombre: string) => {
    if (forzarDescarga) {
      forzarDescarga(url, nombre);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10">
      <div className="text-center mb-6">
        <span className="bg-blue-100/90 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Control de Flota</span>
        <h1 className="text-2xl font-black text-slate-800 mt-3">Identificación</h1>
        <p className="text-sm text-slate-600 mt-1 font-mono font-bold tracking-wider">Patente: {patente.toUpperCase()}</p>
      </div>

      <div className="mb-6 bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Documentos del Vehículo
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMostrarDocs(!mostrarDocs)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            {mostrarDocs ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {mostrarDocs && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {docsDisponibles.map((docItem, idx) => {
              const estado = calcularEstadoVencimiento && docItem.fecha ? calcularEstadoVencimiento(docItem.fecha) : null;
              const tieneArchivo = Boolean(docItem.url);

              return (
                <div key={idx} className="flex justify-between items-center bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/60">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{docItem.nombre}</span>
                    {estado ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    ) : docItem.fecha ? (
                      <span className="text-[10px] text-slate-500 mt-0.5">Vence: {docItem.fecha}</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 mt-0.5">Sin caducidad / No registrada</span>
                    )}
                  </div>

                  {tieneArchivo ? (
                    <button
                      type="button"
                      onClick={() => descargarArchivo(docItem.url, `${docItem.nombre}_${patente}.pdf`)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-1 rounded-lg">
                      No adjunto
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100/90 border border-red-300 text-red-700 text-xs font-bold rounded-xl text-center leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={validarFormulario} className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Nombre Completo</label>
          <input 
            type="text" 
            value={nombreConductor} 
            onChange={(e) => { setNombreConductor(e.target.value); if (error) setError(null); }} 
            placeholder="Ej: Juan Pérez" 
            className="w-full p-4 bg-white/70 border border-white/80 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:bg-white/90 focus:outline-none transition-all shadow-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">RUT</label>
          <input 
            type="text" 
            value={rutConductor} 
            onChange={manejarCambioRut} 
            placeholder="Ej: 12.345.678-9" 
            maxLength={12}
            className="w-full p-4 bg-white/70 border border-white/80 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:bg-white/90 focus:outline-none transition-all shadow-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Foto Licencia de Conducir</label>
          <label className="block w-full cursor-pointer">
            <input type="file" accept="image/*" capture="environment" onChange={capturarLicencia} className="hidden" />
            <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-2xl p-4 text-center hover:bg-white/80 transition-all shadow-sm backdrop-blur-sm">
              {fotoLicenciaPreview ? (
                <div className="flex flex-col items-center">
                  <img src={fotoLicenciaPreview} className="mx-auto h-20 rounded-lg shadow-sm mb-1 object-cover" alt="Vista previa licencia" />
                  <span className="text-[11px] font-bold text-blue-600">Presiona para cambiar foto</span>
                </div>
              ) : (
                <span className="text-slate-600 text-sm font-bold flex items-center justify-center gap-2 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Tomar foto a la licencia
                </span>
              )}
            </div>
          </label>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Ubicación de Salida / Faena</label>
          <button
            type="button"
            onClick={capturarUbicacion}
            disabled={obteniendoGPS}
            className={`w-full p-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all border shadow-sm ${
              ubicacionGPS 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                : 'bg-white/70 text-slate-700 border-slate-300 hover:bg-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${ubicacionGPS ? 'text-emerald-600' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {obteniendoGPS ? (
              <span>Obteniendo señal GPS...</span>
            ) : ubicacionGPS ? (
              <span>Ubicación Guardada (±{ubicacionGPS.precisionMetros}m)</span>
            ) : (
              <span>Capturar Ubicación Actual</span>
            )}
          </button>
        </div>

        <button type="submit" className="w-full bg-blue-600/90 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all mt-4 active:scale-[0.98]">
          Continuar
        </button>
      </form>
    </div>
  );
}