import { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, where, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db, auth, firebaseConfig } from '../../lib/firebase';

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
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuariosRegistrados(users);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const limpiarFormUsuario = () => {
    setFormUsuario({ email: '', password: '', rol: 'admin', nombreTaller: '', direccionTaller: '', ciudadTaller: '', especialidadTaller: 'Mecánica Integrada', limiteQR: 10, razonSocial: '', telefono: '', direccion: '' });
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
        // Usar app secundaria para no desloguear al admin actual
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
    const rolActual = user.rol === 'taller' ? 'taller' : user.rol === 'generador_qr' ? 'generador_qr' : 'admin';
    setFormUsuario({
      email: user.email,
      password: '',
      rol: rolActual,
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="bg-white rounded-3xl shadow-lg p-6 border border-slate-100 xl:col-span-1 h-fit">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800">{editandoUsuarioId ? 'Editar Perfil' : 'Crear Usuario'}</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona los accesos al sistema.</p>
        </div>
        <form onSubmit={guardarUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Correo Electronico</label>
            <input type="email" required disabled={!!editandoUsuarioId} value={formUsuario.email} onChange={(e) => setFormUsuario({...formUsuario, email: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500" placeholder="usuario@empresa.com" />
          </div>
          {!editandoUsuarioId && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Contrasena (Minimo 6 caracteres)</label>
              <input type="password" required minLength={6} value={formUsuario.password} onChange={(e) => setFormUsuario({...formUsuario, password: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Rol</label>
            <select value={formUsuario.rol} onChange={(e) => setFormUsuario({...formUsuario, rol: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="admin">Administrador General</option>
              <option value="taller">Taller Externo Asociado</option>
              <option value="generador_qr">Generador de QRs (Restringido)</option>
            </select>
          </div>
          
          {formUsuario.rol === 'taller' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Nombre del Taller</label>
                <input type="text" required value={formUsuario.nombreTaller} onChange={(e) => setFormUsuario({...formUsuario, nombreTaller: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: LubriLoa" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Especialidad</label>
                <input type="text" required value={formUsuario.especialidadTaller} onChange={(e) => setFormUsuario({...formUsuario, especialidadTaller: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: Mecánica Integrada, Pintura" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Dirección Exacta</label>
                <input type="text" required value={formUsuario.direccionTaller} onChange={(e) => setFormUsuario({...formUsuario, direccionTaller: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: Vicuña Mackenna 2945" />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Ciudad</label>
                <input type="text" required value={formUsuario.ciudadTaller} onChange={(e) => setFormUsuario({...formUsuario, ciudadTaller: e.target.value})} className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: Calama" />
              </div>
            </div>
          )}

          {formUsuario.rol === 'generador_qr' && (
            <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">Razón Social / Empresa</label>
                <input type="text" required value={formUsuario.razonSocial} onChange={(e) => setFormUsuario({...formUsuario, razonSocial: e.target.value})} className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white" placeholder="Ej: Transportes XYZ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">Teléfono de Contacto</label>
                <input type="text" required value={formUsuario.telefono} onChange={(e) => setFormUsuario({...formUsuario, telefono: e.target.value})} className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white" placeholder="Ej: +569 1234 5678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">Dirección / Sede</label>
                <input type="text" required value={formUsuario.direccion} onChange={(e) => setFormUsuario({...formUsuario, direccion: e.target.value})} className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white" placeholder="Ej: Parque Industrial, Sitio 4" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-800 mb-1">Plan contratado (Límite de QRs)</label>
                <select value={formUsuario.limiteQR} onChange={(e) => setFormUsuario({...formUsuario, limiteQR: Number(e.target.value)})} className="w-full p-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white">
                  <option value={1}>Plan Básico (1 QR máximo)</option>
                  <option value={10}>Plan Intermedio (10 QRs máximo)</option>
                  <option value={20}>Plan Avanzado (20 QRs máximo)</option>
                  <option value={50}>Plan Corporativo (50 QRs máximo)</option>
                </select>
                {editandoUsuarioId && (
                  <p className="text-xs text-purple-600 mt-2 italic">* Al actualizar el plan no se reiniciará la cantidad de QRs ya creados por el usuario.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={creandoUsuario} className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-md ${creandoUsuario ? 'bg-slate-400 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>
              {creandoUsuario ? 'Guardando...' : (editandoUsuarioId ? 'Guardar Cambios' : 'Crear Usuario')}
            </button>
            {editandoUsuarioId && (
              <button type="button" onClick={limpiarFormUsuario} className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-slate-100 xl:col-span-2">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">Cuentas Registradas</h2></div>

        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-bold">Correo (Auth)</th>
                <th className="p-4 font-bold">Detalle Perfil</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosRegistrados.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-slate-400">Cargando usuarios...</td></tr>) 
              : usuariosRegistrados.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <span className="font-bold text-slate-800">{user.email}</span>
                    <span className={`text-[10px] block mt-1 uppercase font-bold px-2 py-0.5 rounded inline-block ${
                      user.rol === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                      user.rol === 'taller' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.rol === 'taller' ? (
                      <div className="text-sm">
                        <p className="font-black text-blue-700">{user.nombreTaller || 'Sin nombre'}</p>
                        <p className="text-slate-500 font-medium text-xs">{user.especialidadTaller}</p>
                        <p className="text-slate-500 text-xs">{user.ciudadTaller ? `${user.direccionTaller}, ${user.ciudadTaller}` : user.ubicacionTaller}</p>
                      </div>
                    ) : user.rol === 'generador_qr' ? (
                      <div className="text-sm">
                        <p className="font-black text-purple-700">{user.razonSocial || 'Empresa No Definida'}</p>
                        <p className="text-slate-500 font-medium text-xs">Plan: {user.limiteQR} QRs | Dir: {user.direccion || 'N/A'}</p>
                        <p className="text-slate-500 font-medium text-xs">Tel: {user.telefono || 'N/A'}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Acceso Total</span>
                    )}
                  </td>
                  <td className="p-4 flex gap-2 justify-center mt-2">
                    <button onClick={() => editarUsuario(user)} className="text-xs font-bold px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">Editar</button>
                    <button onClick={() => eliminarUsuario(user.id, user.email)} className="text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Borrar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:hidden gap-4 p-4">
          {usuariosRegistrados.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 text-slate-400 text-center">Cargando usuarios...</div>
          ) : (
            usuariosRegistrados.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex justify-between items-start gap-3">
                  <span className="font-black text-slate-800 text-sm break-all">{user.email}</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full inline-block ${
                    user.rol === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                    user.rol === 'taller' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>{user.rol}</span>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  {user.rol === 'taller' ? (
                    <div>
                      <p className="font-black text-blue-700">{user.nombreTaller || 'Sin nombre'}</p>
                      <p className="text-slate-500 font-medium text-xs">{user.especialidadTaller}</p>
                      <p className="text-slate-500 text-xs">{user.ciudadTaller ? `${user.direccionTaller}, ${user.ciudadTaller}` : user.ubicacionTaller}</p>
                    </div>
                  ) : user.rol === 'generador_qr' ? (
                    <div>
                      <p className="font-black text-purple-700">{user.razonSocial || 'Empresa No Definida'}</p>
                      <p className="text-slate-500 font-medium text-xs">Plan: {user.limiteQR} QRs | Dir: {user.direccion || 'N/A'}</p>
                      <p className="text-slate-500 font-medium text-xs">Tel: {user.telefono || 'N/A'}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Acceso Total</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => editarUsuario(user)} className="w-full text-xs font-bold px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">Editar</button>
                  <button onClick={() => eliminarUsuario(user.id, user.email)} className="w-full text-xs font-bold px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">Borrar</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}