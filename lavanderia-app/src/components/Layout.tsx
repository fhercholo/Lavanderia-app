import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* 1. SIDEBAR PARA ESCRITORIO (Oculto en celular, Visible en PC) */}
      <div className="hidden md:flex w-72 flex-col h-full z-20 shadow-xl">
        <Sidebar /> 
      </div>

      {/* 2. SIDEBAR PARA MÓVIL (El menú deslizante) */}
      
      {/* Fondo oscuro (Overlay) - Cierra el menú si tocas afuera */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* El panel deslizante (LIMPIO: Sin botón X) */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white z-40 transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Pasamos la función para que al dar clic en un link, se cierre solo */}
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        
        {/* BARRA SUPERIOR (Solo móvil) */}
        <div className="md:hidden bg-white border-b border-slate-200 shadow-sm z-10">
           <button 
              onClick={() => setSidebarOpen(true)}
              className="w-full p-4 flex items-center gap-3 text-slate-700 active:bg-slate-50 transition-colors"
           >
              <Menu className="w-7 h-7" />
              <span className="font-bold text-lg">Menú Principal</span>
              
              <div className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                 Tocar para abrir
              </div>
           </button>
        </div>

        {/* Aquí se renderizan tus páginas */}
        <main className="flex-1 overflow-auto p-2 md:p-6 w-full max-w-[1600px] mx-auto scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}