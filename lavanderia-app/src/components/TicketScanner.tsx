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

  // --- 1. PRE-PROCESAMIENTO DE IMAGEN (ALTO CONTRASTE) ---
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

        // Filtro Binarización (Blanco y Negro agresivo)
        // Esto hace que las letras grises o térmicas se vuelvan negras sólidas
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= 150) ? 255 : 0; // Umbral ajustado
          data[i] = data[i + 1] = data[i + 2] = v;
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  const startScan = (imageFile: File) => {
    setScanning(true);
    setStatusText('Iniciando motor...');
    setPreviewData([]);
    // Pequeña pausa para que la UI se actualice antes de bloquearse procesando
    setTimeout(() => { processImage(imageFile); }, 100);
  };

  const processImage = async (imageFile: File) => {
    try {
      setStatusText('Optimizando imagen...');
      const processedImageSrc = await preprocessImage(imageFile);

      setStatusText('Leyendo ticket...');
      const result = await Tesseract.recognize(
        processedImageSrc,
        'spa',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.floor(m.progress * 100));
              setStatusText(`Analizando: ${Math.floor(m.progress * 100)}%`);
            }
          }
        }
      );

      analyzeTicketCaucelLines(result.data.text);

    } catch (error) {
      console.error(error);
      alert('Error al leer. Intenta con mejor luz.');
      setScanning(false);
    }
  };

  // --- 2. LIMPIEZA DE DATOS ---
  const parseCurrency = (line: string) => {
    // 1. Nos quedamos solo con lo que parece dinero al final de la línea
    // Buscamos el último grupo de números que tenga un punto decimal
    const matches = line.match(/[\d,OolISB]+\.[\dOolISB]{2}/g);
    if (!matches) return 0;
    
    // Tomamos el último match (por si hay fechas u otros números antes)
    let amountStr = matches[matches.length - 1];

    // 2. Corregimos errores comunes de OCR (typos)
    amountStr = amountStr
      .replace(/O/g, '0').replace(/o/g, '0')
      .replace(/l/g, '1').replace(/I/g, '1').replace(/\|/g, '1')
      .replace(/S/g, '5').replace(/s/g, '5')
      .replace(/B/g, '8')
      .replace(/[^\d.]/g, ''); // Quitamos comas y símbolos raros

    return parseFloat(amountStr) || 0;
  };

  // --- 3. ANÁLISIS LÍNEA POR LÍNEA (MÁS ROBUSTO) ---
  const analyzeTicketCaucelLines = (text: string) => {
    console.log("TEXTO PURO:", text);
    const lines = text.split('\n'); // Separamos por renglones
    const foundTransactions: any[] = [];
    
    // Buscamos fecha primero (generalmente al inicio)
    const dateMatch = text.match(/(\d{2})\s?[\/\-]\s?(\d{2})\s?[\/\-]\s?(\d{4})/);
    let detectedDate = new Date().toISOString().split('T')[0];
    if (dateMatch) {
      detectedDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Recorremos cada línea buscando palabras clave
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        const amount = parseCurrency(line);

        if (amount > 0) {
            // A. AUTOSERVICIO
            if (lowerLine.includes('autoservicio')) {
                foundTransactions.push({
                    date: detectedDate, amount, type: 'income', category: 'Autoservicio', description: 'Corte Autoservicio'
                });
            }
            // B. SERVICIO (ENCARGO) - Cuidamos que no sea "Autoservicio"
            else if (lowerLine.includes('servicio') && !lowerLine.includes('auto')) {
                foundTransactions.push({
                    date: detectedDate, amount, type: 'income', category: 'Por Encargo', description: 'Corte Servicio'
                });
            }
            // C. NÓMINA (Sueldo) - El problema de los signos negativos se resuelve aquí
            // Al usar 'includes' ignoramos los símbolos (-): -$ que están antes
            else if (lowerLine.includes('nomina') || lowerLine.includes('nómina') || lowerLine.includes('sueldo')) {
                foundTransactions.push({
                    date: detectedDate, amount, type: 'expense', category: 'Nómina', description: 'Pago Nómina'
                });
            }
            // D. FONDO NUEVO / CAJA
            else if ((lowerLine.includes('fondo') && lowerLine.includes('nu')) || lowerLine.includes('caja')) {
                // Filtramos "Fondo Anterior" y "Fecha Corte Caja"
                if (!lowerLine.includes('anterior') && !lowerLine.includes('fecha') && !lowerLine.includes('hora')) {
                    foundTransactions.push({
                        date: detectedDate, amount, type: 'expense', category: 'Caja Chica', description: 'Fondo Nuevo Caja'
                    });
                }
            }
        }
    });

    // Filtramos duplicados exactos (por si la IA lee la misma línea dos veces)
    const uniqueTxs = foundTransactions.filter((v,i,a)=>a.findIndex(t=>(t.category === v.category && t.amount === v.amount))===i);

    setPreviewData(uniqueTxs);
    setScanning(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md p-6 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>

        <div className="text-center space-y-4">
          <h3 className="text-xl font-bold text-blue-400">Escáner Ticket V4.0</h3>
          
          {previewData.length === 0 && !scanning && (
             <p className="text-slate-400 text-sm">Apunta bien al ticket CAUCEL.</p>
          )}

          {!scanning && previewData.length === 0 && (
            <label className="block mt-6 cursor-pointer group">
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-10 hover:bg-slate-800 hover:border-blue-500 transition-all">
                <Camera className="w-12 h-12 text-slate-500 mx-auto mb-3 group-hover:text-blue-400" />
                <span className="font-bold text-slate-300 group-hover:text-white block">Tomar Foto</span>
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
                 <div className="bg-blue-500 h-full rounded-full transition-all duration-300 shadow-[0_0_15px_#3b82f6]" style={{ width: `${progress}%` }}></div>
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