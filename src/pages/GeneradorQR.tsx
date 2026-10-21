import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../constants';
import { ResponsiveLayout } from '../components/common/ResponsiveLayout';

export default function GeneradorQR() {
  const [patente, setPatente] = useState('HBL123');
  const [tipoVehiculo, setTipoVehiculo] = useState('Camioneta');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [ownerId, setOwnerId] = useState(auth.currentUser?.email || '');
  const [kilometrajeActual, setKilometrajeActual] = useState('');
  const [kilometrajeTaller, setKilometrajeTaller] = useState('');

  const [vencimientoRevision, setVencimientoRevision] = useState('');
  const [vencimientoCirculacion, setVencimientoCirculacion] = useState('');
  const [vencimientoCertificado, setVencimientoCertificado] = useState('');
  const [vencimientoSoap, setVencimientoSoap] = useState('');

  const [pdfRevision, setPdfRevision] = useState<File | null>(null);
  const [pdfCirculacion, setPdfCirculacion] = useState<File | null>(null);
  const [pdfCertificado, setPdfCertificado] = useState<File | null>(null);
  const [pdfSoap, setPdfSoap] = useState<File | null>(null);
  const [pdfPauta, setPdfPauta] = useState<File | null>(null);

  const [procesando, setProcesando] = useState(false);
  const [sesionVehiculos, setSesionVehiculos] = useState<any[]>([]);

  const urlVehiculo = `https://gestion-flota-web.vercel.app/v/${patente.toUpperCase()}`;

  const limpiarFormulario = () => {
    setPatente('');
    setTipoVehiculo('Camioneta');
    setMarca('');
    setModelo('');
    setAnio('');
    setOwnerId(auth.currentUser?.email || '');
    setKilometrajeActual('');
    setKilometrajeTaller('');
    setVencimientoRevision('');
    setVencimientoCirculacion('');
    setVencimientoCertificado('');
    setVencimientoSoap('');
    setPdfRevision(null);
    setPdfCirculacion(null);
    setPdfCertificado(null);
    setPdfSoap(null);
    setPdfPauta(null);
  };

  const guardarYDescargar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patente.trim()) return;

    setProcesando(true);

    try {
      const patenteMayuscula = patente.trim().toUpperCase();
      const url = `https://gestion-flota-web.vercel.app/v/${patenteMayuscula}`;

      const qQR = query(collection(db, 'qrs_guardados'), where('patente', '==', patenteMayuscula));
      const qrSnapshot = await getDocs(qQR);

      let urlRevision = '';
      let urlCirculacion = '';
      let urlCertificado = '';
      let urlSoap = '';
      let urlPauta = '';

      if (pdfRevision) {
        const refRevision = ref(storage, `documentos/${patenteMayuscula}/revision.pdf`);
        await uploadBytes(refRevision, pdfRevision);
        urlRevision = await getDownloadURL(refRevision);
      }

      if (pdfCirculacion) {
        const refCirculacion = ref(storage, `documentos/${patenteMayuscula}/circulacion.pdf`);
        await uploadBytes(refCirculacion, pdfCirculacion);
        urlCirculacion = await getDownloadURL(refCirculacion);
      }

      if (pdfCertificado) {
        const refCertificado = ref(storage, `documentos/${patenteMayuscula}/certificado.pdf`);
        await uploadBytes(refCertificado, pdfCertificado);
        urlCertificado = await getDownloadURL(refCertificado);
      }

      if (pdfSoap) {
        const refSoap = ref(storage, `documentos/${patenteMayuscula}/soap.pdf`);
        await uploadBytes(refSoap, pdfSoap);
        urlSoap = await getDownloadURL(refSoap);
      }

      if (pdfPauta) {
        const refPauta = ref(storage, `documentos/${patenteMayuscula}/pauta.pdf`);
        await uploadBytes(refPauta, pdfPauta);
        urlPauta = await getDownloadURL(refPauta);
      }

      const vehiculoPayload = {
        patente: patenteMayuscula,
        tipo: tipoVehiculo,
        marca,
        modelo,
        anio,
        ownerId: ownerId || auth.currentUser?.email || 'admin_general',
        kilometrajeActual,
        kilometrajeTaller,
        vencimientoRevision,
        vencimientoCirculacion,
        vencimientoCertificado,
        vencimientoSoap,
        urlRevision,
        urlCirculacion,
        urlCertificado,
        urlSoap,
        urlPauta,
        fechaRegistro: serverTimestamp()
      };

      const nuevoVehiculoRef = await addDoc(collection(db, 'vehiculos'), vehiculoPayload);

      const nuevoVehiculo = {
        id: nuevoVehiculoRef.id,
        ...vehiculoPayload,
        fechaRegistro: new Date().toISOString()
      };

      if (qrSnapshot.empty) {
        await addDoc(collection(db, 'qrs_guardados'), {
          patente: patenteMayuscula,
          tipo: tipoVehiculo,
          marca,
          modelo,
          anio,
          url,
          creadoPor: 'admin',
          creadoPorNombre: 'Administrador General',
          fechaRegistro: serverTimestamp()
        });
      }

      setSesionVehiculos(prev => [nuevoVehiculo, ...prev]);

      // Generación de PDF optimizada para móviles y tablets
      const elemento = document.getElementById('tarjeta-pdf-generador');
      if (elemento) {
        const imgData = await toPng(elemento, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true
        });

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
        pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);

        const nombreArchivo = `QR_${patenteMayuscula}.pdf`;
        pdf.save(nombreArchivo);
      }

      limpiarFormulario();
    } catch (error) {
      console.error('Error al registrar vehículo y generar QR:', error);
      alert('Ocurrió un error al procesar el registro. Revisa la consola.');
    } finally {
      setProcesando(false);
    }
  };

  const descargarQRDesdeSesion = async (vehiculo: any) => {
    const elemento = document.getElementById(`tarjeta-pdf-sesion-${vehiculo.patente}`);
    if (!elemento) return;

    try {
      const imgData = await toPng(elemento, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
      pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
      pdf.save(`QR_${vehiculo.patente}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF de sesión:', error);
      window.open(`https://gestion-flota-web.vercel.app/v/${vehiculo.patente}`, '_blank');
    }
  };

  return (
    <ResponsiveLayout
      badge="Operaciones y Flota"
      titulo="Central de Ingreso de Vehículos"
      subtitulo="Registra las especificaciones técnicas, documentos vigentes y genera la tarjeta QR"
      acciones={
        <Link
          to="/admin"
          className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm text-center transition-all"
        >
          ← Volver al Panel Admin
        </Link>
      }
    >
      {/* Tarjeta oculta fuera de pantalla para rasterización limpia en PDF */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
        <div id="tarjeta-pdf-generador" className="bg-white p-8 flex flex-col items-center justify-center" style={{ width: '400px', height: '600px' }}>
          <img src={LOGO_BASE64} alt="Logo" style={{ height: '85px', objectFit: 'contain', marginBottom: '24px' }} />
          <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-widest">{patente.toUpperCase()}</h2>
          <p className="text-base text-slate-500 font-bold uppercase mb-8">{tipoVehiculo}</p>
          <div className="bg-white p-4 rounded-3xl border-4 border-slate-900 mb-6 shadow-md">
            <QRCodeSVG value={urlVehiculo} size={210} level="H" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Escanee para iniciar el checklist</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulario Principal */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200">
          <form onSubmit={guardarYDescargar} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Patente / ID</label>
                <input
                  type="text"
                  value={patente}
                  onChange={(e) => setPatente(e.target.value.toUpperCase())}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base text-center font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  placeholder="ABCD12"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Tipo de Vehículo</label>
                <select
                  value={tipoVehiculo}
                  onChange={(e) => setTipoVehiculo(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option>Tracto camión</option>
                  <option>Semirremolque</option>
                  <option>Camioneta</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Marca</label>
                <input
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Scania / Toyota"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Modelo</label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: R500 / Hilux"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Año</label>
                <input
                  type="number"
                  value={anio}
                  onChange={(e) => setAnio(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="2024"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Responsable (OwnerId)</label>
                <input
                  type="text"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="admin@empresa.cl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Km Actual</label>
                <input
                  type="text"
                  value={kilometrajeActual}
                  onChange={(e) => setKilometrajeActual(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: 120000"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Próximo Taller (KM)</label>
                <input
                  type="text"
                  value={kilometrajeTaller}
                  onChange={(e) => setKilometrajeTaller(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: 130000"
                />
              </div>
            </div>

            {/* Documentos Obligatorios */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Documentación y Fechas de Vencimiento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Revisión Técnica */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Revisión Técnica</span>
                    {pdfRevision && (
                      <button type="button" onClick={() => setPdfRevision(null)} className="text-[10px] text-rose-600 font-bold">Quitar</button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={vencimientoRevision}
                    onChange={(e) => setVencimientoRevision(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <label className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2 text-center hover:bg-blue-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-600 truncate block">
                      {pdfRevision ? pdfRevision.name : 'Adjuntar PDF'}
                    </span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfRevision(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>

                {/* Permiso de Circulación */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Permiso Circulación</span>
                    {pdfCirculacion && (
                      <button type="button" onClick={() => setPdfCirculacion(null)} className="text-[10px] text-rose-600 font-bold">Quitar</button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={vencimientoCirculacion}
                    onChange={(e) => setVencimientoCirculacion(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <label className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2 text-center hover:bg-blue-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-600 truncate block">
                      {pdfCirculacion ? pdfCirculacion.name : 'Adjuntar PDF'}
                    </span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCirculacion(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>

                {/* Certificado Mantención */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Certificado Mantención</span>
                    {pdfCertificado && (
                      <button type="button" onClick={() => setPdfCertificado(null)} className="text-[10px] text-rose-600 font-bold">Quitar</button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={vencimientoCertificado}
                    onChange={(e) => setVencimientoCertificado(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <label className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2 text-center hover:bg-blue-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-600 truncate block">
                      {pdfCertificado ? pdfCertificado.name : 'Adjuntar PDF'}
                    </span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCertificado(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>

                {/* SOAP */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Seguro SOAP</span>
                    {pdfSoap && (
                      <button type="button" onClick={() => setPdfSoap(null)} className="text-[10px] text-rose-600 font-bold">Quitar</button>
                    )}
                  </div>
                  <input
                    type="date"
                    value={vencimientoSoap}
                    onChange={(e) => setVencimientoSoap(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <label className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2 text-center hover:bg-blue-50 transition-colors">
                    <span className="text-[11px] font-bold text-slate-600 truncate block">
                      {pdfSoap ? pdfSoap.name : 'Adjuntar PDF'}
                    </span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfSoap(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Pauta de Mantención */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 text-xs block">Pauta de Mantención Oficial</span>
                    <span className="text-[10px] text-slate-400">Pauta técnica periódica (PDF)</span>
                  </div>
                  {pdfPauta && (
                    <button type="button" onClick={() => setPdfPauta(null)} className="text-[10px] text-rose-600 font-bold">Quitar</button>
                  )}
                </div>
                <label className="cursor-pointer bg-white border border-slate-200 rounded-lg p-2.5 text-center hover:bg-blue-50 transition-colors">
                  <span className="text-[11px] font-bold text-slate-600 truncate block">
                    {pdfPauta ? pdfPauta.name : 'Seleccionar PDF de Pauta'}
                  </span>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfPauta(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={procesando}
              className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-sm text-xs sm:text-sm active:scale-[0.99] ${
                procesando ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {procesando ? 'Guardando y generando PDF...' : 'Registrar Vehículo y Descargar QR'}
            </button>
          </form>
        </div>

        {/* Panel Lateral: Añadidos Recientemente */}
        <aside className="lg:col-span-5 bg-white p-5 sm:p-7 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
            Añadidos en esta Sesión ({sesionVehiculos.length})
          </h2>

          {sesionVehiculos.length === 0 ? (
            <div className="text-xs text-slate-400 italic bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
              Los vehículos que registres aparecerán aquí listos para descargar.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scroll-touch pr-1">
              {sesionVehiculos.map((v) => {
                const qrUrl = `https://gestion-flota-web.vercel.app/v/${v.patente}`;
                return (
                  <div key={v.id ?? v.patente} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 shadow-sm">
                    {/* Tarjeta oculta por patente */}
                    <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
                      <div id={`tarjeta-pdf-sesion-${v.patente}`} className="bg-white p-8 flex flex-col items-center justify-center" style={{ width: '400px', height: '600px' }}>
                        <img src={LOGO_BASE64} alt="Logo" style={{ height: '85px', objectFit: 'contain', marginBottom: '24px' }} />
                        <h2 className="text-5xl font-black text-slate-900 mb-2 tracking-widest">{v.patente}</h2>
                        <p className="text-base text-slate-500 font-bold uppercase mb-8">{v.tipo || 'Flota'}</p>
                        <div className="bg-white p-4 rounded-3xl border-4 border-slate-900 mb-6 shadow-md">
                          <QRCodeSVG value={qrUrl} size={210} level="H" />
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">Escanee para iniciar el checklist</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xl font-black text-slate-800 font-mono tracking-wider">{v.patente}</div>
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          {v.marca || '--'} / {v.modelo || '--'} ({v.tipo})
                        </div>
                      </div>
                      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shrink-0">
                        <QRCodeSVG value={qrUrl} size={50} level="H" />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => descargarQRDesdeSesion(v)}
                        className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl transition-all"
                      >
                        Descargar QR PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </ResponsiveLayout>
  );
}