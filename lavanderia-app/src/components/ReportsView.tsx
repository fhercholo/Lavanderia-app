import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, TrendingUp, TrendingDown, CalendarRange, Wallet, BarChart3, Printer, 
  ToggleLeft, ToggleRight, ArrowUpCircle, ArrowDownCircle, PieChart, Activity, 
  Table2, Search, Trash2, Download, Pencil, X, Save, Building2, MapPin, Phone, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, AreaChart, Area, ReferenceLine, Label 
} from 'recharts';
import { startOfMonth, endOfMonth, format, startOfYear, endOfYear, parseISO } from 'date-fns';

// --- HELPERS ---
const formatMoney = (val: number) => 
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);

const formatCompactMoney = (val: number) => {
  if (val === 0) return '';
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`; 
  return `$${val}`;
};

// COLORES ESTÁNDAR
const COLORS = {
  income: '#2563eb', // Blue-600
  expense: '#e11d48', // Rose-600
  balance: '#4f46e5', // Indigo-600
};

// Tooltip Gráficas
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs z-50">
        <p className="font-bold mb-1 opacity-70 uppercase tracking-wider">{label}</p>
        <p className="text-base font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: payload[0].color || payload[0].fill }}></span>
          {formatMoney(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// --- COMPONENTE 1: GRÁFICA OPERATIVA ---
const OperationalChart = ({ data, title, subtitle, icon: Icon, colorKey, id, printDesc }: any) => {
  const total = data.reduce((acc: number, curr: any) => acc + curr.value, 0);
  const average = total / (data.length || 1);
  const maxVal = data.length > 0 ? Math.max(...data.map((d: any) => d.value)) : 0;

  const mainColor = colorKey === 'income' ? COLORS.income : COLORS.expense; 
  const lightColor = colorKey === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600';
  const textColor = colorKey === 'income' ? 'text-blue-600' : 'text-amber-600';

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col h-[450px] print:h-auto print:border-slate-300 print:shadow-none print:break-inside-avoid">
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
            <div className={`p-3 rounded-2xl ${lightColor} ${textColor} shadow-inner print:hidden`}>
                <Icon className="w-6 h-6"/>
            </div>
            <div>
                <h3 className="font-extrabold text-slate-800 text-base print:text-black">{title}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5 print:text-slate-600">{subtitle}</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-2xl font-black text-slate-800 tracking-tight print:text-black">{formatCompactMoney(total)}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={mainColor} stopOpacity={1}/>
                        <stop offset="100%" stopColor={mainColor} stopOpacity={0.2}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                
                <ReferenceLine y={average} stroke={mainColor} strokeDasharray="4 4" strokeOpacity={0.6}>
                    <Label 
                        value={`Prom: ${formatCompactMoney(average)}`} 
                        position="insideTopRight" 
                        fill={mainColor} 
                        fontSize={11} 
                        fontWeight={800}
                        offset={10}
                        style={{ textShadow: '0px 0px 4px white' }} 
                    />
                </ReferenceLine>

                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1500} maxBarSize={50} fill={`url(#gradient-${id})`}>
                    <LabelList dataKey="value" position="top" formatter={(val: any) => formatCompactMoney(val)} style={{ fontSize: '11px', fill: '#475569', fontWeight: 'bold' }} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl print:bg-transparent print:border-slate-300 print:mt-2 print:pt-2">
          <div className="flex items-start gap-2">
             <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 print:hidden"/>
             <p className="text-xs text-slate-500 leading-relaxed text-justify print:text-black">
                <span className="print:hidden">Análisis:</span> {printDesc} El promedio diario es <strong>{formatMoney(average)}</strong>. 
                Pico máximo: <strong>{maxVal > 0 ? formatMoney(maxVal) : '$0'}</strong>.
             </p>
          </div>
      </div>
    </div>
  );
};

// --- COMPONENTE 2: GRÁFICA CATEGORÍAS ---
const CategoryChart = ({ data, title, subtitle, icon: Icon, color }: any) => {
    const total = data.reduce((acc: number, curr: any) => acc + curr.value, 0);
    const topCategory = data.length > 0 ? data[0] : { name: '-', value: 0 };
    const topPercentage = total > 0 ? ((topCategory.value / total) * 100).toFixed(1) : 0;

    const barColor = color === 'green' ? '#10b981' : '#ef4444';
    const lightColor = color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col h-[450px] print:h-auto print:border-slate-300 print:shadow-none print:break-inside-avoid">
            <div className="flex justify-between items-start mb-2">
                <div className="flex gap-3">
                    <div className={`p-3 rounded-2xl ${lightColor} shadow-inner print:hidden`}>
                        <Icon className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-slate-800 text-base print:text-black">{title}</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5 print:text-slate-600">{subtitle}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data.slice(0, 7)} margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" fill={barColor} radius={[0, 6, 6, 0] as any} barSize={24} animationDuration={1500} background={{ fill: '#f8fafc', radius: [0, 6, 6, 0] as any }}>
                                <LabelList dataKey="value" position="right" formatter={(val: any) => `$${val.toLocaleString()}`} style={{ fontSize: '11px', fill: '#64748b', fontWeight: 'bold' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                        <FileText className="w-12 h-12 mb-2 opacity-20"/>
                        <span className="text-sm font-medium">Sin datos registrados</span>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-50 bg-slate-50/50 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl print:bg-transparent print:border-slate-300 print:mt-2 print:pt-2">
                <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 print:hidden"/>
                    <p className="text-xs text-slate-500 leading-relaxed text-justify print:text-black">
                        La categoría principal es <strong>{topCategory.name}</strong>, representando el <strong>{topPercentage}%</strong> del total registrado.
                    </p>
                </div>
            </div>
        </div>
    );
};

export function ReportsView() {
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [includeCaja, setIncludeCaja] = useState(false); 
  
  const [bizInfo, setBizInfo] = useState({ name: '', address: '', phone: '', logo_url: '' });
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  
  // Estados para gráficas
  const [financials, setFinancials] = useState({ income: 0, expense: 0, profit: 0, margin: 0 });
  const [weekDayData, setWeekDayData] = useState<any[]>([]);
  const [weekendData, setWeekendData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]); 
  const [incomeCategoryData, setIncomeCategoryData] = useState<any[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<any[]>([]);

  const componentRef = useRef(null);
  
  const handlePrint = useReactToPrint({ 
    contentRef: componentRef,
    documentTitle: `Reporte_${selectedYear}_${selectedMonth}`,
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  useEffect(() => {
    fetchBusinessInfo(); 
    fetchReportData();
    fetchCategories(); 
  }, [selectedMonth, selectedYear, includeCaja]); 

  const fetchBusinessInfo = async () => {
      const { data } = await supabase.from('business_settings').select('*').single();
      if(data) setBizInfo(data);
  };

  const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      if(data) setCategoriesList(data);
  };

  const fetchReportData = async () => {
    // loading eliminado aquí
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
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (!transactions) transactions = [];

    if (!includeCaja) {
        transactions = transactions.filter(t => t.category.toUpperCase() !== 'CAJA');
    }

    setRawTransactions(transactions);

    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const profit = income - expense;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    setFinancials({ income, expense, profit, margin });

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

    let trendMap: any[] = [];
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

    const incomeCats: Record<string, number> = {};
    const expenseCats: Record<string, number> = {};
    transactions.forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'income') incomeCats[t.category] = (incomeCats[t.category] || 0) + amount;
        else expenseCats[t.category] = (expenseCats[t.category] || 0) + amount;
    });

    setIncomeCategoryData(Object.entries(incomeCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    setExpenseCategoryData(Object.entries(expenseCats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
    
    // loading eliminado aquí
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('¿Borrar movimiento?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) fetchReportData();
    else alert('Error al eliminar');
  };

  const handleSaveEdit = async () => {
      if(!editingTransaction) return;
      const { error } = await supabase.from('transactions').update({
            date: editingTransaction.date,
            type: editingTransaction.type,
            category: editingTransaction.category,
            amount: editingTransaction.amount,
            description: editingTransaction.description
        }).eq('id', editingTransaction.id);
      if (!error) { setEditingTransaction(null); fetchReportData(); }
  };

  const handleExport = () => {
    const headers = ["Fecha", "Tipo", "Categoria", "Descripcion", "Monto"];
    const rows = filteredTransactions.map(t => [t.date, t.type === 'income' ? 'Ingreso' : 'Gasto', t.category, `"${t.description || ''}"`, t.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const filteredTransactions = rawTransactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = t.category?.toLowerCase().includes(searchLower) || t.description?.toLowerCase().includes(searchLower) || String(t.amount).includes(searchLower);
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalVisibleIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalVisibleExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalVisibleBalance = totalVisibleIncome - totalVisibleExpense;

  const reportTitle = selectedMonth === 'all' ? `Análisis Anual ${selectedYear}` : `Reporte ${months[parseInt(selectedMonth)]} ${selectedYear}`;
  const chartTitle = selectedMonth === 'all' ? 'Tendencia Anual' : 'Flujo Diario';

  const maxTrendVal = Math.max(...trendData.map((d: any) => d.value));
  const maxTrendLabel = trendData.find((d: any) => d.value === maxTrendVal)?.name || '-';

  return (
    <div className="animate-fade-in pb-10 max-w-7xl mx-auto font-sans relative">
      
      <style type="text/css" media="print">
        {`
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; background-color: #fff; }
          .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          .print-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .print-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .print-break-inside-avoid { break-inside: avoid; }
        `}
      </style>

      {/* HEADER DE CONTROL */}
      <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 print-hidden">
        <div>
            <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200"><FileText className="w-6 h-6"/></div>
                Reportes Inteligentes
            </h2>
            <p className="text-slate-500 font-medium mt-1 ml-1">Centro de análisis financiero y auditoría.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
            <button onClick={() => setIncludeCaja(!includeCaja)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border transition-all duration-300 ${includeCaja ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
                {includeCaja ? <ToggleRight className="w-5 h-5"/> : <ToggleLeft className="w-5 h-5"/>} <span className="hidden sm:inline">{includeCaja ? 'Con Caja' : 'Sin Caja'}</span>
            </button>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border p-2.5 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 transition-all cursor-pointer"><option value="all">📅 Todo el Año</option>{months.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}</select>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-white border p-2.5 rounded-lg text-sm font-bold text-slate-700 outline-none hover:border-blue-400 transition-all cursor-pointer">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <button onClick={handlePrint} className="bg-slate-900 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-800 hover:shadow-lg transition-all active:scale-95"><Printer className="w-4 h-4"/> <span className="hidden lg:inline">PDF</span></button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit mx-auto md:mx-0 print-hidden">
          <button onClick={() => setViewMode('charts')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'charts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><PieChart className="w-4 h-4"/> Tablero Visual</button>
          <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Table2 className="w-4 h-4"/> Auditoría de Datos</button>
      </div>

      {/* === ÁREA IMPRIMIBLE === */}
      <div ref={componentRef} className="print:w-full print:text-sm">
        
        {/* HEADER IMPRESO */}
        <div className="hidden print-only mb-8">
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
                <div className="flex gap-4 items-center">
                    <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden">
                        {bizInfo.logo_url ? (
                            <img src={bizInfo.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="w-10 h-10 text-slate-300"/>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{bizInfo.name || 'MI NEGOCIO'}</h1>
                        <div className="flex flex-col text-slate-600 text-sm font-medium gap-0.5">
                            {bizInfo.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {bizInfo.address}</span>}
                            {bizInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {bizInfo.phone}</span>}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-800 uppercase">{reportTitle}</h2>
                    <p className="text-slate-500 text-xs">Generado: {new Date().toLocaleDateString()}</p>
                    <div className="mt-2 bg-slate-100 px-3 py-1 rounded text-xs font-bold inline-block border border-slate-200">{includeCaja ? 'Incluye Caja' : 'Sin Mov. Caja'}</div>
                </div>
            </div>
        </div>

        {viewMode === 'charts' && (
        <>
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print-grid print:gap-4">
                <div className="relative overflow-hidden bg-gradient-to-br from-white to-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-lg shadow-emerald-50/50 print:border-slate-300 print:shadow-none print:bg-white print:p-4">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-emerald-600"/></div>
                    <p className="text-emerald-600/70 text-xs font-bold uppercase tracking-widest mb-1 print:text-black">Ingresos Totales</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight print:text-black">{formatMoney(financials.income)}</h3>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-white to-rose-50 p-6 rounded-3xl border border-rose-100 shadow-lg shadow-rose-50/50 print:border-slate-300 print:shadow-none print:bg-white print:p-4">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="w-24 h-24 text-rose-600"/></div>
                    <p className="text-rose-600/70 text-xs font-bold uppercase tracking-widest mb-1 print:text-black">Gastos Totales</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tight print:text-black">{formatMoney(financials.expense)}</h3>
                </div>
                <div className={`relative overflow-hidden p-6 rounded-3xl border shadow-lg print:border-slate-300 print:shadow-none print:p-4 ${financials.profit >= 0 ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-slate-200 print:bg-white' : 'bg-gradient-to-br from-red-50 to-white border-red-100 print:bg-white'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className={`w-24 h-24 ${financials.profit >= 0 ? 'text-white print:text-black' : 'text-red-600'}`}/></div>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${financials.profit >= 0 ? 'text-blue-300 print:text-black' : 'text-red-400 print:text-black'}`}>Utilidad Neta</p>
                    <h3 className={`text-4xl font-black tracking-tight ${financials.profit >= 0 ? 'text-white print:text-black' : 'text-red-600'}`}>{formatMoney(financials.profit)}</h3>
                    <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold ${financials.profit >= 0 ? 'bg-emerald-500/20 text-emerald-300 print:bg-emerald-50 print:text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        <Activity className="w-3 h-3"/> Margen: {financials.margin.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* SECCIÓN OPERATIVA */}
            <div className="print-grid-2 print-break-inside-avoid mb-8">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pl-1 print:text-black print:mb-2 print:border-b print:pb-1 print:text-sm">
                        <BarChart3 className="text-indigo-500 w-5 h-5 print:hidden"/> Rendimiento Operativo
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
                        <OperationalChart 
                            data={weekDayData} 
                            title="Días Laborales (Lun - Vie)" 
                            subtitle="Ingresos por día"
                            icon={Wallet} 
                            colorKey="income" 
                            id="1" 
                            printDesc="Distribución de ingresos durante la semana laboral."
                        />
                        <OperationalChart 
                            data={weekendData} 
                            title="Fin de Semana (Sáb - Dom)" 
                            subtitle="Ingresos fin de semana"
                            icon={CalendarRange} 
                            colorKey="expense" 
                            id="2"
                            printDesc="Comportamiento de ventas durante el fin de semana."
                        />
                    </div>
                </div>
                
                {/* DESGLOSE (Se forza a la derecha en impresión) */}
                <div className="print-only">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 pl-1 print:text-black print:mb-2 print:border-b print:pb-1 print:text-sm">
                        Desglose Financiero
                    </h2>
                    <div className="flex flex-col gap-4">
                        <CategoryChart data={incomeCategoryData} title="Top Ingresos" subtitle="Por Categoría" icon={ArrowUpCircle} color="green" />
                        <CategoryChart data={expenseCategoryData} title="Top Gastos" subtitle="Por Categoría" icon={ArrowDownCircle} color="red" />
                    </div>
                </div>
            </div>

            {/* DESGLOSE (Solo Pantalla) */}
            <div className="print-hidden mb-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pl-1"><PieChart className="text-indigo-500 w-5 h-5"/> Desglose Financiero</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <CategoryChart data={incomeCategoryData} title="Origen de Ingresos" subtitle="Categorías Principales" icon={ArrowUpCircle} color="green" />
                    <CategoryChart data={expenseCategoryData} title="Distribución de Gastos" subtitle="Egresos Operativos" icon={ArrowDownCircle} color="red" />
                </div>
            </div>

            {/* TENDENCIA (Full Width) */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 print:break-inside-avoid print:shadow-none print:border-slate-300 print:rounded-xl print:mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 print:text-black">{chartTitle}</h3>
                        <p className="text-slate-400 text-sm mt-1 print:hidden">Visualización del flujo de ingresos.</p>
                    </div>
                </div>
                <div className="h-[300px] w-full print:h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={COLORS.income} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}}/>
                            <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v)=>`$${v/1000}k`} tick={{fill: '#94a3b8'}}/>
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="value" stroke={COLORS.income} strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 print:border-slate-300">
                    <p className="text-xs text-slate-500 leading-relaxed text-center print:text-black">
                        <Info className="w-3 h-3 inline mr-1 mb-0.5"/>
                        El punto más alto de ingresos se registró en <strong>{maxTrendLabel}</strong> ({formatMoney(maxTrendVal)}).
                    </p>
                </div>
            </div>
        </>
        )}

        {/* VISTA 2: TABLA DE DATOS */}
        {viewMode === 'table' && (
            <div className="animate-fade-in">
                 {/* CONTROLES (OCULTOS EN PRINT) */}
                 <div className="flex flex-col md:flex-row justify-between gap-4 mb-4 print-hidden">
                     <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none shadow-sm"/>
                        </div>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 text-sm font-medium outline-none shadow-sm"><option value="all">Todo</option><option value="income">Ingresos</option><option value="expense">Gastos</option></select>
                     </div>
                     <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition"><Download className="w-4 h-4"/> Exportar Datos</button>
                 </div>

                 {/* TABLA PRINCIPAL */}
                 <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:border-slate-300 print:shadow-none print:w-full">
                    <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-sm text-left print-table">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs print:bg-white print:text-black print:border-black">
                                <tr>
                                    <th className="px-6 py-4 print:px-2 print:py-1">Fecha</th>
                                    <th className="px-6 py-4 print:px-2 print:py-1">Categoría</th>
                                    <th className="px-6 py-4 print:px-2 print:py-1">Descripción</th>
                                    <th className="px-6 py-4 text-center print:px-2 print:py-1">Tipo</th>
                                    <th className="px-6 py-4 text-right print:px-2 print:py-1">Monto</th>
                                    {isAdmin && <th className="px-6 py-4 text-center print-hidden">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 print:break-inside-avoid">
                                        <td className="px-6 py-3 font-medium print:px-2 print:py-1 print:text-black">{format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                                        <td className="px-6 py-3 print:px-2 print:py-1"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold border border-slate-200 print:border-none print:bg-transparent print:p-0 print:text-black">{t.category}</span></td>
                                        <td className="px-6 py-3 text-slate-500 max-w-xs truncate print:px-2 print:py-1 print:text-black print:whitespace-normal">{t.description || '-'}</td>
                                        <td className="px-6 py-3 text-center print:px-2 print:py-1">{t.type === 'income' ? <span className="text-blue-600 font-bold print:text-black">Ingreso</span> : <span className="text-rose-600 font-bold print:text-black">Gasto</span>}</td>
                                        <td className={`px-6 py-3 text-right font-bold font-mono print:px-2 print:py-1 ${t.type === 'income' ? 'text-blue-600 print:text-black' : 'text-rose-600 print:text-black'}`}>{t.type === 'expense' ? '-' : ''}{formatMoney(t.amount)}</td>
                                        {isAdmin && <td className="px-6 py-3 text-center flex justify-center gap-2 print-hidden"><button onClick={() => setEditingTransaction(t)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-full"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDelete(t.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-full"><Trash2 className="w-4 h-4"/></button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
                 
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg mt-4 flex flex-col sm:flex-row justify-between items-center text-sm gap-4 print:bg-white print:border-t-2 print:border-black print:rounded-none print:mt-2 print:break-inside-avoid">
                    <span className="text-slate-500 print:text-black">Registros visibles: <strong>{filteredTransactions.length}</strong></span>
                    <div className="flex gap-4 sm:gap-6 flex-wrap justify-center">
                        <span className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 print:bg-transparent print:border-none print:text-black print:p-0">Ingresos: {formatMoney(totalVisibleIncome)}</span>
                        <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 print:bg-transparent print:border-none print:text-black print:p-0">Gastos: {formatMoney(totalVisibleExpense)}</span>
                        <span className={`font-black px-3 py-1 rounded-lg border print:bg-transparent print:border-none print:text-black print:p-0 ${totalVisibleBalance >= 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>Balance: {formatMoney(totalVisibleBalance)}</span>
                    </div>
                 </div>
            </div>
        )}

        {/* MODAL DE EDICIÓN */}
        {editingTransaction && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 print-hidden">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-500"/> Editar Movimiento</h3>
                        <button onClick={() => setEditingTransaction(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Fecha</label><input type="date" value={editingTransaction.date} onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})} className="w-full mt-1 p-2 border rounded-lg text-sm"/></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Monto</label><input type="number" value={editingTransaction.amount} onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded-lg text-sm font-bold text-right"/></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Categoría</label><select value={editingTransaction.category} onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})} className="w-full mt-1 p-2 border rounded-lg text-sm bg-white"><option value="">Seleccionar...</option>{categoriesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Descripción</label><input type="text" value={editingTransaction.description || ''} onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})} className="w-full mt-1 p-2 border rounded-lg text-sm"/></div>
                        <button onClick={handleSaveEdit} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg mt-4"><Save className="w-4 h-4"/> Guardar Cambios</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}