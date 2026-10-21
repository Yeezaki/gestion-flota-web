import { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, where, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../../lib/firebase';
import { ResponsiveTable } from '../common/ResponsiveTable';

export default function TabUsuarios() {
  const [usuariosRegistrados, setUsuariosRegistrados] = useState<any[]>([]);
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<string | null>(null);
  const [formUsuario, setFormUsuario] = useState({ 
    email: '', password: '', rol: 'admin', nombreTaller: '', direccionTaller: '', ciudadTaller: '', especialidadTaller: 'Mecánica Integrada', limiteQR: 10,
    razonSocial: '', telefono: '', direccion: ''
  });
  const [creandoUsuario, setCreandoUsuario] = useState(false);

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

  const cargarUsuarios = async () => {
    try {
      const q = query(collection(db, 'usuarios'), where('proyecto', '==', 'flota_app'));
      const snap = await getDocs(q);
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsuariosRegistrados(users);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const limpiarFormUsuario = () => {
    setFormUsuario({ 
      email: '', password: '', rol: 'admin', nombreTaller: '', direccionTaller: '', ciudadTaller: '', especialidadTaller: 'Mecánica Integrada', limiteQR: 10, razonSocial: '', telefono: '', direccion: '' 
    });
    setEditandoUsuarioId(null);
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreandoUsuario(true);

    try {
      const datosUsuario: any = { 
        rol: formUsuario.rol, 
        proyecto: 'flota_app',
        razonSocial: formUsuario.razonSocial,
        telefono: formUsuario.telefono,
        direccion: formUsuario.direccion
      };

      if (formUsuario.rol === 'taller') {
        datosUsuario.nombreTaller = formUsuario.nombreTaller;
        datosUsuario.direccionTaller = formUsuario.direccionTaller;
        datosUsuario.ciudadTaller = formUsuario.ciudadTaller;
        datosUsuario.especialidadTaller = formUsuario.especialidadTaller;
      } else if (formUsuario.rol === 'generador_qr') {
        datosUsuario.limiteQR = Number(formUsuario.limiteQR);
      }

      if (editandoUsuarioId) {
        await updateDoc(doc(db, 'usuarios', editandoUsuarioId), datosUsuario);
        await logAccion('EDITAR_USUARIO', `Se actualizó el perfil de: ${formUsuario.email} (Rol: ${formUsuario.rol})`);
        alert("Usuario actualizado correctamente.");
      } else {
        if (formUsuario.password.length < 6) {
          alert("La contraseña debe tener al menos 6 caracteres.");
          setCreandoUsuario(false);
          return;
        }
        
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formUsuario.email, formUsuario.password);
        
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: formUsuario.email,
          ...datosUsuario,
          ...(formUsuario.rol === 'generador_qr' && { qrsCreados: 0 }),
          fechaCreacion: serverTimestamp()
        });

        await deleteApp(secondaryApp);
        await logAccion('CREAR_USUARIO', `Se creó el usuario: ${formUsuario.email} (Rol: ${formUsuario.rol})`);
        alert("Usuario creado exitosamente.");
      }
      limpiarFormUsuario();
      cargarUsuarios();
    } catch (error: any) {
      console.error(error);
      alert(`Error al guardar el usuario.`);
    } finally {
      setCreandoUsuario(false);
    }
  };

  const editarUsuario = (user: any) => {
    setFormUsuario({
      email: user.email,
      password: '',
      rol: user.rol || 'admin',
      nombreTaller: user.nombreTaller || '',
      direccionTaller: user.direccionTaller || user.ubicacionTaller || '',
      ciudadTaller: user.ciudadTaller || '',
      especialidadTaller: user.especialidadTaller || 'Mecánica Integrada',
      limiteQR: user.limiteQR || 10,
      razonSocial: user.razonSocial || user.nombreTaller || '',
      telefono: user.telefono || '',
      direccion: user.direccion || user.direccionTaller || user.ubicacionTaller || ''
    });
    setEditandoUsuarioId(user.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarUsuario = async (id: string, email: string) => {
    const confirmar = window.confirm("¿Eliminar el perfil de este usuario de la base de datos?");
    if (!confirmar) return;
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      await logAccion('ELIMINAR_USUARIO', `Se eliminó el usuario con correo: ${email}`);
      cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* Columna Izquierda: Formulario Crear / Editar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm xl:col-span-4 h-fit">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-base sm:text-lg font-black text-slate-800">
            {editandoUsuarioId ? 'Editar Perfil' : 'Crear Usuario'}
          </h2>
          <p className="text-xs text-slate-500">Gestiona los accesos al sistema.</p>
        </div>

        <form onSubmit={guardarUsuario} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              disabled={!!editandoUsuarioId} 
              value={formUsuario.email} 
              onChange={(e) => setFormUsuario({...formUsuario, email: e.target.value})} 
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100" 
              placeholder="usuario@empresa.com" 
            />
          </div>

          {!editandoUsuarioId && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña (Mínimo 6)</label>
              <input 
                type="password" 
                required 
                minLength={6} 
                value={formUsuario.password} 
                onChange={(e) => setFormUsuario({...formUsuario, password: e.target.value})} 
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="••••••••" 
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Rol</label>
            <select 
              value={formUsuario.rol} 
              onChange={(e) => setFormUsuario({...formUsuario, rol: e.target.value})} 
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white"
            >
              <option value="admin">Administrador General</option>
              <option value="prevencion_riesgo">Prevención de Riesgos</option>
              <option value="torre_control">Torre de Control</option>
              <option value="taller">Taller Externo Asociado</option>
              <option value="generador_qr">Generador de QRs (Restringido)</option>
            </select>
          </div>

          {formUsuario.rol === 'taller' && (
            <div className="space-y-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <input type="text" required placeholder="Nombre del Taller" value={formUsuario.nombreTaller} onChange={(e) => setFormUsuario({...formUsuario, nombreTaller: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs" />
              <input type="text" required placeholder="Especialidad (ej: Mecánica Integrada)" value={formUsuario.especialidadTaller} onChange={(e) => setFormUsuario({...formUsuario, especialidadTaller: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs" />
              <input type="text" required placeholder="Dirección Exacta" value={formUsuario.direccionTaller} onChange={(e) => setFormUsuario({...formUsuario, direccionTaller: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs" />
              <input type="text" required placeholder="Ciudad" value={formUsuario.ciudadTaller} onChange={(e) => setFormUsuario({...formUsuario, ciudadTaller: e.target.value})} className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs" />
            </div>
          )}

          {formUsuario.rol === 'generador_qr' && (
            <div className="space-y-3 p-3 bg-purple-50/60 rounded-xl border border-purple-100">
              <input type="text" required placeholder="Razón Social / Empresa" value={formUsuario.razonSocial} onChange={(e) => setFormUsuario({...formUsuario, razonSocial: e.target.value})} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs" />
              <input type="text" required placeholder="Teléfono de Contacto" value={formUsuario.telefono} onChange={(e) => setFormUsuario({...formUsuario, telefono: e.target.value})} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs" />
              <input type="text" required placeholder="Dirección / Sede" value={formUsuario.direccion} onChange={(e) => setFormUsuario({...formUsuario, direccion: e.target.value})} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs" />
              <select value={formUsuario.limiteQR} onChange={(e) => setFormUsuario({...formUsuario, limiteQR: Number(e.target.value)})} className="w-full p-2 bg-white border border-purple-200 rounded-lg text-xs font-bold">
                <option value={1}>Plan Básico (1 QR)</option>
                <option value={10}>Plan Intermedio (10 QRs)</option>
                <option value={20}>Plan Avanzado (20 QRs)</option>
                <option value={50}>Plan Corporativo (50 QRs)</option>
              </select>
            </div>
          )}

          {(formUsuario.rol === 'prevencion_riesgo' || formUsuario.rol === 'torre_control') && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input type="text" required placeholder="Nombre Completo del Operador" value={formUsuario.razonSocial} onChange={(e) => setFormUsuario({...formUsuario, razonSocial: e.target.value})} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs" />
              <input type="text" placeholder="Teléfono Institucional" value={formUsuario.telefono} onChange={(e) => setFormUsuario({...formUsuario, telefono: e.target.value})} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs" />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button 
              type="submit" 
              disabled={creandoUsuario} 
              className="flex-1 font-bold py-2.5 rounded-xl text-xs sm:text-sm bg-slate-800 hover:bg-slate-900 text-white transition-all shadow-sm"
            >
              {creandoUsuario ? 'Guardando...' : (editandoUsuarioId ? 'Guardar Cambios' : 'Crear Usuario')}
            </button>
            {editandoUsuarioId && (
              <button 
                type="button" 
                onClick={limpiarFormUsuario} 
                className="px-3 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Columna Derecha: Cuentas Registradas */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm xl:col-span-8 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-base sm:text-lg font-black text-slate-800">
            Cuentas Registradas ({usuariosRegistrados.length})
          </h2>
        </div>

        <ResponsiveTable minWidth="min-w-[650px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3">Correo (Auth)</th>
                <th className="p-3">Detalle Perfil</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosRegistrados.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-slate-400">Cargando usuarios...</td></tr>
              ) : (
                usuariosRegistrados.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-bold text-slate-800 block">{user.email}</span>
                      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded inline-block mt-1 ${
                        user.rol === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                        user.rol === 'taller' ? 'bg-blue-100 text-blue-700' :
                        user.rol === 'prevencion_riesgo' ? 'bg-amber-100 text-amber-800' :
                        user.rol === 'torre_control' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {user.rol === 'prevencion_riesgo' ? 'Prevención' : user.rol === 'torre_control' ? 'Torre de Control' : user.rol}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {user.rol === 'taller' ? (
                        <div>
                          <p className="font-bold text-blue-700">{user.nombreTaller || 'Sin nombre'}</p>
                          <p className="text-[11px] text-slate-500">{user.especialidadTaller} — {user.ciudadTaller || user.ubicacionTaller}</p>
                        </div>
                      ) : user.rol === 'generador_qr' ? (
                        <div>
                          <p className="font-bold text-purple-700">{user.razonSocial || 'Empresa No Definida'}</p>
                          <p className="text-[11px] text-slate-500">Plan: {user.limiteQR} QRs | Tel: {user.telefono || 'N/A'}</p>
                        </div>
                      ) : user.rol === 'prevencion_riesgo' || user.rol === 'torre_control' ? (
                        <div>
                          <p className="font-bold text-slate-800">{user.razonSocial || 'Operador Institucional'}</p>
                          <p className="text-[11px] text-slate-500">Tel: {user.telefono || 'N/A'}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Acceso Total Plataforma</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button 
                          onClick={() => editarUsuario(user)} 
                          className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => eliminarUsuario(user.id, user.email)} 
                          className="text-xs font-bold px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>

    </div>
  );
}