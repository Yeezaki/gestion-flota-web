import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';

export interface Usuario {
  id?: string;
  razonSocial?: string;
  nombre?: string;
  rut?: string;
  email: string;
  direccion?: string;
  telefono?: string;
  proyecto?: string;
  rol: string;
  activo?: boolean;
  fechaCreacion?: any;
}

interface TabUsuariosProps {
  readOnly?: boolean;
}

const ETIQUETA_PROYECTO = 'flota_app';

export const TabUsuarios: React.FC<TabUsuariosProps> = ({ readOnly = false }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);

  const [formData, setFormData] = useState({
    razonSocial: '',
    rut: '',
    email: '',
    password: '',
    direccion: '',
    telefono: '',
    rol: 'admin_readonly',
    activo: true
  });

  const coleccionUsuarios = 'usuarios';

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, coleccionUsuarios));
      const lista: Usuario[] = [];
      snap.forEach((d) => {
        lista.push({ id: d.id, ...d.data() } as Usuario);
      });
      setUsuarios(lista);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleAbrirCrear = () => {
    if (readOnly) return;
    setUsuarioEditar(null);
    setFormData({
      razonSocial: '',
      rut: '',
      email: '',
      password: '',
      direccion: '',
      telefono: '',
      rol: 'admin_readonly',
      activo: true
    });
    setModalAbierto(true);
  };

  const handleAbrirEditar = (u: Usuario) => {
    if (readOnly) return;
    setUsuarioEditar(u);
    setFormData({
      razonSocial: u.razonSocial || u.nombre || '',
      rut: u.rut || '',
      email: u.email || '',
      password: '',
      direccion: u.direccion || '',
      telefono: u.telefono || '',
      rol: u.rol || 'conductor',
      activo: u.activo ?? true
    });
    setModalAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || guardando) return;

    setGuardando(true);

    try {
      if (usuarioEditar?.id) {
        const ref = doc(db, coleccionUsuarios, usuarioEditar.id);
        await updateDoc(ref, {
          razonSocial: formData.razonSocial,
          nombre: formData.razonSocial,
          rut: formData.rut,
          email: formData.email,
          direccion: formData.direccion,
          telefono: formData.telefono,
          rol: formData.rol,
          activo: formData.activo
        });
      } else {
        if (!formData.password || formData.password.length < 6) {
          alert('La contraseña debe tener al menos 6 caracteres.');
          setGuardando(false);
          return;
        }

        const secondaryApp = getApps().find((a) => a.name === 'SecondaryAuthAdmin') 
          || initializeApp(auth.app.options, 'SecondaryAuthAdmin');
        const secondaryAuthInstance = getAuth(secondaryApp);

        const cred = await createUserWithEmailAndPassword(
          secondaryAuthInstance,
          formData.email.trim(),
          formData.password
        );

        const nuevoUid = cred.user.uid;
        await secondarySignOut(secondaryAuthInstance);

        await setDoc(doc(db, coleccionUsuarios, nuevoUid), {
          razonSocial: formData.razonSocial,
          nombre: formData.razonSocial,
          rut: formData.rut,
          email: formData.email.trim(),
          direccion: formData.direccion,
          telefono: formData.telefono,
          rol: formData.rol,
          proyecto: ETIQUETA_PROYECTO,
          activo: formData.activo,
          fechaCreacion: serverTimestamp()
        });
      }

      setModalAbierto(false);
      cargarUsuarios();
    } catch (error: any) {
      console.error('Error al procesar el usuario:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('El correo electronico ya esta registrado en el sistema.');
      } else {
        alert('Error: ' + (error.message || 'No se pudo guardar el usuario'));
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id?: string) => {
    if (readOnly || !id) return;
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return;

    try {
      await deleteDoc(doc(db, coleccionUsuarios, id));
      cargarUsuarios();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    }
  };

  const renderBadgeRol = (rol: string) => {
    const rolNorm = (rol || '').toLowerCase().trim();

    if (rolNorm.includes('readonly') || rolNorm.includes('auditor')) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          ADMIN (SOLO LECTURA)
        </span>
      );
    }

    if (rolNorm === 'admin') {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
          ADMINISTRADOR
        </span>
      );
    }

    if (rolNorm.includes('taller')) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
          TALLER MECÁNICO
        </span>
      );
    }

    if (rolNorm.includes('prevencion')) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          PREVENCIÓN
        </span>
      );
    }

    if (rolNorm.includes('torre')) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
          TORRE DE CONTROL
        </span>
      );
    }

    if (rolNorm.includes('generador') || rolNorm.includes('qr')) {
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          GENERADOR QR
        </span>
      );
    }

    return (
      <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        CONDUCTOR
      </span>
    );
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Usuarios del Sistema
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Gestión de roles y accesos a la plataforma
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAbrirCrear}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            + Crear Usuario
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando usuarios...</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3">NOMBRE</th>
                <th className="py-3 px-3">RUT</th>
                <th className="py-3 px-3">EMAIL</th>
                <th className="py-3 px-3">ROL</th>
                <th className="py-3 px-3">ESTADO</th>
                {!readOnly && <th className="py-3 px-3 text-right">ACCIONES</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => {
                const nombreMostrar = u.razonSocial || u.nombre || '';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {nombreMostrar}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {u.rut || ''}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-600">
                      {u.email || ''}
                    </td>
                    <td className="py-3.5 px-3">
                      {renderBadgeRol(u.rol)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.activo !== false 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(u)}
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs mr-3 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(u.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold text-xs transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalAbierto && !readOnly && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-4">
              {usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre o Razón Social
                </label>
                <input
                  type="text"
                  required
                  value={formData.razonSocial}
                  onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ej: Transportes Ecopanta SpA o Carlos Pérez"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  RUT
                </label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="12.345.678-9"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  disabled={!!usuarioEditar}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="usuario@ecopanta.cl"
                />
              </div>

              {!usuarioEditar && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rol Asignado
                </label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white cursor-pointer font-bold text-slate-700"
                >
                  <option value="admin">Administrador (Control Total)</option>
                  <option value="admin_readonly">Admin Solo Lectura (Solo Ver / Auditor)</option>
                  <option value="prevencion">Prevención de Riesgos</option>
                  <option value="taller">Taller Mecánico</option>
                  <option value="torre_control">Torre de Control</option>
                  <option value="generador">Generador QR</option>
                  <option value="conductor">Conductor</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Faena / Ciudad"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activoCheck"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="activoCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Usuario Activo
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:bg-slate-400"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabUsuarios;