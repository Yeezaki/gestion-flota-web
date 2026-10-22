import React, { useState } from 'react';
import type { RegistroAlcoholDrogas } from '../../constants';

interface PlanillaProps {
  controles: RegistroAlcoholDrogas[];
}

export const PlanillaControlesDrogas: React.FC<PlanillaProps> = ({ controles }) => {
  const [modalFoto, setModalFoto] = useState<{ url: string; titulo: string } | null>(null);
  const ahora = Date.now();

  const MILIS_DIA = 24 * 60 * 60 * 1000;
  const RETENCION_VISTA_DIAS = 30;
  const GRACIA_DESCARGA_DIAS = 7;
  const LIMITE_TOTAL_DIAS = RETENCION_VISTA_DIAS + GRACIA_DESCARGA_DIAS; // 37 dias

  // Filtro de retención
  const controlesVigentes = controles.filter((c) => {
    const fechaBase = c.fechaTimestamp || new Date(c.fechaControl).getTime() || ahora;
    const diasTranscurridos = (ahora - fechaBase) / MILIS_DIA;
    return diasTranscurridos <= LIMITE_TOTAL_DIAS;
  });

  const exportarAExcel = () => {
    if (controlesVigentes.length === 0) {
      alert('No hay registros disponibles para exportar.');
      return;
    }

    const encabezados = [
      'Conductor',
      'RUT',
      'Patente',
      'Tipo Examen',
      'Resultado',
      'Fecha Control',
      'Dias Restantes Descarga',
      'Observaciones',
      'Evaluador'
    ];

    const filas = controlesVigentes.map((c) => {
      const fechaBase = c.fechaTimestamp || new Date(c.fechaControl).getTime() || ahora;
      const diasTranscurridos = Math.floor((ahora - fechaBase) / MILIS_DIA);
      const diasRestantesDescarga = Math.max(0, LIMITE_TOTAL_DIAS - diasTranscurridos);

      return [
        `"${c.conductorNombre}"`,
        `"${c.conductorRut}"`,
        `"${c.patente || 'N/A'}"`,
        `"${c.tipoExamen.toUpperCase()}"`,
        `"${c.resultado.toUpperCase()}"`,
        `"${new Date(c.fechaControl).toLocaleString('es-CL')}"`,
        `"${diasRestantesDescarga} dias"`,
        `"${(c.observaciones || '').replace(/"/g, '""')}"`,
        `"${c.creadoPorNombre}"`
      ].join(';');
    });

    const contenidoCSV = '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
    const blob = new Blob([contenidoCSV], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Planilla_Controles_Drogas_Alcohol_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Planilla de Evaluaciones Realizadas
          </h3>
          <p className="text-xs text-slate-500">
            Ciclo de visualización: 30 días en sistema + 7 días de gracia para descarga en formato Excel.
          </p>
        </div>

        <button
          type="button"
          onClick={exportarAExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar Planilla Excel
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3">Conductor</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Patente</th>
              <th className="p-3">Tipo / Resultado</th>
              <th className="p-3">Fecha Control</th>
              <th className="p-3 text-center">Credencial</th>
              <th className="p-3 text-center">Foto Prueba (24h)</th>
              <th className="p-3 text-center">Vigencia Archivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {controlesVigentes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                  No hay conductores registrados dentro del periodo activo de 30 + 7 días.
                </td>
              </tr>
            ) : (
              controlesVigentes.map((item) => {
                const fechaBase = item.fechaTimestamp || new Date(item.fechaControl).getTime() || ahora;
                const diasTranscurridos = Math.floor((ahora - fechaBase) / MILIS_DIA);
                const enPeriodoGracia = diasTranscurridos > RETENCION_VISTA_DIAS;
                const pruebaVencida24h = item.fotoPruebaExpiraEn ? ahora > item.fotoPruebaExpiraEn : false;

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{item.conductorNombre}</td>
                    <td className="p-3 font-mono">{item.conductorRut}</td>
                    <td className="p-3 font-mono text-slate-600">{item.patente || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.resultado === 'negativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.tipoExamen}: {item.resultado}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(item.fechaControl).toLocaleDateString('es-CL')}
                    </td>
                    <td className="p-3 text-center">
                      {item.fotoCredencialUrl ? (
                        <button
                          type="button"
                          onClick={() => setModalFoto({ url: item.fotoCredencialUrl!, titulo: `Credencial - ${item.conductorNombre}` })}
                          className="text-amber-600 hover:underline font-bold text-[11px]"
                        >
                          Ver
                        </button>
                      ) : (
                        <span className="text-slate-400">Sin foto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {item.fotoPruebaUrl ? (
                        pruebaVencida24h ? (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Expirada (&gt;24h)
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setModalFoto({ url: item.fotoPruebaUrl!, titulo: `Prueba Reactiva - ${item.conductorNombre}` })}
                            className="text-blue-600 hover:underline font-bold text-[11px]"
                          >
                            Ver Prueba
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400">Sin foto</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {enPeriodoGracia ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                          Gracia ({LIMITE_TOTAL_DIAS - diasTranscurridos}d descarga)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-[11px]">
                          {RETENCION_VISTA_DIAS - diasTranscurridos} días activos
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalFoto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="text-xs font-bold text-slate-800">{modalFoto.titulo}</h4>
              <button
                type="button"
                onClick={() => setModalFoto(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-200">
              <img src={modalFoto.url} alt="Evidencia" className="max-h-72 object-contain rounded-lg" />
            </div>
            <button
              type="button"
              onClick={() => setModalFoto(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};