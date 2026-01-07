import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, BarChart3, 
  Landmark, ToggleLeft, ToggleRight, Scale, TrendingUp, TrendingDown, DollarSign, PieChart, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell
} from 'recharts';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns';

// --- HELPERS DE FORMATO Y ESTILO ---
const formatMoney = (val: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const formatCompactMoney = (val: number) => {
  if (val === 0) return '';
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`; 
  return `$${val}`;
};

// Tooltip Pro (Estilo Vidrio Oscuro)
const CustomTooltip = ({ active, payload, label, prefix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-md text-white p-3 rounded-lg shadow-2xl border border-slate-700 text-xs z-50">
        <p className="font-bold mb-1 opacity-70 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
                <p key={index} className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    {entry.name}: {formatMoney(entry.value)}
                </p>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

// Gráfica Horizontal Pro (Categorías)
const HorizontalChart = ({ data, color, barColor }: { data: any[], color: string, barColor: string }) => {
    const chartData = data.slice(0, 7); 
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
                <Bar dataKey="value" name="Total" fill={barColor} radius={[0, 6, 6, 0]} barSize={20} animationDuration={1500} background={{ fill: '#f1f5f9', radius: [0, 6, 6, 0] }}>
                    <LabelList dataKey="value" position="right" formatter={(val: number) => `$${val.toLocaleString()}`} style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export function Dashboard() {
  
  // --- FILTROS ---
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 
  const [includeCaja, setIncludeCaja] = useState(false); 

  // --- ESTADOS DE DATOS ---
  const [globalStats, setGlobalStats] = useState({ income: 0, expense: 0, profit: 0 });
  const [filteredKpis, setFilteredKpis] = useState({ income: 0, expense: 0, profit: 0 });
  const [annualData, setAnnualData] = useState<any[]>([]);
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<any[]>([]);
  const [monthlyExpenseData, setMonthlyExpenseData] = useState<any[]>([]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { id: '01', name: 'Enero' }, { id: '02', name: 'Febrero' }, { id: '03', name: 'Marzo' },
    { id: '04', name: 'Abril' }, { id: '05', name: 'Mayo' }, { id: '06', name: 'Junio' },
    { id: '07', name: 'Julio' }, { id: '08', name: 'Agosto' }, { id: '09', name: 'Septiembre' },
    { id: '10', name: 'Octubre' }, { id: '11', name: 'Noviembre' }, { id: '12', name: 'Diciembre' }
  ];

  useEffect(() => {
    fetchDashboardData();
    fetchHistoricalData();
  }, [selectedYear, selectedMonth, includeCaja]); 

  // --- LOGICA SIN CAMBIOS ---
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

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    setFilteredKpis({ income, expense, profit: income - expense });

    const monthMap = new Array(12).fill(0).map((_, i) => ({ name: months[i].name.substring(0,3), Ingresos: 0, Gastos: 0, Utilidad: 0 }));
    transactions.forEach(t => {
      const date = new Date(t.date + 'T00:00:00');
      const mIndex = date.getMonth();
      if (t.type === 'income') monthMap[mIndex].Ingresos += Number(t.amount);
      else monthMap[mIndex].Gastos += Number(t.amount);
    });
    monthMap.forEach(m => m.Utilidad = m.Ingresos - m.Gastos);
    setAnnualData(monthMap);

    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};
    transactions.forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'income') incomeCats[t.category] = (incomeCats[t.category] || 0) + amount;
        else expenseCats[t.category] = (expenseCats[t.category] || 0) + amount;
    });

    setMonthlyIncomeData(Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    setMonthlyExpenseData(Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
  };

  const fetchHistoricalData = async () => {
    let { data: allTxs } = await supabase.from('transactions').select('amount, type, category');
    if (!allTxs) allTxs = [];
    if (!includeCaja) allTxs = allTxs.filter(t => t.category.toUpperCase() !== 'CAJA');

    const totalIncome = allTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = allTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    setGlobalStats({ income: totalIncome, expense: totalExpense, profit: totalIncome - totalExpense });
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10 max-w-7xl mx-auto font-sans">
      
      {/* HEADER DE CONTROL (Igual que reportes) */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center xl:text-left">
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center justify-center xl:justify-start gap-3 tracking-tight">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
                <BarChart3 className="w-6 h-6" /> 
            </div>
            Dashboard General
          </h2>
          <p className="text-slate-500 font-medium mt-1 ml-1">Visión estratégica de tu negocio.</p>
        </div>
        
        {/* CONTROLES GRID RESPONSIVE */}
        <div className="w-full xl:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 items-center">
                
                {/* SWITCH CAJA */}
                <button 
                    onClick={() => setIncludeCaja(!includeCaja)}
                    className={`h-11 w-full lg:w-auto flex items-center justify-center gap-2 px-4 rounded-lg text-sm font-bold border transition-all duration-300 ${
                        includeCaja 
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                >
                    {includeCaja ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>}
                    <span>{includeCaja ? 'Con Caja' : 'Sin Caja'}</span>
                </button>

                {/* SELECTORES */}
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-11 w-full lg:w-auto bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                    <option value="all">📅 Todo el Año</option>
                    {months.map((m, i) => <option key={i} value={String(i)}>{m.name}</option>)}
                </select>

                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="h-11 w-full lg:w-auto bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* === SECCIÓN 1: BALANCE HISTÓRICO (BURBUJAS PRO) === */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
            <Scale className="w-4 h-4"/> Balance Histórico Total
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Burbuja 1: Ingresos Históricos */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Landmark className="w-24 h-24 text-emerald-600"/>
                </div>
                <div className="relative z-10">
                    <p className="text-emerald-600/80 text-xs font-bold uppercase tracking-widest mb-1">Ingresos Históricos</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatMoney(globalStats.income)}</h3>
                </div>
            </div>

            {/* Burbuja 2: Gastos Históricos */}
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown className="w-24 h-24 text-rose-600"/>
                </div>
                <div className="relative z-10">
                    <p className="text-rose-600/80 text-xs font-bold uppercase tracking-widest mb-1">Gastos Históricos</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{formatMoney(globalStats.expense)}</h3>
                </div>
            </div>

            {/* Burbuja 3: Utilidad Histórica (DARK MODE PRO) */}
            <div className="relative overflow-hidden bg-slate-900 p-6 rounded-2xl shadow-xl shadow-slate-200 flex items-center justify-between text-white group">
                <div className="absolute -right-6 -top-6 text-slate-700 opacity-20 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                    <Wallet className="w-40 h-40"/>
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex justify-between items-start w-full">
                         <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                <DollarSign className="w-3 h-3 text-amber-400"/> Balance Total
                            </p>
                            <h3 className={`text-3xl font-black tracking-tight ${globalStats.profit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                                {formatMoney(globalStats.profit)}
                            </h3>
                         </div>
                         <div className={`p-2 rounded-lg ${globalStats.profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            <Activity className="w-6 h-6"/>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* === SECCIÓN 2: RESUMEN DEL PERIODO (TARJETAS CLEAN) === */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Resumen del Periodo ({selectedMonth === 'all' ? selectedYear : months[parseInt(selectedMonth)].name})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Ingresos Periodo */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-emerald-200 hover:shadow-md transition-all">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <ArrowUpCircle className="w-3 h-3 text-emerald-500"/> Ingresos
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatMoney(filteredKpis.income)}</h3>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6"/>
                </div>
            </div>

            {/* Gastos Periodo */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-rose-200 hover:shadow-md transition-all">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <ArrowDownCircle className="w-3 h-3 text-rose-500"/> Gastos
                    </p>
                    <h3 className="text-2xl font-bold text-slate-800">{formatMoney(filteredKpis.expense)}</h3>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl text-rose-600 group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-6 h-6"/>
                </div>
            </div>

            {/* Utilidad Periodo */}
            <div className={`p-5 rounded-2xl shadow-sm border flex items-center justify-between hover:shadow-md transition-all ${filteredKpis.profit >= 0 ? 'bg-white border-slate-100 hover:border-blue-200' : 'bg-red-50 border-red-100'}`}>
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Wallet className={`w-3 h-3 ${filteredKpis.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}/> Utilidad
                    </p>
                    <h3 className={`text-2xl font-bold ${filteredKpis.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatMoney(filteredKpis.profit)}
                    </h3>
                </div>
                <div className={`p-3 rounded-xl ${filteredKpis.profit >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                    <DollarSign className="w-6 h-6"/>
                </div>
            </div>
        </div>
      </div>

      {/* GRÁFICA PRINCIPAL (HERO SECTION) */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Landmark className="w-5 h-5 text-indigo-500"/> Flujo de Efectivo {selectedYear}
                </h3>
                <p className="text-slate-400 text-sm mt-1">Comparativa de ingresos vs gastos en el tiempo.</p>
            </div>
             <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ingresos</span>
                <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Gastos</span>
             </div>
        </div>

        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={1500} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={1500} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* DESGLOSE POR CATEGORÍA */}
      <div className="pt-4">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
            <PieChart className="w-4 h-4"/> Detalles Operativos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-100 transition-all duration-300 h-[420px]">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-md"><ArrowUpCircle className="w-4 h-4"/></span> 
                            Origen de Ingresos
                        </h3>
                    </div>
                    <div className="w-full h-[300px]">
                        {monthlyIncomeData.length > 0 ? (
                            <HorizontalChart data={monthlyIncomeData} color="#10b981" barColor="#10b981" />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Wallet className="w-12 h-12 mb-2 opacity-20"/>
                                <span className="text-sm font-medium">Sin datos registrados</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-rose-100 transition-all duration-300 h-[420px]">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <span className="bg-rose-100 text-rose-600 p-1.5 rounded-md"><ArrowDownCircle className="w-4 h-4"/></span>
                            Distribución de Gastos
                        </h3>
                    </div>
                    <div className="w-full h-[300px]">
                        {monthlyExpenseData.length > 0 ? (
                            <HorizontalChart data={monthlyExpenseData} color="#ef4444" barColor="#f43f5e" />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Wallet className="w-12 h-12 mb-2 opacity-20"/>
                                <span className="text-sm font-medium">Sin datos registrados</span>
                            </div>
                        )}
                    </div>
                </div>
        </div>
      </div>

    </div>
  );
}