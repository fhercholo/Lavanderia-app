import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useReactToPrint } from 'react-to-print';
import { 
  FileText, TrendingUp, TrendingDown, CalendarRange, Wallet, BarChart3, Printer, ToggleLeft, ToggleRight, ArrowUpCircle, ArrowDownCircle, PieChart, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell 
} from 'recharts';
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear, parseISO } from 'date-fns';

// --- HELPERS DE FORMATO ---
const formatMoney = (val: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const formatCompactMoney = (val: number) => {
  if (val === 0) return '';
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`; // $1.5k
  return `$${val}`;
};

// --- TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload, label, prefix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
        <p className="font-bold mb-1 opacity-70">{label}</p>
        <p className="text-base font-bold flex items-center gap-2">
          {prefix && <span className="text-slate-400 font-normal">{prefix}:</span>}
          {formatMoney(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// --- COMPONENTE AUXILIAR 1: Gráfica Vertical ---
const OperationalChart = ({ data, title, icon: Icon, color }: any) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[340px] hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-lg ${color === '#3b82f6' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <Icon className="w-5 h-5"/>
        </div>
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v/1000}k`}/>
                <Tooltip content={<CustomTooltip prefix="Venta" />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={1500} maxBarSize={50}>
                    {data.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={color || '#3b82f6'} />
                    ))}
                    <LabelList 
                        dataKey="value" 
                        position="top" 
                        formatter={formatCompactMoney} 
                        style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} 
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- COMPONENTE AUXILIAR 2: Gráfica Horizontal ---
const HorizontalChart = ({ data, color, barColor }: { data: any[], color: string, barColor: string }) => {
    const chartData = data.slice(0, 7); 
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip prefix="Total" />} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" fill={barColor} radius={[0, 6, 6, 0]} barSize={24} animationDuration={1500} background={{ fill: '#f1f5f9', radius: [0, 6, 6, 0] }}>
                    <LabelList dataKey="value" position="right" formatter={(val: number) => `$${val.toLocaleString()}`} style={{ fontSize: '11px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export function ReportsView() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [includeCaja, setIncludeCaja] = useState(false); 

  const [financials, setFinancials] = useState({ income: 0, expense: 0, profit: 0, margin: 0 });
  const [dayStats, setDayStats] = useState({ bestDay: '', bestDayAmount: 0, bestDayType: '' });
  const [weekDayData, setWeekDayData] = useState<any[]>([]);
  const [weekendData, setWeekendData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]); 
  
  const [incomeCategoryData, setIncomeCategoryData] = useState<any[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<any[]>([]);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({ content: () => componentRef.current });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, selectedYear, includeCaja]); 

  const fetchReportData = async () => {
    setLoading(true);
    let startDate, endDate;

    if (selectedMonth === 'all') {
      startDate = format(startOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
      endDate = format(endOfYear(new Date(selectedYear, 0, 1)), 'yyyy-MM-dd');
    } else {
      const mIndex = parseInt(selectedMonth);
      startDate = format(startOfMonth(new Date(selectedYear, mIndex, 1)), 'yyyy-MM-dd');
      endDate = format(endOfMonth(new Date(selectedYear, mIndex, 1)), 'yyyy-MM-dd');
    }

    let { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);

    if (!transactions) transactions = [];

    if (!includeCaja) {
        transactions = transactions.filter(t => t.category.toUpperCase() !== 'CAJA');
    }

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const profit = income - expense;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    setFinancials({ income, expense, profit, margin });

    // DÍAS
    const daysMap: Record<string, number> = { 'Mon':0, 'Tue':0, 'Wed':0, 'Thu':0, 'Fri':0, 'Sat':0, 'Sun':0 };
    transactions.filter(t => t.type === 'income').forEach(t => {
        const date = parseISO(t.date); 
        const dayName = format(date, 'EEE'); 
        if (daysMap[dayName] !== undefined) daysMap[dayName] += Number(t.amount);
    });

    setWeekDayData([
        { name: 'Lun', value: daysMap['Mon'] }, { name: 'Mar', value: daysMap['Tue'] },
        { name: 'Mié', value: daysMap['Wed'] }, { name: 'Jue', value: daysMap['Thu'] },
        { name: 'Vie', value: daysMap['Fri'] }
    ]);
    setWeekendData([
        { name: 'Sáb', value: daysMap['Sat'] }, { name: 'Dom', value: daysMap['Sun'] }
    ]);

    // MEJOR DÍA
    let maxVal = 0;
    let maxDay = '';
    const esDays: Record<string, string> = { 'Mon':'Lun', 'Tue':'Mar', 'Wed':'Mié', 'Thu':'Jue', 'Fri':'Vie', 'Sat':'Sáb', 'Sun':'Dom' };
    Object.entries(daysMap).forEach(([key, val]) => {
        if (val > maxVal) { maxVal = val; maxDay = esDays[key]; }
    });
    setDayStats({ 
        bestDay: maxDay || '-', 
        bestDayAmount: maxVal,
        bestDayType: ['Sáb', 'Dom'].includes(maxDay) ? 'Fin de Semana' : 'Día de Semana'
    });

    // TENDENCIA
    let trendMap = [];
    if (selectedMonth === 'all') {
        trendMap = months.map(m => ({ name: m.substring(0, 3), value: 0 }));
        transactions.forEach(t => {
            if (t.type === 'income') {
                const d = parseISO(t.date);
                trendMap[d.getMonth()].value += Number(t.amount);
            }
        });
    } else {
        const mIndex = parseInt(selectedMonth);
        const daysInMonth = new Date(selectedYear, mIndex + 1, 0).getDate();
        trendMap = new Array(daysInMonth).fill(0).map((_, i) => ({ name: `${i+1}`, value: 0 }));
        transactions.forEach(t => {
            if (t.type === 'income') {
                const d = parseInt(t.date.split('-')[2]) - 1;
                if (trendMap[d]) trendMap[d].value += Number(t.amount);
            }
        });
    }
    setTrendData(trendMap);

    // CATEGORÍAS
    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};

    transactions.forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'income') incomeCats[t.category] = (incomeCats[t.category] || 0) + amount;
        else expenseCats[t.category] = (expenseCats[t.category] || 0) + amount;
    });

    setIncomeCategoryData(Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    setExpenseCategoryData(Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

    setLoading(false);
  };

  const reportTitle = selectedMonth === 'all' 
    ? `Análisis Anual Corporativo ${selectedYear}` 
    : `Reporte Operativo Mensual • ${months[parseInt(selectedMonth)]} ${selectedYear}`;

  const chartTitle = selectedMonth === 'all' 
    ? 'Tendencia Anual de Ingresos' 
    : 'Comportamiento Diario de Ingresos';

  return (
    <div className="animate-fade-in pb-10 max-w-7xl mx-auto font-sans">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center xl:text-left">
            <h2 className="text-3xl font-extrabold text-slate-800 flex items-center justify-center xl:justify-start gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
                   <FileText className="w-6 h-6"/> 
                </div>
                Reportes Inteligentes
            </h2>
            <p className="text-slate-500 font-medium mt-1 ml-1">Centro de análisis financiero y operativo.</p>
        </div>
        
        {/* CONTROLES GRID RESPONSIVE */}
        <div className="w-full xl:w-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-2 items-center">
                
                {/* BOTÓN CAJA - Adaptable */}
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

                {/* SELECTORES - Mismo alto que el botón */}
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="h-11 w-full lg:w-auto bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                    <option value="all">📅 Todo el Año</option>
                    {months.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
                </select>

                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="h-11 w-full lg:w-auto bg-white border border-slate-200 rounded-lg px-3 text-sm font-bold text-slate-700 outline-none cursor-pointer hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                
                {/* BOTÓN EXPORTAR - Col span en móvil para que quede centrado si sobra espacio */}
                <button 
                    onClick={handlePrint}
                    className="h-11 w-full lg:w-auto sm:col-span-2 lg:col-span-1 bg-slate-900 text-white px-5 rounded-lg flex items-center justify-center gap-2 text-sm font-bold hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95"
                >
                    <Printer className="w-4 h-4"/> <span>Exportar</span>
                </button>
            </div>
        </div>
      </div>

      <div ref={componentRef} className="space-y-10 print:p-8 print:bg-white print:space-y-6">
        
        {/* TÍTULO DEL DOCUMENTO */}
        <div className="text-center border-b border-slate-100 pb-6">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">{reportTitle}</h1>
            <p className="text-slate-400 text-sm font-medium mt-2">Generado automáticamente el {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* 1. TARJETAS FINANCIERAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="w-24 h-24 text-emerald-600"/>
                </div>
                <div className="relative z-10">
                    <p className="text-emerald-600/70 text-xs font-bold uppercase tracking-widest mb-2">Ingresos Totales</p>
                    <div className="flex items-end gap-2">
                         <h3 className="text-4xl font-black text-slate-800 tracking-tight">{formatMoney(financials.income)}</h3>
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-white to-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown className="w-24 h-24 text-rose-600"/>
                </div>
                <div className="relative z-10">
                    <p className="text-rose-600/70 text-xs font-bold uppercase tracking-widest mb-2">Gastos Totales</p>
                    <div className="flex items-end gap-2">
                         <h3 className="text-4xl font-black text-slate-800 tracking-tight">{formatMoney(financials.expense)}</h3>
                    </div>
                </div>
            </div>

            <div className={`relative overflow-hidden p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 group ${financials.profit >= 0 ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-red-50 to-white border-red-100'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className={`w-24 h-24 ${financials.profit >= 0 ? 'text-white' : 'text-red-600'}`}/>
                </div>
                <div className="relative z-10">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${financials.profit >= 0 ? 'text-blue-300' : 'text-red-400'}`}>Utilidad Neta</p>
                    <h3 className={`text-4xl font-black tracking-tight ${financials.profit >= 0 ? 'text-white' : 'text-red-600'}`}>{formatMoney(financials.profit)}</h3>
                    <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded text-xs font-bold ${financials.profit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-100 text-red-600'}`}>
                        <Activity className="w-3 h-3"/> Margen: {financials.margin.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>

        {/* 2. DESGLOSE POR CATEGORÍA */}
        <div className="pt-2">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pl-1">
                <PieChart className="text-indigo-500 w-5 h-5"/> Desglose Financiero
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-100 transition-all duration-300 h-[420px]">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-md"><ArrowUpCircle className="w-4 h-4"/></span> 
                            Origen de Ingresos
                        </h3>
                    </div>
                    <div className="w-full h-[300px]">
                        {incomeCategoryData.length > 0 ? (
                            <HorizontalChart data={incomeCategoryData} color="#10b981" barColor="#10b981" />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <FileText className="w-12 h-12 mb-2 opacity-20"/>
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
                         {expenseCategoryData.length > 0 ? (
                            <HorizontalChart data={expenseCategoryData} color="#ef4444" barColor="#f43f5e" />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <FileText className="w-12 h-12 mb-2 opacity-20"/>
                                <span className="text-sm font-medium">Sin datos registrados</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* 3. SECCIÓN OPERATIVA */}
        <div className="pt-2">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pl-1">
                <BarChart3 className="text-indigo-500 w-5 h-5"/> Rendimiento Operativo
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <OperationalChart data={weekDayData} title="Entre Semana (Lun - Vie)" icon={Wallet} color="#3b82f6" />
                <OperationalChart data={weekendData} title="Fin de Semana (Sáb - Dom)" icon={CalendarRange} color="#8b5cf6" />
            </div>
        </div>

        {/* 4. GRÁFICA TENDENCIA (HERO SECTION) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 print:break-inside-avoid relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {chartTitle}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Visualización del flujo de ingresos.</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Periodo</span>
                    <p className="text-lg font-bold text-slate-800">{formatMoney(financials.income)}</p>
                </div>
            </div>

            <div className="h-[300px] w-full">
                {trendData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-300">Sin datos</div>
                ) : (
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} interval={selectedMonth === 'all' ? 0 : 2} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v)=>`$${v/1000}k`} />
                                <Tooltip content={<CustomTooltip prefix="Ingreso" />} cursor={{fill: '#ecfdf5'}} />
                                
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={2000}>
                                    {trendData.map((entry, index) => {
                                        // LOGICA DE COLOR PARA FIN DE SEMANA
                                        let fillColor = "url(#colorValue)";
                                        if (selectedMonth !== 'all') {
                                            const date = new Date(selectedYear, parseInt(selectedMonth), index + 1);
                                            const day = date.getDay();
                                            if (day === 0 || day === 6) { 
                                                fillColor = "#f59e0b"; // ÁMBAR PARA FINDE
                                            }
                                        }
                                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                                    })}
                                    <LabelList 
                                        dataKey="value" 
                                        position="top" 
                                        formatter={formatCompactMoney} 
                                        style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} 
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-4">
                <div className="bg-blue-50 p-2 rounded-full text-blue-600 mt-1">
                    <Activity className="w-5 h-5"/>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">Análisis Inteligente</h4>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-4xl">
                        El periodo muestra una ganancia neta de <strong className="text-emerald-600">{formatMoney(financials.profit)}</strong> con un margen del <strong>{financials.margin.toFixed(1)}%</strong>. 
                        El punto operativo más fuerte se registra el <strong>{dayStats.bestDay}</strong>.
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}