import { useState } from 'react'; // <--- AQUÍ ESTABA EL CAMBIO
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      
      {/* --- BOTÓN DE MENÚ MÓVIL (Solo visible en cel) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <span className="font-bold text-lg text-blue-600">Tropalimpia</span>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SIDEBAR (Adaptable) --- */}
      {/* En móvil: es fijo y se desliza. En escritorio (md): es estático y siempre visible */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        mt-14 md:mt-0 /* Margen superior solo en móvil para no tapar el header */
      `}>
        <Sidebar />
      </div>

      {/* --- FONDO OSCURO (Overlay) --- */}
      {/* Solo aparece en móvil cuando el menú está abierto para cerrar al hacer clic fuera */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 overflow-auto w-full pt-16 md:pt-0 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}