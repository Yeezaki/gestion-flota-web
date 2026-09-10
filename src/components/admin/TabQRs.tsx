import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { LOGO_BASE64 } from '../../constants';

type TabQRsProps = {
  busqueda: string;
  filtroTipoVehiculo: string;
};

export default function TabQRs({ busqueda, filtroTipoVehiculo }: TabQRsProps) {
  const [qrsGuardados, setQrsGuardados] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]); // Para validar huérfanos/reconstrucción
  const [limitesQR, setLimitesQR] = useState<Record<string, number>>({});
  const [generandoPdf, setGenerandoPdf] = useState<string | null>(null);

  const cargarDatos = async () => {
    try {
      // 1. Cargar QRs
      const qQR = query(collection(db, 'qrs_guardados'), orderBy('fechaRegistro', 'desc'));
      const snapQR = await getDocs(qQR);
      setQrsGuardados(snapQR.docs.map(doc => {
        const data = doc.data();
        if (data.tipo === 'Semi remolque') data.tipo = 'Semirremolque';
        return { id: doc.id, ...data };
      }));

      // 2. Cargar Vehículos (para poder comparar y depurar)
      const snapVehiculos = await getDocs(collection(db, 'vehiculos'));
      setVehiculos(snapVehiculos.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const depurarQRsHuerfanos = async () => {
    const vehiculosPatentes = new Set(vehiculos.map(v => v.patente));
    const qrsHuerfanos = qrsGuardados.filter(qr => !vehiculosPatentes.has(qr.patente));

    if (qrsHuerfanos.length === 0) {
      alert("No hay QRs huérfanos para depurar.");
      return;
    }

    try {
      for (const qr of qrsHuerfanos) {
        await deleteDoc(doc(db, 'qrs_guardados', qr.id));
      }
      setQrsGuardados(prev => prev.filter(qr => vehiculosPatentes.has(qr.patente)));
      alert(`Se depuraron ${qrsHuerfanos.length} QR(s) huérfano(s).`);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al depurar QRs huérfanos.");
    }
  };

  const reconstruirQRsDesdeFlota = async () => {
    const existentes = new Set(qrsGuardados.map(qr => String(qr.patente || '').trim().toUpperCase()));
    const nuevos: any[] = [];

    try {
      for (const vehiculo of vehiculos) {
        const patente = String(vehiculo.patente || '').trim().toUpperCase();
        if (!patente || existentes.has(patente)) continue;

        const payload = {
          patente,
          tipo: vehiculo.tipo || 'Camioneta',
          marca: vehiculo.marca || '',
          modelo: vehiculo.modelo || '',
          anio: vehiculo.anio || '',
          url: 'https://gestion-flota-web.vercel.app/v/' + patente,
          creadoPor: 'admin',
          creadoPorNombre: 'Administrador General',
          fechaRegistro: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'qrs_guardados'), payload);
        existentes.add(patente);
        nuevos.push({ id: docRef.id, ...payload });
      }

      if (nuevos.length > 0) {
        setQrsGuardados(prev => [...nuevos, ...prev]);
      }
      alert(`Se recuperaron ${nuevos.length} QR(s) de la flota.`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al reconstruir los QRs desde la flota.');
    }
  };

  const descargarPDF = async (patente: string) => {
    setGenerandoPdf(patente);
    const elemento = document.getElementById(`tarjeta-pdf-${patente}`);
    if (elemento) {
      try {
        await toPng(elemento, { cacheBust: true }); // primer render para calentar caché
        const imgData = await toPng(elemento, { 
          quality: 1, 
          pixelRatio: 3, 
          backgroundColor: '#ffffff', 
          cacheBust: true 
        });
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 150] });
        pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
        
        const nombreArchivo = `QR_${patente}.pdf`;
        const esCelular = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });

        if (esCelular && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
          } catch (e) {
            pdf.save(nombreArchivo);
          }
        } else {
          pdf.save(nombreArchivo);
        }
      } catch (error) {
        console.error(error);
      }
    }
    setGenerandoPdf(null);
  };

  const qrsFiltrados = qrsGuardados.filter(q => {
    const coincidePatente = q.patente?.toLowerCase().includes(busqueda.toLowerCase());
    const tipoNorm = q.tipo === 'Semi remolque' ? 'Semirremolque' : q.tipo;
    const coincideTipo = filtroTipoVehiculo === 'todos' || tipoNorm === filtroTipoVehiculo;
    return coincidePatente && coincideTipo;
  });

  const qrsAgrupadosPorUsuario = qrsFiltrados.reduce((acc: any, qr: any) => {
    const grupo = qr.creadoPorNombre || 'Administrador General';
    if (!acc[grupo]) {
      acc[grupo] = { detalles: qr.creadoPorDetalles || 'Generado desde el Panel Admin', qrs: [] };
    }
    acc[grupo].qrs.push(qr);
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      <div className="flex justify-end gap-3">
        <button onClick={depurarQRsHuerfanos} className="text-xs bg-rose-50 text-rose-600 font-bold px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
          Depurar QRs Huérfanos
        </button>
        <button onClick={reconstruirQRsDesdeFlota} className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3.5 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors">
          Reconstruir QRs de Flota
        </button>
      </div>

      {Object.keys(qrsAgrupadosPorUsuario).length === 0 ? (
        <div className="bg-white p-12 rounded-3xl shadow-lg text-center border border-slate-100">
          <p className="text-slate-500 text-lg">No se encontraron códigos QR guardados.</p>
        </div>
      ) : (
        Object.entries(qrsAgrupadosPorUsuario).map(([grupo, dataGrupo]: any) => {
          const limiteActual = limitesQR[grupo] || 6;
          return (
            <div key={grupo} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-800">{grupo}</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">{dataGrupo.detalles}</p>
                <div className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-lg mt-2">
                  Total Creados: {dataGrupo.qrs.length}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {dataGrupo.qrs.slice(0, limiteActual).map((qr: any) => {
                  const urlCorregida = qr.url?.replace(/http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, 'https://gestion-flota-web.vercel.app') || '';
                  return (
                    <div key={qr.id} className="flex flex-col gap-2 relative bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex flex-col items-center">
                        <h3 className="text-2xl font-black text-slate-800 tracking-widest">{qr.patente}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">{qr.tipo || 'Control de Flota'}</p>
                        <div className="bg-white p-2 rounded-xl border-2 border-slate-200 mb-4 shadow-sm">
                          <QRCodeSVG value={urlCorregida} size={100} level="H" includeMargin={false} />
                        </div>
                      </div>

                      {/* Elemento oculto para PDF */}
                      <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                        <div id={`tarjeta-pdf-${qr.patente}`} className="bg-white p-8 flex flex-col items-center justify-center" style={{ width: '400px', height: '600px', backgroundColor: 'white' }}>
                          <img src={LOGO_BASE64} alt="Logo Empresa" style={{ height: '90px', objectFit: 'contain', marginBottom: '30px' }} />
                          <h2 className="text-5xl font-black text-slate-800 mb-2 tracking-widest">{qr.patente}</h2>
                          <p className="text-lg text-slate-500 font-bold uppercase tracking-widest mb-10">{qr.tipo || 'Control de Flota'}</p>
                          <div className="bg-white p-4 rounded-3xl border-8 border-slate-800 mb-8 shadow-xl">
                            <QRCodeSVG value={urlCorregida} size={220} level="H" includeMargin={false} />
                          </div>
                          <p className="text-slate-500 font-bold text-center">Escanee este código para iniciar el checklist.</p>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full mt-2 relative z-10">
                        <button onClick={() => descargarPDF(qr.patente)} disabled={generandoPdf === qr.patente} className="flex-1 bg-slate-800 text-white font-bold py-2 rounded-xl hover:bg-slate-900 transition-colors shadow-sm text-xs">
                          {generandoPdf === qr.patente ? '...' : 'Descargar'}
                        </button>
                        <a href={urlCorregida} target="_blank" rel="noreferrer" className="flex-1 text-center bg-blue-50 text-blue-600 font-bold py-2 rounded-xl hover:bg-blue-100 transition-colors text-xs flex items-center justify-center">Probar</a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dataGrupo.qrs.length > limiteActual && (
                <div className="mt-6 text-center">
                  <button onClick={() => setLimitesQR(prev => ({ ...prev, [grupo]: limiteActual + 6 }))} className="px-8 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-100 transition-colors">
                    Mostrar más
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}