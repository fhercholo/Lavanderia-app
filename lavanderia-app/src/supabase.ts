import { createClient } from '@supabase/supabase-js'

// 1. Leemos las variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 2. IMPRIMIR DIAGNÓSTICO EN CONSOLA (Mira la consola del navegador)
console.log("--- DIAGNÓSTICO DE VARIABLES ---")
console.log("URL leída:", supabaseUrl)
console.log("Key leída:", supabaseKey ? "Detectada (Oculta por seguridad)" : "NO DETECTADA")
console.log("------------------------------")

// 3. Validación de emergencia
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error("ERROR CRÍTICO: La URL no es válida. Revisa el archivo .env.local")
  // Usamos una URL falsa temporalmente para que la app no explote al iniciar,
  // pero sabremos que falló por el mensaje de arriba.
}

export const supabase = createClient(
  supabaseUrl || "https://url-falsa-para-evitar-crash.supabase.co", 
  supabaseKey || "key-falsa"
)