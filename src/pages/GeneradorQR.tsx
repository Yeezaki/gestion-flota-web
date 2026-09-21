import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../constants';

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

      const elemento = document.getElementById('tarjeta-pdf-generador');
      if (elemento) {
        await toPng(elemento, { cacheBust: true });
        const imgData = await toPng(elemento, { quality: 1, pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
        pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);

        const nombreArchivo = `QR_${patenteMayuscula}.pdf`;
        const esCelular = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });

        if (esCelular && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file] }); } catch (e) { pdf.save(nombreArchivo); }
        } else {
          pdf.save(nombreArchivo);
        }
      }

      limpiarFormulario();
    } catch (error) {
      console.error(error);
      alert('Error al generar el PDF. Verifica la consola.');
    } finally {
      setProcesando(false);
    }
  };

  const descargarQRDesdeSesion = async (vehiculo: any) => {
    const url = `https://gestion-flota-web.vercel.app/v/${vehiculo.patente}`;
    const elemento = document.getElementById(`tarjeta-pdf-sesion-${vehiculo.patente}`);
    if (!elemento) return;

    try {
      const imgData = await toPng(elemento, { quality: 1, pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
      pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
      pdf.save(`QR_${vehiculo.patente}.pdf`);
    } catch (error) {
      console.error(error);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative z-10 overflow-hidden">
      <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
        <div id="tarjeta-pdf-generador" className="bg-white p-8 flex flex-col items-center justify-center" style={{ width: '400px', height: '600px' }}>
          <img src={LOGO_BASE64} alt="Logo Empresa" style={{ height: '90px', objectFit: 'contain', marginBottom: '30px' }} />
          <h2 className="text-5xl font-black text-slate-800 mb-2 tracking-widest">{patente.toUpperCase()}</h2>
          <p className="text-lg text-slate-500 font-bold uppercase mb-10">{tipoVehiculo}</p>
          <div className="bg-white p-4 rounded-3xl border-8 border-slate-800 mb-8 shadow-xl">
            <QRCodeSVG value={urlVehiculo} size={220} level="H" />
          </div>
          <p className="text-slate-500 font-bold text-center">Escanee para iniciar el checklist.</p>
        </div>
      </div>

      <div className="max-w-7xl w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Agregar Nuevo Vehículo a la Flota</h2>
                <p className="text-sm text-slate-500 mt-1">Registro técnico y documentos</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => window.history.back()} 
                  className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
                >
                  ← Volver a Flota
                </button>
                <Link to="/admin" className="text-slate-500 font-bold hover:text-slate-800 transition-colors">Volver a la Flota</Link>
              </div>
            </div>

            <form onSubmit={guardarYDescargar} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Patente / ID</label>
                  <input type="text" value={patente} onChange={(e) => setPatente(e.target.value.toUpperCase())} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono text-lg text-center focus:border-blue-500 focus:outline-none transition-all" placeholder="EJ: ABCD12" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Vehículo</label>
                  <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:outline-none transition-all">
                    <option>Tracto camión</option>
                    <option>Semirremolque</option>
                    <option>Camioneta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Marca</label>
                  <input type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="Marca" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Modelo</label>
                  <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="Modelo" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Año</label>
                  <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="2024" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Responsable (OwnerId)</label>
                  <input type="text" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="admin@empresa.cl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Km Actual</label>
                  <input type="text" value={kilometrajeActual} onChange={(e) => setKilometrajeActual(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="Km actual" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Próximo Taller</label>
                  <input type="text" value={kilometrajeTaller} onChange={(e) => setKilometrajeTaller(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:outline-none" placeholder="Km próximo taller" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase">Rev. Técnica</span>
                    {pdfRevision && (
                      <button type="button" onClick={() => setPdfRevision(null)} className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">×</button>
                    )}
                  </div>
                  <input type="date" value={vencimientoRevision} onChange={(e) => setVencimientoRevision(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 transition-all hover:bg-blue-50">
                    <span className="text-[11px] font-bold text-slate-600">Seleccionar PDF</span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfRevision(e.target.files?.[0] ?? null)} className="hidden" />
                    {pdfRevision && <span className="text-[10px] font-bold text-blue-700">{pdfRevision.name}</span>}
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase">Permiso Circulación</span>
                    {pdfCirculacion && (
                      <button type="button" onClick={() => setPdfCirculacion(null)} className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">×</button>
                    )}
                  </div>
                  <input type="date" value={vencimientoCirculacion} onChange={(e) => setVencimientoCirculacion(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 transition-all hover:bg-blue-50">
                    <span className="text-[11px] font-bold text-slate-600">Seleccionar PDF</span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCirculacion(e.target.files?.[0] ?? null)} className="hidden" />
                    {pdfCirculacion && <span className="text-[10px] font-bold text-blue-700">{pdfCirculacion.name}</span>}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase">Certificado Mantención</span>
                    {pdfCertificado && (
                      <button type="button" onClick={() => setPdfCertificado(null)} className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">×</button>
                    )}
                  </div>
                  <input type="date" value={vencimientoCertificado} onChange={(e) => setVencimientoCertificado(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 transition-all hover:bg-blue-50">
                    <span className="text-[11px] font-bold text-slate-600">Seleccionar PDF</span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCertificado(e.target.files?.[0] ?? null)} className="hidden" />
                    {pdfCertificado && <span className="text-[10px] font-bold text-blue-700">{pdfCertificado.name}</span>}
                  </label>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-slate-800 text-xs uppercase">SOAP</span>
                    {pdfSoap && (
                      <button type="button" onClick={() => setPdfSoap(null)} className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">×</button>
                    )}
                  </div>
                  <input type="date" value={vencimientoSoap} onChange={(e) => setVencimientoSoap(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 transition-all hover:bg-blue-50">
                    <span className="text-[11px] font-bold text-slate-600">Seleccionar PDF</span>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfSoap(e.target.files?.[0] ?? null)} className="hidden" />
                    {pdfSoap && <span className="text-[10px] font-bold text-blue-700">{pdfSoap.name}</span>}
                  </label>
                </div>
              </div>

              {/* Pauta de Mantención */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-slate-800 text-xs uppercase">Pauta de Mantención</span>
                    <span className="text-[11px] text-slate-400 block font-normal">Documento de inspección o preventivo (PDF)</span>
                  </div>
                  {pdfPauta && (
                    <button type="button" onClick={() => setPdfPauta(null)} className="text-[10px] font-black px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">×</button>
                  )}
                </div>
                <label className="cursor-pointer flex flex-col items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-3 transition-all hover:bg-blue-50">
                  <span className="text-[11px] font-bold text-slate-600">Seleccionar PDF de Pauta</span>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfPauta(e.target.files?.[0] ?? null)} className="hidden" />
                  {pdfPauta && <span className="text-[10px] font-bold text-blue-700">{pdfPauta.name}</span>}
                </label>
              </div>

              <div className="flex gap-4">
                <button type="submit" disabled={procesando} className={`flex-1 font-bold py-4 rounded-xl transition-all shadow-md ${procesando ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}> 
                  {procesando ? 'Procesando...' : 'Registrar Vehículo y Generar QR'}
                </button>
              </div>
            </form>
          </div>

          <aside className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-h-[800px] overflow-y-auto custom-scrollbar">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-2xl font-black text-slate-800">Añadidos recientemente</h2>
            </div>

            {sesionVehiculos.length === 0 ? (
              <div className="text-sm text-slate-500 italic bg-slate-50 rounded-2xl p-8 border border-slate-100">
                Los vehículos que registres en esta sesión aparecerán aquí.
              </div>
            ) : (
              <div className="space-y-4">
                {sesionVehiculos.map((vehiculo) => {
                  const qrUrl = `https://gestion-flota-web.vercel.app/v/${vehiculo.patente}`;
                  return (
                    <div key={vehiculo.id ?? vehiculo.patente} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                        <div id={`tarjeta-pdf-sesion-${vehiculo.patente}`} className="bg-white p-8 flex flex-col items-center justify-center" style={{ width: '400px', height: '600px', backgroundColor: 'white' }}>
                          <img src={LOGO_BASE64} alt="Logo Empresa" style={{ height: '90px', objectFit: 'contain', marginBottom: '30px' }} />
                          <h2 className="text-5xl font-black text-slate-800 mb-2 tracking-widest">{vehiculo.patente}</h2>
                          <p className="text-lg text-slate-500 font-bold uppercase mb-10">{vehiculo.tipo || 'Control de Flota'}</p>
                          <div className="bg-white p-4 rounded-3xl border-8 border-slate-800 mb-8 shadow-xl">
                            <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={false} />
                          </div>
                          <p className="text-slate-500 font-bold text-center">Escanee para iniciar el checklist.</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-3xl font-black text-slate-800 tracking-widest">{vehiculo.patente}</div>
                          <div className="text-xs font-bold text-slate-500 uppercase mt-1">{vehiculo.marca || '--'} / {vehiculo.modelo || '--'}</div>
                        </div>
                        <div className="bg-white p-2 rounded-2xl border border-slate-200">
                          <QRCodeSVG value={qrUrl} size={70} level="H" includeMargin={false} />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => descargarQRDesdeSesion(vehiculo)} className="text-xs bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700">Descargar QR PDF</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}