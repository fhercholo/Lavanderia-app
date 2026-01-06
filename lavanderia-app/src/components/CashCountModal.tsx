import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Save, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Las monedas de tu archivo Excel
const DENOMINATIONS = [
  { value: 1000, label: '$1,000' },
  { value: 500, label: '$500' },
  { value: 200, label: '$200' },
  { value: 100, label: '$100' },
  { value: 50, label: '$50' },
  { value: 20, label: '$20' },
  { value: 10, label: '$10' },
  { value: 5, label: '$5' },
  { value: 2, label: '$2' },
  { value: 1, label: '$1' },
  { value: 0.5, label: '50¢' },
];

export function CashCountModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [systemTotal, setSystemTotal] = useState(0);

  // Cargar ventas del día de HOY para comparar
  useEffect(() => {
    if (isOpen) {
      const fetchTodaySales = async () => {
        const today = new Date().toISOString().split('T')[0];
        
        // Sumamos solo INGRESOS ('income') de HOY
        const { data } = await supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'income')
          .eq('date', today);

        const total = data?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
        setSystemTotal(total);
      };
      fetchTodaySales();
      setCounts({}); // Resetear conteo al abrir
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calcular total físico en tiempo real
  const physicalTotal = DENOMINATIONS.reduce((acc, curr) => {
    return acc + (curr.value * (counts[curr.value] || 0));
  }, 0);

  const difference = physicalTotal - systemTotal;

  const handleSave = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Guardamos en la tabla cash_cuts
    const { error } = await supabase.from('cash_cuts').insert([{
      date: today,
      expected_amount: systemTotal,
      real_amount: physicalTotal,
      denominations: counts // Guardamos el detalle JSON de cuántos billetes hubo
    }]);

    setLoading(false);
    if (error) alert('Error: ' + error.message);
    else {
      alert(difference === 0 ? '¡Corte Perfecto!' : 'Corte guardado con diferencias.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Calculator className="text-blue-600" />
            <h3 className="font-bold text-lg text-slate-800">Corte de Caja (Arqueo)</h3>
          </div>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Los Billetes */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Conteo de Efectivo</h4>
              <div className="grid grid-cols-2 gap-3">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom.value} className="flex items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="w-12 font-bold text-slate-700 text-sm">{denom.label}</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="w-full bg-white border-none outline-none text-right font-mono text-lg"
                      value={counts[denom.value] || ''}
                      onChange={(e) => setCounts({ ...counts, [denom.value]: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Columna Derecha: Resultados */}
            <div className="flex flex-col gap-6">
              
              {/* Tarjeta Resumen */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
                <p className="text-slate-400 text-sm mb-1">Total Contado (Físico)</p>
                <div className="text-4xl font-bold mb-4">${physicalTotal.toLocaleString()}</div>
                
                <div className="border-t border-slate-700 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Sistema espera:</span>
                    <span className="font-mono">${systemTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Diferencia:</span>
                    <span className={`${difference < 0 ? 'text-red-400' : difference > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                      {difference > 0 ? '+' : ''}{difference.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alerta Visual */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                difference === 0 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                {difference === 0 ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                <div className="text-sm">
                  {difference === 0 
                    ? "¡La caja cuadra perfectamente! Puedes cerrar turno tranquilo."
                    : difference < 0 
                      ? `Faltan $${Math.abs(difference)}. Revisa si olvidaste registrar algún gasto o diste cambio de más.`
                      : `Sobran $${difference}. Posiblemente no registraste una venta.`
                  }
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="mt-auto w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg active:scale-95 transition flex justify-center gap-2"
              >
                {loading ? 'Guardando...' : 'Finalizar Corte'} <Save className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}