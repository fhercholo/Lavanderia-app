import { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, Loader2, X, CheckCircle2, RefreshCw } from 'lucide-react';

interface TicketScannerProps {
  onScanComplete: (transactions: any[]) => void;
  onClose: () => void;
}

export function TicketScanner({ onScanComplete, onClose }: TicketScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- 1. PROCESAMIENTO DE IMAGEN (BLANCO Y NEGRO) ---
  const preprocessImage = (imageFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { resolve(img.src); return; }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(img.src); return; }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Aumentar contraste radicalmente (Binarización)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Si es gris claro, hazlo blanco puro. Si es oscuro, negro puro.
          const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= 140) ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  // --- 2. INICIO DEL ESCANEO ---
  const startScan = (imageFile: File) => {
    // IMPORTANTE: Activamos el loading PRIMERO y damos un respiro al navegador
    setScanning(true);
    setStatusText('Preparando motor OCR...');
    setPreviewData([]);

    setTimeout(() => {
        processImage(imageFile);
    }, 100);
  };

  const processImage = async (imageFile: File) => {
    try {
      setStatusText('Mejorando legibilidad...');
      const processedImageSrc = await preprocessImage(imageFile);

      setStatusText('Leyendo ticket...');
      const result = await Tesseract.recognize(
        processedImageSrc,
        'spa',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.floor(m.progress * 100));
              setStatusText(`Analizando texto: ${Math.floor(m.progress * 100)}%`);
            } else if (m.status === 'loading tesseract core') {
              setStatusText('Cargando cerebro IA...');
            } else {
               setStatusText('Procesando...');
            }
          }
        }
      );

      analyzeTicketCaucel(result.data.text);

    } catch (error) {
      console.error(error);
      alert('Error al procesar. Intenta con una foto más clara.');
      setScanning(false);
    }
  };

  // --- 3. CORRECCIÓN DE ERRORES (IA TYPOS) ---
  const cleanNumberString = (str: string) => {
    return str
      .replace(/O/g, '0').replace(/o/g, '0')
      .replace(/l/g, '1').replace(/I/g, '1').replace(/\|/g, '1')
      .replace(/S/g, '5').replace(/s/g, '5')
      .replace(/B/g, '8')
      .replace(/[^\d.]/g, ''); // Eliminar todo lo que no sea número o punto
  };

  const parseCurrency = (rawStr: string) => {
    // Busca patrón de dinero: digitos + punto + 2 digitos
    const match = rawStr.match(/[\d,OolISB]+\.[\dOolISB]{2}/);
    if (!match) return 0;
    
    const clean = cleanNumberString(match[0]);
    return parseFloat(clean) || 0;
  };

  const analyzeTicketCaucel = (text: string) => {
    console.log("TEXTO DETECTADO:", text); // Checa la consola si tienes dudas
    const foundTransactions: any[] = [];

    // A. FECHA
    const dateMatch = text.match(/(\d{2})\s?[\/\-]\s?(\d{2})\s?[\/\-]\s?(\d{4})/);
    let detectedDate = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // B. AUTOSERVICIO
    const autoMatch = text.match(/Auto.*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i);
    if (autoMatch) {
        const val = parseCurrency(autoMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'income', category: 'Autoservicio', description: 'Corte Autoservicio' 
        });
    }

    // C. SERVICIO / ENCARGO (Que no sea Auto)
    // Buscamos línea que tenga "Servicio"
    const lines = text.split('\n');
    lines.forEach(line => {
        if (line.match(/Servicio/i) && !line.match(/Auto/i)) {
             const valMatch = line.match(/(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/);
             if (valMatch) {
                 const val = parseCurrency(valMatch[0]);
                 if (val > 0) foundTransactions.push({ 
                     date: detectedDate, amount: val, type: 'income', category: 'Por Encargo', description: 'Corte Servicio' 
                 });
             }
        }
    });

    // D. NÓMINA (Sueldo) - MEJORADO
    // Busca: "Nomina", "Nornina", "Nomlna" o "Sueldo"
    // El .*? salta los simbolos raros como "(-):"
    const nominaRegex = /(?:N[o0][mn]in[ao]|Su[e3]ldo).*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i;
    const nominaMatch = text.match(nominaRegex);
    
    if (nominaMatch) {
        const val = parseCurrency(nominaMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'expense', category: 'Nómina', description: 'Pago Nómina' 
        });
    }

    // E. FONDO NUEVO / CAJA
    const fondoMatch = text.match(/Fondo\s*Nu.*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i);
    if (fondoMatch) {
        const val = parseCurrency(fondoMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'expense', category: 'Caja Chica', description: 'Fondo de Caja' 
        });
    }

    // Filtramos duplicados por si acaso
    const uniqueTxs = foundTransactions.filter((v,i,a)=>a.findIndex(t=>(t.category === v.category))===i);

    setPreviewData(uniqueTxs);
    setScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      {/* Canvas invisible para mejorar la imagen */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>

        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-blue-400">Escáner Ticket V3.0</h3>
          
          {previewData.length === 0 && !scanning && (
             <p className="text-slate-400 text-sm">Versión optimizada para tu ticket CAUCEL.</p>
          )}

          {!scanning && previewData.length === 0 && (
            <label className="block mt-6 cursor-pointer group">
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 hover:bg-slate-800 hover:border-blue-500 transition-all">
                <Camera className="w-12 h-12 text-slate-500 mx-auto mb-3 group-hover:text-blue-400" />
                <span className="font-bold text-slate-300 group-hover:text-white block">Tomar Foto</span>
                
                {/* INPUT MODIFICADO: Llama a startScan en lugar de processImage directamente */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && startScan(e.target.files[0])} 
                />
              </div>
            </label>
          )}

          {scanning && (
            <div className="mt-8 space-y-4 py-10">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
              <p className="text-blue-300 font-mono text-sm animate-pulse">{statusText}</p>
              <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700">
                 <div className="bg-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_#3b82f6]" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* RESULTADOS */}
          {previewData.length > 0 && (
            <div className="text-left bg-slate-800/50 rounded-xl p-4 border border-slate-700 mt-4">
                <div className="flex justify-between items-center mb-4">
                     <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Resultados ({previewData[0].date})</h4>
                     <button onClick={() => setPreviewData([])} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300"><RefreshCw className="w-3 h-3"/> Reintentar</button>
                </div>
                
                <div className="space-y-2 mb-6">
                    {previewData.map((tx, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <div><p className="font-bold text-white">{tx.category}</p></div>
                            <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString('es-MX', {minimumFractionDigits: 2})}
                            </span>
                        </div>
                    ))}
                </div>
                <button onClick={() => onScanComplete(previewData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform">
                    <CheckCircle2 className="w-5 h-5" /> Confirmar e Importar
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}