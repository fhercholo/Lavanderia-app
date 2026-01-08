import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DataImporter } from './components/DataImporter';
import { CalendarView } from './components/CalendarView';
import { CatalogsView } from './components/CatalogsView';
import { ReportsView } from './components/ReportsView';
import { CashCountView } from './components/CashCountView'; 
import { TransactionsView } from './components/TransactionsView'; // <--- NUEVO IMPORT
import { Login } from './components/Login';
import { useEffect } from 'react';

// Componente interno para manejar redirección limpia
function AppRoutes() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
     // Si hay sesión y estamos en login, ir a inicio
     if (session && window.location.pathname === '/login') {
         navigate('/');
     }
  }, [session]);

  if (!session) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<CalendarView />} />
        <Route path="/reportes" element={<ReportsView />} />
        <Route path="/caja" element={<CashCountView />} /> 
        <Route path="/importar" element={<DataImporter />} />
        <Route path="/configuracion" element={<CatalogsView />} />
        
        {/* NUEVA RUTA DE CONTROL */}
        <Route path="/control" element={<TransactionsView />} />
        
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;