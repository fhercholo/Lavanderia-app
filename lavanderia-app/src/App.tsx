import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase } from './supabase'; // Importamos supabase
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DataImporter } from './components/DataImporter';
import { CalendarView } from './components/CalendarView';
import { CatalogsView } from './components/CatalogsView';
import { ReportsView } from './components/ReportsView';
import { Login } from './components/Login'; // <--- Importamos Login

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Revisar si ya había sesión guardada al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios (login o logout) en tiempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Mientras carga, mostrar pantalla blanca o loader simple
  if (loading) return null;

  // --- EL GUARDIA DE SEGURIDAD ---
  // Si NO hay sesión, mostramos SOLO el Login
  if (!session) {
    return <Login />;
  }

  // Si SÍ hay sesión, mostramos la App completa
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen">
        {/* Botón temporal de Logout para probar (luego lo movemos al sidebar) */}
        <div className="fixed top-4 right-4 z-50 md:hidden">
            <button onClick={() => supabase.auth.signOut()} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Salir</button>
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendario" element={<CalendarView />} />
          <Route path="/reportes" element={<ReportsView />} />
          <Route path="/importar" element={<DataImporter />} />
          <Route path="/configuracion" element={<CatalogsView />} />
        </Routes>
      </main>
    </div>
  )
}

export default App