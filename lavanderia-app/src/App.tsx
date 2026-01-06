import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Layout } from './components/Layout'; // <--- IMPORTANTE: Usamos Layout en vez de Sidebar
import { Dashboard } from './components/Dashboard';
import { DataImporter } from './components/DataImporter';
import { CalendarView } from './components/CalendarView';
import { CatalogsView } from './components/CatalogsView';
import { ReportsView } from './components/ReportsView';
import { Login } from './components/Login';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Revisar sesión al inicio
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios de sesión
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  // --- SI NO HAY SESIÓN ---
  if (!session) {
    return <Login />;
  }

  // --- SI HAY SESIÓN (APP PRINCIPAL) ---
  return (
    <Routes>
      {/* AQUÍ ESTÁ LA CLAVE: 
         Envolvemos todo en <Layout>. 
         Layout se encarga de mostrar el menú hamburguesa en móvil 
         y el Sidebar fijo en escritorio.
      */}
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendario" element={<CalendarView />} />
        <Route path="/reportes" element={<ReportsView />} />
        <Route path="/importar" element={<DataImporter />} />
        <Route path="/configuracion" element={<CatalogsView />} />
      </Route>

      {/* Si la ruta no existe, redirigir al Dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;