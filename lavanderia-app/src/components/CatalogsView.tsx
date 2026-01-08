import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Trash2, Plus, Tag, Save, Building2, 
  Lock, User, ShieldCheck, Loader2, Camera, UploadCloud, Users, UserPlus, AlertCircle,
  MapPin, Phone, Mail, FileText, Globe, Pencil, Search, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function CatalogsView() {
  const { isAdmin, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [mainTab, setMainTab] = useState<'business' | 'catalogs' | 'security'>('business'); 
  
  // ESTADO NEGOCIO (VERSIÓN PRO RECUPERADA)
  const [businessData, setBusinessData] = useState({ 
      id: 0, 
      name: '', 
      address: '', 
      phone: '', 
      email: '', 
      rfc: '',        
      website: '',    
      logo_url: '' 
  });

  // ESTADO CATÁLOGOS (VERSIÓN MEJORADA)
  const [categories, setCategories] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [catTypeTab, setCatTypeTab] = useState<'income' | 'expense'>('income');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [isUpdatingHistory, setIsUpdatingHistory] = useState(false);

  // ESTADO SEGURIDAD
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    fetchBusinessData(); 
    fetchCategories(); 
    fetchCurrentUser();
    if (mainTab === 'security' && isAdmin) fetchUsersList();
  }, [mainTab, isAdmin]);

  const fetchCurrentUser = async () => { const { data } = await supabase.auth.getUser(); setCurrentUser(data.user); };
  
  const fetchBusinessData = async () => { 
      const { data } = await supabase.from('business_settings').select('*').single(); 
      if (data) setBusinessData(data); 
  };
  
  const fetchCategories = async () => { const { data } = await supabase.from('categories').select('*').order('name'); setCategories(data || []); };

  // --- LÓGICA DE NEGOCIO ---
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    try {
      setUploadingLogo(true);
      const file = event.target.files?.[0];
      if (!file) return;
      const fileName = `logo-${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('logos').upload(fileName, file);
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
      
      await supabase.from('business_settings').update({ logo_url: data.publicUrl }).eq('id', businessData.id);
      
      setBusinessData(prev => ({ ...prev, logo_url: data.publicUrl }));
      alert('Logo actualizado correctamente');
    } catch (e: any) { 
        alert('Error al subir logo: ' + e.message); 
    } finally { 
        setUploadingLogo(false); 
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!isAdmin) return;
    
    setLoading(true);
    const { error } = await supabase
        .from('business_settings')
        .update({
            name: businessData.name,
            address: businessData.address,
            phone: businessData.phone,
            email: businessData.email,
            rfc: businessData.rfc,
            website: businessData.website
        })
        .eq('id', businessData.id);
    
    setLoading(false); 
    if (error) alert('Error al guardar: ' + error.message); 
    else alert('¡Información del negocio actualizada!');
  };

  // --- LÓGICA DE CATÁLOGOS ---
  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin || !newItem.trim()) return;
    const { error } = await supabase.from('categories').insert([{ name: newItem.toUpperCase(), type: catTypeTab }]);
    if (!error) { setNewItem(''); fetchCategories(); }
  };

  const handleDeleteCat = async (cat: any) => {
    if (!isAdmin) return;
    if (confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"?`)) { 
        await supabase.from('categories').delete().eq('id', cat.id); 
        fetchCategories(); 
    }
  };

  const handleUpdateCategory = async () => {
      if (!editingCategory || !isAdmin) return;
      
      const newName = editingCategory.name.toUpperCase();
      const oldName = categories.find(c => c.id === editingCategory.id)?.name;

      if (!newName.trim()) return alert("El nombre no puede estar vacío");

      const { error } = await supabase
        .from('categories')
        .update({ name: newName })
        .eq('id', editingCategory.id);

      if (error) return alert("Error al actualizar: " + error.message);

      if (isUpdatingHistory && oldName) {
          if (confirm(`⚠️ ATENCIÓN: Esto cambiará "${oldName}" por "${newName}" en TODOS los registros históricos. ¿Continuar?`)) {
              await supabase
                .from('transactions')
                .update({ category: newName })
                .eq('category', oldName)
                .eq('type', catTypeTab);
              alert("Historial actualizado correctamente.");
          }
      }

      setEditingCategory(null);
      setIsUpdatingHistory(false);
      fetchCategories();
  };

  // --- LÓGICA DE SEGURIDAD ---
  const fetchUsersList = async () => {
    const { data, error } = await supabase.rpc('get_users_admin');
    if (!error) setUsersList(data || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setUserLoading(true);
    const { error } = await supabase.rpc('create_user_admin', { email_input: newUserEmail, password_input: newUserPass });
    setUserLoading(false);
    if (error) alert('Error: ' + error.message); else { alert('Usuario creado exitosamente'); setNewUserEmail(''); setNewUserPass(''); fetchUsersList(); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) return alert('No puedes borrarte a ti mismo.');
    if (confirm('¿Eliminar usuario permanentemente?')) {
        const { error } = await supabase.rpc('delete_user_admin', { user_id: userId });
        if (error) alert(error.message); else fetchUsersList();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
    if (newPassword !== confirmPassword) return alert("Las contraseñas no coinciden");
    
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    
    if (error) alert(error.message); else { alert("Contraseña actualizada correctamente"); setNewPassword(''); setConfirmPassword(''); }
  };

  const currentCatList = categories.filter(c => c.type === catTypeTab).filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 font-sans">
      
      {/* HEADER PRINCIPAL */}
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Tag className="text-blue-600 w-6 h-6"/> Configuración General
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                {isAdmin ? 'Administra la identidad del negocio y la seguridad del sistema.' : 'Opciones de cuenta personal.'}
            </p>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl mb-8 w-fit">
        <button onClick={() => setMainTab('business')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab==='business'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            <Building2 className="w-4 h-4"/> Perfil de Negocio
        </button>
        <button onClick={() => setMainTab('catalogs')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab==='catalogs'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            <Tag className="w-4 h-4"/> Catálogos
        </button>
        <button onClick={() => setMainTab('security')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${mainTab==='security'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            <ShieldCheck className="w-4 h-4"/> Seguridad
        </button>
      </div>

      {/* --- PESTAÑA: NEGOCIO (DISEÑO PRO RECUPERADO) --- */}
      {mainTab === 'business' && (
        <div className={`bg-white rounded-2xl shadow-lg shadow-slate-100 border border-slate-100 p-8 ${!isAdmin ? 'opacity-80 pointer-events-none' : ''}`}>
            
            {!isAdmin && (
                <div className="mb-6 bg-orange-50 text-orange-600 p-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-orange-100">
                    <AlertCircle className="w-5 h-5"/> Estás en modo visualización. Contacta al administrador para editar estos datos.
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-10">
                
                {/* COLUMNA IZQUIERDA: LOGO */}
                <div className="flex flex-col items-center gap-4 lg:w-1/4">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-2xl border-4 border-slate-50 bg-white shadow-md flex items-center justify-center overflow-hidden">
                            {businessData.logo_url ? (
                                <img src={businessData.logo_url} className="w-full h-full object-contain p-2" alt="Logo" />
                            ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                                    <span className="text-xs font-bold uppercase">Sin Logo</span>
                                </div>
                            )}
                        </div>
                        
                        {/* Botón Flotante de Carga */}
                        {isAdmin && (
                            <label className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 hover:scale-110 transition-all">
                                {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin"/> : <UploadCloud className="w-5 h-5"/>}
                                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden"/>
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 text-center font-medium px-4">
                        Formato recomendado: PNG o JPG cuadrado.
                    </p>
                </div>

                {/* COLUMNA DERECHA: FORMULARIO */}
                <form onSubmit={handleSaveBusiness} className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre del Negocio */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Nombre Comercial</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="Ej. Lavandería La Burbuja"
                                    value={businessData.name} 
                                    onChange={e => setBusinessData({...businessData, name: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* RFC */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">RFC</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none uppercase font-mono"
                                    placeholder="XAXX010101000"
                                    value={businessData.rfc || ''} 
                                    onChange={e => setBusinessData({...businessData, rfc: e.target.value.toUpperCase()})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Teléfono / WhatsApp</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="(55) 1234 5678"
                                    value={businessData.phone || ''} 
                                    onChange={e => setBusinessData({...businessData, phone: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Dirección Física</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="Calle, Número, Colonia, Ciudad"
                                    value={businessData.address || ''} 
                                    onChange={e => setBusinessData({...businessData, address: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="contacto@negocio.com"
                                    value={businessData.email || ''} 
                                    onChange={e => setBusinessData({...businessData, email: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* Website */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Sitio Web (Opcional)</label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-3.5 w-5 h-5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                                    placeholder="www.minegocio.com"
                                    value={businessData.website || ''} 
                                    onChange={e => setBusinessData({...businessData, website: e.target.value})} 
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />}
                                Guardar Cambios
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
      )}

      {/* --- PESTAÑA: CATÁLOGOS (VERSIÓN MEJORADA) --- */}
      {mainTab === 'catalogs' && (
        <div className="grid lg:grid-cols-12 gap-8">
             
             {/* COLUMNA IZQUIERDA: LISTADO (8/12) */}
             <div className="lg:col-span-8">
                 {/* Toolbar Superior */}
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                        <button onClick={() => setCatTypeTab('income')} className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${catTypeTab==='income'?'bg-emerald-500 text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Ingresos</button>
                        <button onClick={() => setCatTypeTab('expense')} className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${catTypeTab==='expense'?'bg-rose-500 text-white shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Gastos</button>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                        <input type="text" placeholder="Buscar categoría..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-100 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                {/* Grid de Tarjetas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                    {currentCatList.map(item => (
                        <div key={item.id} className="group bg-white p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${catTypeTab === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-700 uppercase text-sm tracking-wide">{item.name}</h4>
                                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded mt-2 inline-block border border-slate-100">ID: {item.id}</span>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingCategory(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteCat(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {currentCatList.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 flex flex-col items-center">
                            <Tag className="w-12 h-12 mb-3 opacity-20"/>
                            <p>No se encontraron categorías.</p>
                        </div>
                    )}
                </div>
             </div>

             {/* COLUMNA DERECHA: AGREGAR (4/12) */}
             {isAdmin && (
                 <div className="lg:col-span-4">
                    <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-200 sticky top-6">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <div className="bg-white/10 p-2 rounded-lg"><Plus className="w-5 h-5 text-emerald-400"/></div>
                            Nueva Categoría
                        </h3>
                        <form onSubmit={handleAddCat} className="space-y-5">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nombre</label>
                                <input 
                                    type="text" 
                                    value={newItem} 
                                    onChange={e => setNewItem(e.target.value)} 
                                    placeholder={catTypeTab === 'income' ? 'Ej. VENTA MOSTRADOR' : 'Ej. PAGO DE LUZ'} 
                                    className="w-full mt-2 p-4 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-bold shadow-inner"
                                />
                            </div>
                            
                            <div className={`p-4 rounded-xl text-xs font-medium border flex items-start gap-3 ${catTypeTab === 'income' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 border-rose-500/20 text-rose-200'}`}>
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>
                                <p>Se agregará a la lista de <strong>{catTypeTab === 'income' ? 'INGRESOS' : 'GASTOS'}</strong>.</p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={!newItem.trim()} 
                                className={`w-full font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${catTypeTab === 'income' ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20' : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-900/20'}`}
                            >
                                <Save className="w-4 h-4"/> Guardar Categoría
                            </button>
                        </form>
                    </div>
                 </div>
             )}
        </div>
      )}

      {/* PESTAÑA: SEGURIDAD (SIN CAMBIOS) */}
      {mainTab === 'security' && (
        <div className="grid lg:grid-cols-2 gap-8">
            {isAdmin && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/> Gestión de Usuarios</h3>
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4"/> Registrar Nuevo</h4>
                        <form onSubmit={handleCreateUser} className="space-y-3">
                            <input type="email" required placeholder="Correo electrónico" className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}/>
                            <div className="flex gap-2">
                                <input type="password" required placeholder="Contraseña temporal" className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" value={newUserPass} onChange={e => setNewUserPass(e.target.value)}/>
                                <button disabled={userLoading} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors">
                                    {userLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {usersList.map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs ${u.role === 'admin' ? 'bg-purple-600' : 'bg-slate-400'}`}>{u.email.charAt(0).toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{u.email}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{u.role || 'Auditor'}</span>
                            </div>
                          </div>
                          {u.id !== currentUser?.id && <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                      ))}
                    </div>
                </div>
            )}
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-fit ${!isAdmin ? 'lg:col-span-2' : ''}`}>
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100"><Lock className="w-7 h-7" /></div>
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Contraseña</h3>
                        <p className="text-sm text-slate-500 mt-1">Actualiza tu clave de acceso personal.</p>
                    </div>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nueva Contraseña</label><input type="password" className="w-full p-4 border border-slate-200 rounded-xl text-slate-800 focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar Contraseña</label><input type="password" className="w-full p-4 border border-slate-200 rounded-xl text-slate-800 focus:ring-4 focus:ring-blue-50 outline-none transition-all" placeholder="Repite la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></div>
                    <button type="submit" disabled={passLoading || !newPassword} className="w-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2">{passLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ShieldCheck className="w-5 h-5"/>} Actualizar Seguridad</button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE CATEGORÍA */}
      {editingCategory && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-600"/> Editar Categoría</h3>
                      <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="p-6">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nuevo Nombre</label>
                      <input 
                        type="text" 
                        value={editingCategory.name} 
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 mb-6 uppercase"
                      />
                      
                      {/* SWITCH UPDATE CASCADA */}
                      <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 mb-6 cursor-pointer" onClick={() => setIsUpdatingHistory(!isUpdatingHistory)}>
                          <div className={`w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${isUpdatingHistory ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                              {isUpdatingHistory && <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>}
                          </div>
                          <div>
                              <p className="font-bold text-sm text-blue-900">Actualizar historial</p>
                              <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                                  Si activas esto, todos los registros antiguos que tengan el nombre anterior se cambiarán al nuevo nombre automáticamente.
                              </p>
                          </div>
                      </div>

                      <button 
                        onClick={handleUpdateCategory} 
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
                      >
                          Guardar Cambios
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}