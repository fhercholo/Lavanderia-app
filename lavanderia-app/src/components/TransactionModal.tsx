import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { X, Save, Loader2, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
  editingTx?: any;
  lockDate?: boolean;
}

export function TransactionModal({ isOpen, onClose, onSuccess, defaultDate, editingTx, lockDate }: Props) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  
  // ESTADO PARA LAS LISTAS DINÁMICAS
  const [incomeCats, setIncomeCats] = useState<string[]>([]);
  const [expenseCats, setExpenseCats] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '', // Se llenará dinámicamente
    description: '',
    date: ''
  });

  // 1. CARGAR CATEGORÍAS DE LA BD AL ABRIR
  useEffect(() => {
    if (isOpen) {
      const fetchCats = async () => {
        const { data } = await supabase.from('categories').select('*');
        if (data) {
          const incomes = data.filter(c => c.type === 'income').map(c => c.name);
          const expenses = data.filter(c => c.type === 'expense').map(c => c.name);
          
          setIncomeCats(incomes);
          setExpenseCats(expenses);

          // Si estamos creando uno nuevo, poner por defecto la primera categoría válida
          if (!editingTx) {
            setFormData(prev => ({
              ...prev,
              category: type === 'income' ? incomes[0] : expenses[0]
            }));
          }
        }
      };
      fetchCats();
    }
  }, [isOpen]); // Se ejecuta cada vez que se abre el modal

  // 2. INICIALIZAR FORMULARIO
  useEffect(() => {
    if (isOpen) {
      if (editingTx) {
        setType(editingTx.type);
        setFormData({
          amount: editingTx.amount,
          category: editingTx.category,
          description: editingTx.description || '',
          date: editingTx.date
        });
      } else {
        setType('income');
        // La categoría se setea en el fetchCats, aquí solo ponemos fecha
        setFormData(prev => ({
          ...prev,
          amount: '',
          description: '',
          date: defaultDate || new Date().toISOString().split('T')[0]
        }));
      }
    }
  }, [isOpen, defaultDate, editingTx]);

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    // Cambiar a la primera categoría de la lista correspondiente
    const list = newType === 'income' ? incomeCats : expenseCats;
    setFormData(prev => ({ ...prev, category: list[0] || '' }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      type,
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
    };

    let error;

    if (editingTx) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingTx.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{ ...payload, created_at: new Date().toISOString() }]);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  const currentCategories = type === 'income' ? incomeCats : expenseCats;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">
            {editingTx ? 'Editar Movimiento' : 'Nueva Transacción'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${
                type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Ingreso (Venta)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${
                type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Gasto (Salida)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 flex justify-between">
                Fecha
                {lockDate && <span className="text-[10px] text-blue-600 flex items-center gap-1"><Lock className="w-3 h-3"/> Bloqueada por vista</span>}
            </label>
            <input
              type="date"
              required
              disabled={lockDate}
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className={`w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                lockDate ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
                {type === 'income' ? 'Tipo de Servicio' : 'Concepto del Gasto'}
            </label>
            {currentCategories.length > 0 ? (
                <select
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                {currentCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
                </select>
            ) : (
                <div className="text-red-500 text-xs p-2 bg-red-50 rounded">
                    ⚠️ No hay categorías cargadas. Ve a Configuración {'>'} Catálogos.
                </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              className="w-full p-3 text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción (Opcional)</label>
            <input
              type="text"
              placeholder={type === 'income' ? "Detalles extra" : "Ej. Compra de Jabón"}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || currentCategories.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
              type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Guardando...' : editingTx ? 'Actualizar' : 'Guardar'}
          </button>

        </form>
      </div>
    </div>
  );
}