import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Trash2, Plus, Tag, Save, Building2, Phone, MapPin, 
  Lock, User, ShieldCheck, Loader2, Camera, UploadCloud 
} from 'lucide-react';

export function CatalogsView() {
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false); // Estado para la carga
  
  // Pestañas: 'business', 'catalogs', 'security'
  const [mainTab, setMainTab] = useState<'business' | 'catalogs' | 'security'>('business'); 
  
  // --- ESTADO DATOS NEGOCIO ---
  const [businessData, setBusinessData] = useState({
    id: 0,
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '' // Campo para la URL del logo
  });

  // --- ESTADO CATÁLOGOS ---
  const [categories, setCategories] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [catTypeTab, setCatTypeTab] = useState<'income' | 'expense'>('income');

  // --- ESTADO SEGURIDAD ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchBusinessData();
    fetchCategories();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchBusinessData = async () => {
    const { data } = await supabase.from('business_settings').select('*').limit(1).single();
    if (data) setBusinessData(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    setCategories(data || []);
  };

  // --- FUNCIÓN PARA SUBIR LOGO ---
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingLogo(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Subir al Storage 'logos'
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obtener la URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // 3. Guardar la URL en la base de datos
      const { error: dbError } = await supabase
        .from('business_settings')
        .update({ logo_url: publicUrl })
        .eq('id', businessData.id);

      if (dbError) throw dbError;

      // 4. Actualizar estado local para ver el cambio inmediato
      setBusinessData(prev => ({ ...prev, logo_url: publicUrl }));
      alert('¡Logo actualizado con éxito!');

    } catch (error: any) {
      alert('Error subiendo logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // GUARDAR DATOS TEXTO
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('business_settings')
      .update({
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email
      })
      .eq('id', businessData.id);
    
    setLoading(false);
    if (error) alert('Error al guardar');
    else alert('Datos actualizados correctamente');
  };

  // GESTIÓN CATÁLOGOS
  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const { error } = await supabase.from('categories').insert([{ name: newItem.toUpperCase(), type: catTypeTab }]);
    if (!error) { setNewItem(''); fetchCategories(); }
  };

  const handleDeleteCat = async (id: number) => {
    if (!confirm('¿Borrar categoría?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  // CAMBIAR CONTRASEÑA
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      alert("¡Contraseña actualizada con éxito!");
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const currentCatList = categories.filter(c => c.type === catTypeTab);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tag className="text-blue-600"/> Configuración del Sistema
        </h2>
        <p className="text-slate-500">Administra la identidad, catálogos y seguridad.</p>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
        <button onClick={() => setMainTab('business')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab === 'business' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Building2 className="w-4 h-4"/> Datos del Negocio
        </button>
        <button onClick={() => setMainTab('catalogs')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab === 'catalogs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Tag className="w-4 h-4"/> Catálogos
        </button>
        <button onClick={() => setMainTab('security')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab === 'security' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ShieldCheck className="w-4 h-4"/> Seguridad
        </button>
      </div>

      {/* --- PESTAÑA 1: DATOS NEGOCIO (Aquí está el logo) --- */}
      {mainTab === 'business' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-3xl animate-in fade-in slide-in-from-left-4">
            <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-50 pb-2">Información Pública</h3>
            
            <div className="flex flex-col md:flex-row gap-8">
                
                {/* --- ÁREA DE LOGO --- */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative bg-slate-50 group hover:border-blue-400 transition-colors">
                        
                        {/* Mostrar Imagen o Icono */}
                        {businessData.logo_url ? (
                            <img src={businessData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="w-10 h-10 text-slate-300" />
                        )}
                        
                        {/* Capa oscura al pasar el mouse */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                           <UploadCloud className="text-white w-8 h-8"/>
                        </div>
                        
                        {/* Input real (Invisible pero funcional) */}
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                            disabled={uploadingLogo}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                    </div>
                    <p className="text-xs text-slate-400 font-medium text-center">
                        {uploadingLogo ? 'Subiendo...' : 'Click para cambiar Logo'}
                    </p>
                </div>

                {/* FORMULARIO */}
                <form onSubmit={handleSaveBusiness} className="space-y-6 flex-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Lavandería</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                            <input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.name} onChange={e => setBusinessData({...businessData, name: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Completa</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                            <input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                <input type="text" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.phone || ''} onChange={e => setBusinessData({...businessData, phone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.email || ''} onChange={e => setBusinessData({...businessData, email: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center gap-2">
                            <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar Información'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 2: CATÁLOGOS --- */}
      {mainTab === 'catalogs' && (
        <div className="animate-in fade-in slide-in-from-right-4">
             <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button onClick={() => setCatTypeTab('income')} className={`pb-3 px-4 font-medium transition-all ${catTypeTab === 'income' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Categorías de Ingresos</button>
                <button onClick={() => setCatTypeTab('expense')} className={`pb-3 px-4 font-medium transition-all ${catTypeTab === 'expense' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Categorías de Gastos</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 p-6 border-r border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700">Listado Actual</h3>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{currentCatList.length}</span>
                    </div>
                    <div className="h-80 overflow-y-auto space-y-2 pr-2">
                        {currentCatList.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition group">
                                <span className="font-medium text-slate-700">{item.name}</span>
                                <button onClick={() => handleDeleteCat(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="w-full md:w-80 p-6 bg-slate-50">
                    <h3 className="font-bold text-slate-700 mb-4">Agregar Nuevo</h3>
                    <form onSubmit={handleAddCat} className="space-y-4">
                        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ej. NUEVO CONCEPTO" className="w-full p-3 border border-slate-200 rounded-lg outline-none bg-white"/>
                        <button type="submit" disabled={!newItem.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4"/> Agregar
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 3: SEGURIDAD --- */}
      {mainTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-lg animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><User className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-lg text-slate-800">Perfil de Usuario</h3><p className="text-sm text-slate-500">{currentUser?.email}</p></div>
            </div>
            <h3 className="font-bold text-slate-700 mb-4">Cambiar Contraseña</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></div></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nueva Contraseña</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Repite la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></div></div>
                <div className="pt-4"><button type="submit" disabled={passLoading || !newPassword} className="w-full bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2">{passLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <ShieldCheck className="w-4 h-4" />} {passLoading ? 'Actualizando...' : 'Actualizar Contraseña'}</button></div>
            </form>
        </div>
      )}

    </div>
  );
}