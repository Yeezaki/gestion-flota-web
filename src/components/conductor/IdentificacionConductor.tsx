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
  fotoLicenciaInternaPreview?: string | null;
  setFotoLicenciaInternaPreview?: (val: string | null) => void;
  setFotoLicenciaInterna?: (val: File | null) => void;
  fotoLicenciaInternaTraseraPreview?: string | null;
  setFotoLicenciaInternaTraseraPreview?: (val: string | null) => void;
  setFotoLicenciaInternaTrasera?: (val: File | null) => void;
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
  fotoLicenciaInternaPreview,
  setFotoLicenciaInternaPreview,
  setFotoLicenciaInterna,
  fotoLicenciaInternaTraseraPreview,
  setFotoLicenciaInternaTraseraPreview,
  setFotoLicenciaInternaTrasera,
  ubicacionGPS,
  setUbicacionGPS,
  vehiculo,
  calcularEstadoVencimiento,
  onContinuar
}: IdentificacionConductorProps) {
  const [error, setError] = useState<string | null>(null);
  const [obteniendoGPS, setObteniendoGPS] = useState(false);
  const [mostrarDocsVehiculo, setMostrarDocsVehiculo] = useState(true);
  const [mostrarDocsFaena, setMostrarDocsFaena] = useState(false);

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

  const capturarLicenciaInternaFrontal = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && setFotoLicenciaInterna && setFotoLicenciaInternaPreview) {
      const file = e.target.files[0];
      setFotoLicenciaInterna(file);
      const reader = new FileReader();
      reader.onload = (event) => setFotoLicenciaInternaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const capturarLicenciaInternaTrasera = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && setFotoLicenciaInternaTrasera && setFotoLicenciaInternaTraseraPreview) {
      const file = e.target.files[0];
      setFotoLicenciaInternaTrasera(file);
      const reader = new FileReader();
      reader.onload = (event) => setFotoLicenciaInternaTraseraPreview(event.target?.result as string);
      reader.readAsDataURL(file);
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
      setError('Falta subir la foto de la Licencia Municipal de Conducir.');
      return;
    }

    if (!ubicacionGPS) {
      setError('Es obligatorio capturar tu ubicación GPS actual antes de continuar.');
      return;
    }

    setError(null);
    onContinuar();
  };

  const descargarArchivo = async (url: string, nombreVisible: string) => {
    if (!url) {
      alert("El enlace del documento no está disponible.");
      return;
    }

    const esDispositivoMovil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (esDispositivoMovil) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    const nombreLimpio = `${nombreVisible.replace(/\s+/g, '_')}_${patente.toUpperCase()}.pdf`;

    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new Error("Fallo en la red");

      const blob = await respuesta.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.style.display = 'none';
      enlace.href = urlBlob;
      enlace.download = nombreLimpio;
      document.body.appendChild(enlace);
      enlace.click();

      setTimeout(() => {
        document.body.removeChild(enlace);
        window.URL.revokeObjectURL(urlBlob);
      }, 200);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 1. Documentos Vehiculares y Mecánicos
  const docsVehiculo = [
    { nombre: 'Permiso de Circulación', url: vehiculo?.urlCirculacion, fecha: vehiculo?.vencimientoCirculacion },
    { nombre: 'Revisión Técnica', url: vehiculo?.urlRevision, fecha: vehiculo?.vencimientoRevision },
    { nombre: 'Seguro Obligatorio (SOAP)', url: vehiculo?.urlSoap, fecha: vehiculo?.vencimientoSoap },
    { nombre: 'Certificado de Mantención Vigente', url: vehiculo?.urlCertificado, fecha: vehiculo?.vencimientoCertificado },
    { nombre: 'Certificado de Torque Vigente', url: vehiculo?.urlCertificadoTorque || vehiculo?.urlTorque, fecha: vehiculo?.vencimientoTorque },
    { nombre: 'Programa / Pauta de Mantención', url: vehiculo?.urlPauta, fecha: vehiculo?.vencimientoPauta || null }
  ];

  // 2. Documentación Preventiva y Faena
  const docsSeguridadFaena = [
    { nombre: 'Mapa de Riesgos de Conducción', url: vehiculo?.urlMapaRiesgos, fecha: vehiculo?.vencimientoMapaRiesgos || null },
    { nombre: 'Procedimiento de Conducción', url: vehiculo?.urlProcedimientoConduccion, fecha: vehiculo?.vencimientoProcedimiento || null },
    { nombre: 'Plan de Tránsito', url: vehiculo?.urlPlanTransito, fecha: vehiculo?.vencimientoPlanTransito || null },
    { nombre: 'Plan de Emergencia', url: vehiculo?.urlPlanEmergencia, fecha: vehiculo?.vencimientoPlanEmergencia || null },
    { nombre: 'Gestión y Control Alcohol y Drogas', url: vehiculo?.urlAlcoholDrogas, fecha: vehiculo?.vencimientoAlcoholDrogas || null },
    { nombre: 'Reporte Control de Velocidad (GPS)', url: vehiculo?.urlReporteGPS, fecha: null }
  ];

  return (
    <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10">
      <div className="text-center mb-6">
        <span className="bg-blue-100/90 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Control de Flota</span>
        <h1 className="text-2xl font-black text-slate-800 mt-3">Identificación</h1>
        <p className="text-sm text-slate-600 mt-1 font-mono font-bold tracking-wider">Patente: {patente.toUpperCase()}</p>
      </div>

      {/* Bloque 1: Documentación del Vehículo y Mecánica */}
      <div className="mb-4 bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
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
            onClick={() => setMostrarDocsVehiculo(!mostrarDocsVehiculo)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800"
          >
            {mostrarDocsVehiculo ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {mostrarDocsVehiculo && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {docsVehiculo.map((docItem, idx) => {
              const tieneArchivo = Boolean(docItem.url);
              const estado = calcularEstadoVencimiento && docItem.fecha ? calcularEstadoVencimiento(docItem.fecha) : null;

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
                    ) : tieneArchivo ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit bg-green-100 text-green-700 border-green-200">
                        Disponible
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit bg-slate-100 text-slate-400 border-slate-200">
                        No disponible
                      </span>
                    )}
                  </div>

                  {tieneArchivo ? (
                    <button
                      type="button"
                      onClick={() => descargarArchivo(docItem.url, docItem.nombre)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-1 rounded-lg shrink-0">
                      No adjunto
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bloque 2: Documentación de Seguridad y Faena */}
      <div className="mb-6 bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Seguridad Operacional y Faena
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMostrarDocsFaena(!mostrarDocsFaena)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
          >
            {mostrarDocsFaena ? 'Ocultar' : 'Ver'}
          </button>
        </div>

        {mostrarDocsFaena && (
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 max-h-60 overflow-y-auto pr-1">
            {docsSeguridadFaena.map((docItem, idx) => {
              const tieneArchivo = Boolean(docItem.url);
              const estado = calcularEstadoVencimiento && docItem.fecha ? calcularEstadoVencimiento(docItem.fecha) : null;

              return (
                <div key={idx} className="flex justify-between items-center bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/60">
                  <div className="flex flex-col max-w-[65%]">
                    <span className="text-xs font-bold text-slate-800 truncate pr-2">{docItem.nombre}</span>
                    {estado ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    ) : docItem.fecha ? (
                      <span className="text-[10px] text-slate-500 mt-0.5">Vence: {docItem.fecha}</span>
                    ) : tieneArchivo ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit bg-green-100 text-green-700 border-green-200">
                        Disponible
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border w-fit bg-slate-100 text-slate-400 border-slate-200">
                        No disponible
                      </span>
                    )}
                  </div>

                  {tieneArchivo ? (
                    <button
                      type="button"
                      onClick={() => descargarArchivo(docItem.url, docItem.nombre)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Descargar
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-1 rounded-lg shrink-0">
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
            className="w-full p-4 bg-white/70 border border-white/80 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:bg-white/90 focus:outline-none transition-all shadow-sm font-mono" 
          />
        </div>

        {/* Licencia Municipal */}
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Licencia Municipal Vigente *</label>
          <label className="block w-full cursor-pointer">
            <input type="file" accept="image/*" capture="environment" onChange={capturarLicencia} className="hidden" />
            <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-2xl p-4 text-center hover:bg-white/80 transition-all shadow-sm backdrop-blur-sm">
              {fotoLicenciaPreview ? (
                <div className="flex flex-col items-center">
                  <img src={fotoLicenciaPreview} className="mx-auto h-20 rounded-lg shadow-sm mb-1 object-cover" alt="Licencia Municipal" />
                  <span className="text-[11px] font-bold text-blue-600">Presiona para cambiar foto</span>
                </div>
              ) : (
                <span className="text-slate-600 text-sm font-bold flex items-center justify-center gap-2 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Foto Licencia Municipal
                </span>
              )}
            </div>
          </label>
        </div>

        {/* Licencia Interna de Faena - Captura obligatoria/opcional de ambos lados antes del test */}
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">
            Licencia Interna de Faena (Ambos Lados)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Lado Frontal */}
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={capturarLicenciaInternaFrontal}
                className="hidden"
              />
              <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-xl p-2.5 text-center hover:bg-white/80 transition-all shadow-sm">
                {fotoLicenciaInternaPreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={fotoLicenciaInternaPreview}
                      className="h-12 w-auto rounded object-cover mb-1"
                      alt="Frontal"
                    />
                    <span className="text-[10px] font-bold text-emerald-700">Frontal OK</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 block py-1">
                    + Cara Frontal
                  </span>
                )}
              </div>
            </label>

            {/* Lado Trasero */}
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={capturarLicenciaInternaTrasera}
                className="hidden"
              />
              <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-xl p-2.5 text-center hover:bg-white/80 transition-all shadow-sm">
                {fotoLicenciaInternaTraseraPreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={fotoLicenciaInternaTraseraPreview}
                      className="h-12 w-auto rounded object-cover mb-1"
                      alt="Trasera"
                    />
                    <span className="text-[10px] font-bold text-emerald-700">Trasera OK</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 block py-1">
                    + Cara Trasera
                  </span>
                )}
              </div>
            </label>
          </div>
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