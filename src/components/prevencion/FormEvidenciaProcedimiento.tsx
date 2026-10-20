import React, { useState } from 'react';
import type { EvidenciaEvalProcedimiento } from '../../constants';

interface FormEvidenciaProcedimientoProps {
  evaluadorUid: string;
  evaluadorNombre: string;
  onGuardar: (registro: EvidenciaEvalProcedimiento) => Promise<void>;
}

export const FormEvidenciaProcedimiento: React.FC<FormEvidenciaProcedimientoProps> = ({
  evaluadorUid,
  evaluadorNombre,
  onGuardar
}) => {
  const [conductorNombre, setConductorNombre] = useState<string>('');
  const [conductorRut, setConductorRut] = useState<string>('');
  const [conductorUid, setConductorUid] = useState<string>('');
  const [aprobado, setAprobado] = useState<boolean>(true);
  const [observaciones, setObservaciones] = useState<string>('');
  const [archivosBase64, setArchivosBase64] = useState<string[]>([]);
  const [nombresArchivos, setNombresArchivos] = useState<string[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setMensaje({ tipo: 'error', texto: 'Ingrese el nombre y RUT del conductor.' });
      return;
    }

    try {
      setCargando(true);
      setMensaje(null);

      const registro: EvidenciaEvalProcedimiento = {
        conductorUid: conductorUid || conductorRut,
        conductorNombre,
        conductorRut,
        fechaEvaluacion: new Date().toISOString(),
        evaluadorUid,
        evaluadorNombre,
        observaciones,
        archivosUrls: archivosBase64,
        aprobado
      };

      await onGuardar(registro);
      setMensaje({ tipo: 'ok', texto: 'Evidencia de evaluación de procedimiento guardada con éxito.' });

      setConductorNombre('');
      setConductorRut('');
      setConductorUid('');
      setObservaciones('');
      setArchivosBase64([]);
      setNombresArchivos([]);
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar la evidencia.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h3 className="text-base font-bold text-slate-800">
          Evidencia de Evaluación de Procedimiento
        </h3>
        <p className="text-xs text-slate-500">
          Carga de documentos técnicos, listas de chequeo y respaldos fotográficos de terreno.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Conductor
            </label>
            <input
              type="text"
              value={conductorNombre}
              onChange={(e) => setConductorNombre(e.target.value)}
              placeholder="Ej: Marcelo Vargas Soto"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              RUT Conductor
            </label>
            <input
              type="text"
              value={conductorRut}
              onChange={(e) => setConductorRut(e.target.value)}
              placeholder="11.222.333-4"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Resultado de la Evaluación
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="radio"
                name="resultadoProcedimiento"
                checked={aprobado}
                onChange={() => setAprobado(true)}
                className="text-blue-600 focus:ring-blue-500"
              />
              Aprobado (Cumple estándar del procedimiento)
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
              <input
                type="radio"
                name="resultadoProcedimiento"
                checked={!aprobado}
                onChange={() => setAprobado(false)}
                className="text-rose-600 focus:ring-rose-500"
              />
              No Aprobado (Requiere re-instrucción)
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Observaciones y Conclusiones del Evaluador
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles observados durante la inspección o conducción práctica..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Adjuntar Archivos (PDFs de informe, fotografías de maniobra, etc.)
          </label>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />

          {nombresArchivos.length > 0 && (
            <div className="mt-2 space-y-1">
              {nombresArchivos.map((nom, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-slate-100 px-3 py-1.5 rounded border border-slate-200"
                >
                  <span className="truncate max-w-md text-slate-700">{nom}</span>
                  <button
                    type="button"
                    onClick={() => eliminarArchivo(idx)}
                    className="text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mensaje && (
          <div
            className={`p-3 rounded-lg text-xs font-medium border ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={cargando}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {cargando ? 'Guardando...' : 'Guardar Evidencia'}
          </button>
        </div>
      </form>
    </div>
  );
};