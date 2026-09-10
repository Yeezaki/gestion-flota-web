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

  const [pdfRevision, setPdfRevision] = useState<File | null>(null);
  const [pdfCirculacion, setPdfCirculacion] = useState<File | null>(null);
  const [pdfCertificado, setPdfCertificado] = useState<File | null>(null);
  const [pdfSoap, setPdfSoap] = useState<File | null>(null);

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
    setPdfRevision(null);
    setPdfCirculacion(null);
    setPdfCertificado(null);
    setPdfSoap(null);
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

      const qVehiculo = query(collection(db, 'vehiculos'), where('patente', '==', patenteMayuscula));
      const vehiculoSnapshot = await getDocs(qVehiculo);

      let urlRevision = '';
      let urlCirculacion = '';
      let urlCertificado = '';
      let urlSoap = '';

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

      const vehiculoPayload = {
        patente: patenteMayuscula,
        tipo: tipoVehiculo,
        marca,
        modelo,
        anio,
        ownerId: ownerId || auth.currentUser?.email || 'admin_general',
        kilometrajeActual,
        kilometrajeTaller,
        vencimientoRevision: '',
        vencimientoCirculacion: '',
        vencimientoCertificado: '',
        vencimientoSoap: '',
        urlRevision,
        urlCirculacion,
        urlCertificado,
        urlSoap,
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

      if (vehiculoSnapshot.empty) {
        // el documento se crea junto con el vehículo, no se duplica con esta ruta
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
                <h2 className="text-2xl font-black text-slate-800">Central de Ingreso de Vehículos</h2>
                <p className="text-sm text-slate-500 mt-1">Registro técnico y documentos</p>
              </div>
              <Link to="/admin" className="text-slate-500 font-bold hover:text-slate-800 transition-colors">Volver al Panel Admin</Link>
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
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Rev. Técnica</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfRevision(e.target.files?.[0] ?? null)} className="w-full text-sm text-slate-600" />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Permiso Circulación</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfCirculacion(e.target.files?.[0] ?? null)} className="w-full text-sm text-slate-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Certificado Mantención</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfCertificado(e.target.files?.[0] ?? null)} className="w-full text-sm text-slate-600" />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">SOAP</label>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfSoap(e.target.files?.[0] ?? null)} className="w-full text-sm text-slate-600" />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" disabled={procesando} className={`flex-1 font-bold py-4 rounded-xl transition-all shadow-md ${procesando ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}> 
                  {procesando ? 'Procesando...' : 'Guardar y Descargar PDF'}
                </button>
              </div>
            </form>
          </div>

          <aside className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
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
