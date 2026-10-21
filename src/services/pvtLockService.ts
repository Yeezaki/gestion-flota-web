import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface BloqueoPVT {
  rut: string;
  nombreConductor?: string;
  patente?: string;
  nivelRiesgo: string;
  tiempoEsperaMinutos: number;
  bloqueadoHasta: number;
  fechaRegistro: number;
  motivo?: string;
}

export const TIEMPOS_ESPERA_PVT: Record<string, number> = {
  bajo: 0,
  medio: 15,
  "medio-alto": 45,
  medio_alto: 45,
  alto: 120
};

export const normalizarRut = (rut: string): string => {
  return rut.replace(/\./g, "").trim().toUpperCase();
};

export const verificarBloqueoPVT = async (rut: string): Promise<{
  bloqueado: boolean;
  minutosRestantes?: number;
  bloqueadoHasta?: number;
  nivelRiesgo?: string;
  datos?: BloqueoPVT;
}> => {
  if (!rut) return { bloqueado: false };
  const rutLimpio = normalizarRut(rut);
  const docRef = doc(db, "bloqueos_pvt", rutLimpio);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return { bloqueado: false };
  }

  const data = snap.data() as BloqueoPVT;
  const ahora = Date.now();

  if (ahora < data.bloqueadoHasta) {
    const minutosRestantes = Math.ceil((data.bloqueadoHasta - ahora) / (1000 * 60));
    return {
      bloqueado: true,
      minutosRestantes,
      bloqueadoHasta: data.bloqueadoHasta,
      nivelRiesgo: data.nivelRiesgo,
      datos: data
    };
  } else {
    await deleteDoc(docRef);
    return { bloqueado: false };
  }
};

export const registrarBloqueoPVT = async (
  rut: string,
  nivelRiesgo: string,
  nombreConductor: string = "",
  patente: string = ""
): Promise<{
  bloqueado: boolean;
  minutosRestantes: number;
  bloqueadoHasta: number;
}> => {
  const clave = nivelRiesgo.toLowerCase().trim();
  const minutos = TIEMPOS_ESPERA_PVT[clave] || 0;

  if (minutos <= 0) {
    return { bloqueado: false, minutosRestantes: 0, bloqueadoHasta: 0 };
  }

  const rutLimpio = normalizarRut(rut);
  const ahora = Date.now();
  const bloqueadoHasta = ahora + minutos * 60 * 1000;

  const docData: BloqueoPVT = {
    rut: rutLimpio,
    nombreConductor,
    patente,
    nivelRiesgo: clave,
    tiempoEsperaMinutos: minutos,
    bloqueadoHasta,
    fechaRegistro: ahora,
    motivo: `Reposo obligatorio por resultado de fatiga: ${clave.toUpperCase()}`
  };

  await setDoc(doc(db, "bloqueos_pvt", rutLimpio), docData);

  return {
    bloqueado: true,
    minutosRestantes: minutos,
    bloqueadoHasta
  };
};

export const obtenerBloqueosActivos = async (): Promise<BloqueoPVT[]> => {
  const ref = collection(db, "bloqueos_pvt");
  const ahora = Date.now();
  const q = query(ref, where("bloqueadoHasta", ">", ahora));
  const snapshot = await getDocs(q);

  const lista: BloqueoPVT[] = [];
  snapshot.forEach((d) => {
    lista.push(d.data() as BloqueoPVT);
  });

  return lista.sort((a, b) => a.bloqueadoHasta - b.bloqueadoHasta);
};

export const liberarBloqueoPVT = async (rut: string): Promise<void> => {
  const rutLimpio = normalizarRut(rut);
  await deleteDoc(doc(db, "bloqueos_pvt", rutLimpio));
};