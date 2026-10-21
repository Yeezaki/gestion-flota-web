import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

import IdentificacionConductor from '../components/conductor/IdentificacionConductor';
import TestCognitivo from '../components/conductor/TestCognitivo';
import TestSeguimiento from '../components/conductor/TestSeguimiento';
import TestTrazoContinuo from '../components/conductor/TestTrazoContinuo';
import TestMemoriaSecuencia from '../components/conductor/TestMemoriaSecuencia';
import FormChecklist from '../components/conductor/FormChecklist';
import ResumenConductor from '../components/conductor/ResumenConductor';
import { ModalVisorDocumento } from '../components/conductor/ModalVisorDocumento';
import { ChecklistEmergenciaConductor } from '../components/conductor/ChecklistEmergenciaConductor';
import { PantallaEsperaPVT } from '../components/conductor/PantallaEsperaPVT';
import {
  verificarBloqueoPVT,
  registrarBloqueoPVT
} from '../services/pvtLockService';

import { SAFETY_DOCUMENTS } from '../constants';
import type {
  EvaluacionEmergenciaRegistro,
  FirmaDocumento,
  SafetyDocumentType
} from '../constants';

type TipoTestPVT = 'reaccion' | 'seguimiento' | 'trazo' | 'memoria';

const preguntasBasePorTipo = {
  'Tracto camión': [
    { id: 'presiones_tablero', texto: '¿Los indicadores de presion (aceite, aire/vacio) marcan niveles normales?', esCritica: true },
    { id: 'frenos_servicio', texto: '¿El freno de pie y el de emergencia funcionan bien y sin fugas de aire?', esCritica: true },
    { id: 'volante_direccion', texto: '¿El volante y la direccion operan correctamente sin juego excesivo?', esCritica: true },
    { id: 'parabrisas_limpiadores', texto: '¿El parabrisas esta sin fisuras graves y los limpiaparabrisas funcionan?', esCritica: false },
    { id: 'espejos_retrovisores', texto: '¿Los espejos retrovisores estan en buen estado y bien ajustados?', esCritica: false },
    { id: 'luces_frontales', texto: '¿Faros principales, direccionales y luces de galibo frontales encienden?', esCritica: true },
    { id: 'luces_traseras', texto: '¿Luces de freno, reversa y direccionales traseras operan sin problemas?', esCritica: true },
    { id: 'neumaticos_tracto', texto: '¿Las llantas tienen buena huella, presion correcta y los birlos estan completos?', esCritica: true },
    { id: 'suspension_chasis', texto: '¿La suspension (muelles) y el chasis se encuentran sin fisuras o roturas?', esCritica: true },
    { id: 'tanque_combustible', texto: '¿El tanque de combustible y su tapon estan bien asegurados y sin fugas?', esCritica: true },
    { id: 'quinta_rueda', texto: '¿La quinta rueda y sus conexiones de aire/electricas estan en buen estado?', esCritica: true },
    { id: 'equipo_emergencia', texto: '¿Lleva extintor cargado, botiquin, triangulos, gato hidraulico y llave de rueda?', esCritica: true }
  ],
  'Semirremolque': [
    { id: 'estado_carroceria', texto: '¿La carroceria se encuentra sin abolladuras, corrosion ni elementos sueltos?', esCritica: false },
    { id: 'luces_remolque', texto: '¿Las luces de posicion, intermitentes, freno y galibo estan operativas?', esCritica: true },
    { id: 'huincha_reflectante', texto: '¿La huincha reflectante en el chasis esta visible y en buen estado?', esCritica: false },
    { id: 'neumaticos_remolque', texto: '¿Los neumaticos (incluido el de repuesto) estan sin danos y con presion correcta?', esCritica: true },
    { id: 'patines_apoyo', texto: '¿Los patines de apoyo (patas) suben, bajan y se aseguran correctamente?', esCritica: true },
    { id: 'conexiones_tracto', texto: '¿Las lineas electricas y conexiones de frenos de aire hacia el tracto estan sin fugas?', esCritica: true },
    { id: 'extintores_pqs', texto: '¿Cuenta con 2 extintores de 6 kilos con mantencion vigente?', esCritica: true },
    { id: 'cunas_seguridad', texto: '¿Lleva al menos 2 cunas en buen estado y conos de seguridad?', esCritica: true },
    { id: 'rotulacion_carga', texto: '¿Los letreros de riesgo (Ej. ONU, Rombo) estan visibles en los 4 lados?', esCritica: true },
    { id: 'valvulas_acoples', texto: '¿Las valvulas, acoples y piolas de accionamiento de emergencia estan operativas?', esCritica: true }
  ],
  'Camioneta': [
    { id: 'luces_altas_bajas', texto: '¿Las luces altas, bajas y de estacionamiento encienden correctamente?', esCritica: true },
    { id: 'luces_freno_interm', texto: '¿Las luces de freno, retroceso e intermitentes estan operativas?', esCritica: true },
    { id: 'alarmas_bocina', texto: '¿La alarma de retroceso y la bocina suenan de forma clara?', esCritica: false },
    { id: 'parabrisas_visibilidad', texto: '¿El parabrisas esta limpio, sin trizaduras y los limpiaparabrisas limpian bien?', esCritica: false },
    { id: 'espejos_camioneta', texto: '¿Los espejos laterales y el retrovisor interior estan ajustados y sin danos?', esCritica: false },
    { id: 'cinturones_seguridad', texto: '¿Todos los cinturones de seguridad enganchan y retraen correctamente?', esCritica: true },
    { id: 'neumaticos_camioneta', texto: '¿Los neumaticos (delanteros, traseros y repuesto) tienen buena huella y presion?', esCritica: true },
    { id: 'frenos_camioneta', texto: '¿El pedal de freno y el freno de mano retienen el vehiculo adecuadamente?', esCritica: true },
    { id: 'kit_emergencia_cam', texto: '¿Cuenta con extintor vigente, botiquin y triangulos reflectantes?', esCritica: true },
    { id: 'herramientas_cam', texto: '¿Lleva gata hidraulica, llave de rueda y cunas de seguridad?', esCritica: true },
    { id: 'carroceria_puertas', texto: '¿Las puertas cierran bien y la carroceria (con barra antivuelco si aplica) es segura?', esCritica: true }
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

  const [parejaTests, setParejaTests] = useState<[TipoTestPVT, TipoTestPVT]>(['seguimiento', 'reaccion']);
  const [testActualIndice, setTestActualIndice] = useState<number>(0);
  const [fasePVTCompletada, setFasePVTCompletada] = useState(false);
  const [mostrarPantallaPuntajePVT, setMostrarPantallaPuntajePVT] = useState(false);
  const [datosTests, setDatosTests] = useState<any[]>([]);
  const [puntajeGlobalPVT, setPuntajeGlobalPVT] = useState<number>(100);

  const [datosBloqueoPVT, setDatosBloqueoPVT] = useState<{
    bloqueadoHasta: number;
    nivelRiesgo: string;
  } | null>(null);

  const [ubicacionGPS, setUbicacionGPS] = useState<any>(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).ubicacionGPS || null : null;
  });

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

  const [fotoLicenciaInternaPreview, setFotoLicenciaInternaPreview] = useState<string | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    return cache ? JSON.parse(cache).fotoLicenciaInternaPreview || null : null;
  });

  const [fotoLicenciaInterna, setFotoLicenciaInterna] = useState<File | null>(() => {
    const cache = sessionStorage.getItem(storageKey);
    if (cache) {
      const data = JSON.parse(cache);
      if (data.fotoLicenciaInternaPreview) {
        return base64ToFile(data.fotoLicenciaInternaPreview, `licencia_interna_${patenteValida}.jpg`);
      }
    }
    return null;
  });

  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState<'pvt' | 'checklist' | null>(null);
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

  const [docSeleccionado, setDocSeleccionado] = useState<SafetyDocumentType | null>(null);
  const [mostrarChecklistEmergencia, setMostrarChecklistEmergencia] = useState(false);

  const [preguntasPrevencionRemotas, setPreguntasPrevencionRemotas] = useState<any[]>([]);

  useEffect(() => {
    const qPrev = query(collection(db, 'preguntas_prevencion'), where('activa', '==', true), orderBy('creadoEn', 'asc'));
    const unsub = onSnapshot(qPrev, (snap) => {
      const preguntas = snap.docs.map(d => ({
        id: `prev_${d.id}`,
        texto: d.data().texto,
        esCritica: d.data().esCritica ?? true,
        origen: 'prevencion'
      }));
      setPreguntasPrevencionRemotas(preguntas);
    }, (err) => console.error("Error cargando preguntas de prevencion:", err));

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!patenteValida) return;
    const datosCache = {
      identificado,
      nombreConductor,
      rutConductor,
      fotoLicenciaPreview,
      fotoLicenciaInternaPreview,
      kilometraje,
      fotoPreview,
      respuestasChecklist,
      ubicacionGPS
    };
    sessionStorage.setItem(storageKey, JSON.stringify(datosCache));
  }, [identificado, nombreConductor, rutConductor, fotoLicenciaPreview, fotoLicenciaInternaPreview, kilometraje, fotoPreview, respuestasChecklist, ubicacionGPS, patenteValida, storageKey]);

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
    if (encuestaCompletada) {
      const timer = setTimeout(() => {
        setMostrarResumen(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [encuestaCompletada]);

  const seleccionarParejaAleatoria = (): [TipoTestPVT, TipoTestPVT] => {
    const catalogo: TipoTestPVT[] = ['reaccion', 'seguimiento', 'trazo', 'memoria'];
    const barajado = [...catalogo].sort(() => Math.random() - 0.5);
    return [barajado[0], barajado[1]];
  };

  const registrarEnHistorial = async (accion: string, detalles: string) => {
    try {
      await addDoc(collection(db, 'historial_acciones'), {
        usuario: nombreConductor ? `${nombreConductor} (${rutConductor})` : 'Conductor',
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

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
  const preguntasVehiculoBase = preguntasBasePorTipo[tipoActual as keyof typeof preguntasBasePorTipo] || preguntasBasePorTipo['Camioneta'];

  const preguntasDinamicas = [...preguntasPrevencionRemotas, ...preguntasVehiculoBase];

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
    preguntasDinamicas.forEach((p) => {
      if (respuestasChecklist[p.id] === 'no' && p.esCritica) {
        tieneFallaCritica = true;
      }
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

      let licenciaInternaUrl = null;
      let licenciaInternaPath = null;
      const archivoLicenciaInterna = fotoLicenciaInterna || (fotoLicenciaInternaPreview ? base64ToFile(fotoLicenciaInternaPreview, `licencia_interna_${patenteValida}.jpg`) : null);
      if (archivoLicenciaInterna) {
        licenciaInternaPath = `licencias_internas/${patenteValida}-${Date.now()}-${archivoLicenciaInterna.name}`;
        const licenciaInternaRef = ref(storage, licenciaInternaPath);
        await uploadBytes(licenciaInternaRef, archivoLicenciaInterna);
        licenciaInternaUrl = await getDownloadURL(licenciaInternaRef);
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
        licenciaInternaUrl,
        licenciaInternaPath,
        firmaUrl,
        firmaPath,
        fallaCritica: tieneFallaCritica,
        bloqueoPorTestCognitivo: false,
        respuestas: respuestasChecklist,
        testsCognitivos: datosTests,
        puntajePVT: puntajeGlobalPVT,
        ubicacion: ubicacionGPS || null,
        fecha: serverTimestamp()
      });

      if (tieneFallaCritica) {
        await registrarEnHistorial(
          'BLOQUEO_CHECKLIST',
          `Vehículo ${patenteValida} bloqueado por fallas críticas en checklist. PVT aprobado (${puntajeGlobalPVT}%). Conductor: ${nombreConductor}`
        );
      } else {
        await registrarEnHistorial(
          'CHECKLIST_COMPLETADO',
          `Vehículo ${patenteValida} operativo. PVT: ${puntajeGlobalPVT}%. Conductor: ${nombreConductor}`
        );
      }

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
          if (data.licenciaInternaPath) await deleteObject(ref(storage, data.licenciaInternaPath)).catch(() => null);
          await deleteDoc(item.ref);
        }
      }

      sessionStorage.removeItem(storageKey);

      if (tieneFallaCritica) {
        setMotivoBloqueo('checklist');
        setBloqueado(true);
      } else {
        setEncuestaCompletada(true);
      }

    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar el reporte. Verifica tu conexión a internet.");
    } finally {
      setSubiendo(false);
    }
  };

  const calcularNotaGlobal = (tests: any[]) => {
    let puntos = 100;
    tests.forEach((t) => {
      if (!t.aprobado) puntos -= 40;
      if (t.erroresComision) puntos -= (t.erroresComision * 10);
      if (t.erroresOmision) puntos -= (t.erroresOmision * 10);
      if (t.promedioMs && t.promedioMs > 580 && t.tipoTest && t.tipoTest.includes('Reaccion')) {
        const penalizacionMs = Math.min(20, Math.round((t.promedioMs - 580) / 10));
        puntos -= penalizacionMs;
      }
    });
    return Math.max(0, Math.min(100, puntos));
  };

  const obtenerRangoRiesgo = (puntaje: number): string => {
    if (puntaje >= 80) return 'bajo';
    if (puntaje >= 65) return 'medio';
    if (puntaje >= 50) return 'medio-alto';
    return 'alto';
  };

  const procesarResultadoTestGenerico = async (resultado: any) => {
    const nuevosTests = [...datosTests, resultado];
    setDatosTests(nuevosTests);
    const notaCalculada = calcularNotaGlobal(nuevosTests);
    setPuntajeGlobalPVT(notaCalculada);

    const rangoRiesgo = obtenerRangoRiesgo(notaCalculada);

    if (!resultado.aprobado || rangoRiesgo !== 'bajo') {
      const resBloqueo = await registrarBloqueoPVT(
        rutConductor,
        rangoRiesgo,
        nombreConductor,
        patenteValida
      );

      setDatosBloqueoPVT({
        bloqueadoHasta: resBloqueo.bloqueadoHasta,
        nivelRiesgo: rangoRiesgo
      });

      setMotivoBloqueo('pvt');
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
          nivelRiesgoPVT: rangoRiesgo,
          minutosEsperaPVT: resBloqueo.minutosRestantes,
          testFallido: resultado,
          testsCognitivos: nuevosTests,
          puntajePVT: notaCalculada,
          ubicacion: ubicacionGPS || null,
          fecha: serverTimestamp()
        });

        await registrarEnHistorial(
          'BLOQUEO_TEST_PVT',
          `Conductor ${nombreConductor} (${rutConductor}) bloqueado ${resBloqueo.minutosRestantes} min por nivel de fatiga ${rangoRiesgo.toUpperCase()} (${notaCalculada}%). Patente: ${patenteValida}`
        );
      } catch (err) {
        console.error(err);
      }
    } else {
      if (testActualIndice === 0) {
        setTestActualIndice(1);
      } else {
        setFasePVTCompletada(true);
        setMostrarPantallaPuntajePVT(true);
      }
    }
  };

  const renderComponenteTest = (tipo: TipoTestPVT) => {
    switch (tipo) {
      case 'reaccion':
        return <TestCognitivo onFinalizado={procesarResultadoTestGenerico} />;
      case 'seguimiento':
        return <TestSeguimiento onFinalizado={procesarResultadoTestGenerico} />;
      case 'trazo':
        return <TestTrazoContinuo onFinalizado={procesarResultadoTestGenerico} />;
      case 'memoria':
        return <TestMemoriaSecuencia onFinalizado={procesarResultadoTestGenerico} />;
      default:
        return <TestCognitivo onFinalizado={procesarResultadoTestGenerico} />;
    }
  };

  const handleGuardarFirmaDocumento = async (registro: FirmaDocumento) => {
    try {
      await addDoc(collection(db, 'firmas_documentos'), {
        ...registro,
        patente: patenteValida,
        creadoEn: serverTimestamp()
      });
      await registrarEnHistorial(
        'FIRMA_DOCUMENTO_SEGURIDAD',
        `Conductor ${nombreConductor} firmó y tomó conocimiento de: ${SAFETY_DOCUMENTS[registro.documentoId]?.titulo}`
      );
      alert(`Documento firmado con éxito: ${SAFETY_DOCUMENTS[registro.documentoId]?.titulo}`);
    } catch (e) {
      console.error(e);
      alert('Error al guardar la firma en el servidor.');
    }
  };

  const handleGuardarEvaluacionEmergencia = async (registro: EvaluacionEmergenciaRegistro) => {
    try {
      await addDoc(collection(db, 'evaluaciones_emergencia'), {
        ...registro,
        patente: patenteValida,
        creadoEn: serverTimestamp()
      });
      await registrarEnHistorial(
        'EVALUACION_EMERGENCIA',
        `Conductor ${nombreConductor} completó el checklist de emergencia. Puntaje: ${registro.puntaje}/${registro.totalPreguntas} (${registro.aprobado ? 'Aprobado' : 'Rechazado'})`
      );
      alert('Evaluación de emergencia guardada con éxito.');
      setMostrarChecklistEmergencia(false);
    } catch (e) {
      console.error(e);
      alert('Error al guardar la evaluación de emergencia.');
    }
  };

  const handleValidarContinuarIdentificacion = async () => {
    if (!rutConductor.trim()) {
      alert("Por favor ingrese su RUT antes de continuar.");
      return;
    }

    try {
      const estadoBloqueo = await verificarBloqueoPVT(rutConductor);
      if (estadoBloqueo.bloqueado && estadoBloqueo.bloqueadoHasta) {
        setDatosBloqueoPVT({
          bloqueadoHasta: estadoBloqueo.bloqueadoHasta,
          nivelRiesgo: estadoBloqueo.nivelRiesgo || 'medio'
        });
        setMotivoBloqueo('pvt');
        setBloqueado(true);
        setIdentificado(true);
        return;
      }
    } catch (err) {
      console.error("Error al validar bloqueo inicial:", err);
    }

    const parejaElegida = seleccionarParejaAleatoria();
    setParejaTests(parejaElegida);
    setTestActualIndice(0);
    setFasePVTCompletada(false);
    setMostrarPantallaPuntajePVT(false);
    setBloqueado(false);
    setMotivoBloqueo(null);
    setDatosBloqueoPVT(null);
    setIdentificado(true);
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center p-4 md:p-6 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
      {/* 1. Identificación y Descarga Inmediata de Documentos */}
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
          fotoLicenciaInternaPreview={fotoLicenciaInternaPreview}
          setFotoLicenciaInternaPreview={setFotoLicenciaInternaPreview}
          setFotoLicenciaInterna={setFotoLicenciaInterna}
          ubicacionGPS={ubicacionGPS}
          setUbicacionGPS={setUbicacionGPS}
          vehiculo={vehiculo}
          forzarDescarga={forzarDescarga}
          calcularEstadoVencimiento={calcularEstadoVencimiento}
          onContinuar={handleValidarContinuarIdentificacion}
        />
      )}

      {/* 2. Pruebas Psicomotoras Aleatorias */}
      {identificado && !fasePVTCompletada && !bloqueado && (
        <div className="w-full flex flex-col items-center">
          <div className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-700 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
            Batería Psicomotora: Prueba {testActualIndice + 1} de 2
          </div>
          {renderComponenteTest(parejaTests[testActualIndice])}
        </div>
      )}

      {/* 3. Tarjeta de Puntaje de Pruebas Psicomotoras */}
      {identificado && fasePVTCompletada && mostrarPantallaPuntajePVT && !bloqueado && (
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/60 animate-fade-in relative z-10 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="bg-green-100 text-green-800 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
            Pruebas Aprobadas
          </span>
          <h2 className="text-2xl font-black text-slate-800 mt-2">Aptitud Psicomotora</h2>
          
          <div className="bg-white/80 rounded-2xl p-4 my-5 border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calificación de Vigilia</div>
            <div className="text-4xl font-black text-blue-600 my-1">{puntajeGlobalPVT}%</div>
            <p className="text-xs text-slate-600 font-medium">Reflejos y atención dentro de los rangos de seguridad.</p>
          </div>

          <button
            type="button"
            onClick={() => setMostrarPantallaPuntajePVT(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all"
          >
            Continuar al Checklist
          </button>
        </div>
      )}

      {/* 4. Pantalla de Bloqueo */}
      {bloqueado && !mostrarResumen && (
        <div className="bg-white/70 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md border-2 border-red-500/80 animate-fade-in w-full relative z-10 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-red-700">VEHÍCULO BLOQUEADO</h1>

          {motivoBloqueo === 'checklist' ? (
            <div className="mt-4 space-y-4">
              <p className="text-slate-700 text-sm font-medium">
                Se detectaron una o más <strong>fallas críticas en el checklist de inspección y prevención</strong>. Por normativa de seguridad, este vehículo no puede iniciar ruta.
              </p>
              <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2">
                <span>Evaluación psicomotora: Aprobada ({puntajeGlobalPVT}%)</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comunícate inmediatamente con el supervisor o encargado de flota para reportar las fallas.
              </p>
              <button
                type="button"
                onClick={() => setMostrarResumen(true)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl text-xs shadow-md transition-all active:scale-[0.98]"
              >
                Ver Resumen y Documentación
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {datosBloqueoPVT ? (
                <PantallaEsperaPVT
                  rut={rutConductor}
                  bloqueadoHasta={datosBloqueoPVT.bloqueadoHasta}
                  nivelRiesgo={datosBloqueoPVT.nivelRiesgo}
                  onExpirado={() => {
                    setBloqueado(false);
                    setMotivoBloqueo(null);
                    setDatosBloqueoPVT(null);
                    setFasePVTCompletada(false);
                    setTestActualIndice(0);
                    setDatosTests([]);
                  }}
                />
              ) : (
                <>
                  <p className="text-slate-700 text-sm font-medium">
                    Evaluación psicomotora no superada (Puntaje: {puntajeGlobalPVT}%). Se detectaron indicios de fatiga, reflejos lentos o falta de atención.
                  </p>
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-xs font-bold">
                    Bloqueo preventivo de seguridad. El checklist quedó inhabilitado.
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Avisa al supervisor a cargo para reasignación o pausa reglamentaria.
                  </p>
                </>
              )}
            </div>
          )}
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
      {identificado && fasePVTCompletada && !mostrarPantallaPuntajePVT && !encuestaCompletada && !bloqueado && (
        <div className="w-full max-w-2xl space-y-4">
          <div className="bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Documentación y Seguridad de Operación
              </h3>
              <p className="text-[11px] text-slate-600 font-medium">
                Consulte las 2 hojas de cada protocolo obligatorio y confirme mediante su firma digital.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDocSeleccionado('mapa_riesgo')}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-400 transition-all text-left shadow-sm flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Mapa de riesgo de conducción</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">Ver 2 hojas y firmar</span>
              </button>

              <button
                type="button"
                onClick={() => setDocSeleccionado('procedimiento_conduccion')}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-400 transition-all text-left shadow-sm flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Procedimiento de conducción</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">Ver 2 hojas y firmar</span>
              </button>

              <button
                type="button"
                onClick={() => setDocSeleccionado('plan_transito')}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-400 transition-all text-left shadow-sm flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Plan de tránsito</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">Ver 2 hojas y firmar</span>
              </button>

              <button
                type="button"
                onClick={() => setDocSeleccionado('plan_emergencia')}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-400 transition-all text-left shadow-sm flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-800">Plan de emergencia</span>
                <span className="text-[10px] text-blue-600 font-semibold mt-1">Ver 2 hojas y firmar</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex justify-end">
              <button
                type="button"
                onClick={() => setMostrarChecklistEmergencia(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow transition-colors"
              >
                Realizar Evaluación de Emergencia (Cuestionario)
              </button>
            </div>
          </div>

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
        </div>
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

      {/* Modal de Lectura y Firma de Documentos */}
      {docSeleccionado && (
        <ModalVisorDocumento
          documentoId={docSeleccionado}
          conductorUid={rutConductor || patenteValida}
          conductorNombre={nombreConductor || 'Conductor sin registrar'}
          conductorRut={rutConductor || 'Sin RUT'}
          isOpen={Boolean(docSeleccionado)}
          onClose={() => setDocSeleccionado(null)}
          onGuardarFirma={handleGuardarFirmaDocumento}
        />
      )}

      {/* Modal de Checklist de Emergencia */}
      {mostrarChecklistEmergencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <ChecklistEmergenciaConductor
              conductorUid={rutConductor || patenteValida}
              conductorNombre={nombreConductor || 'Conductor sin registrar'}
              conductorRut={rutConductor || 'Sin RUT'}
              cantidadPreguntas={3}
              onGuardarEvaluacion={handleGuardarEvaluacionEmergencia}
              onCerrar={() => setMostrarChecklistEmergencia(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}