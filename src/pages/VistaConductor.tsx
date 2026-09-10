import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

const preguntasPorTipo = {
  'Tracto camión': [
    { id: 'presiones_tablero', texto: '¿Los indicadores de presion (aceite, aire/vacio) marcan niveles normales?' },
    { id: 'frenos_servicio', texto: '¿El freno de pie y el de emergencia funcionan bien y sin fugas de aire?' },
    { id: 'volante_direccion', texto: '¿El volante y la direccion operan correctamente sin juego excesivo?' },
    { id: 'parabrisas_limpiadores', texto: '¿El parabrisas esta sin fisuras graves y los limpiaparabrisas funcionan?' },
    { id: 'espejos_retrovisores', texto: '¿Los espejos retrovisores estan en buen estado y bien ajustados?' },
    { id: 'luces_frontales', texto: '¿Faros principales, direccionales y luces de galibo frontales encienden?' },
    { id: 'luces_traseras', texto: '¿Luces de freno, reversa y direccionales traseras operan sin problemas?' },
    { id: 'neumaticos_tracto', texto: '¿Las llantas tienen buena huella, presion correcta y los birlos estan completos?' },
    { id: 'suspension_chasis', texto: '¿La suspension (muelles) y el chasis se encuentran sin fisuras o roturas?' },
    { id: 'tanque_combustible', texto: '¿El tanque de combustible y su tapon estan bien asegurados y sin fugas?' },
    { id: 'quinta_rueda', texto: '¿La quinta rueda y sus conexiones de aire/electricas estan en buen estado?' },
    { id: 'equipo_emergencia', texto: '¿Lleva extintor cargado, botiquin, triangulos, gato hidraulico y llave de rueda?' }
  ],
  'Semirremolque': [
    { id: 'estado_carroceria', texto: '¿La carroceria se encuentra sin abolladuras, corrosion ni elementos sueltos?' },
    { id: 'luces_remolque', texto: '¿Las luces de posicion, intermitentes, freno y galibo estan operativas?' },
    { id: 'huincha_reflectante', texto: '¿La huincha reflectante en el chasis esta visible y en buen estado?' },
    { id: 'neumaticos_remolque', texto: '¿Los neumaticos (incluido el de repuesto) estan sin danos y con presion correcta?' },
    { id: 'patines_apoyo', texto: '¿Los patines de apoyo (patas) suben, bajan y se aseguran correctamente?' },
    { id: 'conexiones_tracto', texto: '¿Las lineas electricas y conexiones de frenos de aire hacia el tracto estan sin fugas?' },
    { id: 'extintores_pqs', texto: '¿Cuenta con 2 extintores de 6 kilos con mantencion vigente?' },
    { id: 'cunas_seguridad', texto: '¿Lleva al menos 2 cunas en buen estado y conos de seguridad?' },
    { id: 'rotulacion_carga', texto: '¿Los letreros de riesgo (Ej. ONU, Rombo) estan visibles en los 4 lados?' },
    { id: 'valvulas_acoples', texto: '¿Las valvulas, acoples y piolas de accionamiento de emergencia estan operativas?' }
  ],
  'Camioneta': [
    { id: 'luces_altas_bajas', texto: '¿Las luces altas, bajas y de estacionamiento encienden correctamente?' },
    { id: 'luces_freno_interm', texto: '¿Las luces de freno, retroceso e intermitentes estan operativas?' },
    { id: 'alarmas_bocina', texto: '¿La alarma de retroceso y la bocina suenan de forma clara?' },
    { id: 'parabrisas_visibilidad', texto: '¿El parabrisas esta limpio, sin trizaduras y los limpiaparabrisas limpian bien?' },
    { id: 'espejos_camioneta', texto: '¿Los espejos laterales y el retrovisor interior estan ajustados y sin danos?' },
    { id: 'cinturones_seguridad', texto: '¿Todos los cinturones de seguridad enganchan y retraen correctamente?' },
    { id: 'neumaticos_camioneta', texto: '¿Los neumaticos (delanteros, traseros y repuesto) tienen buena huella y presion?' },
    { id: 'frenos_camioneta', texto: '¿El pedal de freno y el freno de mano retienen el vehiculo adecuadamente?' },
    { id: 'kit_emergencia_cam', texto: '¿Cuenta con extintor vigente, botiquin y triangulos reflectantes?' },
    { id: 'herramientas_cam', texto: '¿Lleva gata hidraulica, llave de rueda y cunas de seguridad?' },
    { id: 'carroceria_puertas', texto: '¿Las puertas cierran bien y la carroceria (con barra antivuelco si aplica) es segura?' }
  ]
};

export default function VistaConductor() {
  const { id } = useParams();
  
  const [identificado, setIdentificado] = useState(false);
  const [nombreConductor, setNombreConductor] = useState('');
  const [rutConductor, setRutConductor] = useState('');
  const [fotoLicencia, setFotoLicencia] = useState<File | null>(null);
  const [fotoLicenciaPreview, setFotoLicenciaPreview] = useState<string | null>(null);

  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [jornadaFinalizada, setJornadaFinalizada] = useState(false);
  
  const [kilometrajeActual, setKilometrajeActual] = useState<number | null>(null);
  const [kilometrajeAnterior, setKilometrajeAnterior] = useState<number>(0);
  const [kilometraje, setKilometraje] = useState('');
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [vehiculoIdDoc, setVehiculoIdDoc] = useState<string | null>(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [firmando, setFirmando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);

  useEffect(() => {
    const cargarVehiculo = async () => {
      if (!id) return;
      try {
        const patenteFiltro = id.toUpperCase();
        const qVehiculo = query(collection(db, 'vehiculos'), where('patente', '==', patenteFiltro));
        const snapVehiculo = await getDocs(qVehiculo);
        
        if (!snapVehiculo.empty) {
          const vData = snapVehiculo.docs[0].data();
          setVehiculo(vData);
          setVehiculoIdDoc(snapVehiculo.docs[0].id);

          const kmRealAnterior = Number(vData.kilometrajeActual) || 0;
          setKilometrajeAnterior(kmRealAnterior);
          setKilometraje(kmRealAnterior > 0 ? kmRealAnterior.toString() : '');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setCargandoVehiculo(false);
      }
    };
    cargarVehiculo();
  }, [id]);

  useEffect(() => {
    if (encuestaCompletada || bloqueado) {
      const timer = setTimeout(() => {
        setMostrarResumen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [encuestaCompletada, bloqueado]);

  const iniciarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setFirmando(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const dibujarFirma = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!firmando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setTieneFirma(true);
  };

  const detenerFirma = () => {
    setFirmando(false);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
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
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error("Error al descargar, abriendo en nueva pestaña:", error);
      window.open(url, '_blank');
    }
  };

  let tipoActual = vehiculo?.tipo || 'Camioneta';
  if (tipoActual === 'Semi remolque') tipoActual = 'Semirremolque';
  const preguntasDinamicas = preguntasPorTipo[tipoActual as keyof typeof preguntasPorTipo] || preguntasPorTipo['Camioneta'];

  const capturarFotoTablero = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setFotoPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const capturarLicencia = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoLicencia(file);
      const reader = new FileReader();
      reader.onload = (event) => setFotoLicenciaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const manejarEnvio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const kilometrajeEscrito = formData.get('kilometraje') as string;
    
    if (!fotoFile && !kilometrajeEscrito) {
      alert("Es obligatorio ingresar el kilometraje escrito o subir una foto del tablero.");
      return;
    }

    if (!tieneFirma) {
      alert("La firma del conductor es obligatoria para enviar el reporte.");
      return;
    }

    if (kilometrajeEscrito) {
      const kmNuevo = Number(kilometrajeEscrito);
      if (kmNuevo < kilometrajeAnterior) {
        alert(`Error: El kilometraje ingresado (${kmNuevo} km) no puede ser menor al último registro exacto (${kilometrajeAnterior} km).`);
        return;
      }
      setKilometrajeActual(kmNuevo);
    }

    setSubiendo(true);
    let tieneFallaCritica = false;
    const respuestas: Record<string, string> = {};

    preguntasDinamicas.forEach(p => {
      const respuesta = formData.get(p.id) as string;
      respuestas[p.id] = respuesta;
      if (respuesta === 'no') tieneFallaCritica = true;
    });

    try {
      let fotoUrl = null;
      let fotoPath = null;
      
      if (fotoFile) {
        fotoPath = `kilometrajes/${id}-${Date.now()}-${fotoFile.name}`;
        const storageRef = ref(storage, fotoPath);
        await uploadBytes(storageRef, fotoFile);
        fotoUrl = await getDownloadURL(storageRef);
      }

      let licenciaUrl = null;
      let licenciaPath = null;
      if (fotoLicencia) {
        licenciaPath = `licencias/${id}-${Date.now()}-${fotoLicencia.name}`;
        const licenciaRef = ref(storage, licenciaPath);
        await uploadBytes(licenciaRef, fotoLicencia);
        licenciaUrl = await getDownloadURL(licenciaRef);
      }

      let firmaUrl = null;
      let firmaPath = null;
      const canvas = canvasRef.current;
      if (canvas && tieneFirma) {
        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
        firmaPath = `firmas/${id}-${Date.now()}.png`;
        const firmaRef = ref(storage, firmaPath);
        await uploadBytes(firmaRef, blob);
        firmaUrl = await getDownloadURL(firmaRef);
      }

      await addDoc(collection(db, 'reportes'), {
        vehiculoId: id?.toUpperCase(),
        tipoVehiculo: tipoActual,
        conductorNombre: nombreConductor,
        conductorRut: rutConductor,
        kilometraje: kilometrajeEscrito || "No ingresado",
        fotoUrl: fotoUrl,
        fotoPath: fotoPath,
        licenciaUrl: licenciaUrl,
        licenciaPath: licenciaPath,
        firmaUrl: firmaUrl,
        firmaPath: firmaPath,
        fallaCritica: tieneFallaCritica,
        respuestas: respuestas,
        fecha: serverTimestamp()
      });

      if (kilometrajeEscrito && vehiculoIdDoc) {
        await updateDoc(doc(db, 'vehiculos', vehiculoIdDoc), {
          kilometrajeActual: kilometrajeEscrito
        });
      }

      const qReportes = query(collection(db, 'reportes'), where('vehiculoId', '==', id?.toUpperCase()));
      const snapReportes = await getDocs(qReportes);
      if (snapReportes.size > 5) {
        const reportsArray = snapReportes.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));
        reportsArray.sort((a, b) => {
          const timeA = a.data.fecha?.toMillis() || 0;
          const timeB = b.data.fecha?.toMillis() || 0;
          return timeA - timeB;
        });
        
        const toDelete = reportsArray.slice(0, reportsArray.length - 5);
        for (const item of toDelete) {
          const data = item.data;
          if (data.fotoPath) await deleteObject(ref(storage, data.fotoPath)).catch(() => null);
          if (data.firmaPath) await deleteObject(ref(storage, data.firmaPath)).catch(() => null);
          if (data.licenciaPath) await deleteObject(ref(storage, data.licenciaPath)).catch(() => null);
          await deleteDoc(item.ref);
        }
      }

      if (tieneFallaCritica) setBloqueado(true);
      else setEncuestaCompletada(true);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar el reporte. Verifica tu conexión a internet.");
    } finally {
      setSubiendo(false);
    }
  };

  const calcularEstadoVencimiento = (fechaString: string) => {
    if (!fechaString) return { texto: 'No registrado', clase: 'bg-white/80 text-slate-500 border-slate-200' };
    
    const [year, month, day] = fechaString.split('-').map(Number);
    const fechaVencimiento = new Date(year, month - 1, day);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diferenciaTiempo = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.round(diferenciaTiempo / (1000 * 3600 * 24));

    if (diasRestantes < 0) return { texto: `Venció hace ${Math.abs(diasRestantes)}d`, clase: 'bg-red-100/90 text-red-700 border-red-300' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'bg-red-100/90 text-red-700 border-red-300' };
    if (diasRestantes <= 15) return { texto: `Vence en ${diasRestantes}d`, clase: 'bg-orange-100/90 text-orange-700 border-orange-300' };
    return { texto: `Al día (${diasRestantes}d)`, clase: 'bg-green-100/90 text-green-700 border-green-300' };
  };

  const renderDocInfo = (titulo: string, fecha: string, url: string, nombreArchivo: string) => {
    const estado = calcularEstadoVencimiento(fecha);
    const fechaFormateada = fecha ? fecha.split('-').reverse().join('-') : 'Sin fecha';

    return (
      <div className={`p-3 rounded-2xl border-2 backdrop-blur-sm flex flex-col justify-between items-center shadow-sm ${estado.clase}`}>
        <div className="flex flex-col items-center w-full mb-2">
          <span className="text-[10px] uppercase font-black opacity-75 mb-1">{titulo}</span>
          <span className="text-xs font-black text-slate-800">{fechaFormateada}</span>
          <span className="text-[10px] font-bold leading-tight mt-1 text-center">{estado.texto}</span>
        </div>
        {url && (
          <button 
            type="button"
            onClick={() => forzarDescarga(url, nombreArchivo)} 
            className="mt-auto w-full flex items-center justify-center gap-1.5 bg-slate-800/90 hover:bg-slate-900 text-white text-[11px] font-bold py-2 px-1 rounded-xl shadow transition-all"
          >
            Descargar
          </button>
        )}
      </div>
    );
  };

  // 0. PANTALLA DE INGRESO (NOMBRE, RUT Y LICENCIA)
  if (!identificado) {
    return (
      <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] z-0"></div>
        <div className="bg-white/85 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/40 animate-fade-in relative z-10">
          <div className="text-center mb-6">
            <span className="bg-blue-100 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">Control de Flota</span>
            <h1 className="text-2xl font-black text-slate-800 mt-3">Identificación</h1>
            <p className="text-sm text-slate-600 mt-1 font-mono font-bold tracking-wider">Patente: {id?.toUpperCase()}</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if(nombreConductor && rutConductor && fotoLicencia) setIdentificado(true); }} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Nombre Completo</label>
              <input 
                type="text" 
                required 
                value={nombreConductor} 
                onChange={(e) => setNombreConductor(e.target.value)} 
                placeholder="Ej: Juan Pérez" 
                className="w-full p-4 bg-white/70 border-2 border-white/60 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all shadow-inner" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">RUT</label>
              <input 
                type="text" 
                required 
                value={rutConductor} 
                onChange={(e) => setRutConductor(e.target.value)} 
                placeholder="Ej: 12.345.678-9" 
                className="w-full p-4 bg-white/70 border-2 border-white/60 rounded-2xl font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition-all shadow-inner" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1 ml-1">Foto Licencia de Conducir</label>
              <label className="block w-full cursor-pointer">
                <input type="file" required accept="image/*" capture="environment" onChange={capturarLicencia} className="hidden" />
                <div className="border-2 border-dashed border-slate-300 bg-white/60 rounded-2xl p-4 text-center hover:bg-white/80 transition-all shadow-sm backdrop-blur-sm">
                  {fotoLicenciaPreview ? (
                    <img src={fotoLicenciaPreview} className="mx-auto h-20 rounded-lg shadow-sm" alt="Vista previa licencia" />
                  ) : (
                    <span className="text-slate-600 text-sm font-bold flex items-center justify-center gap-2 text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
                      Tomar foto a la licencia
                    </span>
                  )}
                </div>
              </label>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all mt-4 active:scale-[0.98]">
              Continuar al Checklist
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 1. VISTA DE DESPEDIDA FINAL
  if (jornadaFinalizada) {
    return (
      <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 relative text-center" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] z-0"></div>
        <div className="bg-white/85 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-green-500 animate-fade-in relative z-10 border border-white/40">
          <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4">¡Muchas gracias, {nombreConductor}!</h1>
          <p className="text-slate-600 text-base leading-relaxed mb-8 font-medium">
            Tu reporte de checklist diario ha sido completado y guardado con éxito. ¡Que tengas una excelente jornada y un viaje muy seguro!
          </p>
          <button onClick={() => window.location.reload()} className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            Volver a escanear QR
          </button>
        </div>
      </div>
    );
  }

  // 2. VISTA DE RESUMEN
  if (mostrarResumen) {
    return (
      <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center p-4 md:p-6 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] z-0"></div>
        <div className="w-full max-w-md mx-auto bg-white/85 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/40 animate-fade-in my-auto relative z-10">
          <div className={`p-6 text-white text-center ${bloqueado ? 'bg-red-600/90' : 'bg-blue-600/90'} backdrop-blur-sm`}>
            <h1 className="text-2xl font-black">Resumen de Jornada</h1>
            <p className="text-blue-100 font-mono text-lg mt-1 tracking-widest">{id}</p>
            <p className="text-xs font-bold mt-1 opacity-90">{nombreConductor} (RUT: {rutConductor})</p>
            <p className={`text-xs font-black uppercase mt-2 inline-block px-3 py-1 rounded-full ${bloqueado ? 'bg-red-800 text-white' : 'bg-blue-800 text-white'}`}>
              {bloqueado ? 'VEHICULO BLOQUEADO' : 'VEHICULO APROBADO'}
            </p>
          </div>

          <div className="p-6">
            <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white/60 mb-6 shadow-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Registro de Kilometraje</h2>
              <div className="flex justify-between items-stretch px-2">
                <div className="text-center flex-1 flex flex-col justify-center">
                  <p className="text-xs text-slate-500 font-bold mb-1">Actual</p>
                  <p className="text-xl font-black text-slate-800">
                    {kilometrajeActual ? `${kilometrajeActual.toLocaleString('es-CL')} km` : 'Por foto'}
                  </p>
                </div>
                <div className="w-px bg-slate-300 mx-2"></div>
                <Link to={`/agendar/${id}`} className="text-center flex-1 block hover:bg-blue-50/70 p-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-200 group">
                  <p className="text-xs text-blue-600 font-bold mb-1">Próximo Taller</p>
                  <p className="text-xl font-black text-blue-700">
                    {vehiculo?.kilometrajeTaller ? `${Number(vehiculo.kilometrajeTaller).toLocaleString('es-CL')} km` : 'Pendiente'}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 group-hover:text-blue-800 transition-colors">
                    Agendar Hora
                  </div>
                </Link>
              </div>
            </div>

            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Estado de Documentación</h2>
            {vehiculo ? (
              <div className="grid grid-cols-2 gap-3 text-center mb-6">
                {renderDocInfo('Rev. Técnica', vehiculo.vencimientoRevision, vehiculo.urlRevision, `Revision_${id}.pdf`)}
                {renderDocInfo('Permiso Circ.', vehiculo.vencimientoCirculacion, vehiculo.urlCirculacion, `Circulacion_${id}.pdf`)}
                {renderDocInfo('Certificado', vehiculo.vencimientoCertificado, vehiculo.urlCertificado, `Certificado_${id}.pdf`)}
                {renderDocInfo('SOAP', vehiculo.vencimientoSoap, vehiculo.urlSoap, `SOAP_${id}.pdf`)}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-500 mb-6">Documentos no disponibles en este momento.</p>
            )}

            <button onClick={() => setJornadaFinalizada(true)} className="mt-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-md transition-colors active:scale-[0.98]">
              Finalizar Jornada
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. VISTA DE BLOQUEO
  if (bloqueado) {
    return (
      <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 text-center relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
        <div className="absolute inset-0 bg-red-950/35 backdrop-blur-[2px] z-0"></div>
        <div className="bg-white/85 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md border-2 border-red-500 animate-fade-in w-full relative z-10 border border-white/40">
          <h1 className="text-2xl font-black text-red-700">VEHICULO BLOQUEADO</h1>
          <p className="mt-4 text-slate-700 font-medium">Falla crítica detectada en el checklist. El vehículo no puede circular. Avise a la administración inmediatamente.</p>
          <div className="mt-6 flex justify-center">
             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700"></div>
          </div>
        </div>
      </div>
    );
  }

  // 4. VISTA DE CARGA EXITOSA
  if (encuestaCompletada) {
    return (
      <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 text-center relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
        <div className="absolute inset-0 bg-green-950/35 backdrop-blur-[2px] z-0"></div>
        <div className="bg-white/85 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md border-2 border-green-500 animate-fade-in w-full relative z-10 border border-white/40">
          <h1 className="text-2xl font-black text-green-700">Reporte Enviado</h1>
          <p className="mt-2 text-slate-700 font-medium">Generando resumen y validando documentos...</p>
          <div className="mt-6 flex justify-center">
             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // 5. VISTA PRINCIPAL: CHECKLIST CON FIRMA Y DOCUMENTOS
  return (
    <div className="min-h-screen bg-slate-900 bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center p-4 md:p-6 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] z-0"></div>
      <div className="w-full max-w-md mx-auto bg-white/85 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/40 my-auto relative z-10">
        <div className="bg-blue-600/90 backdrop-blur-sm p-6 text-white text-center shadow-inner">
          <h1 className="text-xl font-bold">Checklist Diario</h1>
          <p className="text-blue-100 font-mono text-lg mt-1 tracking-widest">{id}</p>
          <div className="mt-2 text-xs font-semibold bg-blue-800/80 inline-block px-3 py-1 rounded-full shadow-sm">
            Conductor: {nombreConductor}
          </div>
          {!cargandoVehiculo && vehiculo?.tipo && (
            <div className="mt-1">
              <span className="text-white text-[10px] font-black uppercase bg-blue-900/80 inline-block px-2.5 py-0.5 rounded-full">{vehiculo.tipo}</span>
            </div>
          )}
        </div>

        <form onSubmit={manejarEnvio} className="p-6 space-y-6">
          
          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
            <h2 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Estado de Documentación Vehicular</h2>
            {vehiculo ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                {renderDocInfo('Rev. Técnica', vehiculo.vencimientoRevision, vehiculo.urlRevision, `Revision_${id}.pdf`)}
                {renderDocInfo('Permiso Circ.', vehiculo.vencimientoCirculacion, vehiculo.urlCirculacion, `Circulacion_${id}.pdf`)}
                {renderDocInfo('Certificado', vehiculo.vencimientoCertificado, vehiculo.urlCertificado, `Certificado_${id}.pdf`)}
                {renderDocInfo('SOAP', vehiculo.vencimientoSoap, vehiculo.urlSoap, `SOAP_${id}.pdf`)}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic text-center">Cargando documentos...</p>
            )}
          </div>

          <div className="space-y-4 bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
            <h2 className="font-bold text-slate-800 border-b border-slate-200/80 pb-2">Registro de Kilometraje</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Escribir Kilometraje
                {kilometrajeAnterior > 0 && (
                  <span className="text-blue-600 font-bold ml-2">(Anterior: {kilometrajeAnterior.toLocaleString('es-CL')} km)</span>
                )}
              </label>
              <input 
                type="number" 
                name="kilometraje" 
                value={kilometraje}
                onChange={(e) => setKilometraje(e.target.value)}
                min={kilometrajeAnterior > 0 ? kilometrajeAnterior : 0}
                className="w-full p-3 bg-white/80 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none font-bold text-slate-800 shadow-sm" 
              />
            </div>
            <div className="text-center text-slate-400 text-sm font-black uppercase tracking-widest">O</div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Foto del Tablero</label>
              <label className="block w-full cursor-pointer">
                <input type="file" accept="image/*" capture="environment" onChange={capturarFotoTablero} className="hidden" />
                <div className="border-2 border-dashed border-slate-300 bg-white/70 rounded-xl p-4 text-center hover:bg-white transition-all shadow-sm">
                  {fotoPreview ? <img src={fotoPreview} className="mx-auto h-24 rounded-lg shadow-sm" alt="Vista previa" /> : <span className="text-slate-600 text-sm font-bold flex items-center justify-center gap-2 text-blue-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Tomar foto con la cámara</span>}
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80">
            <h2 className="font-bold text-slate-800 mb-4 text-lg">Inspección Visual</h2>
            {preguntasDinamicas.map((p) => (
              <div key={p.id} className="space-y-2 mb-5">
                <p className="text-slate-800 font-medium text-sm leading-snug">{p.texto}</p>
                <div className="flex gap-4">
                  <label className="flex-1">
                    <input type="radio" name={p.id} value="si" required className="hidden peer" />
                    <div className="text-center py-2.5 rounded-xl border-2 border-slate-300 bg-white/70 peer-checked:border-blue-600 peer-checked:bg-blue-50 cursor-pointer font-bold text-slate-500 peer-checked:text-blue-600 transition-all shadow-sm">SI</div>
                  </label>
                  <label className="flex-1">
                    <input type="radio" name={p.id} value="no" required className="hidden peer" />
                    <div className="text-center py-2.5 rounded-xl border-2 border-slate-300 bg-white/70 peer-checked:border-red-600 peer-checked:bg-red-50 cursor-pointer font-bold text-slate-500 peer-checked:text-red-600 transition-all shadow-sm">NO</div>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200/80">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-slate-800">Firma del Conductor *</label>
              <button type="button" onClick={limpiarFirma} className="text-xs text-red-600 font-bold hover:underline">Limpiar firma</button>
            </div>
            <div className="border-2 border-slate-300 rounded-2xl bg-white/90 overflow-hidden shadow-sm touch-none">
              <canvas
                ref={canvasRef}
                width={350}
                height={150}
                onMouseDown={iniciarFirma}
                onMouseMove={dibujarFirma}
                onMouseUp={detenerFirma}
                onMouseLeave={detenerFirma}
                onTouchStart={iniciarFirma}
                onTouchMove={dibujarFirma}
                onTouchEnd={detenerFirma}
                className="w-full h-[150px] cursor-crosshair bg-white/70"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 italic text-center">Firme dentro del recuadro usando su dedo o el mouse.</p>
          </div>

          <button type="submit" disabled={subiendo} className={`w-full text-white font-black text-lg tracking-wide py-4 rounded-2xl shadow-xl transition-all mt-4 active:scale-[0.98] ${subiendo ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30'}`}>
            {subiendo ? 'Enviando reporte...' : 'Finalizar Reporte'}
          </button>
        </form>
      </div>
    </div>
  );
}