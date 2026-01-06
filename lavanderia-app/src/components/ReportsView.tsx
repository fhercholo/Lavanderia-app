import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList 
} from 'recharts';
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

export function ReportsView() {
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Datos procesados
  const [financials, setFinancials] = useState({ income: 0, expense: 0, profit: 0, margin: 0 });
  const [expenseRanking, setExpenseRanking] = useState<any[]>([]);
  const [salesMix, setSalesMix] = useState<any[]>([]);

  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatMoney = (val: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  useEffect(() => {
    generateReport();
  }, [selectedYear, selectedMonth]);

  const generateReport = async () => {
    setLoading(true);
    
    // 1. Definir rango de fechas
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

    // 2. Obtener datos crudos
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);

    if (!txs) { setLoading(false); return; }

    // 3. PROCESAMIENTO INTELIGENTE
    let totalIncome = 0;
    let totalExpense = 0;
    const expenseMap: Record<string, number> = {};
    const salesMap: Record<string, number> = {};

    txs.forEach(tx => {
      const amount = Number(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
        salesMap[tx.category] = (salesMap[tx.category] || 0) + amount;
      } else {
        totalExpense += amount;
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + amount;
      }
    });

    // 4. Calcular Métricas
    const profit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;

    // 5. Preparar Arrays para Gráficas/Tablas
    const expensesSorted = Object.keys(expenseMap)
      .map(k => ({ name: k, value: expenseMap[k], percent: (expenseMap[k]/totalExpense)*100 }))
      .sort((a, b) => b.value - a.value);

    const salesSorted = Object.keys(salesMap)
      .map(k => ({ name: k, value: salesMap[k], percent: (salesMap[k]/totalIncome)*100 }))
      .sort((a, b) => b.value - a.value);

    setFinancials({ income: totalIncome, expense: totalExpense, profit, margin });
    setExpenseRanking(expensesSorted);
    setSalesMix(salesSorted);
    setLoading(false);
  };

  return (
    <div className="animate-fade-in pb-10 max-w-6xl mx-auto">
      
      {/* HEADER Y FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Reportes Financieros
          </h2>
          <p className="text-slate-500">Análisis detallado de rentabilidad y costos.</p>
        </div>

        <div className="flex gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer hover:text-blue-600 px-2"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="w-px bg-slate-200"></div>
            <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer hover:text-blue-600 px-2 min-w-[120px]"
            >
                <option value="all">Todo el Año</option>
                <hr/>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
        </div>
      </div>

      {/* 1. RESUMEN EJECUTIVO (TARJETAS) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-emerald-100 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Ventas Totales</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatMoney(financials.income)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-rose-100 shadow-sm">
            <p className="text-xs font-bold text-rose-600 uppercase mb-1">Gastos Totales</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatMoney(financials.expense)}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase mb-1">Ganancia Neta</p>
            <h3 className={`text-2xl font-bold ${financials.profit >=0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatMoney(financials.profit)}
            </h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Margen de Ganancia</p>
            <h3 className="text-2xl font-bold text-slate-800">{financials.margin.toFixed(1)}%</h3>
            <p className="text-[10px] text-slate-400">De cada $100, te quedan ${financials.margin.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. RADIOGRAFÍA DE GASTOS (Ranking) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-500"/> ¿En qué gastamos más?
                </h3>
            </div>
            
            {loading ? <div className="text-center py-10 text-slate-400">Calculando...</div> : (
                <div className="space-y-4">
                    {expenseRanking.length === 0 ? <p className="text-center text-slate-400 italic">Sin gastos registrados</p> : 
                    expenseRanking.map((item, idx) => (
                        <div key={item.name} className="relative">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-bold text-slate-700">{idx+1}. {item.name}</span>
                                <span className="font-medium text-slate-600">{formatMoney(item.value)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="bg-rose-500 h-2.5 rounded-full" 
                                    style={{ width: `${item.percent}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-right text-slate-400 mt-0.5">{item.percent.toFixed(1)}% del gasto total</p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* 3. MIX DE VENTAS */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500"/> Mix de Ventas
                </h3>
            </div>

            {loading ? <div className="text-center py-10 text-slate-400">Calculando...</div> : (
                <div className="h-[300px]">
                    {salesMix.length === 0 ? <p className="text-center text-slate-400 italic mt-10">Sin ventas registradas</p> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={salesMix} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11, fontWeight: 'bold'}} interval={0} />
                                <Tooltip formatter={(val:any) => formatMoney(Number(val))} />
                                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30}>
                                    <LabelList dataKey="value" position="right" formatter={(val:any) => formatMoney(Number(val))} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#059669' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
            
            {/* Tabla resumen pequeña */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-slate-400 uppercase">
                            <th>Concepto</th>
                            <th className="text-right">Monto</th>
                            <th className="text-right">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salesMix.map(item => (
                            <tr key={item.name} className="border-b border-slate-50 last:border-0">
                                <td className="py-2 font-medium text-slate-700">{item.name}</td>
                                <td className="py-2 text-right text-emerald-600">{formatMoney(item.value)}</td>
                                <td className="py-2 text-right text-slate-400">{item.percent.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}