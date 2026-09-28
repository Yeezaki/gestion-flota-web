import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

import IdentificacionConductor from '../components/conductor/IdentificacionConductor';
import TestSeguimiento from '../components/conductor/TestSeguimiento';
import TestTrazoContinuo from '../components/conductor/TestTrazoContinuo';
import TestCognitivo from '../components/conductor/TestCognitivo';
import FormChecklist from '../components/conductor/FormChecklist';
import ResumenConductor from '../components/conductor/ResumenConductor';

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

const base64ToFile = (base64String: string, filename: string): File => {
  const arr = base64String.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export default function VistaConductor() {
  const { id } = useParams();
  const patenteValida = id ? id.toUpperCase() : '';
  const storageKey = `checklist_cache_${patenteValida}`;

  const [identificado, setIdentificado] = useState(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).identificado || false : false;
  });

  const [tipoJuegoSeguimiento, setTipoJuegoSeguimiento] = useState<'mot' | 'trazo'>('mot');
  const [faseSeguimientoCompletada, setFaseSeguimientoCompletada] = useState(false);
  const [faseColoresCompletada, setFaseColoresCompletada] = useState(false);
  const [datosTests, setDatosTests] = useState<any[]>([]);

  const [nombreConductor, setNombreConductor] = useState(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).nombreConductor || '' : '';
  });

  const [rutConductor, setRutConductor] = useState(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).rutConductor || '' : '';
  });

  const [fotoLicenciaPreview, setFotoLicenciaPreview] = useState<string | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).fotoLicenciaPreview || null : null;
  });

  const [fotoLicencia, setFotoLicencia] = useState<File | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    if (cache) {
      const data = JSON.parse(cache);
      if (data.fotoLicenciaPreview) {
        return base64ToFile(data.fotoLicenciaPreview, `licencia_${patenteValida}.jpg`);
      }
    }
    return null;
  });

  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [jornadaFinalizada, setJornadaFinalizada] = useState(false);

  const [kilometrajeActual, setKilometrajeActual] = useState<number | null>(null);
  const [kilometrajeAnterior, setKilometrajeAnterior] = useState<number>(0);
  const [kilometraje, setKilometraje] = useState(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).kilometraje || '' : '';
  });

  const [fotoPreview, setFotoPreview] = useState<string | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).fotoPreview || null : null;
  });

  const [fotoFile, setFotoFile] = useState<File | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    if (cache) {
      const data = JSON.parse(cache);
      if (data.fotoPreview) {
        return base64ToFile(data.fotoPreview, `tablero_${patenteValida}.jpg`);
      }
    }
    return null;
  });

  const [respuestasChecklist, setRespuestasChecklist] = useState<Record<string, string>>(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).respuestasChecklist || {} : {};
  });

  const [subiendo, setSubiendo] = useState(false);
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [vehiculoIdDoc, setVehiculoIdDoc] = useState<string | null>(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tieneFirma, setTieneFirma] = useState(false);

  useEffect(() => {
    if (!patenteValida) return;
    const datosCache = {
      identificado,
      nombreConductor,
      rutConductor,
      fotoLicenciaPreview,
      kilometraje,
      fotoPreview,
      respuestasChecklist
    };
    sessionStorage.setItem(storageKey, JSON.stringify(datosCache));
  }, [identificado, nombreConductor, rutConductor, fotoLicenciaPreview, kilometraje, fotoPreview, respuestasChecklist, patenteValida, storageKey]);

  useEffect(() => {
    const cargarVehiculo = async () => {
      if (!patenteValida) return;
      try {
        const qVehiculo = query(collection(db, 'vehiculos'), where('patente', '==', patenteValida));
        const snapVehiculo = await getDocs(qVehiculo);
        
        if (!snapVehiculo.empty) {
          const vData = snapVehiculo.docs[0].data();
          setVehiculo(vData);
          setVehiculoIdDoc(snapVehiculo.docs[0].id);

          const kmRealAnterior = Number(vData.kilometrajeActual) || 0;
          setKilometrajeAnterior(kmRealAnterior);
          if (!kilometraje && kmRealAnterior > 0) {
            setKilometraje(kmRealAnterior.toString());
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setCargandoVehiculo(false);
      }
    };
    cargarVehiculo();
  }, [patenteValida]);

  useEffect(() => {
    if (encuestaCompletada || bloqueado) {
      const timer = setTimeout(() => {
        setMostrarResumen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [encuestaCompletada, bloqueado]);

  const forzarDescarga = async (url: string, nombreArchivo: string) => {
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    if (esIOS) {
      window.open(url, '_blank', 'noopener,noreferrer');
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
      console.error(error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const calcularEstadoVencimiento = (fechaString: string) => {
    if (!fechaString) return { texto: 'No registrado', clase: 'bg-white/60 text-slate-500 border-white/60' };
    
    const [year, month, day] = fechaString.split('-').map(Number);
    const fechaVencimiento = new Date(year, month - 1, day);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diferenciaTiempo = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.round(diferenciaTiempo / (1000 * 3600 * 24));

    if (diasRestantes < 0) return { texto: `Venció hace ${Math.abs(diasRestantes)}d`, clase: 'bg-red-100/70 text-red-700 border-red-300' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'bg-red-100/70 text-red-700 border-red-300' };
    if (diasRestantes <= 15) return { texto: `Vence en ${diasRestantes}d`, clase: 'bg-orange-100/70 text-orange-700 border-orange-300' };
    return { texto: `Al día (${diasRestantes}d)`, clase: 'bg-green-100/70 text-green-700 border-green-300' };
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

  const manejarEnvioChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fotoFile && !kilometraje) {
      alert("Es obligatorio ingresar el kilometraje escrito o subir una foto del tablero.");
      return;
    }

    if (!tieneFirma) {
      alert("La firma del conductor es obligatoria para enviar el reporte.");
      return;
    }

    if (kilometraje) {
      const kmNuevo = Number(kilometraje);
      if (kmNuevo < kilometrajeAnterior) {
        alert(`Error: El kilometraje ingresado (${kmNuevo} km) no puede ser menor al último registro exacto (${kilometrajeAnterior} km).`);
        return;
      }
      setKilometrajeActual(kmNuevo);
    }

    for (const p of preguntasDinamicas) {
      if (!respuestasChecklist[p.id]) {
        alert(`Falta responder: ${p.texto}`);
        return;
      }
    }

    setSubiendo(true);
    let tieneFallaCritica = false;
    Object.values(respuestasChecklist).forEach((val) => {
      if (val === 'no') tieneFallaCritica = true;
    });

    try {
      let fotoUrl = null;
      let fotoPath = null;
      if (fotoFile) {
        fotoPath = `kilometrajes/${patenteValida}-${Date.now()}-${fotoFile.name}`;
        const storageRef = ref(storage, fotoPath);
        await uploadBytes(storageRef, fotoFile);
        fotoUrl = await getDownloadURL(storageRef);
      }

      let licenciaUrl = null;
      let licenciaPath = null;
      const archivoLicencia = fotoLicencia || (fotoLicenciaPreview ? base64ToFile(fotoLicenciaPreview, `licencia_${patenteValida}.jpg`) : null);
      if (archivoLicencia) {
        licenciaPath = `licencias/${patenteValida}-${Date.now()}-${archivoLicencia.name}`;
        const licenciaRef = ref(storage, licenciaPath);
        await uploadBytes(licenciaRef, archivoLicencia);
        licenciaUrl = await getDownloadURL(licenciaRef);
      }

      let firmaUrl = null;
      let firmaPath = null;
      const canvas = canvasRef.current;
      if (canvas && tieneFirma) {
        const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
        firmaPath = `firmas/${patenteValida}-${Date.now()}.png`;
        const firmaRef = ref(storage, firmaPath);
        await uploadBytes(firmaRef, blob);
        firmaUrl = await getDownloadURL(firmaRef);
      }

      await addDoc(collection(db, 'reportes'), {
        vehiculoId: patenteValida,
        tipoVehiculo: tipoActual,
        conductorNombre: nombreConductor,
        conductorRut: rutConductor,
        kilometraje: kilometraje || "No ingresado",
        fotoUrl,
        fotoPath,
        licenciaUrl,
        licenciaPath,
        firmaUrl,
        firmaPath,
        fallaCritica: tieneFallaCritica,
        respuestas: respuestasChecklist,
        testsCognitivos: datosTests,
        fecha: serverTimestamp()
      });

      if (kilometraje && vehiculoIdDoc) {
        await updateDoc(doc(db, 'vehiculos', vehiculoIdDoc), {
          kilometrajeActual: kilometraje
        });
      }

      const qReportes = query(collection(db, 'reportes'), where('vehiculoId', '==', patenteValida));
      const snapReportes = await getDocs(qReportes);
      if (snapReportes.size > 5) {
        const reportsArray = snapReportes.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() }));
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

      sessionStorage.removeItem(storageKey);

      if (tieneFallaCritica) setBloqueado(true);
      else setEncuestaCompletada(true);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar el reporte. Verifica tu conexión a internet.");
    } finally {
      setSubiendo(false);
    }
  };

  const procesarResultadoSeguimiento = async (resultado: any) => {
    setDatosTests((prev) => [...prev, resultado]);
    if (!resultado.aprobado) {
      setBloqueado(true);
      try {
        await addDoc(collection(db, 'reportes'), {
          vehiculoId: patenteValida,
          tipoVehiculo: tipoActual,
          conductorNombre: nombreConductor,
          conductorRut: rutConductor,
          kilometraje: kilometraje || "No ingresado",
          fallaCritica: true,
          bloqueoPorTestCognitivo: true,
          testFallido: resultado,
          fecha: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      setFaseSeguimientoCompletada(true);
    }
  };

  const procesarResultadoColores = async (resultado: any) => {
    setDatosTests((prev) => [...prev, resultado]);
    if (!resultado.aprobado) {
      setBloqueado(true);
      try {
        await addDoc(collection(db, 'reportes'), {
          vehiculoId: patenteValida,
          tipoVehiculo: tipoActual,
          conductorNombre: nombreConductor,
          conductorRut: rutConductor,
          kilometraje: kilometraje || "No ingresado",
          fallaCritica: true,
          bloqueoPorTestCognitivo: true,
          testFallido: resultado,
          fecha: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      setFaseColoresCompletada(true);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center p-4 md:p-6 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
      {/* 1. Identificación */}
      {!identificado && (
        <IdentificacionConductor
          patente={patenteValida}
          nombreConductor={nombreConductor}
          setNombreConductor={setNombreConductor}
          rutConductor={rutConductor}
          setRutConductor={setRutConductor}
          fotoLicenciaPreview={fotoLicenciaPreview}
          setFotoLicenciaPreview={setFotoLicenciaPreview}
          setFotoLicencia={setFotoLicencia}
          onContinuar={() => {
            setTipoJuegoSeguimiento(Math.random() > 0.5 ? 'mot' : 'trazo');
            setIdentificado(true);
          }}
        />
      )}

      {/* 2. Primer Test: Seguimiento o Trazo */}
      {identificado && !faseSeguimientoCompletada && !bloqueado && (
        tipoJuegoSeguimiento === 'mot' ? (
          <TestSeguimiento onFinalizado={procesarResultadoSeguimiento} />
        ) : (
          <TestTrazoContinuo onFinalizado={procesarResultadoSeguimiento} />
        )
      )}

      {/* 3. Segundo Test: Reacción por Colores (Go/No-Go) */}
      {identificado && faseSeguimientoCompletada && !faseColoresCompletada && !bloqueado && (
        <TestCognitivo onFinalizado={procesarResultadoColores} />
      )}

      {/* 4. Bloqueo */}
      {bloqueado && !mostrarResumen && (
        <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md border-2 border-red-500/80 animate-fade-in w-full relative z-10 border border-white/50 text-center">
          <h1 className="text-2xl font-black text-red-700">VEHICULO BLOQUEADO</h1>
          <p className="mt-4 text-slate-700 font-medium">
            Falla crítica detectada o prueba psicomotora no superada. El vehículo no puede circular. Avise a la administración inmediatamente.
          </p>
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700"></div>
          </div>
        </div>
      )}

      {/* 5. Enviando reporte */}
      {encuestaCompletada && !mostrarResumen && (
        <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md border-2 border-green-500/80 animate-fade-in w-full relative z-10 border border-white/50 text-center">
          <h1 className="text-2xl font-black text-green-700">Reporte Enviado</h1>
          <p className="mt-2 text-slate-700 font-medium">Generando resumen y validando documentos...</p>
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          </div>
        </div>
      )}

      {/* 6. Formulario de Checklist */}
      {identificado && faseSeguimientoCompletada && faseColoresCompletada && !encuestaCompletada && !bloqueado && (
        <FormChecklist
          idPatente={patenteValida}
          nombreConductor={nombreConductor}
          vehiculo={vehiculo}
          cargandoVehiculo={cargandoVehiculo}
          kilometraje={kilometraje}
          setKilometraje={setKilometraje}
          kilometrajeAnterior={kilometrajeAnterior}
          fotoPreview={fotoPreview}
          onCapturarFotoTablero={capturarFotoTablero}
          preguntasDinamicas={preguntasDinamicas}
          respuestasChecklist={respuestasChecklist}
          onCambioRespuesta={(idQ, val) => setRespuestasChecklist((prev) => ({ ...prev, [idQ]: val }))}
          canvasRef={canvasRef}
          tieneFirma={tieneFirma}
          setTieneFirma={setTieneFirma}
          subiendo={subiendo}
          onSubmit={manejarEnvioChecklist}
          forzarDescarga={forzarDescarga}
          calcularEstadoVencimiento={calcularEstadoVencimiento}
        />
      )}

      {/* 7. Resumen de Jornada */}
      {mostrarResumen && !jornadaFinalizada && (
        <ResumenConductor
          idPatente={patenteValida}
          nombreConductor={nombreConductor}
          rutConductor={rutConductor}
          bloqueado={bloqueado}
          kilometrajeActual={kilometrajeActual}
          vehiculo={vehiculo}
          forzarDescarga={forzarDescarga}
          calcularEstadoVencimiento={calcularEstadoVencimiento}
          onFinalizarJornada={() => {
            sessionStorage.removeItem(storageKey);
            setJornadaFinalizada(true);
          }}
        />
      )}

      {/* 8. Despedida */}
      {jornadaFinalizada && (
        <div className="bg-white/60 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-green-500 animate-fade-in relative z-10 border border-white/50 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100/90 text-green-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4">¡Muchas gracias, {nombreConductor}!</h1>
          <p className="text-slate-600 text-base leading-relaxed mb-8 font-medium">
            Tu reporte de checklist diario ha sido completado y guardado con éxito. ¡Que tengas una excelente jornada y un viaje muy seguro!
          </p>
          <button onClick={() => { sessionStorage.removeItem(storageKey); window.location.reload(); }} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Volver a escanear QR
          </button>
        </div>
      )}
    </div>
  );
}