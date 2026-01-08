import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Coins, Calculator, AlertTriangle, CheckCircle2, RefreshCw, History, ArrowRight, Eraser } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Lista de denominaciones completa
const DENOMINATIONS_LIST = ['1000', '500', '200', '100', '50', '20', '10', '5', '2', '1', '0.50', '0.20', '0.10', '0.01'];

export function CashCountView() {
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [lastSavedDate, setLastSavedDate] = useState<string | null>(null);

  // ESTADO 1: Base Anterior (Solo lectura - DB)
  const [prevDenominations, setPrevDenominations] = useState<Record<string, number>>({});
  
  // ESTADO 2: Captura Actual (Editable)
  const [currentDenominations, setCurrentDenominations] = useState<Record<string, number>>({});

  // Totales Financieros
  const [totals, setTotals] = useState({ income: 0, expense: 0, expected: 0 });
  const [countedAmount, setCountedAmount] = useState(0);

  // --- EFECTO: CAMBIO DE FECHA (Limpia fantasmas y recarga) ---
  useEffect(() => {
    // 1. Limpieza inmediata de estados
    setPrevDenominations({});
    setCurrentDenominations({});
    setCountedAmount(0);
    setTotals({ income: 0, expense: 0, expected: 0 });
    setLastSavedDate(null);
    
    // 2. Cargar datos frescos
    fetchData();
  }, [selectedDate]);

  // --- EFECTO: CALCULAR TOTALES AL EDITAR ---
  useEffect(() => {
    calculateTotal();
  }, [currentDenominations]);

  const fetchData = async () => {
    setLoading(true);
    try {
        await Promise.all([
            fetchSystemProfit(),
            fetchPreviousCut(), // Columna 1
            fetchCurrentCut()   // Columna 2 (si ya existe guardado)
        ]);
    } catch (e) {
        console.error("Error cargando datos:", e);
    } finally {
        setLoading(false);
    }
  };

  // 1. TRAER EL CORTE ANTERIOR (Fecha < Seleccionada)
  const fetchPreviousCut = async () => {
    const { data } = await supabase
        .from('cash_counts')
        .select('date, denominations')
        .lt('date', selectedDate) // Menor que la fecha seleccionada
        .order('date', { ascending: false })
        .limit(1)
        .single();

    if (data) {
        setLastSavedDate(data.date);
        setPrevDenominations(data.denominations || {});
    }
  };

  // 2. TRAER EL CORTE ACTUAL (Si ya se guardó algo hoy)
  const fetchCurrentCut = async () => {
    const { data } = await supabase
        .from('cash_counts')
        .select('denominations')
        .eq('date', selectedDate)
        .single();

    if (data && data.denominations) {
        // Si ya existe corte hoy, lo cargamos para editar
        setCurrentDenominations(data.denominations);
    }
  };

  const fetchSystemProfit = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .lte('date', selectedDate); 

    if (data) {
      const totalIncome = data
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const totalExpense = data
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        
      setTotals({
          income: totalIncome,
          expense: totalExpense,
          expected: totalIncome - totalExpense
      });
    }
  };

  const calculateTotal = () => {
    let total = 0;
    Object.entries(currentDenominations).forEach(([value, count]) => {
      total += parseFloat(value) * count;
    });
    setCountedAmount(total);
  };

  const handleChange = (value: string, count: string) => {
    const qty = count === '' ? 0 : parseFloat(count);
    setCurrentDenominations(prev => ({ ...prev, [value]: qty }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    if (countedAmount <= 0) {
        if(!confirm("⚠️ El total es $0.00. ¿Deseas guardar de todas formas?")) return;
    }

    setLoading(true);
    const difference = countedAmount - totals.expected;
    
    // CORRECCIÓN: Se eliminó 'updated_at' para evitar el error de base de datos
    const { error } = await supabase
        .from('cash_counts')
        .upsert({ 
            date: selectedDate,
            expected_amount: totals.expected,
            counted_amount: countedAmount,
            difference: difference,
            denominations: currentDenominations,
            notes: difference === 0 ? 'Corte Perfecto' : difference > 0 ? 'Sobrante' : 'Faltante'
        }, { onConflict: 'date' }); 

    setLoading(false);

    if (error) {
        alert('Error al guardar: ' + error.message);
    } else {
        alert('✅ Corte guardado correctamente. Los datos se han actualizado.');
        fetchData(); // Recargamos para asegurar que todo esté sincronizado
    }
  };

  const difference = countedAmount - totals.expected;
  const isPerfect = Math.abs(difference) < 0.01; // Ajuste de tolerancia para centavos
  const money = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="bg-amber-500 p-2 rounded-lg text-white shadow-lg shadow-amber-200">
                <Coins className="w-6 h-6" /> 
            </div>
            Corte de Caja
          </h2>
          <p className="text-slate-500 font-medium mt-1 ml-1">Arqueo de efectivo diario.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
             <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha:</div>
             <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-200 p-2 rounded-lg font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: CALCULADORA (7/12) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden relative flex flex-col">
          
          {/* BLOQUEO READ-ONLY */}
          {!isAdmin && (
            <div className="absolute inset-0 bg-white/60 z-20 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white p-4 rounded-xl shadow-2xl border border-slate-200 flex flex-col items-center">
                    <AlertTriangle className="w-10 h-10 text-orange-500 mb-2"/>
                    <span className="font-bold text-slate-700">Modo Solo Lectura</span>
                </div>
            </div>
          )}

          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-500"/> Desglose de Monedas
            </h3>
            {lastSavedDate ? (
                <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-1 shadow-sm">
                    <History className="w-3 h-3 text-slate-400"/> Base: {lastSavedDate}
                </span>
            ) : (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                    Sin base anterior
                </span>
            )}
          </div>
          
          {/* TABLA SCROLLABLE */}
          <div className="flex-1 overflow-hidden flex flex-col">
             <div className="grid grid-cols-12 gap-0 bg-slate-100 text-[10px] sm:text-xs font-bold text-slate-500 uppercase py-3 border-b border-slate-200 text-center shrink-0">
                 <div className="col-span-3">Valor</div>
                 <div className="col-span-3 text-slate-400 border-r border-slate-200">Base (DB)</div>
                 <div className="col-span-3 text-emerald-600 border-r border-slate-200">Captura</div>
                 <div className="col-span-3">Subtotal</div>
             </div>

             <div className="overflow-y-auto max-h-[500px]"> {/* Altura controlada */}
                {DENOMINATIONS_LIST.map((val, index) => {
                   const qtyPrev = prevDenominations[val] || 0;
                   const qtyCurr = currentDenominations[val] || 0;
                   const totalRow = parseFloat(val) * qtyCurr;
                   
                   return (
                   <div key={val} className={`grid grid-cols-12 gap-0 items-center border-b border-slate-50 hover:bg-slate-50 transition p-2 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* 1. DENOMINACIÓN */}
                      <div className="col-span-3 flex justify-center">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md text-sm shadow-sm border border-slate-200 w-20 text-center">
                            ${val}
                        </span>
                      </div>

                      {/* 2. BASE (READONLY) */}
                      <div className="col-span-3 flex justify-center border-r border-slate-100">
                         <div className="w-16 py-1.5 text-center text-slate-400 font-mono text-sm select-none">
                            {qtyPrev > 0 ? qtyPrev : '-'}
                         </div>
                      </div>

                      {/* 3. CAPTURA (EDITABLE) */}
                      <div className="col-span-3 flex justify-center border-r border-slate-100">
                         <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            disabled={!isAdmin}
                            onFocus={(e) => e.target.select()}
                            className="w-20 py-1.5 text-center font-mono font-bold text-emerald-600 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 outline-none bg-white shadow-inner transition-all"
                            value={currentDenominations[val] === undefined ? '' : currentDenominations[val]}
                            onChange={(e) => handleChange(val, e.target.value)}
                          />
                      </div>

                      {/* 4. TOTAL ROW */}
                      <div className="col-span-3 text-right pr-6 font-bold text-slate-700 text-sm">
                         {totalRow > 0 ? money(totalRow) : <span className="text-slate-200">-</span>}
                      </div>
                   </div>
                )})}
             </div>
          </div>

          <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0 shadow-inner">
             <div className="flex items-center gap-2">
                 <button onClick={() => {if(confirm('¿Limpiar todo?')) setCurrentDenominations({})}} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition" title="Limpiar captura">
                    <Eraser className="w-4 h-4"/>
                 </button>
                 <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">Total Físico:</span>
             </div>
             <span className="text-3xl font-black tracking-tight text-emerald-400">{money(countedAmount)}</span>
          </div>
        </div>

        {/* COLUMNA DERECHA: VALIDACIÓN (5/12) */}
        <div className="lg:col-span-5 space-y-6">
           
           <div className={`p-6 rounded-2xl border shadow-sm transition-all duration-500 ${isPerfect ? 'bg-gradient-to-br from-white to-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800 text-lg">Validación de Cuadre</h3>
                  <button onClick={fetchSystemProfit} className="text-slate-400 hover:text-blue-600 transition p-2 hover:bg-slate-100 rounded-full" title="Recalcular"><RefreshCw className="w-4 h-4"/></button>
              </div>
              
              <div className="space-y-4">
                  {/* Utilidad Sistema */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 group-hover:w-2 transition-all"></div>
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esperado (Sistema)</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Ingresos - Gastos</span>
                      </div>
                      <div className="text-3xl font-black text-slate-800 tracking-tight">{money(totals.expected)}</div>
                  </div>

                  {/* Flecha */}
                  <div className="flex justify-center -my-3 relative z-10">
                      <div className="bg-slate-50 rounded-full p-1.5 border border-slate-200 shadow-sm">
                        <ArrowRight className="w-5 h-5 text-slate-400 rotate-90"/>
                      </div>
                  </div>

                  {/* Conteo Físico */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 group-hover:w-2 transition-all"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Real (Tu Conteo)</span>
                      <div className="text-3xl font-black text-emerald-600 tracking-tight">{money(countedAmount)}</div>
                  </div>

                  {/* Diferencia */}
                  <div className={`mt-6 pt-5 border-t border-dashed ${difference === 0 ? 'border-emerald-200' : 'border-slate-300'}`}>
                      <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-600 text-sm uppercase">Diferencia:</span>
                          <div className={`flex items-center gap-2 font-black text-2xl ${difference === 0 ? 'text-emerald-500' : difference > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                              {difference === 0 ? <CheckCircle2 className="w-7 h-7"/> : <AlertTriangle className="w-7 h-7"/>}
                              <span>{difference > 0 ? '+' : ''}{money(difference)}</span>
                          </div>
                      </div>
                      
                      <div className={`text-center text-xs font-bold uppercase p-3 rounded-lg border ${
                          difference === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          difference > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                          {difference === 0 ? '✨ Cuadre Perfecto ✨' : difference > 0 ? 'Sobrante (Dinero Extra)' : '⚠️ Faltante de Dinero'}
                      </div>
                  </div>
              </div>
           </div>

           {/* BOTÓN GUARDAR */}
           {isAdmin ? (
             <button 
               onClick={handleSave}
               disabled={loading}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
             >
               {loading ? (
                   <RefreshCw className="w-5 h-5 animate-spin text-slate-400"/>
               ) : (
                   <Save className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
               )}
               <span className="tracking-wide">{loading ? 'Procesando...' : 'GUARDAR CORTE'}</span>
             </button>
           ) : (
             <div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-center font-bold border border-orange-100 flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6"/>
                <span>No tienes permisos para guardar</span>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}