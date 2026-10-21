import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LOGO_BASE64 } from '../constants';

const ETIQUETA_PROYECTO = 'flota_app';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const navigate = useNavigate();

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // 1. Verificacion con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        // 2. Comprobacion de perfil y rol en Firestore
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();

          if (data.proyecto && data.proyecto !== ETIQUETA_PROYECTO) {
            await signOut(auth);
            setError('Acceso denegado: Esta cuenta pertenece a otra plataforma.');
            setCargando(false);
            return;
          }

          const rol = (data.rol || '').toLowerCase().trim();

          if (rol === 'taller') {
            navigate('/taller');
          } else if (rol === 'generador_qr' || rol === 'generador') {
            navigate('/panel-generador');
          } else if (rol === 'prevencion' || rol === 'prevencion_riesgo') {
            navigate('/prevencion');
          } else if (rol === 'torre' || rol === 'torre_control') {
            navigate('/torre-control');
          } else {
            navigate('/admin');
          }
        } else {
          navigate('/admin');
        }
      } catch (firestoreErr) {
        console.error(firestoreErr);
        navigate('/admin');
      }
    } catch (err: any) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed bg-no-repeat flex items-center justify-center p-4 sm:p-6 relative"
      style={{ backgroundImage: "url('/fondo-conductor.jpg')" }}
    >
      {/* Capa de oscurecimiento y desenfoque de fondo */}
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-md"></div>

      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/60">
        
        {/* Cabecera institucional */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4">
            <img
              src={LOGO_BASE64 || '/logo.webp'}
              alt="Logo Institucional"
              className="h-14 sm:h-16 object-contain"
            />
          </div>
          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Plataforma Central
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            Control de Acceso
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
            Sistema Integrado de Gestión de Flota y Seguridad Vial
          </p>
        </div>

        {/* Mensaje de error estilizado */}
        {error && (
          <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs font-bold mb-6 animate-fade-in">
            <svg className="w-5 h-5 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={manejarLogin} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Correo Institucional
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder="usuario@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={mostrarPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {mostrarPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg active:scale-[0.98] ${
              cargando
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25'
            }`}
          >
            {cargando ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"></div>
                <span>Verificando Credenciales...</span>
              </div>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

        {/* Pie de seguridad */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Acceso auditado y registrado bajo protocolo de seguridad institucional.
          </p>
        </div>
      </div>
    </div>
  );
}