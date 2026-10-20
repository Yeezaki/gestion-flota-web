import React, { useState } from 'react';
import { SAFETY_DOCUMENTS } from '../../constants';
import type {
  FirmaDocumento,
  RegistroAlcoholDrogas,
  EvidenciaEvalProcedimiento,
  EvaluacionEmergenciaRegistro,
  ReporteVelocidadGPS,
  SafetyDocumentType
} from '../../constants';

interface TabAuditoriaSeguridadProps {
  firmasDocumentos: FirmaDocumento[];
  registrosAlcohol: RegistroAlcoholDrogas[];
  evidenciasProcedimiento: EvidenciaEvalProcedimiento[];
  evaluacionesEmergencia: EvaluacionEmergenciaRegistro[];
  reportesGPS: ReporteVelocidadGPS[];
}

export const TabAuditoriaSeguridad: React.FC<TabAuditoriaSeguridadProps> = ({
  firmasDocumentos = [],
  registrosAlcohol = [],
  evidenciasProcedimiento = [],
  evaluacionesEmergencia = [],
  reportesGPS = []
}) => {
  const [subTab, setSubTab] = useState<
    'documentos' | 'alcohol' | 'procedimientos' | 'emergencias' | 'gps'
  >('documentos');

  const [modalFirmaPreview, setModalFirmaPreview] = useState<string | null>(null);
  const [modalAdjuntoPreview, setModalAdjuntoPreview] = useState<string | null>(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteVelocidadGPS | null>(null);

  return (
    <div className="space-y-6">
      {/* Navegación interna de Auditoría */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setSubTab('documentos')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'documentos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          Documentos y Firmas ({firmasDocumentos.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('alcohol')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'alcohol'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          Alcohol y Drogas ({registrosAlcohol.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('procedimientos')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'procedimientos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          Eval. Procedimiento ({evidenciasProcedimiento.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('emergencias')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'emergencias'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          Checklists Emergencia ({evaluacionesEmergencia.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('gps')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            subTab === 'gps'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
          }`}
        >
          Torre de Control / GPS ({reportesGPS.length})
        </button>
      </div>

      {/* 1. SECCIÓN: DOCUMENTOS FIRMADOS */}
      {subTab === 'documentos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Registros de Toma de Conocimiento y Firma Digital
            </h4>
            <p className="text-[11px] text-slate-500">
              Aplica a: Mapa de riesgo de conducción, Procedimiento de conducción, Plan de tránsito y Plan de emergencia.
            </p>
          </div>
          {firmasDocumentos.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay tomas de conocimiento registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Firma Digital</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {firmasDocumentos.map((reg, idx) => {
                    const docInfo = SAFETY_DOCUMENTS[reg.documentoId as SafetyDocumentType];
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">
                          {docInfo ? docInfo.titulo : reg.documentoId}
                        </td>
                        <td className="p-3 text-slate-800">{reg.conductorNombre}</td>
                        <td className="p-3 font-mono text-slate-600">{reg.conductorRut}</td>
                        <td className="p-3 text-slate-600">
                          {new Date(reg.fechaLectura).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aceptado y Leído
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setModalFirmaPreview(reg.firmaBase64)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                          >
                            Ver firma
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. SECCIÓN: ALCOHOL Y DROGAS */}
      {subTab === 'alcohol' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Controles Preventivos de Alcohol y Drogas
            </h4>
          </div>
          {registrosAlcohol.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se registran controles de alcohol o drogas en la base de datos.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Tipo Prueba</th>
                    <th className="p-3">Resultado</th>
                    <th className="p-3">Observaciones</th>
                    <th className="p-3">Evaluador</th>
                    <th className="p-3 text-right">Evidencias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {registrosAlcohol.map((reg, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">
                        {new Date(reg.fechaControl).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{reg.conductorNombre}</td>
                      <td className="p-3 font-mono text-slate-600">{reg.conductorRut}</td>
                      <td className="p-3 uppercase text-slate-700">{reg.tipoExamen}</td>
                      <td className="p-3">
                        {reg.resultado === 'negativo' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Negativo (Apto)
                          </span>
                        ) : reg.resultado === 'positivo' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Positivo (No Apto)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{reg.observaciones || '-'}</td>
                      <td className="p-3 text-slate-600">{reg.creadoPorNombre}</td>
                      <td className="p-3 text-right space-x-1">
                        {reg.adjuntosUrls && reg.adjuntosUrls.length > 0 ? (
                          reg.adjuntosUrls.map((adj, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setModalAdjuntoPreview(adj)}
                              className="text-blue-600 hover:text-blue-800 underline text-[11px]"
                            >
                              Doc #{i + 1}
                            </button>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin adjuntos</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. SECCIÓN: EVALUACIONES DE PROCEDIMIENTO */}
      {subTab === 'procedimientos' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Evidencias de Evaluación de Procedimiento de Conducción
            </h4>
          </div>
          {evidenciasProcedimiento.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se han ingresado evaluaciones de procedimiento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Evaluador</th>
                    <th className="p-3">Veredicto</th>
                    <th className="p-3">Observaciones</th>
                    <th className="p-3 text-right">Archivos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {evidenciasProcedimiento.map((reg, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">
                        {new Date(reg.fechaEvaluacion).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{reg.conductorNombre}</td>
                      <td className="p-3 font-mono text-slate-600">{reg.conductorRut}</td>
                      <td className="p-3 text-slate-700">{reg.evaluadorNombre}</td>
                      <td className="p-3">
                        {reg.aprobado ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aprobado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Rechazado
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{reg.observaciones || '-'}</td>
                      <td className="p-3 text-right space-x-1">
                        {reg.archivosUrls && reg.archivosUrls.length > 0 ? (
                          reg.archivosUrls.map((adj, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setModalAdjuntoPreview(adj)}
                              className="text-blue-600 hover:text-blue-800 underline text-[11px]"
                            >
                              Adjunto #{i + 1}
                            </button>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">Sin archivos</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SECCIÓN: EVALUACIONES DE EMERGENCIA (CHECKLIST) */}
      {subTab === 'emergencias' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Resultados de Evaluaciones de Emergencia (Cuestionarios Aleatorios)
            </h4>
          </div>
          {evaluacionesEmergencia.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay evaluaciones de emergencia completadas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Conductor</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Puntaje</th>
                    <th className="p-3">Resultado</th>
                    <th className="p-3 text-right">Firma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {evaluacionesEmergencia.map((reg, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">
                        {new Date(reg.fecha).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{reg.conductorNombre}</td>
                      <td className="p-3 font-mono text-slate-600">{reg.conductorRut}</td>
                      <td className="p-3 font-mono font-bold">
                        {reg.puntaje} / {reg.totalPreguntas}
                      </td>
                      <td className="p-3">
                        {reg.aprobado ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aprobado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            No Aprobado
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setModalFirmaPreview(reg.firmaBase64)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                        >
                          Ver firma
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. SECCIÓN: TORRE DE CONTROL Y SEGUIMIENTO GPS */}
      {subTab === 'gps' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Informes Telemáticos y Control de Velocidad (Torre de Control)
              </h4>
              <p className="text-[11px] text-slate-500">
                Métricas calculadas: velocidad media, máxima, eventos de exceso y kilometraje de ruta.
              </p>
            </div>
          </div>
          {reportesGPS.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No hay reportes telemáticos de GPS cargados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Patente</th>
                    <th className="p-3">Fecha Recorrido</th>
                    <th className="p-3">Origen - Destino</th>
                    <th className="p-3">Vel. Media</th>
                    <th className="p-3">Vel. Máxima</th>
                    <th className="p-3">Excesos ({'>'}Límite)</th>
                    <th className="p-3">Kilometraje</th>
                    <th className="p-3">Subido por</th>
                    <th className="p-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportesGPS.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{rep.vehiculoPatente}</td>
                      <td className="p-3 text-slate-600">
                        {new Date(rep.fechaRecorrido).toLocaleString()}
                      </td>
                      <td className="p-3 text-slate-700">
                        {rep.origen} → {rep.destino}
                      </td>
                      <td className="p-3 font-mono">{rep.velocidadMediaKmh} km/h</td>
                      <td className="p-3 font-mono font-bold">
                        <span className={rep.velocidadMaximaKmh > rep.limiteVelocidadKmh ? 'text-rose-600' : ''}>
                          {rep.velocidadMaximaKmh} km/h
                        </span>
                      </td>
                      <td className="p-3">
                        {rep.excesosVelocidadDetectados > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            {rep.excesosVelocidadDetectados} excesos
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            0 excesos
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono">{rep.kilometrajeTotalKm} km</td>
                      <td className="p-3 text-slate-600">{rep.subidoPorNombre}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setReporteSeleccionado(rep)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
                        >
                          Ver Ruta
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Previsualización de Firma */}
      {modalFirmaPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Previsualización de Firma Digital
            </h5>
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 flex justify-center">
              <img
                src={modalFirmaPreview}
                alt="Firma del Conductor"
                className="max-h-48 object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalFirmaPreview(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Previsualización de Adjuntos (Fotos o PDFs) */}
      {modalAdjuntoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-5 max-w-2xl w-full shadow-2xl space-y-4 border border-slate-200">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Documento / Evidencia Adjunta
            </h5>
            <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 flex justify-center max-h-[65vh] overflow-auto">
              {modalAdjuntoPreview.startsWith('data:application/pdf') ? (
                <iframe
                  src={modalAdjuntoPreview}
                  title="Documento PDF"
                  className="w-full h-96 rounded"
                />
              ) : (
                <img
                  src={modalAdjuntoPreview}
                  alt="Evidencia fotográfica"
                  className="max-h-96 object-contain rounded"
                />
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setModalAdjuntoPreview(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle de Puntos GPS del Reporte */}
      {reporteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-5 max-w-2xl w-full shadow-2xl space-y-4 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <div>
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Detalle de Recorrido: {reporteSeleccionado.vehiculoPatente}
                </h5>
                <p className="text-[11px] text-slate-500">
                  {reporteSeleccionado.origen} → {reporteSeleccionado.destino} ({reporteSeleccionado.puntosRuta.length} puntos registrados)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReporteSeleccionado(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Latitud</th>
                    <th className="p-2">Longitud</th>
                    <th className="p-2">Velocidad</th>
                    <th className="p-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reporteSeleccionado.puntosRuta.map((pt, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-mono text-slate-400">{i + 1}</td>
                      <td className="p-2 font-mono">{pt.lat}</td>
                      <td className="p-2 font-mono">{pt.lng}</td>
                      <td className={`p-2 font-mono font-bold ${
                        pt.velocidadKmh > reporteSeleccionado.limiteVelocidadKmh
                          ? 'text-rose-600'
                          : 'text-slate-800'
                      }`}>
                        {pt.velocidadKmh} km/h
                      </td>
                      <td className="p-2 text-slate-500">{pt.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReporteSeleccionado(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};