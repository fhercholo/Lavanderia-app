import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { LayoutDashboard, Upload, CalendarDays, Tag, FileText, LogOut, Store, Coins, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  // Ahora consumimos todo del contexto global
  const { isAdmin, realRole, isSimulating, toggleSimulation, session } = useAuth();
  const location = useLocation();
  
  const [businessName, setBusinessName] = useState('Lavandería');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const menuItems = [
    { path: '/', label: 'Panel Principal', icon: LayoutDashboard },
    { path: '/calendario', label: 'Operaciones', icon: CalendarDays },
    { path: '/reportes', label: 'Reportes', icon: FileText },
    { path: '/caja', label: 'Corte de Caja', icon: Coins },
    { path: '/importar', label: 'Importar CSV', icon: Upload },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('business_settings').select('name, logo_url').single();
      if (data) {
        setBusinessName(data.name || 'Lavandería');
        setLogoUrl(data.logo_url);
      }
    };
    fetchSettings();
  }, []);

  const initial = businessName.charAt(0).toUpperCase();

  return (
    <aside className={`w-full h-full border-r flex flex-col transition-all shadow-sm ${isSimulating ? 'bg-slate-50 border-orange-200' : 'bg-white border-slate-200'}`}>
      
      {/* HEADER */}
      <div className={`p-6 border-b flex flex-col items-center justify-center text-center ${isSimulating ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-50/50 border-slate-100'}`}>
        <div className="mb-4 relative group">
          {logoUrl ? (
             <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center p-2 overflow-hidden">
               <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
             </div>
          ) : (
             <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-lg shadow-blue-200 border-4 border-white">
               {initial}
             </div>
          )}
          
          {/* Indicador de Estado */}
          <div className={`absolute -bottom-2 -right-2 p-1.5 rounded-full border-2 border-white shadow-sm text-white ${isSimulating ? 'bg-orange-500' : 'bg-emerald-500'}`} title="Estado">
            {isSimulating ? <Eye className="w-3 h-3"/> : <Store className="w-3 h-3"/>}
          </div>
        </div>
        <h1 className="text-lg font-bold text-slate-800 leading-tight px-2 break-words w-full">
          {businessName}
        </h1>
        <p className={`text-[10px] font-bold tracking-widest uppercase mt-1 ${isSimulating ? 'text-orange-400' : 'text-slate-400'}`}>
          {isSimulating ? 'Modo Auditor (Simulado)' : 'Panel de Control'}
        </p>
      </div>
      
      {/* MENÚ */}
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group relative ${
                isActive 
                  ? (isSimulating ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-blue-600 text-white shadow-md shadow-blue-200')
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      {/* FOOTER */}
      <div className={`p-4 border-t space-y-2 ${isSimulating ? 'bg-orange-50/30 border-orange-100' : 'bg-slate-50/30 border-slate-100'}`}>
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sistema</p>
        
        {/* BOTÓN REAL DE SIMULACIÓN */}
        {realRole === 'admin' && (
            <button 
                onClick={toggleSimulation}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors font-bold text-xs border mb-2 ${
                    isSimulating 
                    ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {isSimulating ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                {isSimulating ? 'Salir de Simulación' : 'Ver como Auditor'}
            </button>
        )}

        <Link to="/configuracion" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${location.pathname === '/configuracion' ? 'bg-white shadow-sm text-slate-900 border border-slate-100' : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900'}`}>
            <Tag className="w-5 h-5 text-slate-400" /> Configuración
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border hover:border-red-100">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
        </button>
      </div>

      {/* --- FICHA DE USUARIO --- */}
      <div className={`p-4 border-t ${isSimulating ? 'border-orange-200 bg-orange-50' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3 p-1">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${isAdmin ? 'bg-purple-600' : 'bg-slate-500'}`}>
            {isAdmin ? 'ADM' : 'AUD'}
          </div>
          <div className="overflow-hidden w-full">
            <p className="text-xs font-bold text-slate-700 truncate">
                {isAdmin ? 'Administrador' : 'Auditor'}
                {isSimulating && <span className="ml-1 text-[9px] text-orange-600">(SIM)</span>}
            </p>
            <p className="text-[10px] text-slate-500 font-medium truncate" title={session?.user.email}>
                {session?.user.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}