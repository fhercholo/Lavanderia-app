import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, isSameDay, getDay, setMonth, setYear 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, Trash2, X, Edit2, 
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight 
} from 'lucide-react'; 
import { TransactionModal } from './TransactionModal';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const fetchMonthData = async () => {
    const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
    const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('transactions')
      .select('date, type, amount')
      .gte('date', startStr)
      .lte('date', endStr);

    setTransactions(data || []);
  };

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setYear(currentDate, parseInt(e.target.value)));
  };
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(setMonth(currentDate, parseInt(e.target.value)));
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });
  const startingDayIndex = getDay(startOfMonth(currentDate));

  const getDaySummary = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTxs = transactions.filter(t => t.date === dayStr);
    
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const profit = income - expense; 
    
    return { income, expense, profit, count: dayTxs.length };
  };

  // Formato súper compacto para celular
  const formatCompact = (val: number) => 
    new Intl.NumberFormat('es-MX', { 
      style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
      notation: "compact" // Esto convierte 1500 en 1.5K si es necesario ahorrar espacio
    }).format(val);

  return (
    <div className="animate-fade-in flex flex-col h-full md:p-2">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <h2 className="text-lg font-bold text-slate-700 hidden sm:block">Calendario</h2>
            <div className="flex gap-2">
              <select 
                  value={currentDate.getMonth()} 
                  onChange={handleMonthChange}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg outline-none block p-2 font-bold w-32"
              >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select 
                  value={currentDate.getFullYear()} 
                  onChange={handleYearChange}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg outline-none block p-2 font-bold"
              >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            
            <button 
              onClick={() => setCurrentDate(new Date())} 
              className="sm:hidden text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg"
            >
              Hoy
            </button>
        </div>
        
        <button 
            onClick={() => setCurrentDate(new Date())} 
            className="hidden sm:block text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
        >
            Ir a Hoy
        </button>
      </div>

      {/* GRID (Días de la semana) */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wider">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* GRID DEL CALENDARIO */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr overflow-y-auto pb-20">
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((day) => {
          const summary = getDaySummary(day);
          const isToday = isSameDay(day, new Date());
          const hasActivity = summary.count > 0;
          const isProfit = summary.profit >= 0;

          return (
            <div 
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              // Altura dinámica: 70px en movil, 100px en PC
              className={`
                relative p-1 sm:p-2 rounded-lg sm:rounded-xl border cursor-pointer transition-all flex flex-col min-h-[70px] sm:min-h-[100px] group
                ${isToday ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : 'bg-white border-slate-200 active:bg-slate-50 sm:hover:border-blue-400 sm:hover:shadow-md'}
                ${!isSameMonth(day, currentDate) ? 'opacity-40 bg-slate-50' : ''}
              `}
            >
              {/* Encabezado de la celda */}
              <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                 <span className={`text-[10px] sm:text-sm font-bold w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 sm:group-hover:bg-slate-100'}`}>
                    {format(day, 'd')}
                 </span>
                 
                 {hasActivity && (
                    <div className="hidden sm:block"> {/* Icono solo en PC para no ensuciar el movil */}
                        {isProfit ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                        )}
                    </div>
                 )}
              </div>
              
              {/* Contenido (Ingresos/Gastos) */}
              {hasActivity ? (
                <div className="flex flex-col gap-0.5 mt-auto text-[9px] sm:text-[11px] leading-tight">
                    
                    {/* Ingresos */}
                    {summary.income > 0 && (
                        <div className="flex justify-end sm:justify-between text-emerald-700 font-medium">
                            {/* "Ing:" solo visible en PC (sm) */}
                            <span className="hidden sm:flex items-center gap-1 text-slate-400 font-normal">
                                <ArrowUpRight className="w-3 h-3"/> Ing:
                            </span>
                            <span>{formatCompact(summary.income)}</span>
                        </div>
                    )}

                    {/* Gastos */}
                    {summary.expense > 0 && (
                        <div className="flex justify-end sm:justify-between text-rose-700 font-medium">
                            <span className="hidden sm:flex items-center gap-1 text-slate-400 font-normal">
                                <ArrowDownRight className="w-3 h-3"/> Gas:
                            </span>
                            <span>-{formatCompact(summary.expense)}</span>
                        </div>
                    )}

                    {/* Total (visible siempre, pero simplificado en movil) */}
                    <div className={`flex justify-end sm:justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5 font-bold ${isProfit ? 'text-slate-800' : 'text-slate-800'}`}>
                        <span className="hidden sm:inline">Total:</span>
                        <span className={isProfit ? 'text-blue-700' : 'text-rose-700'}>
                            {formatCompact(summary.profit)}
                        </span>
                    </div>

                </div>
              ) : (
                <div className="flex-1 hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
                    <Plus className="w-6 h-6 text-slate-400"/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selectedDay && (
        <DayDetailModal 
          date={selectedDay} 
          onClose={() => setSelectedDay(null)} 
          onUpdate={fetchMonthData} 
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTE MODAL ---
function DayDetailModal({ date, onClose, onUpdate }: { date: Date, onClose: () => void, onUpdate: () => void }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);

  const fetchDayDetails = async () => {
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd'); 
    
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', dateStr)
      .order('created_at', { ascending: false });
    setTxs(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDayDetails(); }, [date]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Borrar definitivamente?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    fetchDayDetails(); 
    onUpdate(); 
  };

  const handleEdit = (tx: any) => { setEditingTx(tx); setIsAddOpen(true); };
  const handleCloseForm = () => { setIsAddOpen(false); setEditingTx(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
      <TransactionModal 
        isOpen={isAddOpen} onClose={handleCloseForm} onSuccess={() => { fetchDayDetails(); onUpdate(); }}
        defaultDate={format(date, 'yyyy-MM-dd')} editingTx={editingTx} lockDate={true}
      />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-xl text-slate-800 capitalize">{format(date, "EEEE, d 'de' MMMM", { locale: es })}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loading ? ( <div className="text-center p-10 text-slate-400">Cargando...</div> ) : txs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2"><span className="text-4xl opacity-50">📝</span><p>Sin movimientos</p></div>
          ) : (
            <div className="space-y-3">
              {txs.map(tx => (
                <div key={tx.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                    </div>
                    <div>
                        <div className="font-bold text-slate-700 text-sm">{tx.category}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">{tx.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(tx)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-white border-t border-slate-100">
          <button onClick={() => { setEditingTx(null); setIsAddOpen(true); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
            <Plus className="w-5 h-5" /> Agregar Nuevo
          </button>
        </div>
      </div>
    </div>
  );
}