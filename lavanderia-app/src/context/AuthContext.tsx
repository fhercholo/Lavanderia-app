import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface AuthContextType {
  session: any;
  role: 'admin' | 'auditor' | null;
  loading: boolean;
  isAdmin: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  role: null, 
  loading: true, 
  isAdmin: false, 
  isAuditor: false 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'auditor' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    // 2. Escuchar cambios (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId: string) => {
    try {
      // Consultamos la tabla 'profiles'
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) setRole(data.role);
      else setRole('auditor'); // Por seguridad, default a auditor
    } catch (e) {
      console.error("Error cargando rol", e);
      setRole('auditor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      role, 
      loading, 
      isAdmin: role === 'admin', 
      isAuditor: role === 'auditor' 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);