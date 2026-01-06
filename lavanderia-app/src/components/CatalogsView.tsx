import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Trash2, Plus, Tag, Save, Building2, 
  Lock, User, ShieldCheck, Loader2, Camera, UploadCloud, Users, UserPlus 
} from 'lucide-react';

export function CatalogsView() {
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Pestañas: 'business', 'catalogs', 'security'
  const [mainTab, setMainTab] = useState<'business' | 'catalogs' | 'security'>('business'); 
  
  // --- ESTADO DATOS NEGOCIO ---
  const [businessData, setBusinessData] = useState({
    id: 0,
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '' 
  });

  // --- ESTADO CATÁLOGOS ---
  const [categories, setCategories] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [catTypeTab, setCatTypeTab] = useState<'income' | 'expense'>('income');

  // --- ESTADO SEGURIDAD (ADMIN) ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Lista de usuarios y formulario nuevo
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    fetchBusinessData();
    fetchCategories();
    fetchCurrentUser();
    // Si entramos a la pestaña seguridad, cargamos usuarios
    if (mainTab === 'security') {
        fetchUsersList();
    }
  }, [mainTab]);

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

  // --- LOGO UPLOAD ---
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingLogo(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Debes seleccionar una imagen.');
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('business_settings').update({ logo_url: publicUrl }).eq('id', businessData.id);
      if (dbError) throw dbError;

      setBusinessData(prev => ({ ...prev, logo_url: publicUrl }));
      alert('¡Logo actualizado con éxito!');

    } catch (error: any) {
      alert('Error subiendo logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('business_settings').update({
        name: businessData.name,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email
      }).eq('id', businessData.id);
    setLoading(false);
    if (error) alert('Error al guardar');
    else alert('Datos actualizados correctamente');
  };

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

  // --- GESTIÓN DE USUARIOS (ADMIN) ---
  const fetchUsersList = async () => {
    // Llamamos a la función SQL 'get_users_admin'
    const { data, error } = await supabase.rpc('get_users_admin');
    if (!error) setUsersList(data || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPass) return;
    if (newUserPass.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }

    setUserLoading(true);
    // Llamamos a la función SQL 'create_user_admin'
    const { error } = await supabase.rpc('create_user_admin', { 
        email_input: newUserEmail, 
        password_input: newUserPass 
    });

    setUserLoading(false);
    if (error) {
        alert('Error al crear usuario: ' + error.message);
    } else {
        alert('Usuario creado correctamente');
        setNewUserEmail('');
        setNewUserPass('');
        fetchUsersList();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este usuario? Perderá el acceso inmediatamente.')) return;
    if (userId === currentUser?.id) { alert('No puedes eliminar tu propia cuenta desde aquí.'); return; }
    
    const { error } = await supabase.rpc('delete_user_admin', { user_id: userId });
    
    if (error) alert('Error: ' + error.message);
    else fetchUsersList();
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return alert("Las contraseñas no coinciden.");
    
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    
    if (error) alert("Error: " + error.message);
    else { alert("¡Contraseña actualizada!"); setNewPassword(''); setConfirmPassword(''); }
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
            <ShieldCheck className="w-4 h-4"/> Seguridad y Usuarios
        </button>
      </div>

      {/* --- PESTAÑA 1: DATOS NEGOCIO --- */}
      {mainTab === 'business' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-3xl animate-in fade-in slide-in-from-left-4">
            <h3 className="font-bold text-lg text-slate-800 mb-6 border-b border-slate-50 pb-2">Información Pública</h3>
            
            <div className="flex flex-col md:flex-row gap-8">
                {/* LOGO */}
                <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative bg-slate-50 group hover:border-blue-400 transition-colors">
                        {businessData.logo_url ? (
                            <img src={businessData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Camera className="w-10 h-10 text-slate-300" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                           <UploadCloud className="text-white w-8 h-8"/>
                        </div>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"/>
                    </div>
                    <p className="text-xs text-slate-400 font-medium text-center">{uploadingLogo ? 'Subiendo...' : 'Click para cambiar Logo'}</p>
                </div>
                {/* FORM */}
                <form onSubmit={handleSaveBusiness} className="space-y-6 flex-1">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                        <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.name} onChange={e => setBusinessData({...businessData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                        <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.phone || ''} onChange={e => setBusinessData({...businessData, phone: e.target.value})} /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label><input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={businessData.email || ''} onChange={e => setBusinessData({...businessData, email: e.target.value})} /></div>
                    </div>
                    <div className="pt-4"><button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center gap-2"><Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar Información'}</button></div>
                </form>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 2: CATÁLOGOS --- */}
      {mainTab === 'catalogs' && (
        <div className="animate-in fade-in slide-in-from-right-4">
             <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button onClick={() => setCatTypeTab('income')} className={`pb-3 px-4 font-medium transition-all ${catTypeTab === 'income' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Ingresos</button>
                <button onClick={() => setCatTypeTab('expense')} className={`pb-3 px-4 font-medium transition-all ${catTypeTab === 'expense' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Gastos</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 p-6 border-r border-slate-100">
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
                    <h3 className="font-bold text-slate-700 mb-4">Agregar</h3>
                    <form onSubmit={handleAddCat} className="space-y-4">
                        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="Ej. NUEVO CONCEPTO" className="w-full p-3 border border-slate-200 rounded-lg outline-none bg-white"/>
                        <button type="submit" disabled={!newItem.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> Agregar</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* --- PESTAÑA 3: SEGURIDAD Y USUARIOS --- */}
      {mainTab === 'security' && (
        <div className="animate-in fade-in slide-in-from-right-4 grid lg:grid-cols-2 gap-8">
            
            {/* COLUMNA 1: GESTIÓN DE USUARIOS (NUEVO MÓDULO) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600"/> Gestión de Usuarios
                </h3>
                
                {/* Formulario Agregar Usuario */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <UserPlus className="w-4 h-4"/> Crear Nuevo Usuario
                    </h4>
                    <form onSubmit={handleCreateUser} className="space-y-3">
                        <input 
                            type="email" required placeholder="Correo electrónico" 
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <input 
                                type="password" required placeholder="Contraseña (mín 6)" 
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                value={newUserPass} onChange={e => setNewUserPass(e.target.value)}
                            />
                            <button disabled={userLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition">
                                {userLoading ? <Loader2 className="animate-spin w-4 h-4"/> : 'Crear'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista de Usuarios */}
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    <div className="flex justify-between text-xs font-bold text-slate-400 uppercase px-2 mb-2">
                        <span>Usuario</span>
                        <span>Acción</span>
                    </div>
                    {usersList.map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:shadow-sm transition">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                    <User className="w-4 h-4"/>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-slate-700 truncate max-w-[150px]">{u.email}</p>
                                    <p className="text-[10px] text-slate-400">Creado: {new Date(u.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            {u.id === currentUser?.id ? (
                                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">TÚ</span>
                            ) : (
                                <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" 
                                    title="Eliminar acceso"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUMNA 2: MI PERFIL */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><ShieldCheck className="w-6 h-6" /></div>
                    <div><h3 className="font-bold text-lg text-slate-800">Tu Seguridad</h3><p className="text-sm text-slate-500">{currentUser?.email}</p></div>
                </div>
                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Cambiar tu Contraseña</h3>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></div></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nueva Contraseña</label><div className="relative"><Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="password" className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Repite la contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></div></div>
                    <div className="pt-4"><button type="submit" disabled={passLoading || !newPassword} className="w-full bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2">{passLoading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4" />} {passLoading ? 'Actualizando...' : 'Actualizar'}</button></div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}