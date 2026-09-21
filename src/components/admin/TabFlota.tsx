import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, getDocs, deleteDoc, doc, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../lib/firebase';

type FormEditState = {
  patente: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: string;
  ownerId: string;
  kilometrajeActual: string;
  kilometrajeTaller: string;
  vencimientoRevision: string;
  vencimientoCirculacion: string;
  vencimientoCertificado: string;
  vencimientoSoap: string;
  urlRevision: string;
  urlCirculacion: string;
  urlCertificado: string;
  urlSoap: string;
  urlPauta: string;
};

type TabFlotaProps = {
  busqueda: string;
  filtroTipoVehiculo: string;
};

export default function TabFlota({ busqueda, filtroTipoVehiculo }: TabFlotaProps) {
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [usuariosRegistrados, setUsuariosRegistrados] = useState<any[]>([]);
  const [limiteVehiculos, setLimiteVehiculos] = useState(10);

  const [vehiculoEditando, setVehiculoEditando] = useState<any | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formEdit, setFormEdit] = useState<FormEditState>({
    patente: '', tipo: '', marca: '', modelo: '', anio: '', ownerId: '',
    kilometrajeActual: '', kilometrajeTaller: '',
    vencimientoRevision: '', vencimientoCirculacion: '', vencimientoCertificado: '', vencimientoSoap: '',
    urlRevision: '', urlCirculacion: '', urlCertificado: '', urlSoap: '', urlPauta: ''
  });
  
  const [pdfRevisionEdit, setPdfRevisionEdit] = useState<File | null>(null);
  const [pdfCirculacionEdit, setPdfCirculacionEdit] = useState<File | null>(null);
  const [pdfCertificadoEdit, setPdfCertificadoEdit] = useState<File | null>(null);
  const [pdfSoapEdit, setPdfSoapEdit] = useState<File | null>(null);
  const [pdfPautaEdit, setPdfPautaEdit] = useState<File | null>(null);

  const logAccion = async (accion: string, detalles: string) => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: user?.email || 'Desconocido',
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error("Error al guardar en el historial", e);
    }
  };

  const cargarDatos = async () => {
    try {
      const qVehiculos = query(collection(db, 'vehiculos'), orderBy('patente', 'asc'));
      const snapVehiculos = await getDocs(qVehiculos);
      setVehiculos(snapVehiculos.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const qUsuarios = query(collection(db, 'usuarios'), where('proyecto', '==', 'flota_app'));
      const snapUsuarios = await getDocs(qUsuarios);
      setUsuariosRegistrados(snapUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setLimiteVehiculos(10);
  }, [busqueda, filtroTipoVehiculo]);

  const eliminarVehiculo = async (id: string, patente: string) => {
    const confirmar = window.confirm("¿Estás seguro de que deseas eliminar este vehículo del sistema?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, 'vehiculos', id));

      const qrsSnap = await getDocs(query(collection(db, 'qrs_guardados'), where('patente', '==', patente)));
      for (const qrDoc of qrsSnap.docs) {
        await deleteDoc(doc(db, 'qrs_guardados', qrDoc.id));
      }

      await logAccion('ELIMINAR_VEHICULO', `Se borró el vehículo de la base de datos: ${patente}`);
      setVehiculos(prev => prev.filter(v => v.id !== id));
      alert("Vehículo y QR eliminados correctamente.");
    } catch (error) {
      console.error(error);
    }
  };

  const editarVehiculoEnFormulario = (vehiculo: any) => {
    setVehiculoEditando(vehiculo);
    setPdfRevisionEdit(null);
    setPdfCirculacionEdit(null);
    setPdfCertificadoEdit(null);
    setPdfSoapEdit(null);
    setPdfPautaEdit(null);
    setFormEdit({
      patente: vehiculo.patente,
      tipo: vehiculo.tipo || 'Camioneta',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || '',
      ownerId: vehiculo.ownerId || '',
      kilometrajeActual: vehiculo.kilometrajeActual || '',
      kilometrajeTaller: vehiculo.kilometrajeTaller || '',
      vencimientoRevision: vehiculo.vencimientoRevision || '',
      vencimientoCirculacion: vehiculo.vencimientoCirculacion || '',
      vencimientoCertificado: vehiculo.vencimientoCertificado || '',
      vencimientoSoap: vehiculo.vencimientoSoap || '',
      urlRevision: vehiculo.urlRevision || '',
      urlCirculacion: vehiculo.urlCirculacion || '',
      urlCertificado: vehiculo.urlCertificado || '',
      urlSoap: vehiculo.urlSoap || '',
      urlPauta: vehiculo.urlPauta || ''
    });
  };

  const eliminarDocumentoVehiculo = async (tipoDoc: 'revision' | 'circulacion' | 'certificado' | 'soap' | 'pauta') => {
    if (!vehiculoEditando) return;

    const mapeo: Record<'revision' | 'circulacion' | 'certificado' | 'soap' | 'pauta', { urlKey: keyof FormEditState; storage: string; label: string }> = {
      revision: { urlKey: 'urlRevision', storage: 'documentos/' + formEdit.patente.trim().toUpperCase() + '/revision.pdf', label: 'Rev. Técnica' },
      circulacion: { urlKey: 'urlCirculacion', storage: 'documentos/' + formEdit.patente.trim().toUpperCase() + '/circulacion.pdf', label: 'Permiso Circulación' },
      certificado: { urlKey: 'urlCertificado', storage: 'documentos/' + formEdit.patente.trim().toUpperCase() + '/certificado.pdf', label: 'Certificado Mantención' },
      soap: { urlKey: 'urlSoap', storage: 'documentos/' + formEdit.patente.trim().toUpperCase() + '/soap.pdf', label: 'SOAP' },
      pauta: { urlKey: 'urlPauta', storage: 'documentos/' + formEdit.patente.trim().toUpperCase() + '/pauta.pdf', label: 'Pauta de Mantención' }
    };

    const docInfo = mapeo[tipoDoc];
    const urlActual = formEdit[docInfo.urlKey];
    if (!urlActual) {
      alert('No existe un documento asociado para eliminar.');
      return;
    }

    try {
      const storageRef = ref(storage, docInfo.storage);
      await deleteObject(storageRef).catch(() => undefined);

      const payload: Record<string, string> = { [docInfo.urlKey]: '' };
      await updateDoc(doc(db, 'vehiculos', vehiculoEditando.id), payload);

      const nuevoFormEdit = { ...formEdit, [docInfo.urlKey]: '' } as FormEditState;
      setFormEdit(nuevoFormEdit);
      setVehiculoEditando({ ...vehiculoEditando, [docInfo.urlKey]: '' });
      setVehiculos(prev => prev.map(v => v.id === vehiculoEditando.id ? { ...v, [docInfo.urlKey]: '' } : v));

      alert(`${docInfo.label} eliminado correctamente.`);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al eliminar el documento.');
    }
  };

  const guardarEdicionVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoEditando) return;

    setGuardandoEdicion(true);
    try {
      const patenteMayuscula = formEdit.patente.trim().toUpperCase();
      const updatePayload: any = { ...formEdit, patente: patenteMayuscula };

      const archivos = [
        { file: pdfRevisionEdit, tipo: 'revision', urlKey: 'urlRevision' },
        { file: pdfCirculacionEdit, tipo: 'circulacion', urlKey: 'urlCirculacion' },
        { file: pdfCertificadoEdit, tipo: 'certificado', urlKey: 'urlCertificado' },
        { file: pdfSoapEdit, tipo: 'soap', urlKey: 'urlSoap' },
        { file: pdfPautaEdit, tipo: 'pauta', urlKey: 'urlPauta' }
      ];

      for (const item of archivos) {
        if (!item.file) continue;
        const route = ref(storage, `documentos/${patenteMayuscula}/${item.tipo}.pdf`);
        await uploadBytes(route, item.file);
        const nuevaUrl = await getDownloadURL(route);
        updatePayload[item.urlKey] = nuevaUrl;
      }

      await updateDoc(doc(db, 'vehiculos', vehiculoEditando.id), updatePayload);
      setVehiculos(prev => prev.map(v => v.id === vehiculoEditando.id ? { ...v, ...updatePayload } : v));
      setVehiculoEditando(null);
      setPdfRevisionEdit(null);
      setPdfCirculacionEdit(null);
      setPdfCertificadoEdit(null);
      setPdfSoapEdit(null);
      setPdfPautaEdit(null);
      alert("Vehículo actualizado correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al actualizar");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const forzarDescarga = async (url: string, nombreArchivo: string) => {
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    if (esIOS) {
      window.open(url, '_blank');
      return;
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = urlBlob;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
      }, 100);
    } catch (error) {
      console.error("Error al descargar, abriendo en nueva pestaña:", error);
      window.open(url, '_blank');
    }
  };

  const calcularEstadoVencimiento = (fechaString: string) => {
    if (!fechaString) return { texto: 'No registrado', clase: 'text-slate-500 bg-slate-100 border-slate-200' };
    const [year, month, day] = fechaString.split('-').map(Number);
    const fechaVencimiento = new Date(year, month - 1, day);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diferenciaTiempo = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.round(diferenciaTiempo / (1000 * 3600 * 24));

    if (diasRestantes < 0) return { texto: `Venció hace ${Math.abs(diasRestantes)}d`, clase: 'bg-red-100 text-red-700 font-bold border-red-200' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'bg-red-100 text-red-700 border-red-200' };
    if (diasRestantes <= 15) return { texto: `Vence en ${diasRestantes}d`, clase: 'bg-orange-100 text-orange-700 font-bold border-orange-200' };
    return { texto: `Al día (${diasRestantes}d)`, clase: 'bg-green-100 text-green-700 font-bold border-green-200' };
  };

  const vehiculosFiltrados = vehiculos.filter(v => {
    const coincidePatente = v.patente?.toLowerCase().includes(busqueda.toLowerCase());
    const tipoNorm = v.tipo === 'Semi remolque' ? 'Semirremolque' : v.tipo;
    const coincideTipo = filtroTipoVehiculo === 'todos' || tipoNorm === filtroTipoVehiculo;
    return coincidePatente && coincideTipo;
  });

  const vehiculosPaginados = vehiculosFiltrados.slice(0, limiteVehiculos);

  return (
    <>
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100 w-full min-w-0">
          <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Estado de Documentos</h2>
            <Link to="/generador" className="text-sm bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"> + Nuevo Vehículo</Link>
          </div>
          
          {/* VISTA ESCRITORIO */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1250px] whitespace-nowrap">
              <thead>
                <tr className="bg-white text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="p-4 font-bold">Vehículo</th>
                  <th className="p-4 font-bold">Rev. Técnica</th>
                  <th className="p-4 font-bold">Permiso Circ.</th>
                  <th className="p-4 font-bold">Certificado Mantención</th>
                  <th className="p-4 font-bold">SOAP</th>
                  <th className="p-4 font-bold">Pauta Mantención</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehiculosPaginados.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">No se encontraron vehículos.</td></tr>
                ) : vehiculosPaginados.map((vehiculo) => {
                  const revInfo = calcularEstadoVencimiento(vehiculo.vencimientoRevision);
                  const circInfo = calcularEstadoVencimiento(vehiculo.vencimientoCirculacion);
                  const certInfo = calcularEstadoVencimiento(vehiculo.vencimientoCertificado);
                  const soapInfo = calcularEstadoVencimiento(vehiculo.vencimientoSoap);
                  const ownerValue = vehiculo.ownerId || '';
                  const ownerUser = usuariosRegistrados.find((user: any) => user.email === ownerValue || user.id === ownerValue);
                  const ownerIsAdmin = ownerUser?.rol === 'admin' || ownerValue === auth.currentUser?.email;
                  const ownerIsGenerador = ownerUser?.rol === 'generador_qr';
                  return (
                    <tr key={vehiculo.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <span className="font-black text-slate-800 text-lg block">{vehiculo.patente}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{vehiculo.tipo || 'Camioneta'}</span>
                        <div className="text-[10px] mt-2 space-y-1">
                          <div><span className="font-medium text-slate-500">Marca:</span> <span className="font-bold text-slate-800">{vehiculo.marca || '--'}</span></div>
                          <div><span className="font-medium text-slate-500">Modelo:</span> <span className="font-bold text-slate-800">{vehiculo.modelo || '--'}</span></div>
                          <div><span className="font-medium text-slate-500">Año:</span> <span className="font-bold text-slate-800">{vehiculo.anio || '--'}</span></div>
                          <div className="mt-2">
                            {!ownerValue ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>Sin Asignar
                              </span>
                            ) : ownerIsAdmin ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>Admin: {ownerUser?.email || ownerValue}
                              </span>
                            ) : ownerIsGenerador ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Flota: {ownerUser?.razonSocial || ownerUser?.email || ownerValue}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>{ownerValue}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] bg-slate-100 px-2 py-1 rounded-md inline-flex border border-slate-200 mt-2">
                          <span className="font-medium text-slate-600">KM: <span className="font-bold text-slate-800">{vehiculo.kilometrajeActual || '--'}</span></span>
                          <span className="text-slate-300">|</span>
                          <span className="font-medium text-blue-600">Taller: <span className="font-bold">{vehiculo.kilometrajeTaller || '--'}</span></span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs border ${revInfo.clase}`}>{revInfo.texto}</span>
                          {vehiculo.urlRevision && (
                            <button onClick={() => forzarDescarga(vehiculo.urlRevision, `Revision_${vehiculo.patente}.pdf`)} className="text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                              Descargar
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs border ${circInfo.clase}`}>{circInfo.texto}</span>
                          {vehiculo.urlCirculacion && (
                            <button onClick={() => forzarDescarga(vehiculo.urlCirculacion, `Circulacion_${vehiculo.patente}.pdf`)} className="text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                              Descargar
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs border ${certInfo.clase}`}>{certInfo.texto}</span>
                          {vehiculo.urlCertificado && (
                            <button onClick={() => forzarDescarga(vehiculo.urlCertificado, `CertificadoMantencion_${vehiculo.patente}.pdf`)} className="text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                              Descargar
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs border ${soapInfo.clase}`}>{soapInfo.texto}</span>
                          {vehiculo.urlSoap && (
                            <button onClick={() => forzarDescarga(vehiculo.urlSoap, `SOAP_${vehiculo.patente}.pdf`)} className="text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                              Descargar
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col items-start gap-2">
                          {vehiculo.urlPauta ? (
                            <>
                              <span className="px-3 py-1 rounded-full text-xs border bg-blue-50 text-blue-700 font-bold border-blue-200">Disponible</span>
                              <button onClick={() => forzarDescarga(vehiculo.urlPauta, `PautaMantencion_${vehiculo.patente}.pdf`)} className="text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                                Descargar
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs border bg-slate-100 text-slate-400 border-slate-200">Sin Pauta</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 flex gap-2 justify-center mt-2">
                        <button onClick={() => editarVehiculoEnFormulario(vehiculo)} className="text-xs font-bold px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">Editar</button>
                        <button onClick={() => eliminarVehiculo(vehiculo.id, vehiculo.patente)} className="text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISTA MÓVIL */}
          <div className="flex flex-col md:hidden gap-4 p-4 bg-slate-50/50">
            {vehiculosPaginados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-slate-400 text-center text-sm font-medium">No se encontraron vehículos.</div>
            ) : vehiculosPaginados.map((vehiculo) => {
              const revInfo = calcularEstadoVencimiento(vehiculo.vencimientoRevision);
              const circInfo = calcularEstadoVencimiento(vehiculo.vencimientoCirculacion);
              const certInfo = calcularEstadoVencimiento(vehiculo.vencimientoCertificado);
              const soapInfo = calcularEstadoVencimiento(vehiculo.vencimientoSoap);
              const ownerValue = vehiculo.ownerId || '';
              const ownerUser = usuariosRegistrados.find((user: any) => user.email === ownerValue || user.id === ownerValue);
              const ownerIsAdmin = ownerUser?.rol === 'admin' || ownerValue === auth.currentUser?.email;
              const ownerIsGenerador = ownerUser?.rol === 'generador_qr';

              return (
                <div key={vehiculo.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                    <div>
                      <span className="font-black text-slate-800 text-xl block">{vehiculo.patente}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">{vehiculo.tipo || 'Camioneta'}</span>
                      <div className="text-[11px] text-slate-500 mt-2 flex flex-wrap gap-2">
                        <span><span className="font-medium">Marca:</span> <span className="font-bold text-slate-800">{vehiculo.marca || '--'}</span></span>
                        <span className="text-slate-300">|</span>
                        <span><span className="font-medium">Modelo:</span> <span className="font-bold text-slate-800">{vehiculo.modelo || '--'}</span></span>
                        <span className="text-slate-300">|</span>
                        <span><span className="font-medium">Año:</span> <span className="font-bold text-slate-800">{vehiculo.anio || '--'}</span></span>
                      </div>
                    </div>
                    <div className="mt-1">
                      {!ownerValue ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"><span className="w-2 h-2 rounded-full bg-slate-400"></span>Sin Asignar</span>
                      ) : ownerIsAdmin ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Admin: {ownerUser?.email || ownerValue}</span>
                      ) : ownerIsGenerador ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Flota: {ownerUser?.razonSocial || ownerUser?.email || ownerValue}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200"><span className="w-2 h-2 rounded-full bg-slate-400"></span>{ownerValue}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Rev. Técnica</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] border w-fit ${revInfo.clase}`}>{revInfo.texto}</span>
                      {vehiculo.urlRevision && (
                        <button onClick={() => forzarDescarga(vehiculo.urlRevision, `Revision_${vehiculo.patente}.pdf`)} className="mt-3 text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                          Descargar
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Permiso Circ.</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] border w-fit ${circInfo.clase}`}>{circInfo.texto}</span>
                      {vehiculo.urlCirculacion && (
                        <button onClick={() => forzarDescarga(vehiculo.urlCirculacion, `Circulacion_${vehiculo.patente}.pdf`)} className="mt-3 text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                          Descargar
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Certificado Mantención</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] border w-fit ${certInfo.clase}`}>{certInfo.texto}</span>
                      {vehiculo.urlCertificado && (
                        <button onClick={() => forzarDescarga(vehiculo.urlCertificado, `CertificadoMantencion_${vehiculo.patente}.pdf`)} className="mt-3 text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                          Descargar
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">SOAP</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] border w-fit ${soapInfo.clase}`}>{soapInfo.texto}</span>
                      {vehiculo.urlSoap && (
                        <button onClick={() => forzarDescarga(vehiculo.urlSoap, `SOAP_${vehiculo.patente}.pdf`)} className="mt-3 text-[10px] w-full font-bold bg-white text-slate-700 border border-slate-200 px-2 py-2 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1">
                          Descargar
                        </button>
                      )}
                    </div>
                    <div className="border border-slate-100 bg-slate-50 rounded-xl p-3 flex flex-col justify-between col-span-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Pauta de Mantención</span>
                      {vehiculo.urlPauta ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-1 rounded-md text-[10px] border bg-blue-50 text-blue-700 font-bold border-blue-200">Disponible</span>
                          <button onClick={() => forzarDescarga(vehiculo.urlPauta, `PautaMantencion_${vehiculo.patente}.pdf`)} className="text-[10px] font-bold bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all">
                            Descargar
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-[10px] border bg-slate-100 text-slate-400 border-slate-200 w-fit">Sin Pauta</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-5 w-full">
                    <button onClick={() => editarVehiculoEnFormulario(vehiculo)} className="flex-1 py-3 px-4 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors">Editar</button>
                    <button onClick={() => eliminarVehiculo(vehiculo.id, vehiculo.patente)} className="flex-1 py-3 px-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-black hover:bg-red-100 transition-colors">Eliminar</button>
                  </div>
                </div>
              );
            })}
          </div>

          {vehiculosFiltrados.length > limiteVehiculos && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setLimiteVehiculos(prev => prev + 10)} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-100 transition-colors">Mostrar más vehículos</button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      {vehiculoEditando && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Editar Vehículo</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">Modifica los datos y documentos de la patente <span className="font-bold text-slate-700">{formEdit.patente}</span></p>
              </div>
              <button onClick={() => setVehiculoEditando(null)} className="text-slate-400 hover:text-slate-800 font-bold text-xl transition-colors bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            </div>

            <form onSubmit={guardarEdicionVehiculo} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Tipo</label>
                  <select value={formEdit.tipo} onChange={(e) => setFormEdit({ ...formEdit, tipo: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:outline-none transition-all">
                    <option>Camioneta</option>
                    <option>Tracto camión</option>
                    <option>Semirremolque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Patente</label>
                  <input type="text" value={formEdit.patente} onChange={(e) => setFormEdit({ ...formEdit, patente: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Marca</label>
                  <input type="text" value={formEdit.marca} onChange={(e) => setFormEdit({ ...formEdit, marca: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Modelo</label>
                  <input type="text" value={formEdit.modelo} onChange={(e) => setFormEdit({ ...formEdit, modelo: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Año</label>
                  <input type="text" value={formEdit.anio} onChange={(e) => setFormEdit({ ...formEdit, anio: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Responsable (OwnerId)</label>
                  <input type="text" value={formEdit.ownerId} onChange={(e) => setFormEdit({ ...formEdit, ownerId: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Km Actual</label>
                  <input type="text" value={formEdit.kilometrajeActual} onChange={(e) => setFormEdit({ ...formEdit, kilometrajeActual: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">Próx Taller</label>
                  <input type="text" value={formEdit.kilometrajeTaller} onChange={(e) => setFormEdit({ ...formEdit, kilometrajeTaller: e.target.value })} className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-blue-500 focus:outline-none transition-all" />
                </div>
              </div>

              {/* Fechas de Documentos y Cargas */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4">Fechas de Vencimiento y Documentos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Rev. Técnica */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">Rev. Técnica</label>
                    <input type="date" value={formEdit.vencimientoRevision} onChange={(e) => setFormEdit({ ...formEdit, vencimientoRevision: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none" />
                    {formEdit.urlRevision ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl mb-3">
                        <a href={formEdit.urlRevision} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Ver Doc. Actual</a>
                        <button type="button" onClick={() => eliminarDocumentoVehiculo('revision')} className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mb-3 font-medium italic">Sin documento guardado</div>
                    )}
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subir / Actualizar PDF:</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfRevisionEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>

                  {/* Permiso Circulación */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">Permiso Circulación</label>
                    <input type="date" value={formEdit.vencimientoCirculacion} onChange={(e) => setFormEdit({ ...formEdit, vencimientoCirculacion: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none" />
                    {formEdit.urlCirculacion ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl mb-3">
                        <a href={formEdit.urlCirculacion} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Ver Doc. Actual</a>
                        <button type="button" onClick={() => eliminarDocumentoVehiculo('circulacion')} className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mb-3 font-medium italic">Sin documento guardado</div>
                    )}
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subir / Actualizar PDF:</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCirculacionEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>

                  {/* Certificado Mantención */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">Certificado Mantención</label>
                    <input type="date" value={formEdit.vencimientoCertificado} onChange={(e) => setFormEdit({ ...formEdit, vencimientoCertificado: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none" />
                    {formEdit.urlCertificado ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl mb-3">
                        <a href={formEdit.urlCertificado} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Ver Doc. Actual</a>
                        <button type="button" onClick={() => eliminarDocumentoVehiculo('certificado')} className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mb-3 font-medium italic">Sin documento guardado</div>
                    )}
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subir / Actualizar PDF:</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfCertificadoEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>

                  {/* SOAP */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">SOAP</label>
                    <input type="date" value={formEdit.vencimientoSoap} onChange={(e) => setFormEdit({ ...formEdit, vencimientoSoap: e.target.value })} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none" />
                    {formEdit.urlSoap ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl mb-3">
                        <a href={formEdit.urlSoap} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Ver Doc. Actual</a>
                        <button type="button" onClick={() => eliminarDocumentoVehiculo('soap')} className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mb-3 font-medium italic">Sin documento guardado</div>
                    )}
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subir / Actualizar PDF:</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfSoapEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>

                  {/* Pauta de Mantención */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm md:col-span-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase mb-3">Pauta de Mantención (PDF)</label>
                    {formEdit.urlPauta ? (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-2.5 rounded-xl mb-3">
                        <a href={formEdit.urlPauta} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Ver Pauta Actual</a>
                        <button type="button" onClick={() => eliminarDocumentoVehiculo('pauta')} className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Eliminar</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 mb-3 font-medium italic">Sin pauta guardada</div>
                    )}
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Subir / Reemplazar PDF:</label>
                    <input type="file" accept="application/pdf" onChange={(e) => setPdfPautaEdit(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setVehiculoEditando(null)} className="bg-slate-100 text-slate-600 font-bold px-6 py-3.5 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={guardandoEdicion} className="bg-blue-600 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:bg-slate-400 shadow-md">
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}