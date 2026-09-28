import { useState } from 'react';

type IdentificacionConductorProps = {
  patente: string;
  nombreConductor: string;
  setNombreConductor: (val: string) => void;
  rutConductor: string;
  setRutConductor: (val: string) => void;
  fotoLicenciaPreview: string | null;
  setFotoLicenciaPreview: (val: string | null) => void;
  setFotoLicencia: (val: File | null) => void;
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
  onContinuar
}: IdentificacionConductorProps) {
  const [error, setError] = useState<string | null>(null);

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

  const validarFormulario = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreConductor.trim()) {
      setError('Falta ingresar el Nombre Completo del conductor.');
      return;
    }

    const rutLimpio = rutConductor.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 8) {
      setError('El RUT ingresado no es valido (ej: 12.345.678-9).');
      return;
    }

    if (!fotoLicenciaPreview) {
      setError('Falta subir la foto de la Licencia de Conducir.');
      return;
    }

    setError(null);
    onContinuar();
  };

  return (
    <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/50 animate-fade-in relative z-10">
      <div className="text-center mb-6">
        <span className="bg-blue-100/90 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Control de Flota</span>
        <h1 className="text-2xl font-black text-slate-800 mt-3">Identificacion</h1>
        <p className="text-sm text-slate-600 mt-1 font-mono font-bold tracking-wider">Patente: {patente.toUpperCase()}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100/90 border border-red-300 text-red-700 text-xs font-bold rounded-xl text-center">
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
            placeholder="Ej: Juan Perez" 
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
        <button type="submit" className="w-full bg-blue-600/90 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all mt-4 active:scale-[0.98]">
          Continuar
        </button>
      </form>
    </div>
  );
}