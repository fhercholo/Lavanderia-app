import { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2, X, CheckCircle2 } from 'lucide-react';

interface TicketScannerProps {
  onScanComplete: (transactions: any[]) => void;
  onClose: () => void;
}

export function TicketScanner({ onScanComplete, onClose }: TicketScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);

  const processImage = async (imageFile: File) => {
    setScanning(true);
    setStatusText('Iniciando lectura inteligente...');
    setPreviewData([]);

    try {
      const result = await Tesseract.recognize(
        imageFile,
        'spa',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.floor(m.progress * 100));
              setStatusText(`Leyendo ticket: ${Math.floor(m.progress * 100)}%`);
            } else {
              setStatusText('Procesando imagen...');
            }
          }
        }
      );

      const text = result.data.text;
      analyzeTicketCaucel(text);

    } catch (error) {
      console.error(error);
      alert('Error al leer la imagen.');
      setScanning(false);
    }
  };

  const parseCurrency = (str: string) => {
    // Limpia símbolos raros, deja solo números y punto
    const clean = str.replace(/[^\d.]/g, '');
    return parseFloat(clean) || 0;
  };

  const analyzeTicketCaucel = (text: string) => {
    // Limpiamos el texto para facilitar la búsqueda
    const cleanText = text.replace(/\$/g, ' $').replace(/-/g, ' '); 
    console.log("Texto OCR:", cleanText);
    
    const foundTransactions: any[] = [];

    // 1. BUSCAR FECHA (Formatos dd/mm/yyyy o similar)
    // En tu ticket dice: "Fecha Corte Caja: 30/10/2025"
    const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    let detectedDate = new Date().toISOString().split('T')[0];
    
    if (dateMatch) {
      // Convertir a formato base de datos: YYYY-MM-DD
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // 2. BUSCAR CONCEPTOS SEGÚN TU TICKET REAL
    
    // A. Autoservicio
    const autoMatch = text.match(/Autoservicio.*?\$\s*([\d,]+\.\d{2})/i);
    if (autoMatch) {
        const val = parseCurrency(autoMatch[1]);
        if (val > 0) foundTransactions.push({ date: detectedDate, amount: val, type: 'income', category: 'Autoservicio', description: 'Corte Autoservicio' });
    }

    // B. Servicio (Encargo)
    // Usamos una expresión que busque "Servicio" pero ignore "Autoservicio"
    const serviceMatch = text.match(/(?<!Auto)Servicio.*?\$\s*([\d,]+\.\d{2})/i);
    if (serviceMatch) {
        const val = parseCurrency(serviceMatch[1]);
        if (val > 0) foundTransactions.push({ date: detectedDate, amount: val, type: 'income', category: 'Por Encargo', description: 'Corte Servicio' });
    }

    // C. Nómina (Gasto)
    const nominaMatch = text.match(/Nomina.*?\$\s*([\d,]+\.\d{2})/i);
    if (nominaMatch) {
        const val = parseCurrency(nominaMatch[1]);
        if (val > 0) foundTransactions.push({ date: detectedDate, amount: val, type: 'expense', category: 'Nómina', description: 'Pago Nómina en Corte' });
    }

    // D. Fondo Nuevo / Caja (Gasto/Retención)
    const fondoMatch = text.match(/Fondo Nuevo.*?\$\s*([\d,]+\.\d{2})/i);
    if (fondoMatch) {
        const val = parseCurrency(fondoMatch[1]);
        if (val > 0) foundTransactions.push({ date: detectedDate, amount: val, type: 'expense', category: 'Caja Chica', description: 'Fondo de Caja' });
    }

    setPreviewData(foundTransactions);
    setScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>

        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-blue-400">Escáner Ticket CAUCEL</h3>
          
          {previewData.length === 0 && !scanning && (
             <p className="text-slate-400 text-sm">Sube la foto de tu ticket de corte.</p>
          )}

          {!scanning && previewData.length === 0 && (
            <label className="block mt-6 cursor-pointer group">
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 hover:bg-slate-800 hover:border-blue-500 transition-all">
                <Camera className="w-12 h-12 text-slate-500 mx-auto mb-3 group-hover:text-blue-400" />
                <span className="font-bold text-slate-300 group-hover:text-white block">Tomar Foto</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])} />
              </div>
            </label>
          )}

          {scanning && (
            <div className="mt-8 space-y-4 py-10">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
              <p className="text-blue-300 font-mono text-sm">{statusText}</p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                 <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* RESULTADOS */}
          {previewData.length > 0 && (
            <div className="text-left bg-slate-800/50 rounded-xl p-4 border border-slate-700 mt-4">
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Detectado ({previewData[0].date})</h4>
                <div className="space-y-2 mb-6">
                    {previewData.map((tx, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded border border-slate-700">
                            <div><p className="font-bold text-white">{tx.category}</p></div>
                            <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tx.type === 'income' ? '+' : '-'}${tx.amount}
                            </span>
                        </div>
                    ))}
                </div>
                <button onClick={() => onScanComplete(previewData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-5 h-5" /> Importar Todo
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}