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
  
  // Referencia oculta para procesar la imagen
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- TRUCO DE MAGIA: Pre-procesar imagen para mejorar contraste ---
  const preprocessImage = (imageFile: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { resolve(img.src); return; }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(img.src); return; }

        // Ajustar tamaño
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Obtener pixeles
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Filtro de Umbral (Threshold) para blanco y negro puro
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Escala de grises
          const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= 128) ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = v;
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  const processImage = async (imageFile: File) => {
    setScanning(true);
    setStatusText('Mejorando imagen...');
    setPreviewData([]);

    try {
      // 1. Limpiamos la imagen primero
      const processedImageSrc = await preprocessImage(imageFile);

      // 2. Leemos la imagen limpia
      const result = await Tesseract.recognize(
        processedImageSrc,
        'spa',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.floor(m.progress * 100));
              setStatusText(`Leyendo datos: ${Math.floor(m.progress * 100)}%`);
            } else {
              setStatusText('Analizando...');
            }
          }
        }
      );

      analyzeTicketCaucel(result.data.text);

    } catch (error) {
      console.error(error);
      alert('Error al procesar. Intenta con mejor iluminación.');
      setScanning(false);
    }
  };

  // --- CORRECCIÓN DE ERRORES DE LECTURA ---
  const cleanNumberString = (str: string) => {
    return str
      .replace(/O/g, '0')   // Cambia letra O por cero
      .replace(/o/g, '0')
      .replace(/l/g, '1')   // Cambia letra l por uno
      .replace(/I/g, '1')
      .replace(/S/g, '5')   // Cambia S por 5 (error común)
      .replace(/B/g, '8')
      .replace(/[^\d.]/g, ''); // Elimina todo lo que no sea número o punto
  };

  const parseCurrency = (rawStr: string) => {
    // Busca algo que parezca dinero: digitos, punto, dos digitos
    // Ejemplo entrada sucia: "$ 1,74O.OO" -> "1740.00"
    const match = rawStr.match(/[\d,OolISB]+\.[\dOolISB]{2}/);
    if (!match) return 0;
    
    const clean = cleanNumberString(match[0]);
    return parseFloat(clean) || 0;
  };

  const analyzeTicketCaucel = (text: string) => {
    console.log("Texto Crudo:", text);
    const foundTransactions: any[] = [];

    // 1. FECHA (Buscamos patrón dd/mm/yyyy con tolerancia a espacios)
    const dateMatch = text.match(/(\d{2})\s?[\/\-]\s?(\d{2})\s?[\/\-]\s?(\d{4})/);
    let detectedDate = new Date().toISOString().split('T')[0];
    
    if (dateMatch) {
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // --- BÚSQUEDA INTELIGENTE DE CONCEPTOS ---

    // A. Autoservicio (Busca "Autoservicio" o similar + signo $ o numero cercano)
    // Regex explica: "Auto" + cualquier cosa + "$" o numero
    const autoRegex = /Autoservicio.*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i;
    const autoMatch = text.match(autoRegex);
    if (autoMatch) {
        const val = parseCurrency(autoMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'income', category: 'Autoservicio', description: 'Corte Autoservicio' 
        });
    }

    // B. Servicio / Encargo (Ignorando Autoservicio)
    // Busca línea que tenga "Servicio" pero NO "Auto" antes
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

    // C. Nómina
    const nominaMatch = text.match(/Nomina.*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i);
    if (nominaMatch) {
        const val = parseCurrency(nominaMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'expense', category: 'Nómina', description: 'Pago Nómina' 
        });
    }

    // D. Fondo Nuevo / Caja
    const fondoMatch = text.match(/Fondo\s*Nuevo.*?(\$?\s*[\d,OolISB]+\.[\dOolISB]{2})/i);
    if (fondoMatch) {
        const val = parseCurrency(fondoMatch[1]);
        if (val > 0) foundTransactions.push({ 
            date: detectedDate, amount: val, type: 'expense', category: 'Caja Chica', description: 'Fondo de Caja' 
        });
    }

    // Evitar duplicados exactos (chapuza rápida por si regex coincide doble)
    const uniqueTxs = foundTransactions.filter((v,i,a)=>a.findIndex(t=>(t.category === v.category))===i);

    setPreviewData(uniqueTxs);
    setScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      {/* Canvas invisible para procesamiento */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>

        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-blue-400">Escáner Ticket V2.0</h3>
          
          {previewData.length === 0 && !scanning && (
             <p className="text-slate-400 text-sm">Versión optimizada para ticket CAUCEL.</p>
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
                <button onClick={() => onScanComplete(previewData)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-5 h-5" /> Confirmar e Importar
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}