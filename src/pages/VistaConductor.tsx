import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';

import IdentificacionConductor from '../components/conductor/IdentificacionConductor';
import TestCognitivo from '../components/conductor/TestCognitivo';
import TestSeguimiento from '../components/conductor/TestSeguimiento';
import TestMemoriaSecuencia from '../components/conductor/TestMemoriaSecuencia';
import FormChecklist from '../components/conductor/FormChecklist';
import ResumenConductor from '../components/conductor/ResumenConductor';
import VistaFiscalizador from '../components/conductor/VistaFiscalizador';

type TipoTestPVT = 'reaccion' | 'seguimiento' | 'memoria';
type MotivoBloqueo = 'pvt' | 'checklist' | 'ambos' | null;
type ModoAccesoQR = 'seleccion' | 'fiscalizador' | 'conductor';

const preguntasBasePorTipo = {
  'Tracto camión': [
    { id: 'presiones_tablero', texto: '¿Los indicadores de presion (aceite, aire/vacio) marcan niveles normales?', esCritica: true },
    { id: 'frenos_servicio', texto: '¿El freno de pie y el de emergencia funcionan bien y sin fugas de aire?', esCritica: true },
    { id: 'volante_direccion', texto: '¿El volante y la direccion operan correctamente sin juego excesivo?', esCritica: true },
    { id: 'parabrisas_limpiadores', texto: '¿El parabrisas esta sin fisuras graves y los limpiaparabrisas funcionan?', esCritica: true },
    { id: 'espejos_retrovisores', texto: '¿Los espejos retrovisores estan en buen estado y bien ajustados?', esCritica: true },
    { id: 'luces_frontales', texto: '¿Faros principales, direccionales y luces de galibo frontales encienden?', esCritica: true },
    { id: 'luces_traseras', texto: '¿Luces de freno, reversa y direccionales traseras operan sin problemas?', esCritica: true },
    { id: 'neumaticos_tracto', texto: '¿Las llantas tienen buena huella, presion correcta y los birlos estan completos?', esCritica: true },
    { id: 'suspension_chasis', texto: '¿La suspension (muelles) y el chasis se encuentran sin fisuras o roturas?', esCritica: true },
    { id: 'tanque_combustible', texto: '¿El tanque de combustible y su tapon estan bien asegurados y sin fugas?', esCritica: true },
    { id: 'quinta_rueda', texto: '¿La quinta rueda y sus conexiones de aire/electricas estan en buen estado?', esCritica: true },
    { id: 'equipo_emergencia', texto: '¿Lleva extintor cargado, botiquin, triangulos, gato hidraulico y llave de rueda?', esCritica: true }
  ],
  'Semirremolque': [
    { id: 'estado_carroceria', texto: '¿La carroceria se encuentra sin abolladuras, corrosion ni elementos sueltos?', esCritica: true },
    { id: 'luces_remolque', texto: '¿Las luces de posicion, intermitentes, freno y galibo estan operativas?', esCritica: true },
    { id: 'huincha_reflectante', texto: '¿La huincha reflectante en el chasis esta visible y en buen estado?', esCritica: true },
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
    { id: 'alarmas_bocina', texto: '¿La alarma de retroceso y la bocina suenan de forma clara?', esCritica: true },
    { id: 'parabrisas_visibilidad', texto: '¿El parabrisas esta limpio, sin trizaduras y los limpiaparabrisas limpian bien?', esCritica: true },
    { id: 'espejos_camioneta', texto: '¿Los espejos laterales y el retrovisor interior estan ajustados y sin danos?', esCritica: true },
    { id: 'cinturones_seguridad', texto: '¿Todos los cinturones de seguridad enganchan y retraen correctamente?', esCritica: true },
    { id: 'neumaticos_camioneta', texto: '¿Los neumaticos (delanteros, traseros y repuesto) tienen buena huella y presion?', esCritica: true },
    { id: 'frenos_camioneta', texto: '¿El pedal de freno y el freno de mano retienen el vehiculo adecuadamente?', esCritica: true },
    { id: 'kit_emergencia_cam', texto: '¿Cuenta con extintor vigente, botiquin y triangulos reflectantes?', esCritica: true },
    { id: 'herramientas_cam', texto: '¿Lleva gata hidraulica, llave de rueda y cunas de seguridad?', esCritica: true },
    { id: 'carroceria_puertas', texto: '¿Las puertas cierran bien y la carroceria (con barra antivuelco si aplica) es segura?', esCritica: true }
  ]
};

const base64ToFile = (base64String: string | null | undefined, filename: string): File | null => {
  if (!base64String || typeof base64String !== 'string' || !base64String.includes(',')) {
    return null;
  }
  try {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.error('Error convirtiendo imagen base64:', err);
    return null;
  }
};

const crearPreviewImagen = (file: File, callback: (preview: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    if (!result) return;

    const img = new Image();
    img.onload = () => {
      const MAX_DIM = 1024;
      let w = img.width;
      let h = img.height;

      if (w > MAX_DIM || h > MAX_DIM) {
        if (w > h) {
          h = Math.round((h * MAX_DIM) / w);
          w = MAX_DIM;
        } else {
          w = Math.round((w * MAX_DIM) / h);
          h = MAX_DIM;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          callback(canvas.toDataURL('image/jpeg', 0.7));
          return;
        }
      }
      callback(result);
    };
    img.onerror = () => callback(result);
    img.src = result;
  };
  reader.readAsDataURL(file);
};

export default function VistaConductor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const patenteValida = id ? id.toUpperCase() : '';
  const storageKey = `checklist_cache_${patenteValida}`;

  const [identificado, setIdentificado] = useState<boolean>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).identificado || false : false;
    } catch {
      return false;
    }
  });

  const [modoAcceso, setModoAcceso] = useState<ModoAccesoQR>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      if (cache && JSON.parse(cache).identificado) return 'conductor';
      return 'seleccion';
    } catch {
      return 'seleccion';
    }
  });

  // Estado para vista de Fiscalizador
  const [ultimoReporte, setUltimoReporte] = useState<any>(null);
  const [cargandoUltimoReporte, setCargandoUltimoReporte] = useState<boolean>(false);

  // Paso 2: Checklist primero
  const [checklistCompletado, setChecklistCompletado] = useState(false);
  const [datosChecklistPendiente, setDatosChecklistPendiente] = useState<any>(null);

  // Paso 3: Juegos PVT al final
  const [parejaTests, setParejaTests] = useState<[TipoTestPVT, TipoTestPVT]>(['seguimiento', 'reaccion']);
  const [testActualIndice, setTestActualIndice] = useState<number>(0);
  const [fasePVTCompletada, setFasePVTCompletada] = useState(false);
  const [mostrarPantallaPuntajePVT, setMostrarPantallaPuntajePVT] = useState(false);
  const [datosTests, setDatosTests] = useState<any[]>([]);
  const [puntajeGlobalPVT, setPuntajeGlobalPVT] = useState<number>(100);

  const [ubicacionGPS, setUbicacionGPS] = useState<any>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).ubicacionGPS || null : null;
    } catch {
      return null;
    }
  });

  const [nombreConductor, setNombreConductor] = useState<string>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).nombreConductor || '' : '';
    } catch {
      return '';
    }
  });

  const [rutConductor, setRutConductor] = useState<string>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).rutConductor || '' : '';
    } catch {
      return '';
    }
  });

  const [fotoLicenciaPreview, setFotoLicenciaPreview] = useState<string | null>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).fotoLicenciaPreview || null : null;
    } catch {
      return null;
    }
  });
  const [fotoLicencia, setFotoLicencia] = useState<File | null>(null);
  const [vencimientoLicencia, setVencimientoLicencia] = useState<string>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).vencimientoLicencia || '' : '';
    } catch {
      return '';
    }
  });

  const [encuestaCompletada, setEncuestaCompletada] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState<MotivoBloqueo>(null);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [jornadaFinalizada, setJornadaFinalizada] = useState(false);

  const [kilometrajeActual, setKilometrajeActual] = useState<number | null>(null);
  const [kilometrajeAnterior, setKilometrajeAnterior] = useState<number>(0);
  const [kilometraje, setKilometraje] = useState<string>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).kilometraje || '' : '';
    } catch {
      return '';
    }
  });

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [respuestasChecklist, setRespuestasChecklist] = useState<Record<string, string>>(() => {
    try {
      const cache = sessionStorage.getItem(storageKey);
      return cache ? JSON.parse(cache).respuestasChecklist || {} : {};
    } catch {
      return {};
    }
  });

  const [subiendo, setSubiendo] = useState(false);
  const [guardandoFinal, setGuardandoFinal] = useState(false);
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [vehiculoIdDoc, setVehiculoIdDoc] = useState<string | null>(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tieneFirma, setTieneFirma] = useState(false);

  const [preguntasPrevencionRemotas, setPreguntasPrevencionRemotas] = useState<any[]>([]);

  useEffect(() => {
    const qPrev = query(collection(db, 'preguntas_prevencion'), where('activa', '==', true));
    const unsub = onSnapshot(qPrev, (snap) => {
      const docsOrdenados = snap.docs
        .map(d => ({
          id: `prev_${d.id}`,
          texto: d.data().texto,
          esCritica: true,
          origen: 'prevencion',
          creadoEn: d.data().creadoEn?.toMillis?.() || 0
        }))
        .sort((a, b) => a.creadoEn - b.creadoEn);

      setPreguntasPrevencionRemotas(docsOrdenados);
    }, (err) => console.error("Error cargando preguntas de prevencion:", err));

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!patenteValida) return;
    try {
      const datosCache = {
        identificado,
        nombreConductor,
        rutConductor,
        vencimientoLicencia,
        fotoLicenciaPreview,
        kilometraje,
        respuestasChecklist,
        ubicacionGPS
      };
      sessionStorage.setItem(storageKey, JSON.stringify(datosCache));
    } catch (err) {
      console.warn("No se pudo escribir en sessionStorage:", err);
    }
  }, [
    identificado,
    nombreConductor,
    rutConductor,
    vencimientoLicencia,
    fotoLicenciaPreview,
    kilometraje,
    respuestasChecklist,
    ubicacionGPS,
    patenteValida,
    storageKey
  ]);

  useEffect(() => {
    const cargarVehiculo = async () => {
      if (!patenteValida) {
        setCargandoVehiculo(false);
        return;
      }
      try {
        const qVehiculo = query(collection(db, 'vehiculos'), where('patente', '==', patenteValida));
        const snapVehiculo = await getDocs(qVehiculo);

        if (!snapVehiculo.empty) {
          const vData = snapVehiculo.docs[0].data();
          setVehiculo(vData);
          setVehiculoIdDoc(snapVehiculo.docs[0].id);

          const kmRealAnterior = Number(vData.kilometrajeActual) || 0;
          setKilometrajeAnterior(kmRealAnterior);

          setKilometraje((prev: string) => prev ? prev : (kmRealAnterior > 0 ? kmRealAnterior.toString() : ''));
        } else {
          console.warn(`No se encontro vehiculo con patente ${patenteValida}`);
        }
      } catch (error) {
        console.error("Error al cargar vehiculo desde Firebase:", error);
      } finally {
        setCargandoVehiculo(false);
      }
    };
    cargarVehiculo();
  }, [patenteValida]);

  const abrirVistaFiscalizador = async () => {
    setModoAcceso('fiscalizador');
    if (!patenteValida) return;

    setCargandoUltimoReporte(true);
    try {
      const qReportes = query(collection(db, 'reportes'), where('vehiculoId', '==', patenteValida));
      const snap = await getDocs(qReportes);
      if (!snap.empty) {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a: any, b: any) => {
          const tA = a.fecha?.toMillis?.() || 0;
          const tB = b.fecha?.toMillis?.() || 0;
          return tB - tA;
        });
        setUltimoReporte(lista[0]);
      } else {
        setUltimoReporte(null);
      }
    } catch (error) {
      console.error('Error al cargar ultimo reporte para fiscalizador:', error);
    } finally {
      setCargandoUltimoReporte(false);
    }
  };

  useEffect(() => {
    if (encuestaCompletada) {
      const timer = setTimeout(() => {
        setMostrarResumen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [encuestaCompletada]);

  const seleccionarParejaAleatoria = (): [TipoTestPVT, TipoTestPVT] => {
    const catalogo: TipoTestPVT[] = ['reaccion', 'seguimiento', 'memoria'];
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

  const capturarFotoTablero = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFotoFile(file);
      crearPreviewImagen(file, (url) => setFotoPreview(url));
    }
  };

  const forzarDescarga = async (url: string, nombreArchivo: string) => {
    if (!url) return;
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    if (esIOS) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error de red al descargar');
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = urlBlob;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(urlBlob);
        document.body.removeChild(a);
      }, 200);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

    if (diasRestantes < 0) return { texto: `Vencio hace ${Math.abs(diasRestantes)}d`, clase: 'bg-red-100/70 text-red-700 border-red-300' };
    if (diasRestantes === 0) return { texto: 'Vence hoy', clase: 'bg-red-100/70 text-red-700 border-red-300' };
    if (diasRestantes <= 15) return { texto: `Vence en ${diasRestantes}d`, clase: 'bg-orange-100/70 text-orange-700 border-orange-300' };
    return { texto: `Al dia (${diasRestantes}d)`, clase: 'bg-green-100/70 text-green-700 border-green-300' };
  };

  let tipoActual = vehiculo?.tipo || 'Camioneta';
  if (tipoActual === 'Semi remolque') tipoActual = 'Semirremolque';
  const preguntasVehiculoBase = preguntasBasePorTipo[tipoActual as keyof typeof preguntasBasePorTipo] || preguntasBasePorTipo['Camioneta'];

  const preguntasDinamicas = [...preguntasPrevencionRemotas, ...preguntasVehiculoBase];

  const manejarEnvioChecklist = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!fotoFile && !kilometraje) {
      alert("Es obligatorio ingresar el kilometraje escrito o subir una foto del tablero.");
      return;
    }

    if (!tieneFirma) {
      alert("La firma del conductor es obligatoria para continuar.");
      return;
    }

    if (kilometraje) {
      const kmNuevo = Number(kilometraje);
      if (kmNuevo < kilometrajeAnterior) {
        alert(`Error: El kilometraje ingresado (${kmNuevo} km) no puede ser menor al ultimo registro exacto (${kilometrajeAnterior} km).`);
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
      const resp = String(respuestasChecklist[p.id] || '').toLowerCase().trim();
      if (resp === 'no') {
        tieneFallaCritica = true;
      }
    });

    try {
      let fotoUrl = null;
      let fotoPath = null;
      const archivoTablero = fotoPreview ? base64ToFile(fotoPreview, `tablero_${patenteValida}.jpg`) : fotoFile;
      if (archivoTablero) {
        fotoPath = `kilometrajes/${patenteValida}-${Date.now()}-${archivoTablero.name}`;
        const storageRef = ref(storage, fotoPath);
        await uploadBytes(storageRef, archivoTablero);
        fotoUrl = await getDownloadURL(storageRef);
      }

      let licenciaUrl = null;
      let licenciaPath = null;
      const archivoLicencia = fotoLicenciaPreview ? base64ToFile(fotoLicenciaPreview, `licencia_${patenteValida}.jpg`) : fotoLicencia;
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

      setDatosChecklistPendiente({
        kilometraje: kilometraje || "No ingresado",
        fotoUrl,
        fotoPath,
        licenciaUrl,
        licenciaPath,
        vencimientoLicencia,
        firmaUrl,
        firmaPath,
        tieneFallaCritica,
        respuestas: { ...respuestasChecklist }
      });

      const parejaElegida = seleccionarParejaAleatoria();
      setParejaTests(parejaElegida);
      setTestActualIndice(0);
      setDatosTests([]);
      setFasePVTCompletada(false);
      setMostrarPantallaPuntajePVT(false);
      setChecklistCompletado(true);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al subir las evidencias del checklist. Verifica tu conexion a internet.");
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

  const procesarResultadoTestGenerico = async (resultado: any) => {
    const nuevosTests = [...datosTests, resultado];
    setDatosTests(nuevosTests);
    const notaCalculada = calcularNotaGlobal(nuevosTests);
    setPuntajeGlobalPVT(notaCalculada);

    if (testActualIndice === 0) {
      setTestActualIndice(1);
      return;
    }

    setGuardandoFinal(true);

    const falloChecklist = Boolean(datosChecklistPendiente?.tieneFallaCritica);
    const falloPVT = notaCalculada < 60 || nuevosTests.some((t) => t.aprobado === false);

    let motivoFinal: MotivoBloqueo = null;
    if (falloChecklist && falloPVT) {
      motivoFinal = 'ambos';
    } else if (falloChecklist) {
      motivoFinal = 'checklist';
    } else if (falloPVT) {
      motivoFinal = 'pvt';
    }

    try {
      await addDoc(collection(db, 'reportes'), {
        vehiculoId: patenteValida,
        tipoVehiculo: tipoActual,
        conductorNombre: nombreConductor,
        conductorRut: rutConductor,
        kilometraje: datosChecklistPendiente?.kilometraje || kilometraje || "No ingresado",
        fotoUrl: datosChecklistPendiente?.fotoUrl || null,
        fotoPath: datosChecklistPendiente?.fotoPath || null,
        licenciaUrl: datosChecklistPendiente?.licenciaUrl || null,
        licenciaPath: datosChecklistPendiente?.licenciaPath || null,
        vencimientoLicencia: datosChecklistPendiente?.vencimientoLicencia || vencimientoLicencia || null,
        licenciaInternaUrl: null,
        licenciaInternaPath: null,
        licenciaInternaTraseraUrl: null,
        licenciaInternaTraseraPath: null,
        firmaUrl: datosChecklistPendiente?.firmaUrl || null,
        firmaPath: datosChecklistPendiente?.firmaPath || null,
        fallaCritica: falloChecklist,
        bloqueoPorTestCognitivo: falloPVT,
        motivoBloqueo: motivoFinal,
        testDrogasNotificado: false,
        respuestas: datosChecklistPendiente?.respuestas || respuestasChecklist,
        testsCognitivos: nuevosTests,
        puntajePVT: notaCalculada,
        ubicacion: ubicacionGPS || null,
        fecha: serverTimestamp()
      });

      if (motivoFinal === 'ambos') {
        await registrarEnHistorial(
          'BLOQUEO_AMBOS',
          `Vehiculo ${patenteValida} bloqueado por fallas en checklist y baja aptitud PVT (${notaCalculada}%). Conductor: ${nombreConductor}`
        );
      } else if (motivoFinal === 'checklist') {
        await registrarEnHistorial(
          'BLOQUEO_CHECKLIST',
          `Vehiculo ${patenteValida} bloqueado por fallas criticas en checklist. PVT: ${notaCalculada}%. Conductor: ${nombreConductor}`
        );
      } else if (motivoFinal === 'pvt') {
        await registrarEnHistorial(
          'BLOQUEO_PVT',
          `Conductor ${nombreConductor} (${rutConductor}) bloqueado por baja aptitud psicomotora PVT (${notaCalculada}%) en vehiculo ${patenteValida}`
        );
      } else {
        await registrarEnHistorial(
          'CHECKLIST_COMPLETADO',
          `Vehiculo ${patenteValida} operativo. PVT: ${notaCalculada}%. Conductor: ${nombreConductor}`
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

        const borrarArchivoSilencioso = async (ruta?: string | null) => {
          if (!ruta) return;
          try {
            await deleteObject(ref(storage, ruta));
          } catch {
            // Ignorar archivos eliminados previamente
          }
        };

        const toDelete = reportsArray.slice(0, reportsArray.length - 5);
        for (const item of toDelete) {
          const data = item.data;
          await borrarArchivoSilencioso(data.fotoPath);
          await borrarArchivoSilencioso(data.firmaPath);
          await borrarArchivoSilencioso(data.licenciaPath);
          await borrarArchivoSilencioso(data.licenciaInternaPath);
          await borrarArchivoSilencioso(data.licenciaInternaTraseraPath);
          await deleteDoc(item.ref).catch((err) => console.warn('No se pudo borrar reporte antiguo:', err));
        }
      }

      sessionStorage.removeItem(storageKey);
      setFotoLicenciaPreview(null);
      setFotoLicencia(null);

      setMotivoBloqueo(motivoFinal);
      setFasePVTCompletada(true);
      setMostrarPantallaPuntajePVT(true);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar el reporte final. Verifica tu conexion a internet.");
    } finally {
      setGuardandoFinal(false);
    }
  };

  const renderComponenteTest = (tipo: TipoTestPVT) => {
    switch (tipo) {
      case 'reaccion':
        return <TestCognitivo onFinalizado={procesarResultadoTestGenerico} />;
      case 'seguimiento':
        return <TestSeguimiento onFinalizado={procesarResultadoTestGenerico} />;
      case 'memoria':
        return <TestMemoriaSecuencia onFinalizado={procesarResultadoTestGenerico} />;
      default:
        return <TestCognitivo onFinalizado={procesarResultadoTestGenerico} />;
    }
  };

  const handleValidarContinuarIdentificacion = async () => {
    if (!rutConductor.trim()) {
      alert("Por favor ingrese su RUT antes de continuar.");
      return;
    }

    setChecklistCompletado(false);
    setDatosChecklistPendiente(null);
    setFasePVTCompletada(false);
    setMostrarPantallaPuntajePVT(false);
    setDatosTests([]);
    setTestActualIndice(0);
    setBloqueado(false);
    setMotivoBloqueo(null);
    setIdentificado(true);
  };

  const handleContinuarDesdePuntajePVT = () => {
    setMostrarPantallaPuntajePVT(false);
    if (motivoBloqueo !== null) {
      setBloqueado(true);
    } else {
      setEncuestaCompletada(true);
    }
  };

  const handleRehacerChecklist = () => {
    setRespuestasChecklist({});
    setFotoPreview(null);
    setFotoFile(null);
    setFotoLicenciaPreview(null);
    setFotoLicencia(null);
    setTieneFirma(false);
    setChecklistCompletado(false);
    setDatosChecklistPendiente(null);
    setFasePVTCompletada(false);
    setMostrarPantallaPuntajePVT(false);
    setDatosTests([]);
    setTestActualIndice(0);
    setBloqueado(false);
    setMotivoBloqueo(null);
    setEncuestaCompletada(false);
    setMostrarResumen(false);
  };

  const pvtAprobado = motivoBloqueo !== 'pvt' && motivoBloqueo !== 'ambos';

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center p-4 md:p-6 relative" style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}>
      {/* 0. Selector Inicial al Escanear QR */}
      {modoAcceso === 'seleccion' && (
        <div className="bg-white/80 backdrop-blur-md p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/60 animate-fade-in relative z-10 space-y-6">
          <div className="text-center">
            <span className="bg-blue-100 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm">
              Control de Flota
            </span>
            <h1 className="text-2xl font-black text-slate-800 mt-3">Seleccione Perfil de Acceso</h1>
            <p className="text-sm text-slate-600 mt-1 font-mono font-bold tracking-wider">
              Patente: {patenteValida}
            </p>
          </div>

          <div className="space-y-3">
            {/* Fiscalizador */}
            <button
              type="button"
              onClick={abrirVistaFiscalizador}
              className="w-full p-4 bg-white/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-all flex items-center justify-between text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800 group-hover:text-indigo-700">Fiscalizador</div>
                  <div className="text-xs text-slate-500 font-medium">Ver documentos del vehículo y licencia del conductor</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Conductor */}
            <button
              type="button"
              onClick={() => setModoAcceso('conductor')}
              className="w-full p-4 bg-white/90 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl shadow-sm transition-all flex items-center justify-between text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800 group-hover:text-blue-700">Conductor</div>
                  <div className="text-xs text-slate-500 font-medium">Identificación, checklist diario y evaluación PVT</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Taller */}
            <button
              type="button"
              onClick={() => navigate('/login?destino=taller')}
              className="w-full p-4 bg-white/90 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-2xl shadow-sm transition-all flex items-center justify-between text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800 group-hover:text-amber-700">Taller</div>
                  <div className="text-xs text-slate-500 font-medium">Iniciar sesión para acceder al panel de taller</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Admin */}
            <button
              type="button"
              onClick={() => navigate('/login?destino=admin')}
              className="w-full p-4 bg-white/90 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-2xl shadow-sm transition-all flex items-center justify-between text-left group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800">Admin</div>
                  <div className="text-xs text-slate-500 font-medium">Iniciar sesión para acceder al panel administrativo</div>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Vista de Fiscalizador (Solo Lectura) */}
      {modoAcceso === 'fiscalizador' && (
        <VistaFiscalizador
          idPatente={patenteValida}
          vehiculo={vehiculo}
          ultimoReporte={ultimoReporte}
          cargandoReporte={cargandoUltimoReporte}
          forzarDescarga={forzarDescarga}
          calcularEstadoVencimiento={calcularEstadoVencimiento}
          onVolverMenu={() => setModoAcceso('seleccion')}
        />
      )}

      {/* Flujo de Conductor */}
      {modoAcceso === 'conductor' && (
        <>
          {/* 1. Identificacion */}
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
              vencimientoLicencia={vencimientoLicencia}
              setVencimientoLicencia={setVencimientoLicencia}
              ubicacionGPS={ubicacionGPS}
              setUbicacionGPS={setUbicacionGPS}
              vehiculo={vehiculo}
              forzarDescarga={forzarDescarga}
              calcularEstadoVencimiento={calcularEstadoVencimiento}
              onContinuar={handleValidarContinuarIdentificacion}
              onVolverMenu={() => setModoAcceso('seleccion')}
            />
          )}

          {/* 2. Formulario de Checklist (Primero) */}
          {identificado && !checklistCompletado && !encuestaCompletada && !bloqueado && (
            <div className="w-full max-w-2xl space-y-4">
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

          {/* 3. Pruebas Psicomotoras Aleatorias PVT (Despues del Checklist) */}
          {identificado && checklistCompletado && !fasePVTCompletada && !guardandoFinal && !bloqueado && (
            <div className="w-full flex flex-col items-center">
              <div className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-700 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
                Bateria Psicomotora: Prueba {testActualIndice + 1} de 2
              </div>
              {renderComponenteTest(parejaTests[testActualIndice])}
            </div>
          )}

          {/* Guardando reporte final */}
          {guardandoFinal && (
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md border border-white/60 animate-fade-in w-full relative z-10 text-center">
              <h2 className="text-xl font-black text-slate-800">Procesando Evaluacion Integral</h2>
              <p className="mt-2 text-sm text-slate-600 font-medium">Consolidando resultados de checklist y pruebas PVT...</p>
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
              </div>
            </div>
          )}

          {/* 4. Tarjeta de Puntaje de Pruebas Psicomotoras */}
          {identificado && checklistCompletado && fasePVTCompletada && mostrarPantallaPuntajePVT && !bloqueado && (
            <div className="bg-white/85 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md w-full border border-white/60 animate-fade-in relative z-10 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ${pvtAprobado ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {pvtAprobado ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  )}
                </svg>
              </div>
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full shadow-sm ${pvtAprobado ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'}`}>
                {pvtAprobado ? 'Pruebas Completadas' : 'Alerta de Fatiga / Vigilia'}
              </span>
              <h2 className="text-2xl font-black text-slate-800 mt-2">Aptitud Psicomotora</h2>

              <div className="bg-white/90 rounded-2xl p-4 my-5 border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calificacion de Vigilia</div>
                <div className={`text-4xl font-black my-1 ${pvtAprobado ? 'text-blue-600' : 'text-rose-600'}`}>{puntajeGlobalPVT}%</div>
                <p className="text-xs text-slate-600 font-medium">
                  {pvtAprobado
                    ? 'Evaluacion psicomotora dentro de parametros operativos.'
                    : 'Puntaje bajo el umbral minimo de seguridad requerido.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinuarDesdePuntajePVT}
                className={`w-full text-white font-black py-4 rounded-2xl shadow-lg transition-all ${pvtAprobado ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                Ver Resultado de Habilitacion
              </button>
            </div>
          )}

          {/* 5. Pantalla Unificada de Bloqueo Final (Checklist, PVT o Ambos) */}
          {bloqueado && !mostrarResumen && motivoBloqueo !== null && (
            <div className="bg-white/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl max-w-md border-2 border-red-500/80 animate-fade-in w-full relative z-10 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <span className="bg-red-100 text-red-800 text-[11px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                {motivoBloqueo === 'ambos' && 'Bloqueo por Check-list y Prueba PVT'}
                {motivoBloqueo === 'checklist' && 'Bloqueo por Falla en Check-list'}
                {motivoBloqueo === 'pvt' && 'Bloqueo por Prueba Psicomotora PVT'}
              </span>

              <h1 className="text-2xl font-black text-red-700 mt-2">OPERACION BLOQUEADA</h1>

              <div className="mt-4 space-y-4">
                {motivoBloqueo === 'ambos' && (
                  <p className="text-slate-700 text-sm font-medium">
                    Se detectaron <strong>fallas criticas en el check-list del vehiculo</strong> y ademas tu <strong>evaluacion psicomotora PVT ({puntajeGlobalPVT}%)</strong> no alcanzo el minimo requerido. No puedes iniciar ruta.
                  </p>
                )}

                {motivoBloqueo === 'checklist' && (
                  <p className="text-slate-700 text-sm font-medium">
                    Se detectaron una o mas <strong>fallas criticas en el check-list de inspeccion y prevencion</strong>. Por normativa de seguridad, este vehiculo no puede iniciar ruta.
                  </p>
                )}

                {motivoBloqueo === 'pvt' && (
                  <p className="text-slate-700 text-sm font-medium">
                    Tu resultado en las <strong>pruebas psicomotoras PVT ({puntajeGlobalPVT}%)</strong> indica fatiga o falta de vigilia. Por seguridad operativa, no estas habilitado para conducir.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <div className={`p-3 rounded-2xl border ${motivoBloqueo === 'checklist' || motivoBloqueo === 'ambos' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    Check-list: {motivoBloqueo === 'checklist' || motivoBloqueo === 'ambos' ? 'Rechazado' : 'Aprobado'}
                  </div>
                  <div className={`p-3 rounded-2xl border ${motivoBloqueo === 'pvt' || motivoBloqueo === 'ambos' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    PVT: {puntajeGlobalPVT}% ({motivoBloqueo === 'pvt' || motivoBloqueo === 'ambos' ? 'Bloqueado' : 'Aprobado'})
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  {motivoBloqueo === 'pvt'
                    ? 'Dirigete al area de Prevencion de Riesgos y revisa tu resumen de jornada.'
                    : 'Debes coordinar la hora de ingreso al taller y revisar tu resumen antes de finalizar.'}
                </p>

                <button
                  type="button"
                  onClick={() => setMostrarResumen(true)}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-2xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {motivoBloqueo === 'pvt' ? 'Ir al Resumen de Jornada' : 'Agendar Hora en Taller y Ver Resumen'}
                </button>
              </div>
            </div>
          )}

          {/* 6. Enviando reporte habilitado */}
          {encuestaCompletada && !mostrarResumen && (
            <div className="bg-white/75 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md border-2 border-green-500/80 animate-fade-in w-full relative z-10 text-center">
              <h1 className="text-2xl font-black text-green-700">Reporte Enviado</h1>
              <p className="mt-2 text-slate-700 font-medium">Check-list y pruebas PVT aprobadas. Generando resumen...</p>
              <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              </div>
            </div>
          )}

          {/* 7. Resumen de Jornada */}
          {mostrarResumen && !jornadaFinalizada && (
            <ResumenConductor
              idPatente={patenteValida}
              nombreConductor={nombreConductor}
              rutConductor={rutConductor}
              bloqueado={bloqueado}
              motivoBloqueo={motivoBloqueo}
              puntajePVT={puntajeGlobalPVT}
              kilometrajeActual={kilometrajeActual}
              vehiculo={vehiculo}
              forzarDescarga={forzarDescarga}
              calcularEstadoVencimiento={calcularEstadoVencimiento}
              onRehacerChecklist={handleRehacerChecklist}
              onFinalizarJornada={() => {
                sessionStorage.removeItem(storageKey);
                setFotoLicenciaPreview(null);
                setFotoLicencia(null);
                setJornadaFinalizada(true);
              }}
            />
          )}

          {/* 8. Despedida */}
          {jornadaFinalizada && (
            <div className="bg-white/75 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-green-500 animate-fade-in relative z-10 border border-white/50 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100/90 text-green-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-800 mb-4">Muchas gracias, {nombreConductor}!</h1>
              <p className="text-slate-600 text-base leading-relaxed mb-8 font-medium">
                Tu reporte de checklist diario y evaluacion PVT han sido completados y guardados con exito.
              </p>
              <button onClick={() => { sessionStorage.removeItem(storageKey); window.location.reload(); }} className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
                Volver a escanear QR
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}