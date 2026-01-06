import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../supabase';
import { Upload, Loader2, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';

export function DataImporter() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

  // --- 1. PLANTILLAS CON FORMATO MX (DD/MM/AAAA) ---
  const downloadTemplate = (type: 'sales' | 'expenses') => {
    let content = '';
    let filename = '';

    if (type === 'sales') {
      // Ejemplo: 05/01/2025
      content = 'Fecha,Monto,Categoria\n01/01/2025,120.00,Autoservicio\n01/01/2025,350.50,Por Encargo\n02/01/2025,80.00,Autoservicio';
      filename = 'plantilla_ventas.csv';
    } else {
      content = 'Fecha,Concepto,Monto\n01/01/2025,JABON,450.00\n02/01/2025,LUZ,1200.00\n03/01/2025,RENTA,5000.00';
      filename = 'plantilla_gastos.csv';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'ventas' | 'gastos') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLogs([]); 
    addLog(`📂 Analizando archivo de ${type}...`);

    Papa.parse(file, {
      complete: async (results) => {
        addLog(`✅ Archivo leído. Procesando ${results.data.length} filas...`);
        await processData(results.data as any[], type);
        setLoading(false);
      },
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.toLowerCase().trim()
    });
    
    event.target.value = '';
  };

  // --- HELPER: CONVERTIR DD/MM/AAAA -> YYYY-MM-DD ---
  // La base de datos siempre necesita YYYY-MM-DD, pero el usuario sube DD/MM/AAAA
  const parseDateMX = (dateStr: string): string | null => {
    if (!dateStr) return null;
    
    // Si ya viene en formato ISO (2025-01-05), lo dejamos pasar
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Buscamos formato DD/MM/AAAA o D/M/AAAA
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`; // Retorna ISO
    }
    return null; // Fecha inválida
  };

  const syncCategories = async (newCategories: string[], type: 'income' | 'expense') => {
    if (newCategories.length === 0) return;

    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .in('name', newCategories)
      .eq('type', type);

    const existingNames = new Set(existing?.map(c => c.name) || []);
    const toCreate = newCategories.filter(cat => !existingNames.has(cat));

    if (toCreate.length > 0) {
      addLog(`✨ Creando ${toCreate.length} categorías nuevas en el catálogo...`);
      await supabase.from('categories').insert(toCreate.map(name => ({ name, type })));
    }
  };

  const processData = async (rows: any[], type: 'ventas' | 'gastos') => {
    let successCount = 0;
    const batchSize = 50;
    let currentBatch: any[] = [];
    const uniqueCategoriesFound = new Set<string>();
    
    // Regex para detectar fechas tipo "01/05/2025" o "1/5/2025"
    const dateRegexMX = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

    const rowsToInsert = [];

    for (const row of rows) {
      const values = Object.values(row);
      
      // 1. Buscar fecha en formato DD/MM/AAAA
      let rawDate = values.find((v: any) => dateRegexMX.test(v));
      
      // Si no la encuentra por valor, busca por nombre de columna
      if (!rawDate && row['fecha'] && dateRegexMX.test(row['fecha'])) {
        rawDate = row['fecha'];
      }

      // 2. Convertir a formato base de datos
      const dateISO = parseDateMX(rawDate as string);

      if (!dateISO) {
        // Si falla la fecha, intentamos ver si era un archivo viejo con formato YYYY-MM-DD
        if (row['fecha'] && /^\d{4}-\d{2}-\d{2}$/.test(row['fecha'])) {
             // Es válido, seguimos
        } else {
             continue; // Saltamos si no hay fecha válida
        }
      }

      const finalDate = dateISO || row['fecha'];

      let amount, category, description;

      if (type === 'ventas') {
        amount = parseFloat(row['monto'] || row['importe'] || values.find((v:any) => !isNaN(parseFloat(v)) && v !== rawDate));
        
        let rawCat = row['categoria'] || row['concepto'];
        if (!rawCat && values.length >= 3) {
            rawCat = values.find((v:any) => v !== rawDate && v != amount);
        }

        category = rawCat ? rawCat.trim() : 'Autoservicio';
        description = 'Importado CSV';
        
        if (!amount) continue;

        uniqueCategoriesFound.add(category);

        rowsToInsert.push({
          date: finalDate,
          type: 'income',
          category,
          amount,
          description,
          created_at: new Date().toISOString()
        });

      } else {
        // GASTOS
        category = (row['concepto'] || row['categoria'] || values[1])?.toString().toUpperCase().trim();
        amount = parseFloat(row['monto'] || row['importe'] || values[2]);

        if (!amount || !category) continue;
        if (category === 'TOTAL' || category === 'CAJA') continue;

        uniqueCategoriesFound.add(category);

        rowsToInsert.push({
          date: finalDate,
          type: 'expense',
          category,
          amount,
          description: `Gasto: ${category}`,
          created_at: new Date().toISOString()
        });
      }
    }

    await syncCategories(
      Array.from(uniqueCategoriesFound), 
      type === 'ventas' ? 'income' : 'expense'
    );

    for (const item of rowsToInsert) {
      currentBatch.push(item);
      if (currentBatch.length >= batchSize) {
        const { error } = await supabase.from('transactions').insert(currentBatch);
        if (error) addLog(`❌ Error lote: ${error.message}`);
        else successCount += currentBatch.length;
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      const { error } = await supabase.from('transactions').insert(currentBatch);
      if (error) addLog(`❌ Error final: ${error.message}`);
      else successCount += currentBatch.length;
    }

    addLog(`🚀 FINALIZADO: ${successCount} registros importados correctamente.`);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto mt-6 animate-fade-in">
      
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
          <Upload className="w-6 h-6 text-blue-600" /> Importador Masivo
        </h2>
        <p className="text-slate-500 mt-2">Sube tus archivos Excel (.csv) usando el formato: <strong>DD/MM/AAAA</strong>.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        
        {/* VENTAS */}
        <div className="flex flex-col gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5"/> Importar Ventas
                    </h3>
                    <button onClick={() => downloadTemplate('sales')} className="text-xs flex items-center gap-1 bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition shadow-sm" title="Descargar ejemplo">
                        <FileDown className="w-4 h-4"/> Plantilla
                    </button>
                </div>
                <p className="text-xs text-emerald-700/70 mb-4 h-10">
                    Ejemplo de fecha: <strong>31/12/2025</strong>. El sistema detecta "Autoservicio" o "Por Encargo".
                </p>
                <label className="cursor-pointer block">
                    <div className="border-2 border-dashed border-emerald-300 rounded-lg p-6 text-center hover:bg-emerald-100/50 transition bg-white">
                        <span className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition">Subir CSV Ventas</span>
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'ventas')} disabled={loading}/>
                    </div>
                </label>
            </div>
        </div>

        {/* GASTOS */}
        <div className="flex flex-col gap-4">
            <div className="bg-rose-50 border border-rose-100 p-5 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-rose-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5"/> Importar Gastos
                    </h3>
                    <button onClick={() => downloadTemplate('expenses')} className="text-xs flex items-center gap-1 bg-white border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition shadow-sm" title="Descargar ejemplo">
                        <FileDown className="w-4 h-4"/> Plantilla
                    </button>
                </div>
                <p className="text-xs text-rose-700/70 mb-4 h-10">
                    Ejemplo: <strong>05/01/2025, JABON, 500</strong>. Las categorías nuevas se crean solas.
                </p>
                <label className="cursor-pointer block">
                    <div className="border-2 border-dashed border-rose-300 rounded-lg p-6 text-center hover:bg-rose-100/50 transition bg-white">
                        <span className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-rose-700 transition">Subir CSV Gastos</span>
                        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'gastos')} disabled={loading}/>
                    </div>
                </label>
            </div>
        </div>

      </div>

      <div className="mt-8 bg-slate-900 text-slate-300 p-4 rounded-xl h-48 overflow-y-auto font-mono text-xs shadow-inner border border-slate-700">
        <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
            <span className="font-bold text-slate-400">LOG DE SISTEMA</span>
            {loading && <span className="flex items-center gap-2 text-yellow-400"><Loader2 className="animate-spin w-3 h-3"/> Procesando...</span>}
        </div>
        {logs.length === 0 && <p className="text-slate-600 italic">Esperando archivo...</p>}
        {logs.map((log, i) => (<div key={i} className="mb-1">{log}</div>))}
      </div>
    </div>
  );
}