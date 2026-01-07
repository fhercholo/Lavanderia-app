import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save, Coins, Calculator, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; // <--- IMPORTAMOS SEGURIDAD

export function CashCountView() {
  const { isAdmin } = useAuth(); // <--- VERIFICAMOS PERMISO
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Estado de Billetes y Monedas
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, '20': 0,
    '10': 0, '5': 0, '2': 0, '1': 0, '0.5': 0
  });

  // Totales
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    expected: 0 
  });
  
  const [countedAmount, setCountedAmount] = useState(0);

  useEffect(() => {
    fetchSystemProfit();
  }, [selectedDate]);

  useEffect(() => {
    calculateTotal();
  }, [denominations]);

  const fetchSystemProfit = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .lte('date', selectedDate);

    if (error) {
        console.error('Error al traer datos:', error);
        return;
    }

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
    Object.entries(denominations).forEach(([value, count]) => {
      total += Number(value) * count;
    });
    setCountedAmount(total);
  };

  const handleChange = (value: string, count: string) => {
    const qty = parseInt(count) || 0;
    setDenominations(prev => ({ ...prev, [value]: qty }));
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const difference = countedAmount - totals.expected;
    
    const { error } = await supabase.from('cash_counts').insert([{
      date: selectedDate,
      expected_amount: totals.expected,
      counted_amount: countedAmount,
      difference: difference,
      denominations: denominations, 
      notes: difference === 0 ? 'Corte Perfecto' : difference > 0 ? 'Sobrante (Histórico)' : 'Faltante (Histórico)'
    }]);

    setLoading(false);
    if (error) alert('Error al guardar: ' + error.message);
    else {
        alert('¡Arqueo guardado correctamente!');
    }
  };

  const difference = countedAmount - totals.expected;
  const isPerfect = Math.abs(difference) < 1; 

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500" /> Arqueo de Caja (Histórico)
          </h2>
          <p className="text-slate-500">Compara el efectivo real contra la utilidad acumulada histórica.</p>
        </div>
        {/* El selector de fecha SÍ se deja activo para que el auditor pueda CONSULTAR días pasados */}
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 p-2 rounded-lg font-bold text-slate-700 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLUMNA 1: CALCULADORA DE BILLETES */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
          
          {/* BLOQUEO VISUAL PARA AUDITORES */}
          {!isAdmin && (
            <div className="absolute inset-0 bg-slate-50/50 z-10 cursor-not-allowed rounded-xl flex items-center justify-center">
                <span className="bg-white px-3 py-1 rounded-full shadow-sm text-xs font-bold text-slate-400 border border-slate-200">
                    Edición Bloqueada
                </span>
            </div>
          )}

          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4"/> Billetes y Monedas
          </h3>
          
          <div className="space-y-3">
             {/* Billetes más comunes primero */}
             {['1000', '500', '200', '100', '50', '20', '10', '5', '2', '1', '0.5'].map(val => (
               <div key={val} className="flex items-center gap-4">
                  <div className="w-24 text-right font-bold text-slate-600 text-sm">
                    ${val}
                  </div>
                  <div className="text-slate-300">x</div>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="0"
                    disabled={!isAdmin} // <--- AQUÍ EL CAMBIO CLAVE
                    className="flex-1 border border-slate-200 rounded-lg p-2 text-center font-mono font-bold text-blue-900 bg-slate-50 focus:bg-white transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    value={denominations[val] || ''}
                    onChange={(e) => handleChange(val, e.target.value)}
                  />
                  <div className="w-24 text-right font-mono text-slate-400 text-sm">
                     = ${(Number(val) * (denominations[val] || 0)).toLocaleString()}
                  </div>
               </div>
             ))}
          </div>

          <div className="mt-6 pt-4 border-t-2 border-slate-100 flex justify-between items-center">
             <span className="text-lg font-bold text-slate-700">Total Físico:</span>
             <span className="text-2xl font-bold text-blue-600">${countedAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {/* COLUMNA 2: COMPARATIVA VS SISTEMA */}
        <div className="space-y-6">
           
           {/* TARJETA DE RESUMEN */}
           <div className={`p-6 rounded-xl border-2 shadow-sm transition-all ${isPerfect ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
              <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-slate-700">Balance Acumulado</h3>
                  <button onClick={fetchSystemProfit} className="text-slate-400 hover:text-blue-600"><RefreshCw className="w-4 h-4"/></button>
              </div>
              
              <div className="space-y-4">
                  <div className="bg-white/60 p-3 rounded-lg text-sm space-y-1 border border-slate-100">
                      <div className="flex justify-between text-emerald-700">
                          <span>(+) Ingresos Históricos:</span>
                          <span className="font-bold">${totals.income.toLocaleString('es-MX')}</span>
                      </div>
                      <div className="flex justify-between text-rose-700">
                          <span>(-) Gastos Históricos:</span>
                          <span className="font-bold">${totals.expense.toLocaleString('es-MX')}</span>
                      </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg text-white shadow-md">
                      <span className="font-medium text-sm">Utilidad Histórica (Debería haber):</span>
                      <span className="font-bold text-xl">${totals.expected.toLocaleString('es-MX')}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                      <span className="text-slate-500 font-medium text-sm">Hay físicamente:</span>
                      <span className="font-bold text-blue-600 text-xl">${countedAmount.toLocaleString('es-MX')}</span>
                  </div>

                  <div className="border-t border-slate-200 my-2"></div>

                  <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Diferencia Total:</span>
                      <div className={`flex items-center gap-2 font-bold text-xl ${difference === 0 ? 'text-emerald-600' : difference > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {difference === 0 ? <CheckCircle2 className="w-6 h-6"/> : <AlertTriangle className="w-6 h-6"/>}
                          <span>{difference > 0 ? '+' : ''}{difference.toLocaleString('es-MX')}</span>
                      </div>
                  </div>
                  
                  <p className={`text-center text-xs font-bold uppercase mt-2 ${difference === 0 ? 'text-emerald-500' : difference > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {difference === 0 ? '¡Cuadre Histórico Perfecto!' : difference > 0 ? 'Sobrante Acumulado' : 'Faltante Acumulado'}
                  </p>
              </div>
           </div>

           {/* BOTÓN GUARDAR (PROTEGIDO) */}
           {isAdmin ? (
             <button 
               onClick={handleSave}
               disabled={loading}
               className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               <Save className="w-5 h-5" />
               {loading ? 'Guardando...' : 'Guardar Corte Histórico'}
             </button>
           ) : (
             <div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-center font-bold border border-orange-100 flex flex-col items-center">
                <p className="flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Modo Auditoría</p>
                <span className="text-xs font-normal mt-1">Solo lectura. No puedes modificar ni guardar el corte.</span>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}