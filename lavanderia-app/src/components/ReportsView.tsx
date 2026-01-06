import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useReactToPrint } from 'react-to-print';
import { 
  FileText, TrendingUp, TrendingDown, CalendarRange, Wallet, BarChart3, Printer 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell 
} from 'recharts';
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

// --- COMPONENTE AUXILIAR (Lo sacamos afuera para que no cause re-renders) ---
const OperationalChart = ({ data, title, icon: Icon }: any) => {
  // Función auxiliar de formato dentro del componente
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[320px] print:h-[250px] print:shadow-none print:border-slate-300">
      <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase tracking-wide">
        <Icon className="w-4 h-4 text-slate-400"/> {title}
      </h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} fontWeight={600} tick={{fill: '#64748b'}} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} fontSize={11} />
            <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: any) => [formatMoney(Number(value)), 'Ingreso']} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
              {data.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-50 flex justify-center gap-4 text-[10px] font-bold text-slate-500">
         {data.map((d:any) => (
             <div key={d.name} className="flex items-center gap-1.5">
                 <span className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></span>
                 {d.name}: <span className="text-slate-800">{formatMoney(d.value)}</span>
             </div>
         ))}
      </div>
    </div>
  );
};

export function ReportsView() {
  const [loading, setLoading] = useState(false);
  const componentRef = useRef(null); 
  
  const [businessInfo, setBusinessInfo] = useState({ name: 'Mi Lavandería', logo_url: '' });

  // Filtros
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Datos
  const [financials, setFinancials] = useState({ income: 0, expense: 0, profit: 0, margin: 0 });
  const [expenseRanking, setExpenseRanking] = useState<any[]>([]);
  const [salesMix, setSalesMix] = useState<any[]>([]);
  const [weekDayData, setWeekDayData] = useState<any[]>([]);
  const [weekendData, setWeekendData] = useState<any[]>([]);
  const [dayStats, setDayStats] = useState({ totalWeek: 0, totalWeekend: 0, bestDayType: '' });

  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Reporte_${selectedMonth === 'all' ? 'Anual' : months[Number(selectedMonth)]}_${selectedYear}`,
  });

  useEffect(() => {
    fetchBusinessInfo();
    generateReport();
  }, [selectedYear, selectedMonth]);

  const fetchBusinessInfo = async () => {
    const { data } = await supabase.from('business_settings').select('name, logo_url').single();
    if (data) setBusinessInfo({ name: data.name || 'Mi Lavandería', logo_url: data.logo_url });
  };

  const generateReport = async () => {
    setLoading(true);
    let startStr, endStr;
    const baseDate = new Date(selectedYear, 0, 1);

    if (selectedMonth === 'all') {
      startStr = format(startOfYear(baseDate), 'yyyy-MM-dd');
      endStr = format(endOfYear(baseDate), 'yyyy-MM-dd');
    } else {
      const monthDate = new Date(selectedYear, parseInt(selectedMonth), 1);
      startStr = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      endStr = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    }

    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);

    if (!txs) { setLoading(false); return; }

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseMap: Record<string, number> = {};
    const salesMap: Record<string, number> = {};
    let weekAuto = 0, weekEncargo = 0, weekendAuto = 0, weekendEncargo = 0;

    txs.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
        salesMap[tx.category] = (salesMap[tx.category] || 0) + amount;
        
        const date = parseISO(tx.date);
        const dayIndex = getDay(date); 
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        const catLower = tx.category.toLowerCase();
        const isAuto = catLower.includes('auto') || catLower.includes('self') || catLower.includes('autoservicio');

        if (isWeekend) { isAuto ? weekendAuto += amount : weekendEncargo += amount; } 
        else { isAuto ? weekAuto += amount : weekEncargo += amount; }
      } else {
        totalExpense += amount;
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + amount;
      }
    });

    const profit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
    const expensesSorted = Object.keys(expenseMap).map(k => ({ name: k, value: expenseMap[k], percent: (expenseMap[k]/totalExpense)*100 })).sort((a, b) => b.value - a.value);
    const salesSorted = Object.keys(salesMap).map(k => ({ name: k, value: salesMap[k], percent: (salesMap[k]/totalIncome)*100 })).sort((a, b) => b.value - a.value);

    setFinancials({ income: totalIncome, expense: totalExpense, profit, margin });
    setExpenseRanking(expensesSorted);
    setSalesMix(salesSorted);
    setWeekDayData([{ name: 'Autoservicio', value: weekAuto, color: '#3b82f6' }, { name: 'Por Encargo', value: weekEncargo, color: '#10b981' }]);
    setWeekendData([{ name: 'Autoservicio', value: weekendAuto, color: '#3b82f6' }, { name: 'Por Encargo', value: weekendEncargo, color: '#10b981' }]);
    
    const weekTotal = weekAuto + weekEncargo;
    const weekendTotal = weekendAuto + weekendEncargo;
    setDayStats({ totalWeek: weekTotal, totalWeekend: weekendTotal, bestDayType: weekTotal > weekendTotal ? 'Entre Semana' : 'Fin de Semana' });

    setLoading(false);
  };

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto space-y-8">
      
      {/* HEADER NO IMPRIMIBLE */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Reporte Integral
          </h2>
          <p className="text-slate-500">Visión financiera y operativa.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer hover:text-blue-600 px-2">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="w-px bg-slate-200"></div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer hover:text-blue-600 px-2 min-w-[120px]">
                    <option value="all">Todo el Año</option>
                    <hr/>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
            </div>

            <button 
              onClick={handlePrint}
              className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
            >
              <Printer className="w-4 h-4" /> 
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
        </div>
      </div>

      {/* ÁREA IMPRIMIBLE */}
      <div ref={componentRef} className="print:p-8 space-y-8">
        
        {/* ENCABEZADO PDF */}
        <div className="hidden print:flex flex-col items-center justify-center border-b-2 border-slate-100 pb-6 mb-8 text-center">
            {businessInfo.logo_url && (
               <img src={businessInfo.logo_url} alt="Logo" className="h-20 object-contain mb-2" />
            )}
            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">{businessInfo.name}</h1>
            <p className="text-slate-500 text-sm mt-1">
              Reporte de Actividad: {selectedMonth === 'all' ? 'Anual' : months[Number(selectedMonth)]} {selectedYear}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Generado el: {format(new Date(), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
            </p>
        </div>

        {/* 1. SECCIÓN FINANCIERA */}
        <div className="grid grid-cols-1 md:grid-cols-4 print:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm print:border-slate-300 print:shadow-none">
                <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Ventas</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatMoney(financials.income)}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm print:border-slate-300 print:shadow-none">
                <p className="text-xs font-bold text-rose-600 uppercase mb-1">Gastos</p>
                <h3 className="text-2xl font-bold text-slate-800">{formatMoney(financials.expense)}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm print:border-slate-300 print:shadow-none">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Ganancia</p>
                <h3 className={`text-2xl font-bold ${financials.profit >=0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatMoney(financials.profit)}
                </h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-slate-300 print:shadow-none">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Margen</p>
                <h3 className="text-2xl font-bold text-slate-800">{financials.margin.toFixed(1)}%</h3>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-8 print:break-inside-avoid">
            {/* Ranking Gastos */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full print:border-slate-300 print:shadow-none">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase">
                    <TrendingDown className="w-4 h-4 text-rose-500"/> Gastos Principales
                </h3>
                {loading ? <div className="text-center py-10">...</div> : (
                    <div className="space-y-3">
                        {expenseRanking.slice(0, 5).map((item, idx) => (
                            <div key={item.name} className="relative">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-bold text-slate-700">{idx+1}. {item.name}</span>
                                    <span className="font-medium text-slate-600">{formatMoney(item.value)}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden print:bg-slate-200">
                                    <div className="bg-rose-500 h-1.5 rounded-full print:bg-rose-600 print:print-color-adjust-exact" style={{ width: `${item.percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Mix Ventas */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full print:border-slate-300 print:shadow-none">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4 text-sm uppercase">
                    <TrendingUp className="w-4 h-4 text-emerald-500"/> Categorías de Venta
                </h3>
                {loading ? <div className="text-center py-10">...</div> : (
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={salesMix} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={90} tick={{fontSize: 10, fontWeight: 'bold'}} interval={0} />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="value" position="right" formatter={(val:any) => formatMoney(Number(val))} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#059669' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>

        {/* 2. SECCIÓN OPERATIVA */}
        <div className="pt-4 border-t border-slate-200 print:break-before-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 print:text-base">
                <BarChart3 className="text-indigo-600"/> Rendimiento Operativo
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6">
                <OperationalChart data={weekDayData} title="Lun - Vie" icon={Wallet} />
                <OperationalChart data={weekendData} title="Sáb - Dom" icon={CalendarRange} />
            </div>
            
            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 print:bg-transparent print:border-slate-300 print:text-xs">
                <p><strong>Resumen:</strong> El periodo muestra una ganancia neta de <strong>{formatMoney(financials.profit)}</strong> con un margen del <strong>{financials.margin.toFixed(1)}%</strong>. 
                El día operativo más fuerte es <strong>{dayStats.bestDayType}</strong>.</p>
            </div>
        </div>

      </div>
    </div>
  );
}