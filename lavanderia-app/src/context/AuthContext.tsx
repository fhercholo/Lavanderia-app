import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface AuthContextType {
  session: any;
  role: 'admin' | 'auditor' | null;
  loading: boolean;
  isAdmin: boolean;         // Este cambiará si simulas
  isAuditor: boolean;
  realRole: 'admin' | 'auditor' | null; // Nuevo: Para saber tu rol verdadero siempre
  isSimulating: boolean;    // Nuevo: Estado de simulación
  toggleSimulation: () => void; // Nuevo: Función para cambiar
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  role: null, 
  loading: true, 
  isAdmin: false, 
  isAuditor: false,
  realRole: null,
  isSimulating: false,
  toggleSimulation: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [realRole, setRealRole] = useState<'admin' | 'auditor' | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Sesión Inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // 2. Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          fetchRole(session.user.id);
      } else {
        setRealRole(null);
        setIsSimulating(false); // Reset al salir
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (data) setRealRole(data.role);
      else setRealRole('auditor'); 
    } catch (e) {
      console.error("Error cargando rol", e);
      setRealRole('auditor');
    } finally {
      setLoading(false);
    }
  };

  const toggleSimulation = () => {
      if (realRole === 'admin') {
          setIsSimulating(!isSimulating);
      }
  };

  // Lógica Maestra: Si simulas, tu rol efectivo baja a 'auditor'
  const effectiveRole = isSimulating ? 'auditor' : realRole;
  const isAdmin = effectiveRole === 'admin';
  const isAuditor = effectiveRole === 'auditor';

  return (
    <AuthContext.Provider value={{ 
      session, 
      role: effectiveRole, 
      realRole, 
      loading, 
      isAdmin, 
      isAuditor,
      isSimulating,
      toggleSimulation 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);