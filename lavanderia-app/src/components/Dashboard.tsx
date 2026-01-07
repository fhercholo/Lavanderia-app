import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, BarChart3, 
  Landmark, ToggleLeft, ToggleRight, Scale, TrendingUp, TrendingDown, DollarSign 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList 
} from 'recharts';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns';

export function Dashboard() {
  
  // --- FILTROS ---
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 
  const [includeCaja, setIncludeCaja] = useState(false); 

  // --- ESTADOS DE DATOS ---
  // 1. Datos Históricos (Acumulado Total)
  const [globalStats, setGlobalStats] = useState({ income: 0, expense: 0, profit: 0 });
  
  // 2. Datos del Periodo (Filtrados por mes/año)
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

  // --- A. DATOS DEL PERIODO (FILTRADOS) ---
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

    let { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!transactions) transactions = [];

    // Filtro Caja
    if (!includeCaja) {
        transactions = transactions.filter(t => t.category.toUpperCase() !== 'CAJA');
    }

    // KPIs Periodo
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    setFilteredKpis({ income, expense, profit: income - expense });

    // Datos Gráfica Anual
    const monthMap = new Array(12).fill(0).map((_, i) => ({ 
      name: months[i].name.substring(0,3), 
      Ingresos: 0, 
      Gastos: 0,
      Utilidad: 0 
    }));

    transactions.forEach(t => {
      const date = new Date(t.date + 'T00:00:00');
      const mIndex = date.getMonth();
      if (t.type === 'income') monthMap[mIndex].Ingresos += Number(t.amount);
      else monthMap[mIndex].Gastos += Number(t.amount);
    });
    monthMap.forEach(m => m.Utilidad = m.Ingresos - m.Gastos);
    setAnnualData(monthMap);

    // Datos Gráficas Circulares
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

  // --- B. DATOS HISTÓRICOS (TOTALES) ---
  const fetchHistoricalData = async () => {
    let { data: allTxs } = await supabase
      .from('transactions')
      .select('amount, type, category');

    if (!allTxs) allTxs = [];

    if (!includeCaja) {
        allTxs = allTxs.filter(t => t.category.toUpperCase() !== 'CAJA');
    }

    const totalIncome = allTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = allTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    setGlobalStats({
        income: totalIncome,
        expense: totalExpense,
        profit: totalIncome - totalExpense
    });
  };

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Dashboard Financiero
          </h2>
          <p className="text-slate-500 text-sm">Resumen general de tu negocio.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* SWITCH CAJA */}
            <button 
                onClick={() => setIncludeCaja(!includeCaja)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                    includeCaja 
                    ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title={includeCaja ? "Ocultar movimientos internos" : "Mostrar movimientos de CAJA"}
            >
                {includeCaja ? <ToggleRight className="w-6 h-6 text-purple-600"/> : <ToggleLeft className="w-6 h-6 text-slate-300"/>}
                <span className="hidden sm:inline">{includeCaja ? 'Con Caja' : 'Sin Caja'}</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4 text-slate-400 ml-1" />
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-slate-700 text-sm font-semibold outline-none cursor-pointer py-1"
                >
                    <option value="all">Todo el Año</option>
                    {months.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-slate-700 text-sm font-bold outline-none cursor-pointer pr-2"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* === SECCIÓN 1: BALANCE HISTÓRICO (BURBUJAS) === */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
            <Scale className="w-4 h-4"/> Balance Histórico Acumulado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Burbuja 1: Ingresos Históricos */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:border-emerald-200 transition-colors">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Ingresos Históricos</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{formatMoney(globalStats.income)}</h3>
                </div>
                <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
                    <Landmark className="w-6 h-6"/>
                </div>
            </div>

            {/* Burbuja 2: Gastos Históricos */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group hover:border-rose-200 transition-colors">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Gastos Históricos</p>
                    <h3 className="text-2xl font-bold text-rose-600">{formatMoney(globalStats.expense)}</h3>
                </div>
                <div className="bg-rose-50 p-3 rounded-full text-rose-600">
                    <TrendingDown className="w-6 h-6"/>
                </div>
            </div>

            {/* Burbuja 3: Utilidad Histórica (Destacada) */}
            <div className="bg-slate-800 p-5 rounded-2xl shadow-md flex items-center justify-between text-white relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10"><Wallet className="w-24 h-24 text-white"/></div>
                <div className="relative z-10">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Utilidad Total (Caja)</p>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{formatMoney(globalStats.profit)}</h3>
                </div>
                <div className="bg-slate-700 p-3 rounded-full text-amber-400 relative z-10 shadow-sm border border-slate-600">
                    <DollarSign className="w-6 h-6"/>
                </div>
            </div>
        </div>
      </div>

      {/* === SECCIÓN 2: RESUMEN DEL PERIODO (FILTRADO) === */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 ml-1 flex items-center gap-2">
            <Calendar className="w-4 h-4"/> Resumen del Periodo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Ingresos Periodo */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 group hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Ingresos</p>
                    <ArrowUpCircle className="w-5 h-5 text-emerald-500"/>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{formatMoney(filteredKpis.income)}</h3>
            </div>

            {/* Gastos Periodo */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 group hover:border-rose-200 transition-colors">
                <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Gastos</p>
                    <ArrowDownCircle className="w-5 h-5 text-rose-500"/>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{formatMoney(filteredKpis.expense)}</h3>
            </div>

            {/* Utilidad Periodo */}
            <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-between h-32 transition-colors ${filteredKpis.profit >= 0 ? 'bg-white border-slate-100 hover:border-blue-300' : 'bg-red-50 border-red-100'}`}>
                <div className="flex justify-between items-start">
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Utilidad Neta</p>
                    <Wallet className={`w-5 h-5 ${filteredKpis.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}/>
                </div>
                <h3 className={`text-3xl font-bold ${filteredKpis.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatMoney(filteredKpis.profit)}
                </h3>
            </div>
        </div>
      </div>

      {/* GRÁFICA PRINCIPAL */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400"/> Flujo de Efectivo {selectedYear}
        </h3>
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatMoney(value), '']}
                    />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* DESGLOSE POR CATEGORÍA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ArrowUpCircle className="w-5 h-5 text-emerald-500"/> Origen de Ingresos
                    </h3>
                </div>
                <div className="w-full h-[300px]">
                    {monthlyIncomeData.length > 0 ? (
                        <HorizontalChart data={monthlyIncomeData} color="#10b981" />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sin ingresos registrados</div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ArrowDownCircle className="w-5 h-5 text-rose-500"/> Distribución de Gastos
                    </h3>
                </div>
                <div className="w-full h-[300px]">
                    {monthlyExpenseData.length > 0 ? (
                        <HorizontalChart data={monthlyExpenseData} color="#ef4444" />
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">Sin gastos registrados</div>
                    )}
                </div>
            </div>
        </div>

    </div>
  );
}

// Subcomponente
const HorizontalChart = ({ data, color }: { data: any[], color: string }) => {
    const chartData = data.slice(0, 7); 
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val)} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={20}>
                    <LabelList dataKey="value" position="right" formatter={(val: number) => `$${val.toLocaleString()}`} style={{ fontSize: '10px', fill: '#64748b' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};