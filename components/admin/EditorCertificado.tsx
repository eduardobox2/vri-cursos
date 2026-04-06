"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Save, Type, Loader2, ShieldCheck, BookOpen, QrCode, PenTool, Hash } from 'lucide-react';

export default function EditorCertificado({ evento, onVolver }: { evento: any, onVolver: () => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  // ESTADOS BASE
  const [templateUrl, setTemplateUrl] = useState(evento.certificate_template_url || "");
  const [textColor, setTextColor] = useState(evento.cert_text_color || "#0f172a");
  
  // NUEVOS ESTADOS: Fuentes y Tamaños
  const [fontFamily, setFontFamily] = useState(evento.cert_font_family || "Arial");
  const [nameSize, setNameSize] = useState(evento.cert_name_size || 60);
  const [courseSize, setCourseSize] = useState(evento.cert_course_size || 35);

  // ESTADOS DE POSICIÓN (Y)
  const [nameY, setNameY] = useState(evento.cert_name_y || 300);
  const [courseY, setCourseY] = useState(evento.cert_course_y || 450);
  
  // ESTADOS: ID de Certificado (X, Y)
  const [codeX, setCodeX] = useState(evento.cert_code_x || 100);
  const [codeY, setCodeY] = useState(evento.cert_code_y || 650);

  // ESTADOS: QR y Firma (X, Y)
  const [qrX, setQrX] = useState(evento.cert_qr_x || 100);
  const [qrY, setQrY] = useState(evento.cert_qr_y || 550);
  const [firmaX, setFirmaX] = useState(evento.cert_firma_x || 650);
  const [firmaY, setFirmaY] = useState(evento.cert_firma_y || 600);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dibujar Preview en tiempo real
  useEffect(() => {
    if (templateUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = templateUrl;
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // -----------------------------------------------------
        // TEXTOS PRINCIPALES (Nombre y Curso)
        // -----------------------------------------------------
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';

        // Dibujar Nombre
        ctx.font = `bold ${nameSize}px ${fontFamily}`;
        ctx.fillText("APELLIDOS Y NOMBRES DEL ALUMNO", canvas.width / 2, nameY);

        // Dibujar Curso
        ctx.font = `bold ${courseSize}px ${fontFamily}`;
        ctx.fillText(evento.title.toUpperCase(), canvas.width / 2, courseY);

        // -----------------------------------------------------
        // CÓDIGO QR Y TEXTO DE VERIFICACIÓN
        // -----------------------------------------------------
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(qrX, qrY, 200, 200);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(qrX, qrY, 200, 200);
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("CÓDIGO QR", qrX + 100, qrY + 105);

        // ID Alfanumérico del Certificado
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'left';
        ctx.fillText("ID: VRI-2026-X8F9A", codeX, codeY);

        // -----------------------------------------------------
        // SELLO DE FIRMA DIGITAL (Estilo Firma Perú)
        // -----------------------------------------------------
        const selloAncho = 380;
        const selloAlto = 110;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(firmaX, firmaY, selloAncho, selloAlto);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(firmaX, firmaY, selloAncho, selloAlto);
        
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Firmado digitalmente por:', firmaX + 20, firmaY + 30);
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('VRI - UNA PUNO', firmaX + 20, firmaY + 55);
        ctx.fillStyle = '#475569';
        ctx.font = 'normal 14px Arial';
        ctx.fillText('Motivo: Autor del documento', firmaX + 20, firmaY + 80);
        ctx.fillText(`Fecha: XX/XX/2026`, firmaX + 20, firmaY + 100);
      };
    }
  }, [templateUrl, nameY, courseY, codeY, textColor, qrX, qrY, firmaX, firmaY, nameSize, courseSize, fontFamily, codeX, evento.title]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSubiendo(true);

    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${evento.id}_${Math.random()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('certificados_templates')
      .upload(fileName, file);

    if (error) {
      alert("Error al subir: " + error.message);
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('certificados_templates')
        .getPublicUrl(fileName);
      setTemplateUrl(publicUrl);
    }
    setSubiendo(false);
  };

  const handleSaveConfig = async () => {
    setGuardando(true);
    const { error } = await supabase
      .from('events')
      .update({
        certificate_template_url: templateUrl,
        cert_name_y: nameY,
        cert_course_y: courseY,
        cert_text_color: textColor,
        cert_font_family: fontFamily, // <--- Nueva
        cert_name_size: nameSize,     // <--- Nueva
        cert_course_size: courseSize, // <--- Nueva
        cert_qr_x: qrX,        
        cert_qr_y: qrY,        
        cert_firma_x: firmaX,  
        cert_firma_y: firmaY,  
        cert_code_x: codeX,           // <--- Nueva
        cert_code_y: codeY
      })
      .eq('id', evento.id);

    if (error) alert("Error: " + error.message);
    else alert("✅ Diseño guardado exitosamente.");
    setGuardando(false);
  };

  return (
    <div className="animate-in fade-in space-y-6 max-w-[1400px] mx-auto pb-20">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <button onClick={onVolver} className="text-slate-400 hover:text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 font-bold transition-colors">← Volver</button>
          <div>
            <h2 className="text-2xl font-black text-white">Constructor de Diploma</h2>
            <p className="text-indigo-400 font-bold text-sm">{evento.title}</p>
          </div>
        </div>
        <button 
          onClick={handleSaveConfig} 
          disabled={guardando || !templateUrl}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {guardando ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />} Guardar Diseño Final
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* COLUMNA DE CONTROLES */}
        <div className="space-y-6 bg-[#1e293b] p-6 rounded-2xl border border-slate-700 h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
          
          {/* 1. UPLOAD */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-700 pb-2">1. Fondo Base (JPG/PNG)</label>
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-2"><Upload className="w-4 h-4"/> {subiendo ? "Subiendo..." : "Subir Plantilla"}</p>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
            </label>
          </div>

          {/* 2. ESTILOS GLOBALES */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-700 pb-2">2. Estilos Globales</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Color de Letra</label>
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 rounded cursor-pointer bg-slate-900 border border-slate-700" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Letra</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold p-2 outline-none text-slate-200 focus:border-indigo-500">
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier</option>
                  <option value="Tahoma">Tahoma</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. TEXTOS CENTRALES */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-700 pb-2">3. Textos Centrales</p>
            
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-2"><span className="flex items-center gap-1.5"><Type className="w-3 h-3 text-indigo-400"/> Nombre Alumno</span></div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500"><span>Tamaño: {nameSize}px</span></div>
                <input type="range" min="20" max="150" value={nameSize} onChange={(e) => setNameSize(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                <div className="flex justify-between text-[10px] text-slate-500"><span>Altura (Y): {nameY}px</span></div>
                <input type="range" min="100" max="1500" value={nameY} onChange={(e) => setNameY(parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-2"><span className="flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-indigo-400"/> Título del Curso</span></div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-slate-500"><span>Tamaño: {courseSize}px</span></div>
                <input type="range" min="15" max="100" value={courseSize} onChange={(e) => setCourseSize(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                <div className="flex justify-between text-[10px] text-slate-500"><span>Altura (Y): {courseY}px</span></div>
                <input type="range" min="100" max="1500" value={courseY} onChange={(e) => setCourseY(parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
            </div>
          </div>

          {/* 4. CÓDIGOS Y SELLOS */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2"><QrCode className="w-4 h-4"/> 4. QR y Verificación</p>
            
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400">POSICIÓN DEL CÓDIGO QR</span>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-slate-500 block">Eje X: {qrX}</span><input type="range" min="0" max="2500" value={qrX} onChange={(e) => setQrX(parseInt(e.target.value))} className="w-full accent-emerald-500" /></div>
                <div><span className="text-[9px] text-slate-500 block">Eje Y: {qrY}</span><input type="range" min="0" max="1500" value={qrY} onChange={(e) => setQrY(parseInt(e.target.value))} className="w-full accent-emerald-500" /></div>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Hash className="w-3 h-3"/> TEXTO ID ÚNICO</span>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-slate-500 block">Eje X: {codeX}</span><input type="range" min="0" max="2500" value={codeX} onChange={(e) => setCodeX(parseInt(e.target.value))} className="w-full accent-emerald-500" /></div>
                <div><span className="text-[9px] text-slate-500 block">Eje Y: {codeY}</span><input type="range" min="0" max="1500" value={codeY} onChange={(e) => setCodeY(parseInt(e.target.value))} className="w-full accent-emerald-500" /></div>
              </div>
            </div>
          </div>

          {/* 5. FIRMA DIGITAL */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-slate-700 pb-2 flex items-center gap-2"><PenTool className="w-4 h-4"/> 5. Firma Digital</p>
            
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400">SELLO FIRMA PERÚ</span>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-[9px] text-slate-500 block">Eje X: {firmaX}</span><input type="range" min="0" max="2500" value={firmaX} onChange={(e) => setFirmaX(parseInt(e.target.value))} className="w-full accent-blue-500" /></div>
                <div><span className="text-[9px] text-slate-500 block">Eje Y: {firmaY}</span><input type="range" min="0" max="1500" value={firmaY} onChange={(e) => setFirmaY(parseInt(e.target.value))} className="w-full accent-blue-500" /></div>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMNA DE PREVIEW */}
        <div className="lg:col-span-3">
          <div className="bg-[#111827] rounded-3xl border border-slate-800 p-4 flex flex-col items-center h-[calc(100vh-200px)] justify-center relative overflow-hidden shadow-inner">
            {!templateUrl ? (
              <div className="text-center space-y-4 opacity-30">
                <ShieldCheck className="w-24 h-24 mx-auto text-slate-500" />
                <p className="font-bold text-xl tracking-tight text-slate-400">El lienzo está vacío</p>
                <p className="text-sm font-medium">Sube una plantilla en la columna izquierda para comenzar a diseñar.</p>
              </div>
            ) : (
              <div className="w-full h-full flex justify-center items-center overflow-auto custom-scrollbar p-4">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded border-4 border-slate-800/50" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 text-center font-bold tracking-widest uppercase flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Preview Dinámico en Tiempo Real
          </p>
        </div>
      </div>
    </div>
  );
}