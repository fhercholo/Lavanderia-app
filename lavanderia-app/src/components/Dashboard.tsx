import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, BarChart3, 
  TrendingUp, TrendingDown, DollarSign, Landmark 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList 
} from 'recharts';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from 'date-fns';

export function Dashboard() {
  // ELIMINADO: loading (no se usaba para mostrar nada en pantalla)
  
  // --- FILTROS ---
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); 

  // --- ESTADOS DE DATOS ---
  // 1. Datos Históricos (Globales)
  const [globalStats, setGlobalStats] = useState({ income: 0, expense: 0, profit: 0 });
  
  // 2. Datos Filtrados (Del periodo seleccionado)
  const [filteredKpis, setFilteredKpis] = useState({ income: 0, expense: 0, profit: 0 });
  const [annualData, setAnnualData] = useState<any[]>([]);
  const [monthlyIncomeData, setMonthlyIncomeData] = useState<any[]>([]);
  const [monthlyExpenseData, setMonthlyExpenseData] = useState<any[]>([]);

  // Arreglo de años para el select
  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // --- EFECTO 1: CARGAR HISTÓRICO GLOBAL (Solo una vez al inicio) ---
  useEffect(() => {
    const fetchGlobalStats = async () => {
      // Pedimos SOLO tipo y monto de TODA la historia
      const { data } = await supabase.from('transactions').select('type, amount');
      
      let gIncome = 0, gExpense = 0;
      data?.forEach(tx => {
        if (tx.type === 'income') gIncome += Number(tx.amount);
        else gExpense += Number(tx.amount);
      });
      setGlobalStats({ income: gIncome, expense: gExpense, profit: gIncome - gExpense });
    };
    fetchGlobalStats();
  }, []);

  // --- EFECTO 2: CARGAR DATOS FILTRADOS (Cada vez que cambian filtros) ---
  useEffect(() => {
    const fetchFilteredData = async () => {
      // (Eliminado setLoading ya que no se usaba visualmente)
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

      if (!txs) return;

      // Calcular KPIs del periodo
      let income = 0, expense = 0;
      txs.forEach(tx => {
        if (tx.type === 'income') income += Number(tx.amount);
        else expense += Number(tx.amount);
      });
      setFilteredKpis({ income, expense, profit: income - expense });

      // Procesar Gráficas
      if (selectedMonth === 'all') {
        const monthlyData = months.map(m => ({ name: m.substring(0,3), income: 0, expense: 0 }));
        txs.forEach(tx => {
          const monthIndex = parseInt(tx.date.split('-')[1]) - 1;
          if (monthIndex >= 0 && monthIndex < 12) {
            if (tx.type === 'income') monthlyData[monthIndex].income += Number(tx.amount);
            else monthlyData[monthIndex].expense += Number(tx.amount);
          }
        });
        setAnnualData(monthlyData);
      } else {
        const incomeMap: Record<string, number> = {};
        const expenseMap: Record<string, number> = {};
        
        txs.forEach(tx => {
          const val = Number(tx.amount);
          if (tx.type === 'income') {
            incomeMap[tx.category] = (incomeMap[tx.category] || 0) + val;
          } else {
            expenseMap[tx.category] = (expenseMap[tx.category] || 0) + val;
          }
        });

        const iData = Object.keys(incomeMap).map(k => ({ name: k, value: incomeMap[k] })).sort((a,b) => b.value - a.value);
        const eData = Object.keys(expenseMap).map(k => ({ name: k, value: expenseMap[k] })).sort((a,b) => b.value - a.value);
        setMonthlyIncomeData(iData);
        setMonthlyExpenseData(eData);
      }
    };

    fetchFilteredData();
  }, [selectedYear, selectedMonth]);

  const HorizontalChart = ({ data, color }: { data: any[], color: string }) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 5, right: 70, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11, fill: '#475569'}} interval={0} />
        <Tooltip formatter={(val: any) => [formatMoney(Number(val)), 'Total']} cursor={{fill: '#f8fafc'}} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={24}>
           <LabelList dataKey="value" position="right" formatter={(val: any) => formatMoney(Number(val))} style={{ fontSize: '11px', fill: '#64748b', fontWeight: '600' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* =========================================================
          SECCIÓN 1: TOTALES HISTÓRICOS
          ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        {/* Histórico Ingresos */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Landmark className="w-3 h-3"/> Ventas Históricas
                </p>
                <h3 className="text-3xl font-bold text-emerald-400">{formatMoney(globalStats.income)}</h3>
            </div>
            <div className="absolute -right-4 -bottom-4 bg-white/5 p-4 rounded-full group-hover:scale-110 transition-transform">
                <TrendingUp className="w-12 h-12 text-emerald-500 opacity-20" />
            </div>
        </div>

        {/* Histórico Gastos */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <TrendingDown className="w-3 h-3"/> Gastos Históricos
                </p>
                <h3 className="text-3xl font-bold text-rose-400">{formatMoney(globalStats.expense)}</h3>
            </div>
            <div className="absolute -right-4 -bottom-4 bg-white/5 p-4 rounded-full group-hover:scale-110 transition-transform">
                <ArrowDownCircle className="w-12 h-12 text-rose-500 opacity-20" />
            </div>
        </div>

        {/* Histórico Utilidad */}
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg relative overflow-hidden group ring-1 ring-blue-500/30">
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Wallet className="w-3 h-3"/> Utilidad Neta Total
                </p>
                <h3 className={`text-3xl font-bold ${globalStats.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {formatMoney(globalStats.profit)}
                </h3>
            </div>
            <div className="absolute -right-4 -bottom-4 bg-white/5 p-4 rounded-full group-hover:scale-110 transition-transform">
                <DollarSign className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
        </div>
      </div>

      <hr className="border-slate-200" />


      {/* =========================================================
          SECCIÓN 2: FILTROS Y ANÁLISIS POR PERIODO
          ========================================================= */}
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600"/> 
            {selectedMonth === 'all' ? `Análisis del Año ${selectedYear}` : `Análisis de ${months[parseInt(selectedMonth)]} ${selectedYear}`}
          </h2>
          <p className="text-xs text-slate-500">
             Viendo datos filtrados por periodo
          </p>
        </div>

        <div className="flex gap-3">
            <div className="relative">
                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold cursor-pointer"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none"/>
            </div>

            <div className="relative">
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold cursor-pointer min-w-[140px]"
                >
                    <option value="all">📅 TODOS (Año)</option>
                    <hr />
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-400">▼</div>
            </div>
        </div>
      </div>

      {/* Tarjetas Pequeñas (Resumen del Periodo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80">
        <div className="bg-white px-5 py-3 rounded-lg border border-emerald-100 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Ventas (Periodo)</span>
            <span className="text-lg font-bold text-emerald-600">{formatMoney(filteredKpis.income)}</span>
        </div>
        <div className="bg-white px-5 py-3 rounded-lg border border-rose-100 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Gastos (Periodo)</span>
            <span className="text-lg font-bold text-rose-600">{formatMoney(filteredKpis.expense)}</span>
        </div>
        <div className="bg-white px-5 py-3 rounded-lg border border-blue-100 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Utilidad (Periodo)</span>
            <span className={`text-lg font-bold ${filteredKpis.profit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                {formatMoney(filteredKpis.profit)}
            </span>
        </div>
      </div>

      {/* GRÁFICAS DEL PERIODO */}
      {selectedMonth === 'all' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[450px]">
            <h3 className="font-bold text-slate-700 mb-4">Tendencia Anual</h3>
            <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} />
                        <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip formatter={(value: any) => [formatMoney(Number(value))]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      )}

    </div>
  );
}