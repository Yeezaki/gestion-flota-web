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

  if (cargando) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">Verificando accesos...</div>;
  if (!usuario) return <Navigate to="/login" />;
  
  if (rolPermitido && rolUsuario !== rolPermitido && rolUsuario !== 'admin') {
    if (rolUsuario === 'taller') return <Navigate to="/taller" />;
    if (rolUsuario === 'generador_qr') return <Navigate to="/panel-generador" />;
    if (rolUsuario === 'prevencion_riesgo') return <Navigate to="/prevencion" />;
    if (rolUsuario === 'torre_control') return <Navigate to="/torre-control" />;
    return <Navigate to="/admin" />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/v/:id" element={<VistaConductor />} />
        <Route path="/agendar/:id" element={<AgendarHora />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rutas con Protección de Roles */}
        <Route path="/admin" element={<RutaPrivada rolPermitido="admin"><DashboardAdmin /></RutaPrivada>} />
        <Route path="/taller" element={<RutaPrivada rolPermitido="taller"><DashboardTaller /></RutaPrivada>} />
        <Route path="/generador" element={<RutaPrivada rolPermitido="admin"><GeneradorQR /></RutaPrivada>} />
        <Route path="/panel-generador" element={<RutaPrivada rolPermitido="generador_qr"><DashboardGenerador /></RutaPrivada>} />
        
        {/* Nuevas Vistas Independientes */}
        <Route path="/prevencion" element={<RutaPrivada rolPermitido="prevencion_riesgo"><DashboardPrevencion /></RutaPrivada>} />
        <Route path="/torre-control" element={<RutaPrivada rolPermitido="torre_control"><DashboardTorreControl /></RutaPrivada>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;