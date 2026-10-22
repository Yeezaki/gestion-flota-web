import React, { useState } from 'react';
import type { RegistroAlcoholDrogas } from '../../constants';

interface FormAlcoholDrogasProps {
  evaluadorUid: string;
  evaluadorNombre: string;
  onGuardar: (registro: RegistroAlcoholDrogas) => Promise<void>;
}

export const FormAlcoholDrogas: React.FC<FormAlcoholDrogasProps> = ({
  evaluadorUid,
  evaluadorNombre,
  onGuardar
}) => {
  const [conductorNombre, setConductorNombre] = useState<string>('');
  const [conductorRut, setConductorRut] = useState<string>('');
  const [patenteOpcional, setPatenteOpcional] = useState<string>('');
  const [tipoExamen, setTipoExamen] = useState<'alcotest' | 'narcotest' | 'laboratorio'>('narcotest');
  const [resultado, setResultado] = useState<'negativo' | 'positivo' | 'pendiente'>('negativo');
  const [observaciones, setObservaciones] = useState<string>('');

  const [fotoCredencialPreview, setFotoCredencialPreview] = useState<string | null>(null);
  const [fotoPruebaPreview, setFotoPruebaPreview] = useState<string | null>(null);
  const [archivosBase64, setArchivosBase64] = useState<string[]>([]);
  const [nombresArchivos, setNombresArchivos] = useState<string[]>([]);

  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const handleFotoCredencial = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoCredencialPreview(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleFotoPrueba = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoPruebaPreview(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleArchivosGenerales = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nuevasUrls: string[] = [];
    const nuevosNombres: string[] = [];

    Array.from(files).forEach((file) => {
      nuevosNombres.push(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          nuevasUrls.push(reader.result);
          if (nuevasUrls.length === files.length) {
            setArchivosBase64((prev) => [...prev, ...nuevasUrls]);
            setNombresArchivos((prev) => [...prev, ...nuevosNombres]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const eliminarArchivo = (index: number) => {
    setArchivosBase64((prev) => prev.filter((_, i) => i !== index));
    setNombresArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conductorNombre.trim() || !conductorRut.trim()) {
      setMensaje({ tipo: 'error', texto: 'Complete el nombre y RUT del conductor evaluado.' });
      return;
    }

    try {
      setCargando(true);
      setMensaje(null);

      const ahora = Date.now();
      const expiraEn24h = ahora + (24 * 60 * 60 * 1000);

      const nuevoRegistro: RegistroAlcoholDrogas = {
        conductorUid: conductorRut.replace(/\./g, '').trim().toUpperCase(),
        conductorNombre,
        conductorRut,
        patente: patenteOpcional.trim().toUpperCase() || 'Sin patente',
        fechaControl: new Date().toISOString(),
        fechaTimestamp: ahora,
        fotoCredencialUrl: fotoCredencialPreview || null,
        fotoPruebaUrl: fotoPruebaPreview || null,
        fotoPruebaExpiraEn: expiraEn24h,
        resultado,
        tipoExamen,
        observaciones,
        adjuntosUrls: archivosBase64,
        creadoPorUid: evaluadorUid,
        creadoPorNombre: evaluadorNombre
      };

      await onGuardar(nuevoRegistro);
      setMensaje({ tipo: 'ok', texto: 'Control registrado exitosamente con vigencia de 24 horas para la prueba.' });

      setConductorNombre('');
      setConductorRut('');
      setPatenteOpcional('');
      setObservaciones('');
      setFotoCredencialPreview(null);
      setFotoPruebaPreview(null);
      setArchivosBase64([]);
      setNombresArchivos([]);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar el control.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h3 className="text-base font-bold text-slate-800">
          Control de Alcohol y Drogas
        </h3>
        <p className="text-xs text-slate-500">
          Registro preventivo con captura obligatoria de credencial y prueba reactiva (validez 24 horas).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Completo del Conductor *
            </label>
            <input
              type="text"
              value={conductorNombre}
              onChange={(e) => setConductorNombre(e.target.value)}
              placeholder="Ej: Juan Pérez Morales"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RUT Conductor *
            </label>
            <input
              type="text"
              value={conductorRut}
              onChange={(e) => setConductorRut(e.target.value)}
              placeholder="12.345.678-9"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patente (Opcional)
            </label>
            <input
              type="text"
              value={patenteOpcional}
              onChange={(e) => setPatenteOpcional(e.target.value)}
              placeholder="Ej: AB12 (rotación libre)"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo de Evaluación
            </label>
            <select
              value={tipoExamen}
              onChange={(e) => setTipoExamen(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="narcotest">Narcotest Salival / Rápido</option>
              <option value="alcotest">Alcotest Digital</option>
              <option value="laboratorio">Examen Clínico de Laboratorio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resultado Obtenido
            </label>
            <select
              value={resultado}
              onChange={(e) => setResultado(e.target.value as any)}
              className={`w-full text-xs font-bold p-2.5 rounded-xl border ${
                resultado === 'negativo'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : resultado === 'positivo'
                  ? 'border-rose-300 bg-rose-50 text-rose-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              <option value="negativo">Negativo (Apto para Conducir)</option>
              <option value="positivo">Positivo (No Apto - Retiro Inmediato)</option>
              <option value="pendiente">Pendiente de Confirmación</option>
            </select>
          </div>
        </div>

        {/* Captura de Credencial y Foto de la Prueba Realizada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Credencial del Conductor
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoCredencial}
              className="hidden"
              id="file-credencial"
            />
            <label
              htmlFor="file-credencial"
              className="cursor-pointer inline-flex flex-col items-center justify-center"
            >
              {fotoCredencialPreview ? (
                <div className="space-y-1">
                  <img
                    src={fotoCredencialPreview}
                    alt="Credencial"
                    className="h-24 w-auto rounded-lg mx-auto object-cover border"
                  />
                  <span className="text-[11px] text-amber-600 font-bold block">Cambiar credencial</span>
                </div>
              ) : (
                <div className="py-2 text-slate-500 text-xs font-medium">
                  <svg className="w-8 h-8 mx-auto text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Subir Foto Credencial</span>
                </div>
              )}
            </label>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50/50">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Foto de Prueba Realizada
              </label>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Vigencia 24h
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoPrueba}
              className="hidden"
              id="file-prueba"
            />
            <label
              htmlFor="file-prueba"
              className="cursor-pointer inline-flex flex-col items-center justify-center"
            >
              {fotoPruebaPreview ? (
                <div className="space-y-1">
                  <img
                    src={fotoPruebaPreview}
                    alt="Prueba"
                    className="h-24 w-auto rounded-lg mx-auto object-cover border"
                  />
                  <span className="text-[11px] text-amber-600 font-bold block">Cambiar foto prueba</span>
                </div>
              ) : (
                <div className="py-2 text-slate-500 text-xs font-medium">
                  <svg className="w-8 h-8 mx-auto text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Subir Foto del Test / Voucher</span>
                </div>
              )}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones Técnicas
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles del equipo reactivo, graduación, estado general o circunstancias..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Evidencias adicionales */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Adjuntos adicionales (PDF, informes clínicos)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleArchivosGenerales}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />
          {nombresArchivos.length > 0 && (
            <div className="mt-2 space-y-1">
              {nombresArchivos.map((nom, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="truncate text-slate-700">{nom}</span>
                  <button type="button" onClick={() => eliminarArchivo(idx)} className="text-rose-600 font-bold hover:underline">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mensaje && (
          <div className={`p-3 rounded-xl text-xs font-bold border ${
            mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={cargando}
            className="px-6 py-3 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-all shadow-md"
          >
            {cargando ? 'Registrando...' : 'Guardar Control Alcohol/Drogas'}
          </button>
        </div>
      </form>
    </div>
  );
};