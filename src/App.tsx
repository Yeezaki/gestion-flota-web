import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import VistaConductor from './pages/VistaConductor';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardTaller from './pages/DashboardTaller';
import GeneradorQR from './pages/GeneradorQR';
import DashboardGenerador from './pages/DashboardGenerador';
import DashboardPrevencion from './pages/DashboardPrevencion';
import DashboardTorreControl from './pages/DashboardTorreControl';
import Login from './pages/Login';
import AgendarHora from './pages/AgendarHora';

function RutaPrivada({ children, rolPermitido }: { children: React.ReactNode, rolPermitido?: string }) {
  const [usuario, setUsuario] = useState<any>(null);
  const [rolUsuario, setRolUsuario] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuario(user);
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            setRolUsuario(userDoc.data().rol);
          } else {
            setRolUsuario('admin');
          }
        } catch (error) {
          console.error(error);
          setRolUsuario('admin'); 
        }
      } else {
        setUsuario(null);
        setRolUsuario(null);
      }
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">
        Verificando accesos...
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  const esAdminTotal = rolUsuario === 'admin';
  const esAdminReadOnly = rolUsuario === 'admin_readonly';
  const esAdminValido = esAdminTotal || esAdminReadOnly;

  if (rolPermitido) {
    // Si la ruta requiere 'admin', permitimos tanto al admin total como al de solo lectura
    const tieneAcceso = 
      rolUsuario === rolPermitido || 
      (rolPermitido === 'admin' && esAdminValido) || 
      esAdminTotal;

    if (!tieneAcceso) {
      if (rolUsuario === 'taller') return <Navigate to="/taller" replace />;
      if (rolUsuario === 'generador_qr' || rolUsuario === 'generador') return <Navigate to="/panel-generador" replace />;
      if (rolUsuario === 'prevencion_riesgo' || rolUsuario === 'prevencion') return <Navigate to="/prevencion" replace />;
      if (rolUsuario === 'torre_control' || rolUsuario === 'torre') return <Navigate to="/torre-control" replace />;
      if (esAdminValido) return <Navigate to="/admin" replace />;
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/v/:id" element={<VistaConductor />} />
        <Route path="/agendar/:id" element={<AgendarHora />} />
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<RutaPrivada rolPermitido="admin"><DashboardAdmin /></RutaPrivada>} />
        <Route path="/taller" element={<RutaPrivada rolPermitido="taller"><DashboardTaller /></RutaPrivada>} />
        <Route path="/generador" element={<RutaPrivada rolPermitido="admin"><GeneradorQR /></RutaPrivada>} />
        <Route path="/panel-generador" element={<RutaPrivada rolPermitido="generador_qr"><DashboardGenerador /></RutaPrivada>} />
        
        <Route path="/prevencion" element={<RutaPrivada rolPermitido="prevencion_riesgo"><DashboardPrevencion /></RutaPrivada>} />
        <Route path="/torre-control" element={<RutaPrivada rolPermitido="torre_control"><DashboardTorreControl /></RutaPrivada>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;