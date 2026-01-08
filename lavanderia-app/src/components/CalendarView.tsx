import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, getDay, setMonth, setYear, parseISO, addDays, subDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, Trash2, Edit2, ArrowUpRight, ArrowDownRight, Camera, Search, Calendar as CalendarIcon, DollarSign,
  ChevronLeft, ChevronRight, GripHorizontal, LayoutGrid
} from 'lucide-react'; 
import { TransactionModal } from './TransactionModal';
import { TicketScanner } from './TicketScanner'; 
import { useAuth } from '../context/AuthContext'; 

// --- HELPER FORMATO MONEDA ---
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function CalendarView() {
  const { isAdmin } = useAuth(); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  
  // Modales y UI
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    if (error) console.error('Error fetching transactions:', error);
    else setTransactions(data || []);
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    // ELIMINADO: scrollIntoView agresivo que tapaba el calendario
  };

  const handlePrevDay = () => {
      const newDate = subDays(selectedDay, 1);
      setSelectedDay(newDate);
      if (!isSameMonth(newDate, currentDate)) setCurrentDate(newDate);
  };

  const handleNextDay = () => {
      const newDate = addDays(selectedDay, 1);
      setSelectedDay(newDate);
      if (!isSameMonth(newDate, currentDate)) setCurrentDate(newDate);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) alert('Error al eliminar');
    else fetchMonthData();
  };

  const handleEdit = (tx: any) => {
    setEditingTx(tx);
    setIsAddOpen(true);
  };

  // --- LÓGICA CALENDARIO ---
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
  const startDayOfWeek = getDay(firstDayOfMonth); 
  const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  // --- DATOS FILTRADOS ---
  const dayTransactions = transactions.filter(t => t.date === format(selectedDay, 'yyyy-MM-dd'));
  const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const dayBalance = dayIncome - dayExpense;

  const searchedTransactions = searchTerm 
    ? transactions.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.amount).includes(searchTerm)
      )
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans overflow-hidden"> 
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-slate-200 p-3 lg:p-4 flex flex-col lg:flex-row justify-between gap-3 shadow-sm z-30 shrink-0">
        
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 hidden lg:block">
                <LayoutGrid className="w-5 h-5"/>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
                <button 
                    onClick={() => {
                        const today = new Date();
                        setCurrentDate(today);
                        setSelectedDay(today);
                    }} 
                    className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-indigo-600"
                    title="Ir a Hoy"
                >
                    <CalendarIcon className="w-5 h-5"/>
                </button>
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                <select 
                    value={months[currentDate.getMonth()]} 
                    onChange={(e) => setCurrentDate(setMonth(currentDate, months.indexOf(e.target.value)))}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-indigo-600 uppercase px-2 flex-1 lg:flex-none"
                >
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                    value={currentDate.getFullYear()} 
                    onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-indigo-600 px-2"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-64 group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
                <input 
                    type="text" 
                    placeholder="Buscar registro..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-slate-400"
                />
            </div>
            
            {isAdmin && (
                <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-300 flex-shrink-0 active:scale-95"
                    title="Escanear Ticket"
                >
                    <Camera className="w-5 h-5"/>
                </button>
            )}
        </div>
      </div>

      {/* --- CONTENEDOR PRINCIPAL DIVIDIDO --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* === PARTE SUPERIOR: CALENDARIO (45% en Móvil) === */}
        <div className="h-[45%] lg:h-auto lg:flex-1 overflow-y-auto p-2 lg:p-6 bg-slate-50 border-b lg:border-b-0 custom-scrollbar shrink-0">
            
            {searchTerm ? (
                <div className="space-y-3 pb-4">
                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-4 px-2 tracking-wider">Resultados ({searchedTransactions.length})</h3>
                    {searchedTransactions.length > 0 ? searchedTransactions.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-indigo-200 cursor-pointer transition-all hover:shadow-md" onClick={() => { setSearchTerm(''); setSelectedDay(parseISO(t.date)); }}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${t.type === 'income' ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {t.type === 'income' ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{t.category}</p>
                                    <p className="text-xs text-slate-500">{format(parseISO(t.date), 'd MMM')} • {t.description}</p>
                                </div>
                            </div>
                            <span className={`font-bold font-mono text-sm ${t.type === 'income' ? 'text-blue-600' : 'text-rose-600'}`}>
                                {formatMoney(t.amount)}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-400 italic">No se encontraron coincidencias.</div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-min">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="py-2 text-center text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {Array.from({ length: emptyDays }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-14 lg:h-32 bg-slate-50/30 border-b border-r border-slate-100"></div>
                        ))}

                        {daysInMonth.map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayTxs = transactions.filter(t => t.date === dayStr);
                            const income = dayTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
                            const expense = dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
                            const isSelected = isSameDay(day, selectedDay);
                            const isToday = isSameDay(day, new Date());

                            return (
                                <div 
                                    key={day.toString()} 
                                    onClick={() => handleDayClick(day)}
                                    className={`relative h-14 lg:h-32 border-b border-r border-slate-100 p-1 lg:p-2 cursor-pointer transition-all active:bg-blue-50 group
                                        ${isSelected ? 'bg-blue-50/50 ring-2 ring-inset ring-blue-600 z-10' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] lg:text-sm font-bold w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 group-hover:text-slate-800'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        <div className="hidden lg:flex flex-col items-end gap-0.5">
                                            {income > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded text-right">+{formatMoney(income)}</span>}
                                            {expense > 0 && <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 rounded text-right">-{formatMoney(expense)}</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Puntos visuales */}
                                    <div className="absolute bottom-1 left-1 lg:bottom-2 lg:left-2 flex gap-0.5 flex-wrap max-w-full">
                                        {dayTxs.slice(0, 4).map((t, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ring-1 ring-white ${t.type==='income'?'bg-blue-500':'bg-rose-500'}`}></div>
                                        ))}
                                        {dayTxs.length > 4 && <span className="text-[8px] text-slate-400 leading-none font-bold">+</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* === PARTE INFERIOR: DETALLES (55% en Móvil) === */}
        <div id="day-details" className="flex-1 lg:w-96 lg:flex-none bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20 relative h-[55%] lg:h-auto">
            
            {/* AGARRADERA VISUAL */}
            <div className="flex justify-center pt-2 pb-1 lg:hidden bg-white rounded-t-2xl shrink-0">
                <GripHorizontal className="text-slate-300 w-8 h-8"/>
            </div>

            {/* HEADER DEL DÍA */}
            <div className="px-4 pb-2 lg:p-6 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={handlePrevDay} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 border border-slate-200 shadow-sm active:scale-95">
                        <ChevronLeft className="w-5 h-5"/>
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-lg lg:text-2xl font-black text-slate-800 capitalize tracking-tight">
                            {format(selectedDay, 'EEEE d', { locale: es })}
                        </h2>
                        <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-widest">
                            {format(selectedDay, 'MMMM yyyy', { locale: es })}
                        </p>
                    </div>

                    <button onClick={handleNextDay} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 border border-slate-200 shadow-sm active:scale-95">
                        <ChevronRight className="w-5 h-5"/>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-50 p-2 lg:p-3 rounded-xl border border-blue-100 text-center">
                        <p className="text-[9px] lg:text-[10px] font-bold text-blue-600 uppercase tracking-wide">Ingresos</p>
                        <p className="text-xs lg:text-sm font-black text-blue-700 mt-0.5">{formatMoney(dayIncome)}</p>
                    </div>
                    <div className="bg-rose-50 p-2 lg:p-3 rounded-xl border border-rose-100 text-center">
                        <p className="text-[9px] lg:text-[10px] font-bold text-rose-600 uppercase tracking-wide">Gastos</p>
                        <p className="text-xs lg:text-sm font-black text-rose-700 mt-0.5">{formatMoney(dayExpense)}</p>
                    </div>
                    <div className={`p-2 lg:p-3 rounded-xl border text-center transition-colors ${dayBalance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-wide ${dayBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>Balance</p>
                        <p className={`text-xs lg:text-sm font-black mt-0.5 ${dayBalance >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>{dayBalance > 0 ? '+' : ''}{formatMoney(dayBalance)}</p>
                    </div>
                </div>
            </div>

            {/* LISTA DE TRANSACCIONES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 pb-24 lg:pb-4 custom-scrollbar"> 
                {dayTransactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 min-h-[150px]">
                        <div className="bg-white p-4 rounded-full mb-3 shadow-sm border border-slate-100"><DollarSign className="w-8 h-8 text-slate-300"/></div>
                        <p className="text-sm font-medium">Día sin movimientos</p>
                        {isAdmin && <p className="text-xs mt-1">Usa el botón + para comenzar</p>}
                    </div>
                ) : (
                    dayTransactions.map(tx => (
                        <div key={tx.id} className="group bg-white p-3 lg:p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center">
                            <div className="flex gap-3 items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${
                                    tx.type === 'income' ? 'bg-blue-500' : 'bg-rose-500'
                                }`}>
                                    {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                            {tx.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium leading-tight max-w-[150px] lg:max-w-[180px] truncate">
                                        {tx.description || 'Sin descripción'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`block font-mono font-bold text-sm lg:text-base ${tx.type === 'income' ? 'text-blue-600' : 'text-rose-600'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                                </span>
                                {isAdmin && (
                                    <div className="flex gap-1 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(tx)} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Edit2 className="w-3.5 h-3.5"/></button>
                                        <button onClick={() => handleDelete(tx.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* BOTÓN FLOTANTE (FAB) */}
            {isAdmin && (
                <div className="absolute bottom-6 right-6 lg:static lg:p-4 lg:bg-white lg:border-t lg:border-slate-200 z-50 pointer-events-none lg:pointer-events-auto">
                    <button 
                        onClick={() => { setEditingTx(null); setIsAddOpen(true); }} 
                        className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-white p-4 lg:py-3.5 lg:w-full rounded-full lg:rounded-xl font-bold shadow-xl shadow-slate-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 hover:shadow-2xl"
                    >
                        <Plus className="w-6 h-6 lg:w-5 lg:h-5"/>
                        <span className="hidden lg:inline">Registrar Movimiento</span>
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* MODALES */}
      {/* @ts-ignore */}
      <TransactionModal 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); setEditingTx(null); }} 
        onSuccess={fetchMonthData} 
        initialData={editingTx} 
        defaultDate={format(selectedDay, 'yyyy-MM-dd')}
      />
      
      {isScannerOpen && (
        <TicketScanner 
          onScanComplete={(data: any[]) => {
             console.log("Ticket escaneado:", data);
             setIsScannerOpen(false);
             setIsAddOpen(true); 
          }} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}

    </div>
  );
}