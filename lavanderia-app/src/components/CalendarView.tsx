import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, getDay, setMonth, setYear, parseISO, addDays, subDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, Trash2, Edit2, ArrowUpRight, ArrowDownRight, Camera, Search, Calendar as CalendarIcon, DollarSign,
  ChevronLeft, ChevronRight, GripHorizontal
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
    // Ya no hacemos scroll global, solo actualizamos la data de abajo
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
      
      {/* --- HEADER (FIJO ARRIBA) --- */}
      <div className="bg-white border-b border-slate-200 p-3 lg:p-4 flex flex-col lg:flex-row justify-between gap-3 shadow-sm z-30 shrink-0">
        
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
            <button 
                onClick={() => {
                    const today = new Date();
                    setCurrentDate(today);
                    setSelectedDay(today);
                }} 
                className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500"
                title="Ir a Hoy"
            >
                <CalendarIcon className="w-5 h-5"/>
            </button>
            <div className="h-6 w-px bg-slate-300 mx-1"></div>
            <select 
                value={months[currentDate.getMonth()]} 
                onChange={(e) => setCurrentDate(setMonth(currentDate, months.indexOf(e.target.value)))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-blue-600 uppercase px-2 flex-1 lg:flex-none"
            >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select 
                value={currentDate.getFullYear()} 
                onChange={(e) => setCurrentDate(setYear(currentDate, parseInt(e.target.value)))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-blue-600 px-2"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full lg:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Buscar registro..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 rounded-xl text-sm font-medium outline-none transition-all"
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

      {/* --- CONTENEDOR PRINCIPAL DIVIDIDO (SIN SCROLL GLOBAL) --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* === PARTE SUPERIOR: CALENDARIO (SCROLL INDEPENDIENTE) === */}
        {/* En móvil ocupa el 55% de la altura, en Desktop ocupa todo el ancho menos el panel derecho */}
        <div className="basis-[55%] lg:basis-auto lg:flex-1 overflow-y-auto p-2 lg:p-6 bg-slate-50 border-b lg:border-b-0">
            
            {searchTerm ? (
                <div className="space-y-3 pb-4">
                    <h3 className="font-bold text-slate-500 uppercase text-xs mb-4 px-2">Resultados ({searchedTransactions.length})</h3>
                    {searchedTransactions.length > 0 ? searchedTransactions.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-blue-200 cursor-pointer" onClick={() => { setSearchTerm(''); setSelectedDay(parseISO(t.date)); }}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                    {t.type === 'income' ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{t.category}</p>
                                    <p className="text-xs text-slate-500">{format(parseISO(t.date), 'd MMM')} • {t.description}</p>
                                </div>
                            </div>
                            <span className={`font-bold font-mono text-sm ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {formatMoney(t.amount)}
                            </span>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-400 italic">No se encontraron coincidencias.</div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-min">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="py-2 lg:py-3 text-center text-[10px] lg:text-xs font-bold text-slate-400">
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
                                    className={`relative h-14 lg:h-32 border-b border-r border-slate-100 p-1 lg:p-2 cursor-pointer transition-all active:bg-blue-50
                                        ${isSelected ? 'bg-blue-100 ring-2 ring-inset ring-blue-600 z-10' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] lg:text-sm font-bold w-5 h-5 lg:w-7 lg:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                                            {format(day, 'd')}
                                        </span>
                                        <div className="hidden lg:flex flex-col items-end gap-0.5">
                                            {income > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-md">+{formatMoney(income)}</span>}
                                            {expense > 0 && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 rounded-md">-{formatMoney(expense)}</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Puntos visuales mejorados para móvil */}
                                    <div className="absolute bottom-1 left-1 lg:bottom-2 lg:left-2 flex gap-0.5 lg:gap-1 flex-wrap max-w-full">
                                        {dayTxs.slice(0, 4).map((t, i) => (
                                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${t.type==='income'?'bg-emerald-500':'bg-rose-500'}`}></div>
                                        ))}
                                        {dayTxs.length > 4 && <span className="text-[8px] text-slate-400 leading-none">+</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* === PARTE INFERIOR: DETALLES (SCROLL INDEPENDIENTE) === */}
        {/* En móvil ocupa el resto (flex-1), en Desktop es barra lateral */}
        <div id="day-details" className="flex-1 lg:w-96 lg:flex-none bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-20 relative">
            
            {/* AGARRADERA VISUAL (SOLO MÓVIL) */}
            <div className="flex justify-center pt-2 pb-1 lg:hidden">
                <GripHorizontal className="text-slate-300 w-8 h-8"/>
            </div>

            {/* HEADER DEL DÍA + NAVEGACIÓN */}
            <div className="px-4 pb-4 lg:p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                <div className="flex items-center justify-between mb-2">
                    <button onClick={handlePrevDay} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 border border-slate-200">
                        <ChevronLeft className="w-5 h-5"/>
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-lg lg:text-2xl font-black text-slate-800 capitalize">
                            {format(selectedDay, 'EEEE d', { locale: es })}
                        </h2>
                        <p className="text-slate-400 text-xs lg:text-sm font-medium uppercase tracking-wide">
                            {format(selectedDay, 'MMMM yyyy', { locale: es })}
                        </p>
                    </div>

                    <button onClick={handleNextDay} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800 border border-slate-200">
                        <ChevronRight className="w-5 h-5"/>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 lg:mt-6">
                    <div className="bg-emerald-50 p-2 lg:p-3 rounded-xl border border-emerald-100 text-center">
                        <p className="text-[9px] lg:text-[10px] font-bold text-emerald-600 uppercase">Ingresos</p>
                        <p className="text-xs lg:text-sm font-black text-emerald-700">{formatMoney(dayIncome)}</p>
                    </div>
                    <div className="bg-rose-50 p-2 lg:p-3 rounded-xl border border-rose-100 text-center">
                        <p className="text-[9px] lg:text-[10px] font-bold text-rose-600 uppercase">Gastos</p>
                        <p className="text-xs lg:text-sm font-black text-rose-700">{formatMoney(dayExpense)}</p>
                    </div>
                    <div className={`p-2 lg:p-3 rounded-xl border text-center ${dayBalance >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                        <p className="text-[9px] lg:text-[10px] font-bold uppercase opacity-60">Balance</p>
                        <p className="text-xs lg:text-sm font-black">{dayBalance > 0 ? '+' : ''}{formatMoney(dayBalance)}</p>
                    </div>
                </div>
            </div>

            {/* LISTA CON SCROLL INDEPENDIENTE */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 pb-24 lg:pb-4"> 
                {dayTransactions.length === 0 ? (
                    <div className="h-32 lg:h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <div className="bg-slate-100 p-4 rounded-full mb-3"><DollarSign className="w-8 h-8 text-slate-300"/></div>
                        <p className="text-sm font-medium">Sin movimientos</p>
                    </div>
                ) : (
                    dayTransactions.map(tx => (
                        <div key={tx.id} className="group bg-white p-3 lg:p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] lg:text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                        tx.type === 'income' 
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {tx.category}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-700 font-medium leading-tight max-w-[180px] lg:max-w-[200px]">
                                    {tx.description || 'Sin descripción'}
                                </p>
                            </div>
                            
                            <div className="text-right">
                                <span className={`block font-mono font-bold text-sm lg:text-base ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                                </span>
                                {isAdmin && (
                                    <div className="flex gap-2 justify-end mt-1">
                                        <button onClick={() => handleEdit(tx)} className="text-slate-300 hover:text-blue-500"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={() => handleDelete(tx.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* BOTÓN FLOTANTE (FAB) SIEMPRE VISIBLE ENCIMA DEL SCROLL */}
            {isAdmin && (
                <div className="absolute bottom-6 right-6 lg:static lg:p-4 lg:bg-white lg:border-t lg:border-slate-200 z-50">
                    <button 
                        onClick={() => { setEditingTx(null); setIsAddOpen(true); }} 
                        className="bg-slate-900 hover:bg-slate-800 text-white p-4 lg:py-3.5 lg:w-full rounded-full lg:rounded-xl font-bold shadow-xl shadow-slate-900/30 transition-all active:scale-90 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-6 h-6 lg:w-5 lg:h-5"/>
                        <span className="hidden lg:inline">Registrar Movimiento</span>
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* MODALES */}
      <TransactionModal 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); setEditingTx(null); }} 
        onSave={fetchMonthData}
        initialData={editingTx}
        defaultDate={selectedDay}
      />
      
      {isScannerOpen && (
        <TicketScanner 
          onScan={(data) => {
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