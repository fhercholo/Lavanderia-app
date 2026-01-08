import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, BarChart3, 
  Landmark, ToggleLeft, ToggleRight, Scale, TrendingUp, TrendingDown, PieChart, Activity, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, AreaChart, Area
} from 'recharts';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format, eachDayOfInterval } from 'date-fns';

// --- HELPERS ---
const formatMoney = (val: any) => {
  const num = Number(val);
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(isNaN(num) ? 0 : num);
};

// Tooltip Estilo Vidrio (Adaptado a Azul)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 text-xs z-50">
        <p className="font-bold mb-2 opacity-60 uppercase tracking-widest text-[10px]">{label}</p>
        <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: entry.color }}></span>
                        {entry.name}
                    </span>
                    <span className="font-mono font-bold text-sm">{formatMoney(entry.value)}</span>
                </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

// Gráfica Horizontal (Ingresos en Azul)
const HorizontalChart = ({ data, barColor }: { data: any[], barColor: string }) => {
    const chartData = data.slice(0, 7); 
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <Tooltip cursor={{fill: '#f8fafc', radius: 8}} content={<CustomTooltip />} />
                <Bar 
                    dataKey="value" 
                    name="Total" 
                    fill={barColor} 
                    radius={[0, 8, 8, 0]} 
                    barSize={18} 
                    animationDuration={1500} 
                    background={{ fill: '#f8fafc', radius: 8 }} 
                >
                    <LabelList 
                        dataKey="value" 
                        position="right" 
                        formatter={(val: any) => `$${Number(val).toLocaleString()}`} 
                        style={{ fontSize: '10px', fill: '#94a3b8', fontWeight: 'bold', fontFamily: 'monospace' }} 
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export function Dashboard() {
  // --- ESTADOS ---
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 
  const [includeCaja, setIncludeCaja] = useState(false); 
  const [, setCurrentDate] = useState(new Date());

  // Datos
  const [globalStats, setGlobalStats] = useState({ income: 0, expense: 0, profit: 0 });
  const [filteredKpis, setFilteredKpis] = useState({ income: 0, expense: 0, profit: 0 });
  
  // Gráficas
  const [annualData, setAnnualData] = useState<any[]>([]); 
  const [chartData, setChartData] = useState<any[]>([]); 
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<any[]>([]);
  const [monthlyExpenseData, setMonthlyExpenseData] = useState<any[]>([]);
  
  // Insights
  const [insights, setInsights] = useState({
      bestPeriodLabel: '',
      bestPeriodAmount: 0,
      topIncomeName: '',
      topIncomePct: 0,
      topExpenseName: '',
      topExpensePct: 0
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { id: '01', name: 'Enero' }, { id: '02', name: 'Febrero' }, { id: '03', name: 'Marzo' },
    { id: '04', name: 'Abril' }, { id: '05', name: 'Mayo' }, { id: '06', name: 'Junio' },
    { id: '07', name: 'Julio' }, { id: '08', name: 'Agosto' }, { id: '09', name: 'Septiembre' },
    { id: '10', name: 'Octubre' }, { id: '11', name: 'Noviembre' }, { id: '12', name: 'Diciembre' }
  ];

  // Sincronizar fecha visual
  useEffect(() => {
      if (selectedMonth !== 'all') {
          const newDate = new Date(selectedYear, parseInt(selectedMonth) - 1, 1);
          setCurrentDate(newDate);
      } else {
          setCurrentDate(new Date(selectedYear, 0, 1));
      }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchDashboardData();
    fetchHistoricalData();
  }, [selectedYear, selectedMonth, includeCaja]); 

  // --- CARGA DE DATOS ---
  const fetchDashboardData = async () => {
    let startDate, endDate;
    
    if (selectedMonth === 'all') {
      startDate = format(startOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
      endDate = format(endOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
    } else {
      const monthIndex = parseInt(selectedMonth) - 1;
      startDate = format(startOfMonth(new Date(selectedYear, monthIndex, 1)), 'yyyy-MM-dd');
      endDate = format(endOfMonth(new Date(selectedYear, monthIndex, 1)), 'yyyy-MM-dd');
    }

    let { data: transactions } = await supabase.from('transactions').select('*').gte('date', startDate).lte('date', endDate);
    if (!transactions) transactions = [];

    if (!includeCaja) transactions = transactions.filter(t => t.category.toUpperCase() !== 'CAJA');

    // 1. KPIs Generales
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    setFilteredKpis({ income, expense, profit: income - expense });

    // 2. Preparar datos para Gráfica Principal
    let bestLabel = '-';
    let bestVal = 0;

    if (selectedMonth === 'all') {
        const monthMap = new Array(12).fill(0).map((_, i) => ({ name: months[i].name.substring(0,3), Ingresos: 0, Gastos: 0 }));
        transactions.forEach(t => {
            const date = new Date(t.date + 'T00:00:00');
            const mIndex = date.getMonth();
            const amt = Number(t.amount);
            if (t.type === 'income') monthMap[mIndex].Ingresos += amt;
            else monthMap[mIndex].Gastos += amt;
        });
        
        monthMap.forEach(m => { if(m.Ingresos > bestVal) { bestVal = m.Ingresos; bestLabel = m.name; } });
        
        setAnnualData(monthMap);
        setChartData([]);
    } else {
        // [FIX CRÍTICO]: Calcular la fecha base localmente para el eje X
        // Esto evita que use el 'currentDate' viejo antes de que React lo actualice
        const targetDate = new Date(selectedYear, parseInt(selectedMonth) - 1, 1);
        const days = eachDayOfInterval({ start: startOfMonth(targetDate), end: endOfMonth(targetDate) });
        
        const dayMap = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTxs = transactions!.filter((t: any) => t.date === dayStr);
            const dayInc = dayTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
            const dayExp = dayTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
            return { name: format(day, 'd'), ingresos: dayInc, gastos: dayExp };
        });

        dayMap.forEach(d => { if(d.ingresos > bestVal) { bestVal = d.ingresos; bestLabel = `Día ${d.name}`; } });

        setChartData(dayMap);
        setAnnualData([]);
    }

    // 3. Desgloses & Insights
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};
    transactions.forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'income') incomeCats[t.category] = (incomeCats[t.category] || 0) + amount;
        else expenseCats[t.category] = (expenseCats[t.category] || 0) + amount;
    });

    const sortedIncome = Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const sortedExpense = Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    setMonthlyIncomeData(sortedIncome);
    setMonthlyExpenseData(sortedExpense);

    const topIncVal = sortedIncome[0]?.value || 0;
    const topExpVal = sortedExpense[0]?.value || 0;
    
    setInsights({
        bestPeriodLabel: bestLabel,
        bestPeriodAmount: bestVal,
        topIncomeName: sortedIncome[0]?.name || '-',
        topIncomePct: income > 0 ? (topIncVal / income) * 100 : 0,
        topExpenseName: sortedExpense[0]?.name || '-',
        topExpensePct: expense > 0 ? (topExpVal / expense) * 100 : 0
    });
  };

  const fetchHistoricalData = async () => {
    let { data: allTxs } = await supabase.from('transactions').select('amount, type, category');
    if (!allTxs) allTxs = [];
    if (!includeCaja) allTxs = allTxs.filter(t => t.category.toUpperCase() !== 'CAJA');

    const totalIncome = allTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = allTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    setGlobalStats({ income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense });
  };

  // COLORES DALTONISMO: Ingresos = Blue (#3b82f6), Gastos = Red (#ef4444)
  const BLUE_COLOR = "#3b82f6";
  const RED_COLOR = "#ef4444";

  return (
    <div className="animate-fade-in space-y-8 pb-10 max-w-7xl mx-auto font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-3xl shadow-xl shadow-slate-100/50 border border-slate-100">
        <div className="text-center xl:text-left">
          <h2 className="text-3xl font-black text-slate-800 flex items-center justify-center xl:justify-start gap-3 tracking-tight">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                <BarChart3 className="w-6 h-6" /> 
            </div>
            Dashboard
          </h2>
          <p className="text-slate-400 font-medium mt-1 ml-1 text-sm">Resumen ejecutivo y analítica.</p>
        </div>
        
        {/* CONTROLES */}
        <div className="w-full xl:w-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 items-center">
                <button 
                    onClick={() => setIncludeCaja(!includeCaja)}
                    className={`h-10 w-full lg:w-auto flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold border transition-all duration-300 ${
                        includeCaja 
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                    {includeCaja ? <ToggleRight className="w-4 h-4"/> : <ToggleLeft className="w-4 h-4"/>}
                    <span>{includeCaja ? 'Caja Incluida' : 'Sin Caja'}</span>
                </button>

                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-10 w-full lg:w-auto bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-600 outline-none hover:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer uppercase"
                >
                    <option value="all">📅 Todo el Año</option>
                    {months.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="h-10 w-full lg:w-auto bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-600 outline-none hover:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* KPI PRINCIPAL: BALANCE HISTÓRICO */}
      <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-slate-300 text-white flex flex-col md:flex-row items-center justify-between gap-8 group">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <Wallet className="w-64 h-64"/>
          </div>
          
          <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-400"><Scale className="w-4 h-4"/></div>
                  <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">Balance Global Histórico</p>
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  {formatMoney(globalStats.profit)}
              </h2>
              <div className="mt-4 flex gap-6 text-sm font-medium text-slate-400">
                  <div className="flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-blue-500"/> Ingresos: <span className="text-white font-mono">{formatMoney(globalStats.income)}</span></div>
                  <div className="w-px h-4 bg-slate-700"></div>
                  <div className="flex items-center gap-2"><ArrowDownCircle className="w-4 h-4 text-rose-500"/> Gastos: <span className="text-white font-mono">{formatMoney(globalStats.expense)}</span></div>
              </div>
          </div>
      </div>

      {/* KPIS DEL PERIODO */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2 flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Métricas del Periodo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-100 transition-colors"><TrendingUp className="w-6 h-6"/></div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">INGRESOS</span>
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatMoney(filteredKpis.income)}</h3>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-100 transition-colors"><TrendingDown className="w-6 h-6"/></div>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">GASTOS</span>
                </div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatMoney(filteredKpis.expense)}</h3>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl transition-colors ${filteredKpis.profit >= 0 ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'}`}>
                        <Activity className="w-6 h-6"/>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase ${filteredKpis.profit >= 0 ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-orange-600 bg-orange-50 border-orange-100'}`}>Utilidad Neta</span>
                </div>
                <h3 className={`text-3xl font-black tracking-tight ${filteredKpis.profit >= 0 ? 'text-slate-800' : 'text-orange-600'}`}>{formatMoney(filteredKpis.profit)}</h3>
            </div>
        </div>
      </div>

      {/* GRÁFICA PRINCIPAL */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Landmark className="w-5 h-5 text-indigo-500"/> Flujo de Efectivo
                </h3>
                <p className="text-slate-400 text-sm mt-1 font-medium">Comparativa visual de entradas y salidas.</p>
            </div>
             <div className="flex gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Ingresos</div>
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Gastos</div>
             </div>
        </div>

        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                {selectedMonth === 'all' ? (
                    <BarChart data={annualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', radius: 8}} />
                        <Bar dataKey="Ingresos" fill={BLUE_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={1500} />
                        <Bar dataKey="Gastos" fill={RED_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={1500} />
                    </BarChart>
                ) : (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={BLUE_COLOR} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={BLUE_COLOR} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={RED_COLOR} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={RED_COLOR} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 700}}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`}/>
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="ingresos" stroke={BLUE_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" activeDot={{r: 6, strokeWidth: 0}} />
                        <Area type="monotone" dataKey="gastos" stroke={RED_COLOR} strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" activeDot={{r: 6, strokeWidth: 0}} />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
        
        {/* FOOTER: CONCLUSIÓN GRÁFICA PRINCIPAL */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-3">
            <div className="bg-indigo-50 p-2 rounded-full text-indigo-600 shrink-0"><Info className="w-4 h-4"/></div>
            <p className="text-sm text-slate-500 leading-relaxed">
                El periodo con mayor movimiento fue <strong>{insights.bestPeriodLabel}</strong> con ingresos totales de <strong>{formatMoney(insights.bestPeriodAmount)}</strong>. 
                {insights.bestPeriodAmount > 0 && " ¡Excelente desempeño!"}
            </p>
        </div>
      </div>

      {/* DESGLOSE POR CATEGORÍA */}
      <div className="pt-4">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-2 flex items-center gap-2">
            <PieChart className="w-4 h-4"/> Análisis Operativo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ingresos Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-blue-50/50 flex flex-col h-[500px]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><ArrowUpCircle className="w-5 h-5"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Origen de Ingresos</h3>
                            <p className="text-xs text-slate-400 font-medium">Categorías principales</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        {monthlyIncomeData.length > 0 ? (
                            <HorizontalChart data={monthlyIncomeData} barColor={BLUE_COLOR} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <Wallet className="w-12 h-12 mb-2"/>
                                <span className="text-sm font-bold">Sin datos</span>
                            </div>
                        )}
                    </div>
                    {/* Conclusión Ingresos */}
                    <div className="mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Tu fuente principal es <strong>{insights.topIncomeName}</strong>, representando el <strong>{insights.topIncomePct.toFixed(1)}%</strong> del total.
                        </p>
                    </div>
                </div>

                {/* Gastos Chart */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-rose-50/50 flex flex-col h-[500px]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-rose-100 p-2 rounded-xl text-rose-600"><ArrowDownCircle className="w-5 h-5"/></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Distribución de Gastos</h3>
                            <p className="text-xs text-slate-400 font-medium">Salidas operativas</p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        {monthlyExpenseData.length > 0 ? (
                            <HorizontalChart data={monthlyExpenseData} barColor={RED_COLOR} />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <Wallet className="w-12 h-12 mb-2"/>
                                <span className="text-sm font-bold">Sin datos</span>
                            </div>
                        )}
                    </div>
                    {/* Conclusión Gastos */}
                    <div className="mt-4 pt-4 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 p-6 rounded-b-3xl">
                        <p className="text-xs text-slate-500 leading-relaxed">
                            El gasto más fuerte es <strong>{insights.topExpenseName}</strong>, ocupando el <strong>{insights.topExpensePct.toFixed(1)}%</strong> de tus egresos.
                        </p>
                    </div>
                </div>
        </div>
      </div>

    </div>
  );
}