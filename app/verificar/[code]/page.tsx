"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, ShieldAlert, CheckCircle2, Loader2, Award, Lock } from "lucide-react";

export default function PaginaVerificacionCiega() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [certificado, setCertificado] = useState<any>(null);

  useEffect(() => {
    if (code) buscarCertificado(code as string);
  }, [code]);

  const buscarCertificado = async (codigo: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('certificates')
      .select(`
        *,
        enrollments (
          profiles (first_names, last_names, document_number),
          events (title, organizer_entity)
        )
      `)
      .eq('certificate_code', codigo)
      .single();

    if (data) setCertificado(data);
    setLoading(false);
  };

  // Algoritmo de Censura Parcial (Ej: E. Lopez - DNI: ****4196)
  const censurarNombre = (nombres: string, apellidos: string) => {
    const inicial = nombres.charAt(0).toUpperCase();
    const primerApellido = apellidos.split(' ')[0];
    return `${inicial}. ${primerApellido}`;
  };

  const censurarDNI = (dni: string) => {
    if (!dni || dni.length < 4) return "****";
    return `****${dni.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans selection:bg-emerald-500/30">
      
      {/* Encabezado Oficial */}
      <div className="max-w-md w-full text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center p-3 bg-slate-800 rounded-2xl mb-4 border border-slate-700 shadow-2xl">
          <Award className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">VRI - UNA Puno</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Lock className="w-3 h-3 text-emerald-500" />
          <p className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Verificación Segura (Ciega)</p>
        </div>
      </div>

      <div className="max-w-lg w-full">
        {loading ? (
          <div className="bg-slate-800 p-16 rounded-[2rem] border border-slate-700 flex flex-col items-center shadow-2xl">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="font-medium text-slate-400 text-sm">Validando firma criptográfica...</p>
          </div>
        ) : certificado ? (
          <div className="bg-slate-800 rounded-[2rem] border border-slate-700 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            {/* Cabecera Verde */}
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-8 flex items-center gap-5">
              <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-emerald-400 font-black text-xl">Certificado Auténtico</h3>
                <p className="text-emerald-500/70 text-xs font-bold uppercase tracking-wider mt-1">Registro Encontrado</p>
              </div>
            </div>

            {/* Datos Censurados */}
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Titular del Documento</p>
                <div className="flex items-end gap-3">
                  <p className="text-2xl font-black text-white">
                    {censurarNombre(certificado.enrollments.profiles.first_names, certificado.enrollments.profiles.last_names)}
                  </p>
                  <p className="text-slate-400 font-mono text-sm mb-1 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                    DNI: {censurarDNI(certificado.enrollments.profiles.document_number)}
                  </p>
                </div>
              </div>

              <div className="h-px bg-slate-700 w-full"></div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Capacitación Aprobada</p>
                <p className="text-lg font-bold text-slate-200 leading-tight">{certificado.enrollments.events.title}</p>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center mt-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Emisión</p>
                  <p className="font-mono text-sm font-bold text-slate-300">{new Date(certificado.issue_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">ID Verificación</p>
                  <p className="font-mono text-sm font-bold text-blue-400">{certificado.certificate_code}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 p-12 rounded-[2rem] border border-red-500/30 flex flex-col items-center text-center shadow-2xl animate-in shake">
            <div className="bg-red-500/10 p-4 rounded-full mb-6">
              <ShieldAlert className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Registro No Encontrado</h3>
            <p className="text-slate-400 text-sm mb-8">Este código no existe en la base de datos de la UNA Puno o fue revocado.</p>
          </div>
        )}
      </div>
    </div>
  );
}