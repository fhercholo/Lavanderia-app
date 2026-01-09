import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Coins, Calculator, AlertTriangle, CheckCircle2, RefreshCw, History, ArrowRight, Eraser, Eye, Plus, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Lista de denominaciones completa
const DENOMINATIONS_LIST = ['1000', '500', '200', '100', '50', '20', '10', '5', '2', '1', '0.50', '0.20', '0.10', '0.01'];

export function CashCountView() {
  const { isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [lastSavedDate, setLastSavedDate] = useState<string | null>(null);

  // ESTADO 1: Base Anterior (Lo que había ayer)
  const [prevDenominations, setPrevDenominations] = useState<Record<string, number>>({});
  
  // ESTADO 2: Ajustes del Día (Lo que sumas o restas hoy) - Inicia en 0
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});

  // Totales Financieros
  const [totals, setTotals] = useState({ income: 0, expense: 0, expected: 0 });
  const [countedAmount, setCountedAmount] = useState(0);

  // --- EFECTOS ---
  useEffect(() => {
    // Reset visual al cambiar fecha
    setPrevDenominations({});
    setAdjustments({});
    setCountedAmount(0);
    setTotals({ income: 0, expense: 0, expected: 0 });
    setLastSavedDate(null);
    
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    calculateTotal();
  }, [adjustments, prevDenominations]);

  // --- LÓGICA DE CARGA (DELTA) ---
  const fetchData = async () => {
    setLoading(true);
    try {
        await fetchSystemProfit();

        // 1. Buscar Corte de HOY
        const { data: currentData } = await supabase.from('cash_counts').select('*').eq('date', selectedDate).single();

        // 2. Buscar Corte ANTERIOR (Base)
        const { data: prevData } = await supabase.from('cash_counts').select('*').lt('date', selectedDate).order('date', { ascending: false }).limit(1).single();

        // A) Configurar Base (Columna Gris)
        const baseMap = prevData?.denominations || {};
        if (prevData) {
            setLastSavedDate(prevData.date);
            setPrevDenominations(baseMap);
        }

        // B) Configurar Ajustes (Inputs)
        const newAdjustments: Record<string, number> = {};
        
        DENOMINATIONS_LIST.forEach(val => {
            if (currentData?.denominations) {
                // Si ya guardé hoy, el ajuste es la diferencia: (Lo que guardé HOY) - (Lo que había AYER)
                const currentQty = currentData.denominations[val] || 0;
                const prevQty = baseMap[val] || 0;
                newAdjustments[val] = currentQty - prevQty;
            } else {
                // Si es nuevo día, empezamos en CERO (neutro)
                newAdjustments[val] = 0;
            }
        });
        
        setAdjustments(newAdjustments);

    } catch (e) {
        console.error("Error cargando datos:", e);
    } finally {
        setLoading(false);
    }
  };

  const fetchSystemProfit = async () => {
    const { data } = await supabase.from('transactions').select('amount, type').lte('date', selectedDate); 
    if (data) {
      const totalIncome = data.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      const totalExpense = data.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      setTotals({ income: totalIncome, expense: totalExpense, expected: totalIncome - totalExpense });
    }
  };

  const calculateTotal = () => {
    let total = 0;
    DENOMINATIONS_LIST.forEach((val) => {
      const base = prevDenominations[val] || 0;
      const adj = adjustments[val] || 0;
      // El total real es: (Base + Ajuste) * Valor
      // Usamos Math.max(0, ...) para evitar dinero negativo absurdo, aunque permitimos el ajuste negativo
      const finalCount = Math.max(0, base + adj); 
      total += parseFloat(val) * finalCount;
    });
    setCountedAmount(total);
  };

  const handleChange = (value: string, inputValue: string) => {
    // Permitir números negativos y vacíos
    const qty = inputValue === '' ? 0 : parseFloat(inputValue);
    setAdjustments(prev => ({ ...prev, [value]: qty }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    if (countedAmount < 0 && !confirm("⚠️ El total es negativo. ¿Deseas guardar?")) return;

    setLoading(true);
    const difference = countedAmount - totals.expected;
    
    // Construir el objeto FINAL (Base + Ajuste) para guardar en DB
    const finalDenominations: Record<string, number> = {};
    DENOMINATIONS_LIST.forEach(val => {
        const base = prevDenominations[val] || 0;
        const adj = adjustments[val] || 0;
        finalDenominations[val] = Math.max(0, base + adj); // Guardamos el valor absoluto resultante
    });

    const { error } = await supabase.from('cash_counts').upsert({ 
            date: selectedDate,
            expected_amount: totals.expected,
            counted_amount: countedAmount,
            difference: difference,
            denominations: finalDenominations, // <-- Se guarda el total real, no el ajuste
            notes: difference === 0 ? 'Corte Perfecto' : difference > 0 ? 'Sobrante' : 'Faltante'
        }, { onConflict: 'date' }); 

    setLoading(false);
    if (error) alert('Error al guardar: ' + error.message);
    else { 
        alert('✅ Histórico actualizado correctamente.'); 
        fetchData(); 
    }
  };

  const difference = countedAmount - totals.expected;
  const isPerfect = Math.abs(difference) < 0.01;
  const money = (val: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-20 lg:pb-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center md:text-left">
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-800 flex items-center justify-center md:justify-start gap-3 tracking-tight">
            <div className="bg-amber-500 p-2 rounded-lg text-white shadow-lg shadow-amber-200"><Coins className="w-6 h-6" /></div>
            Caja Continua
          </h2>
          <p className="text-slate-500 font-medium mt-1 ml-1 text-sm">Ajuste de flujo diario.</p>
        </div>
        
        <div className="w-full md:w-auto flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
             <div className="px-2 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Fecha:</div>
             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full md:w-auto bg-white border border-slate-200 p-2 rounded-lg font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-amber-200 text-sm"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* COLUMNA IZQUIERDA: CALCULADORA DE AJUSTES */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden relative flex flex-col h-auto max-h-[80vh] lg:max-h-none">
          
          <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm lg:text-base">
                    <Calculator className="w-5 h-5 text-indigo-500"/> Ajustes
                </h3>
                {!isAdmin && (
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Eye className="w-3 h-3"/> Auditor
                    </span>
                )}
            </div>
            {lastSavedDate ? (
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 flex items-center gap-1 shadow-sm">
                    <History className="w-3 h-3 text-slate-400"/> Base: {lastSavedDate}
                </span>
            ) : <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">Nueva Base</span>}
          </div>
          
          {/* TABLA DE MONEDAS */}
          <div className="flex-1 overflow-y-auto">
             <div className="grid grid-cols-12 gap-0 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase py-2 border-b border-slate-200 text-center sticky top-0 z-10 shadow-sm">
                 <div className="col-span-3">Valor</div>
                 <div className="col-span-3 text-slate-400 border-r border-slate-200">Base</div>
                 <div className="col-span-3 text-blue-600 border-r border-slate-200">Ajuste (+/-)</div>
                 <div className="col-span-3">Total $</div>
             </div>

             <div className="pb-2">
                {DENOMINATIONS_LIST.map((val, index) => {
                   const qtyPrev = prevDenominations[val] || 0;
                   const qtyAdj = adjustments[val] || 0;
                   const finalCount = Math.max(0, qtyPrev + qtyAdj);
                   const totalRow = parseFloat(val) * finalCount;
                   
                   return (
                   <div key={val} className={`grid grid-cols-12 gap-0 items-center border-b border-slate-50 hover:bg-slate-50 transition p-1.5 lg:p-2 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* DENOMINACIÓN */}
                      <div className="col-span-3 flex justify-center">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 lg:px-3 py-1 lg:py-1.5 rounded-md text-xs lg:text-sm shadow-sm border border-slate-200 w-16 lg:w-20 text-center">
                            ${val}
                        </span>
                      </div>

                      {/* BASE (READONLY) */}
                      <div className="col-span-3 flex justify-center border-r border-slate-100">
                         <div className="w-full text-center text-slate-400 font-mono text-xs lg:text-sm select-none">
                            {qtyPrev}
                         </div>
                      </div>

                      {/* AJUSTE (EDITABLE +/-) */}
                      <div className="col-span-3 flex justify-center border-r border-slate-100 px-1 relative">
                         <input 
                            type="number" 
                            placeholder="0"
                            disabled={!isAdmin}
                            onFocus={(e) => e.target.select()}
                            className={`w-full max-w-[4rem] text-center font-mono font-bold text-sm lg:text-base outline-none transition-all rounded py-1
                                ${isAdmin 
                                    ? qtyAdj !== 0 
                                        ? qtyAdj > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'
                                        : 'text-slate-600 border border-slate-300 focus:ring-2 focus:ring-blue-400' 
                                    : 'bg-transparent border-none text-slate-800' 
                                }`}
                            value={adjustments[val] === 0 ? '' : adjustments[val]}
                            onChange={(e) => handleChange(val, e.target.value)}
                          />
                          {/* Indicador visual de signo */}
                          {qtyAdj !== 0 && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {qtyAdj > 0 ? <Plus className="w-3 h-3 text-emerald-400"/> : <Minus className="w-3 h-3 text-rose-400"/>}
                              </div>
                          )}
                      </div>

                      {/* TOTAL ROW (Base + Ajuste) */}
                      <div className="col-span-3 text-right pr-2 lg:pr-6 font-bold text-slate-700 text-xs lg:text-sm">
                         {totalRow > 0 ? money(totalRow) : <span className="text-slate-200">-</span>}
                      </div>
                   </div>
                )})}
             </div>
          </div>

          {/* FOOTER TOTAL */}
          <div className="bg-slate-900 p-4 lg:p-5 flex justify-between items-center text-white shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
             <div className="flex items-center gap-2">
                 {isAdmin && (
                     <button onClick={() => {if(confirm('¿Reiniciar ajustes a cero?')) setAdjustments({})}} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 transition" title="Limpiar ajustes">
                        <Eraser className="w-4 h-4"/>
                     </button>
                 )}
                 <span className="text-xs lg:text-sm font-bold text-slate-300 uppercase tracking-wide">Total Físico:</span>
             </div>
             <span className="text-2xl lg:text-3xl font-black tracking-tight text-emerald-400">{money(countedAmount)}</span>
          </div>
        </div>

        {/* COLUMNA DERECHA: VALIDACIÓN */}
        <div className="lg:col-span-5 space-y-4 lg:space-y-6">
           
           <div className={`p-4 lg:p-6 rounded-2xl border shadow-sm transition-all duration-500 ${isPerfect ? 'bg-gradient-to-br from-white to-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-center mb-4 lg:mb-6">
                  <h3 className="font-bold text-slate-800 text-base lg:text-lg">Validación</h3>
                  <button onClick={fetchSystemProfit} className="text-slate-400 hover:text-blue-600 transition p-2 hover:bg-slate-100 rounded-full"><RefreshCw className="w-4 h-4"/></button>
              </div>
              
              <div className="space-y-3 lg:space-y-4">
                  {/* Utilidad Sistema */}
                  <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 group-hover:w-2 transition-all"></div>
                      <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esperado</span>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">Sistema</span>
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">{money(totals.expected)}</div>
                  </div>

                  {/* Flecha */}
                  <div className="flex justify-center -my-2 lg:-my-3 relative z-10">
                      <div className="bg-slate-50 rounded-full p-1 border border-slate-200 shadow-sm">
                        <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-slate-400 rotate-90"/>
                      </div>
                  </div>

                  {/* Conteo Físico */}
                  <div className="bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 group-hover:w-2 transition-all"></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Real (Base + Ajustes)</span>
                      <div className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight">{money(countedAmount)}</div>
                  </div>

                  {/* Diferencia */}
                  <div className={`mt-4 pt-4 lg:mt-6 lg:pt-5 border-t border-dashed ${difference === 0 ? 'border-emerald-200' : 'border-slate-300'}`}>
                      <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-600 text-xs lg:text-sm uppercase">Diferencia:</span>
                          <div className={`flex items-center gap-2 font-black text-xl lg:text-2xl ${difference === 0 ? 'text-emerald-500' : difference > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                              {difference === 0 ? <CheckCircle2 className="w-6 h-6 lg:w-7 lg:h-7"/> : <AlertTriangle className="w-6 h-6 lg:w-7 lg:h-7"/>}
                              <span>{difference > 0 ? '+' : ''}{money(difference)}</span>
                          </div>
                      </div>
                      
                      <div className={`text-center text-[10px] lg:text-xs font-bold uppercase p-2 lg:p-3 rounded-lg border ${
                          difference === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          difference > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                          {difference === 0 ? '✨ Cuadre Perfecto ✨' : difference > 0 ? 'Sobrante' : '⚠️ Faltante'}
                      </div>
                  </div>
              </div>
           </div>

           {/* BOTÓN GUARDAR */}
           {isAdmin ? (
             <button 
               onClick={handleSave}
               disabled={loading}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 lg:py-4 rounded-xl shadow-lg shadow-slate-300 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group text-sm lg:text-base"
             >
               {loading ? (
                   <RefreshCw className="w-5 h-5 animate-spin text-slate-400"/>
               ) : (
                   <Save className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
               )}
               <span className="tracking-wide">{loading ? 'Guardando Ajustes...' : 'GUARDAR CORTE'}</span>
             </button>
           ) : (
             <div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-center font-bold border border-orange-100 flex flex-col items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5"/>
                <span>Solo lectura (Modo Auditor)</span>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}