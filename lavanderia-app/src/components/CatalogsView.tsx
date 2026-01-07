import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Trash2, Plus, Tag, Save, Building2, 
  Lock, User, ShieldCheck, Loader2, Camera, UploadCloud, Users, UserPlus, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function CatalogsView() {
  const { isAdmin, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [mainTab, setMainTab] = useState<'business' | 'catalogs' | 'security'>('business'); 
  
  const [businessData, setBusinessData] = useState({ id: 0, name: '', address: '', phone: '', email: '', logo_url: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [newItem, setNewItem] = useState('');
  const [catTypeTab, setCatTypeTab] = useState<'income' | 'expense'>('income');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    fetchBusinessData(); fetchCategories(); fetchCurrentUser();
    if (mainTab === 'security' && isAdmin) fetchUsersList();
  }, [mainTab, isAdmin]);

  const fetchCurrentUser = async () => { const { data } = await supabase.auth.getUser(); setCurrentUser(data.user); };
  const fetchBusinessData = async () => { const { data } = await supabase.from('business_settings').select('*').single(); if (data) setBusinessData(data); };
  const fetchCategories = async () => { const { data } = await supabase.from('categories').select('*').order('name'); setCategories(data || []); };

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
      alert('Logo actualizado');
    } catch (e: any) { alert('Error: ' + e.message); } finally { setUploadingLogo(false); }
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setLoading(true);
    const { error } = await supabase.from('business_settings').update(businessData).eq('id', businessData.id);
    setLoading(false); error ? alert('Error') : alert('Guardado');
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin || !newItem.trim()) return;
    const { error } = await supabase.from('categories').insert([{ name: newItem.toUpperCase(), type: catTypeTab }]);
    if (!error) { setNewItem(''); fetchCategories(); }
  };

  const handleDeleteCat = async (id: number) => {
    if (!isAdmin) return;
    if (confirm('¿Borrar?')) { await supabase.from('categories').delete().eq('id', id); fetchCategories(); }
  };

// Reemplaza tu función fetchUsersList actual con esta:
  const fetchUsersList = async () => {
    console.log("Intentando cargar usuarios...");
    const { data, error } = await supabase.rpc('get_users_admin');
    
    if (error) {
        console.error("Error crítico:", error);
        alert('ERROR AL CARGAR USUARIOS: ' + error.message);
    } else {
        console.log("Usuarios cargados:", data);
        setUsersList(data || []);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); if (!isAdmin) return;
    setUserLoading(true);
    const { error } = await supabase.rpc('create_user_admin', { email_input: newUserEmail, password_input: newUserPass });
    setUserLoading(false);
    if (error) alert('Error: ' + error.message); else { alert('Creado'); setNewUserEmail(''); setNewUserPass(''); fetchUsersList(); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return;
    if (userId === currentUser?.id) return alert('No puedes borrarte a ti mismo.');
    if (confirm('¿Eliminar usuario?')) {
        const { error } = await supabase.rpc('delete_user_admin', { user_id: userId });
        if (error) alert(error.message); else fetchUsersList();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return alert("No coinciden");
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPassLoading(false);
    if (error) alert(error.message); else { alert("Actualizada"); setNewPassword(''); setConfirmPassword(''); }
  };

  const currentCatList = categories.filter(c => c.type === catTypeTab);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Tag className="text-blue-600"/> Configuración</h2>
        <p className="text-slate-500">{isAdmin ? 'Administración total.' : 'Opciones de cuenta.'}</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
        <button onClick={() => setMainTab('business')} className={`px-6 py-2 rounded-lg text-sm font-bold ${mainTab==='business'?'bg-white text-blue-600 shadow-sm':'text-slate-500'}`}>Negocio</button>
        <button onClick={() => setMainTab('catalogs')} className={`px-6 py-2 rounded-lg text-sm font-bold ${mainTab==='catalogs'?'bg-white text-blue-600 shadow-sm':'text-slate-500'}`}>Catálogos</button>
        <button onClick={() => setMainTab('security')} className={`px-6 py-2 rounded-lg text-sm font-bold ${mainTab==='security'?'bg-white text-blue-600 shadow-sm':'text-slate-500'}`}>Seguridad</button>
      </div>

      {mainTab === 'business' && (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-3xl ${!isAdmin ? 'opacity-70 pointer-events-none' : ''}`}>
            {!isAdmin && <div className="mb-4 bg-orange-50 text-orange-600 p-3 rounded-lg text-sm flex gap-2 border border-orange-100"><AlertCircle className="w-4 h-4"/> Solo lectura.</div>}
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative bg-slate-50 group hover:border-blue-400">
                        {businessData.logo_url ? <img src={businessData.logo_url} className="w-full h-full object-cover" /> : <Camera className="w-10 h-10 text-slate-300" />}
                        {isAdmin && <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>}
                    </div>
                </div>
                <form onSubmit={handleSaveBusiness} className="space-y-6 flex-1">
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label><input type="text" className="w-full px-4 py-3 border rounded-lg" value={businessData.name} onChange={e => setBusinessData({...businessData, name: e.target.value})} disabled={!isAdmin}/></div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label><input type="text" className="w-full px-4 py-3 border rounded-lg" value={businessData.address || ''} onChange={e => setBusinessData({...businessData, address: e.target.value})} disabled={!isAdmin}/></div>
                    {isAdmin && <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold"><Save className="w-4 h-4 inline mr-2" /> Guardar</button>}
                </form>
            </div>
        </div>
      )}

      {mainTab === 'catalogs' && (
        <div>
             {!isAdmin && <div className="mb-4 bg-orange-50 text-orange-600 p-3 rounded-lg text-sm flex gap-2 border border-orange-100"><AlertCircle className="w-4 h-4"/> Solo lectura.</div>}
             <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button onClick={() => setCatTypeTab('income')} className={`pb-3 px-4 font-medium ${catTypeTab==='income'?'text-blue-600 border-b-2 border-blue-600':'text-slate-500'}`}>Ingresos</button>
                <button onClick={() => setCatTypeTab('expense')} className={`pb-3 px-4 font-medium ${catTypeTab==='expense'?'text-red-600 border-b-2 border-red-600':'text-slate-500'}`}>Gastos</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row">
                <div className="flex-1 p-6 border-r border-slate-100 h-80 overflow-y-auto">
                    {currentCatList.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg group">
                            <span className="font-medium text-slate-700">{item.name}</span>
                            {isAdmin && <button onClick={() => handleDeleteCat(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                    ))}
                </div>
                {isAdmin && <div className="w-full md:w-80 p-6 bg-slate-50"><h3 className="font-bold text-slate-700 mb-4">Agregar</h3><form onSubmit={handleAddCat} className="space-y-4"><input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="NUEVO..." className="w-full p-3 border rounded-lg bg-white"/><button type="submit" disabled={!newItem.trim()} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg"><Plus className="w-4 h-4 inline mr-2"/> Agregar</button></form></div>}
            </div>
        </div>
      )}

      {mainTab === 'security' && (
        <div className="grid lg:grid-cols-2 gap-8">
            {isAdmin && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/> Gestión de Usuarios</h3>
                    <div className="bg-slate-50 p-4 rounded-xl border mb-6"><h4 className="text-sm font-bold text-slate-700 mb-3">Crear Usuario</h4><form onSubmit={handleCreateUser} className="space-y-3"><input type="email" required placeholder="Email" className="w-full p-2 border rounded-lg text-sm" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)}/><div className="flex gap-2"><input type="password" required placeholder="Contraseña" className="w-full p-2 border rounded-lg text-sm" value={newUserPass} onChange={e => setNewUserPass(e.target.value)}/><button disabled={userLoading} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Crear</button></div></form></div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase px-2 mb-2"><span>Usuario</span><span>Rol / Acción</span></div>
                      {usersList.map((u: any) => (
                        <div key={u.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><User className="w-4 h-4"/></div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[140px]">{u.email}</p>
                              {/* --- AQUI ESTA EL CAMBIO: ETIQUETA DE ROL --- */}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                {u.role || 'Auditor'}
                              </span>
                            </div>
                          </div>
                          {u.id !== currentUser?.id && <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>}
                        </div>
                      ))}
                    </div>
                </div>
            )}
            <div className={`bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit ${!isAdmin ? 'lg:col-span-2' : ''}`}>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><ShieldCheck className="w-6 h-6" /></div><div><h3 className="font-bold text-lg">Tu Seguridad</h3><p className="text-sm text-slate-500">{currentUser?.email}</p></div></div>
                <form onSubmit={handleUpdatePassword} className="space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label><input type="password" className="w-full p-3 border rounded-lg" value={newPassword} onChange={e => setNewPassword(e.target.value)}/></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar</label><input type="password" className="w-full p-3 border rounded-lg" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}/></div><button type="submit" disabled={passLoading || !newPassword} className="w-full bg-slate-900 text-white px-8 py-3 rounded-lg font-bold">Actualizar</button></form>
            </div>
        </div>
      )}
    </div>
  );
}