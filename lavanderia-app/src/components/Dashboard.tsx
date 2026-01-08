import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, BarChart3, PieChart } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid 
} from 'recharts';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  
  // --- FILTROS ---
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' o '0'...'11'

  // --- ESTADOS DE DATOS ---
  const [kpis, setKpis] = useState({ income: 0, expense: 0, profit: 0 });
  const [chartData, setChartData] = useState<any[]>([]);

  // Generar lista de años (2024 al actual + 1)
  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    let startStr, endStr;

    // 1. DEFINIR RANGO DE FECHAS SEGÚN FILTRO
    const baseDate = new Date(selectedYear, 0, 1); // 1 de Enero del año seleccionado

    if (selectedMonth === 'all') {
      // Todo el año
      startStr = format(startOfYear(baseDate), 'yyyy-MM-dd');
      endStr = format(endOfYear(baseDate), 'yyyy-MM-dd');
    } else {
      // Mes específico
      const monthDate = new Date(selectedYear, parseInt(selectedMonth), 1);
      startStr = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      endStr = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    }

    // 2. CONSULTA A BASE DE DATOS
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);

    if (!txs) { setLoading(false); return; }

    // 3. CALCULAR KPIs (Tarjetas de arriba)
    let income = 0, expense = 0;
    txs.forEach(tx => {
      if (tx.type === 'income') income += Number(tx.amount);
      else expense += Number(tx.amount);
    });
    setKpis({ income, expense, profit: income - expense });

    // 4. PREPARAR DATOS PARA LA GRÁFICA (LA PARTE INTELIGENTE)
    if (selectedMonth === 'all') {
      // --- MODO ANUAL: COMPARATIVA MENSUAL ---
      // Creamos un array de 12 meses vacíos
      const monthlyData = months.map(m => ({ name: m.substring(0,3), income: 0, expense: 0 }));
      
      txs.forEach(tx => {
        // Truco: Leer el mes de la fecha "YYYY-MM-DD"
        // Ojo: split('-')[1] da el mes '01', '02'. Restamos 1 para índice de array.
        const monthIndex = parseInt(tx.date.split('-')[1]) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          if (tx.type === 'income') monthlyData[monthIndex].income += Number(tx.amount);
          else monthlyData[monthIndex].expense += Number(tx.amount);
        }
      });
      setChartData(monthlyData);

    } else {
      // --- MODO MENSUAL: DESGLOSE POR CATEGORÍA ---
      // Agrupamos por nombre de categoría
      const catMap: Record<string, number> = {};
      
      txs.forEach(tx => {
        // Solo mostramos gastos en la gráfica mensual para ver en qué se fue el dinero,
        // o ingresos si quieres ver qué vendiste más.
        // Haremos una vista combinada simple: Categoría y Monto total (sea ingreso o gasto)
        const val = Number(tx.amount);
        if (catMap[tx.category]) catMap[tx.category] += val;
        else catMap[tx.category] = val;
      });

      // Convertir a array para la gráfica
      const catData = Object.keys(catMap).map(k => ({
        name: k,
        value: catMap[k]
      })).sort((a, b) => b.value - a.value); // Ordenar mayor a menor

      setChartData(catData);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* --- BARRA DE FILTROS SUPERIOR --- */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600"/> 
            {selectedMonth === 'all' ? `Reporte Anual ${selectedYear}` : `Reporte ${months[parseInt(selectedMonth)]} ${selectedYear}`}
          </h2>
          <p className="text-xs text-slate-500">
            {selectedMonth === 'all' ? 'Comparativa mes a mes' : 'Desglose por categorías'}
          </p>
        </div>

        <div className="flex gap-3">
            {/* SELECTOR AÑO */}
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

            {/* SELECTOR MES (Con opción TODOS) */}
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

      {/* --- TARJETAS KPIs (Se actualizan con el filtro) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">Ingresos</p>
                <h3 className="text-3xl font-bold text-emerald-600">${kpis.income.toLocaleString()}</h3>
            </div>
            <ArrowUpCircle className="absolute right-4 bottom-4 w-12 h-12 text-emerald-50 opacity-20" />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="relative z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">Gastos</p>
                <h3 className="text-3xl font-bold text-rose-600">${kpis.expense.toLocaleString()}</h3>
            </div>
            <ArrowDownCircle className="absolute right-4 bottom-4 w-12 h-12 text-rose-50 opacity-20" />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden ring-1 ring-blue-50">
            <div className="relative z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">Utilidad Neta</p>
                <h3 className={`text-3xl font-bold ${kpis.profit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    ${kpis.profit.toLocaleString()}
                </h3>
            </div>
            <Wallet className="absolute right-4 bottom-4 w-12 h-12 text-blue-50 opacity-20" />
        </div>
      </div>

      {/* --- GRÁFICA INTELIGENTE (Cambia según el contexto) --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px]">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            {selectedMonth === 'all' ? (
                <>📊 Tendencia Anual (Ingresos vs Gastos)</>
            ) : (
                <>🍰 Desglose por Categoría</>
            )}
        </h3>

        <div className="w-full h-[300px]">
            {loading ? (
                <div className="h-full flex items-center justify-center text-slate-400">Calculando...</div>
            ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">No hay datos en este periodo</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    {selectedMonth === 'all' ? (
                        // GRÁFICA ANUAL: Barras Dobles (Ingreso/Gasto)
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: '#f1f5f9'}}
                            />
                            <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    ) : (
                        // GRÁFICA MENSUAL: Barras Simples por Categoría
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                            <XAxis type="number" hide />
                            <XAxis type="category" dataKey="name" width={100} tick={{fontSize: 11, fill: '#475569'}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#60a5fa'} />
                                ))}
                            </Bar>
                        </BarChart>
                    )}
                </ResponsiveContainer>
            )}
        </div>
      </div>

    </div>
  );
}