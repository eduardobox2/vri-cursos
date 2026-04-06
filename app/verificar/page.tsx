"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, Award } from "lucide-react";

export default function BuscadorVerificacion() {
  const [codigo, setCodigo] = useState("");
  const router = useRouter();

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo.trim()) {
      // Redirigimos al usuario a la ruta dinámica que hicimos antes
      router.push(`/verificar/${codigo.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
      <div className="max-w-md w-full text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-3xl mb-6 border border-slate-700 shadow-2xl">
          <ShieldCheck className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">Portal de Verificación</h1>
        <p className="text-slate-400 font-medium">Ingrese el código único del documento para validar su autenticidad en los registros del VRI.</p>
      </div>

      <div className="max-w-md w-full">
        <form onSubmit={handleBuscar} className="bg-slate-800 p-2 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-2 focus-within:border-blue-500 transition-colors">
          <div className="pl-4">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder="Ej: VRI-2026-A1B2C3" 
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            className="w-full bg-transparent border-none text-white font-mono font-bold focus:outline-none focus:ring-0 placeholder:text-slate-600 placeholder:font-sans py-4 uppercase"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Verificar
          </button>
        </form>
      </div>
      
      <div className="mt-16 flex items-center gap-2 text-slate-500">
        <Award className="w-4 h-4" />
        <p className="text-xs font-bold uppercase tracking-widest">Universidad Nacional del Altiplano</p>
      </div>
    </div>
  );
}