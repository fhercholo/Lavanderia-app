import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // <--- AGREGAMOS useNavigate
import { supabase } from './supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DataImporter } from './components/DataImporter';
import { CalendarView } from './components/CalendarView';
import { CatalogsView } from './components/CatalogsView';
import { ReportsView } from './components/ReportsView';
import { CashCountView } from './components/CashCountView'; 
import { Login } from './components/Login';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // <--- Hook para redirigir

  useEffect(() => {
    // 1. Revisar sesión al inicio
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // TRUCO: Si hay sesión al iniciar, forzar ir al Inicio (Dashboard)
      if (session) {
         navigate('/');
      }
    });

    // 2. Escuchar cambios de sesión (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      // Si acaba de iniciar sesión, forzar ir al Inicio
      if (event === 'SIGNED_IN') {
         navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // El array vacío asegura que esto corra solo al montar la app

  if (loading) return null;

  if (!session) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<CalendarView />} />
        <Route path="/reportes" element={<ReportsView />} />
        <Route path="/caja" element={<CashCountView />} /> 
        <Route path="/importar" element={<DataImporter />} />
        <Route path="/configuracion" element={<CatalogsView />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;