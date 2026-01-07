import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { LayoutDashboard, Upload, CalendarDays, Tag, FileText, LogOut, Store, Coins } from 'lucide-react';

// Aceptamos una propiedad para cerrar el menú (opcional)
interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
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
        document.title = `${data.name} | Sistema de Gestión`;
      }
    };

    fetchSettings();

    const subscription = supabase
      .channel('business_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'business_settings' },
        (payload) => {
          if (payload.new) {
            if (payload.new.name) setBusinessName(payload.new.name);
            if (payload.new.logo_url) setLogoUrl(payload.new.logo_url);
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  const initial = businessName.charAt(0).toUpperCase();

  return (
    <aside className="w-full h-full bg-white border-r border-slate-200 flex flex-col transition-all shadow-sm">
      
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center text-center bg-slate-50/50">
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
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Negocio Activo">
            <Store className="w-3 h-3" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-slate-800 leading-tight px-2 break-words w-full">
          {businessName}
        </h1>
        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">
          Panel de Control
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
              onClick={onClose} // <--- AQUÍ ESTÁ LA MAGIA: Cierra el menú al dar clic
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              {item.label}
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* FOOTER */}
      <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/30">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sistema</p>
        <Link to="/configuracion" onClick={onClose} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${location.pathname === '/configuracion' ? 'bg-white shadow-sm text-slate-900 border border-slate-100' : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900'}`}>
            <Tag className="w-5 h-5 text-slate-400" /> Configuración
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border hover:border-red-100">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
        </button>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 bg-slate-100/50 p-2 rounded-lg border border-slate-100">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs shadow-sm">ADM</div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-700 truncate">Administrador</p>
            <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] text-emerald-600 font-medium">En línea</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}