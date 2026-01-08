import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Filter, Trash2, Download, ArrowUpCircle, ArrowDownCircle, Calendar, Table2 
} from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';

export function TransactionsView() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, income, expense
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, startDate, endDate]); // Recargar si cambian filtros, no search (search es local)

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
    }

    const { data, error } = await query;
    
    if (error) console.error('Error fetching transactions:', error);
    else setTransactions(data || []);
    
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('¿Estás seguro de eliminar este registro permanentemente?')) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar');
    } else {
        // Actualizar tabla localmente sin recargar todo
        setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `movimientos_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // Filtrado local por búsqueda de texto
  const filteredTransactions = transactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    return (
        t.category?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchLower)
    );
  });

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10 font-sans">
      
      {/* HEADER Y CONTROLES */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Table2 className="text-blue-600"/> Control de Movimientos
                </h2>
                <p className="text-slate-500 text-sm">Auditoría y limpieza de datos.</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={fetchTransactions}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                >
                    Actualizar
                </button>
                <button 
                    onClick={handleExport}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-2"
                >
                    <Download className="w-4 h-4"/> Exportar CSV
                </button>
            </div>
        </div>

        {/* BARRA DE HERRAMIENTAS (FILTROS) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Buscador */}
            <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Buscar (ej. FALTANTE)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none"
                />
            </div>

            {/* Selector Tipo */}
            <div className="relative">
                <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer"
                >
                    <option value="all">Todos los Tipos</option>
                    <option value="income">Solo Ingresos</option>
                    <option value="expense">Solo Gastos</option>
                </select>
            </div>

            {/* Fechas */}
            <div className="flex items-center gap-2 col-span-2">
                <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                    />
                </div>
                <span className="text-slate-400">-</span>
                <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full pl-10 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Categoría</th>
                        <th className="px-6 py-4">Descripción</th>
                        <th className="px-6 py-4 text-center">Tipo</th>
                        <th className="px-6 py-4 text-right">Monto</th>
                        {isAdmin && <th className="px-6 py-4 text-center">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando datos...</td></tr>
                    ) : filteredTransactions.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No se encontraron movimientos.</td></tr>
                    ) : (
                        filteredTransactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-3 font-medium text-slate-700 whitespace-nowrap">
                                    {format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy')}
                                </td>
                                <td className="px-6 py-3">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200">
                                        {t.category}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-slate-500 max-w-xs truncate" title={t.description}>
                                    {t.description || '-'}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {t.type === 'income' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                            <ArrowUpCircle className="w-3 h-3"/> Ingreso
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-full text-xs font-bold border border-rose-100">
                                            <ArrowDownCircle className="w-3 h-3"/> Gasto
                                        </span>
                                    )}
                                </td>
                                <td className={`px-6 py-3 text-right font-bold font-mono ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type === 'expense' ? '-' : ''}{formatMoney(t.amount)}
                                </td>
                                {isAdmin && (
                                    <td className="px-6 py-3 text-center">
                                        <button 
                                            onClick={() => handleDelete(t.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                            title="Eliminar registro"
                                        >
                                            <Trash2 className="w-4 h-4"/>
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        
        {/* FOOTER DE RESUMEN RÁPIDO */}
        {!loading && filteredTransactions.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-6 text-sm">
                <div className="text-slate-500">
                    Registros: <span className="font-bold text-slate-700">{filteredTransactions.length}</span>
                </div>
                <div className="text-slate-500">
                    Suma Visible: <span className="font-bold text-blue-600">
                        {formatMoney(filteredTransactions.reduce((acc, curr) => 
                            curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount)
                        , 0))}
                    </span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}