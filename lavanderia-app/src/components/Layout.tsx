import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* 1. SIDEBAR PARA ESCRITORIO (Visible solo en pantallas grandes md:flex) */}
      <div className="hidden md:flex w-72 flex-col h-full z-20">
        <Sidebar /> 
      </div>

      {/* 2. SIDEBAR PARA MÓVIL (Con fondo oscuro y animación) */}
      {/* Fondo oscuro (Overlay) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)} // Cierra al dar clic afuera
        />
      )}

      {/* El menú lateral móvil */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Pasamos la función onClose para que los links cierren el menú */}
        <Sidebar onClose={() => setSidebarOpen(false)} />
        
        {/* Botón X flotante para cerrar */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-[-3rem] p-2 bg-white rounded-full shadow-md text-slate-600 md:hidden"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        
        {/* Botón Hamburguesa (Solo móvil) */}
        <div className="md:hidden p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-95 transition"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="font-bold text-slate-800">Menú</span>
           </div>
           {/* Logo pequeño opcional */}
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">L</div>
        </div>

        {/* Aquí se renderizan tus páginas (Dashboard, Calendario, etc) */}
        <main className="flex-1 overflow-auto p-2 md:p-6 w-full max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}