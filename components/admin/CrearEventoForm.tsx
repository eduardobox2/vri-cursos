"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Image as ImageIcon, MapPin, Video, CalendarDays, Clock, ToggleLeft, ToggleRight, FileText, QrCode, Users } from 'lucide-react';

export default function CrearEventoForm({ onVolver, eventoAEditar }: { onVolver: () => void, eventoAEditar?: any }) {
  
  // ESTADOS DEL EVENTO
  const [titulo, setTitulo] = useState(eventoAEditar?.title || '');
  const [organizador, setOrganizador] = useState(eventoAEditar?.organizer_entity || '');
  const [resumen, setResumen] = useState(eventoAEditar?.summary?.replace(/(\n\nHorarios:.*)/, '') || ''); // Extraemos solo el resumen sin horarios
  const [isVirtual, setIsVirtual] = useState(eventoAEditar ? eventoAEditar.is_virtual : true);
  const [isPublic, setIsPublic] = useState(eventoAEditar ? eventoAEditar.is_public : true);
  const [linkVirtual, setLinkVirtual] = useState(eventoAEditar?.virtual_link || '');
  const [ubicacionFisica, setUbicacionFisica] = useState(eventoAEditar?.physical_location || '');
  const [mapUrl, setMapUrl] = useState(eventoAEditar?.location_map_url || '');
  
  const [fechaInicio, setFechaInicio] = useState(eventoAEditar?.start_date ? eventoAEditar.start_date.substring(0, 10) : '');
  const [fechaFin, setFechaFin] = useState(eventoAEditar?.end_date ? eventoAEditar.end_date.substring(0, 10) : '');
  
  // Extraemos el detalle de horarios si venía guardado en el summary
  const [horariosDetalle, setHorariosDetalle] = useState(
    eventoAEditar?.summary?.includes('Horarios:') 
      ? eventoAEditar.summary.split('Horarios: ')[1] 
      : ''
  );

  // === LOS ESTADOS QUE FALTABAN EN PANTALLA ===
  const [asistenciaReq, setAsistenciaReq] = useState(eventoAEditar?.attendance_required_percent || 80);
  const [qrCheckin, setQrCheckin] = useState(eventoAEditar?.qr_checkin_enabled || false);
  const [cupo, setCupo] = useState(eventoAEditar?.capacity?.toString() || '');
  const [dirigidoA, setDirigidoA] = useState<string[]>(eventoAEditar?.target_audience || ['Estudiantes']);
  
  const [guardando, setGuardando] = useState(false);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(eventoAEditar?.poster_url || '');

  const toggleDirigido = (opcion: string) => {
    setDirigidoA(prev => prev.includes(opcion) ? prev.filter(item => item !== opcion) : [...prev, opcion]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImagenFile(file);
      setPreviewUrl(URL.createObjectURL(file)); 
    }
  };

  const handleGuardarEvento = async () => {
    if (!titulo || !fechaInicio || !fechaFin || !organizador) {
      alert("⚠️ Por favor, llena el Título, Organizador y las Fechas.");
      return;
    }

    setGuardando(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No se detecta tu sesión.");

      let finalPosterUrl = eventoAEditar?.poster_url || null;

      if (imagenFile) {
        const fileExt = imagenFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('posters').upload(fileName, imagenFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('posters').getPublicUrl(fileName);
        finalPosterUrl = publicUrl;
      }

      const textoResumen = horariosDetalle ? `${resumen}\n\nHorarios: ${horariosDetalle}` : resumen;

      const datosEvento = {
        title: titulo,
        organizer_entity: organizador,
        summary: textoResumen,
        poster_url: finalPosterUrl, 
        is_virtual: isVirtual,
        is_public: isPublic,
        virtual_link: isVirtual ? linkVirtual : null,
        physical_location: !isVirtual ? ubicacionFisica : null,
        location_map_url: !isVirtual ? mapUrl : null,
        start_date: new Date(fechaInicio).toISOString(),
        end_date: new Date(fechaFin).toISOString(),
        attendance_required_percent: asistenciaReq, // Se guarda el % de asistencia
        qr_checkin_enabled: qrCheckin, // Se guarda si usa QR
        capacity: cupo ? parseInt(cupo) : null, // Se guarda el límite de alumnos
        target_audience: dirigidoA, // Se guardan las casillas marcadas
        status: 'published',
        created_by: user.id
      };

      if (eventoAEditar) {
        const { error } = await supabase.from('events').update(datosEvento).eq('id', eventoAEditar.id);
        if (error) throw error;
        alert("✅ ¡Evento actualizado exitosamente!");
      } else {
        const { error } = await supabase.from('events').insert([datosEvento]);
        if (error) throw error;
        alert("✅ ¡Evento publicado exitosamente!");
      }

      onVolver(); 

    } catch (error: any) {
      console.error("Error:", error);
      alert("❌ Error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="animate-in fade-in max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
        <button onClick={onVolver} className="text-slate-400 hover:text-white font-bold px-4 py-2 bg-slate-900 rounded-lg border border-slate-700">← Volver</button>
        <div>
          <h2 className="text-2xl font-black text-white">{eventoAEditar ? "Editar Evento" : "Crear Evento Oficial"}</h2>
          <p className="text-slate-500 text-sm">{eventoAEditar ? "Modifica los detalles de tu evento publicado." : "Sube el póster de tu PC y configura los detalles."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQ: IMAGEN Y RESUMEN */}
        <div className="space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg text-center relative overflow-hidden group">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 z-10 relative">Póster del Evento</p>
            <div className="w-full aspect-square bg-[#0f172a] rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center overflow-hidden relative z-10">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-slate-600 mb-2" />
                  <span className="text-slate-500 text-sm font-bold">Haz clic para subir</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Resumen de Evento
            </h3>
            <textarea 
              value={resumen} onChange={(e) => setResumen(e.target.value)} rows={4}
              placeholder="Escribe una breve descripción del curso o evento..."
              className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 resize-none"
            ></textarea>
          </div>
        </div>

        {/* COLUMNA DER: FORMULARIO LOGÍSTICO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Detalles Básicos</h3>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Evento *</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Entidad Organizadora *</label>
              <input type="text" value={organizador} onChange={(e) => setOrganizador(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-wrap gap-4 mb-6 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3 bg-[#0f172a] border border-slate-700 px-4 py-2 rounded-xl">
                <button onClick={() => setIsVirtual(true)} className={`text-sm font-bold flex items-center gap-2 ${isVirtual ? 'text-indigo-400' : 'text-slate-500'}`}>{isVirtual && <Video className="w-4 h-4" />} Virtual</button>
                <span className="text-slate-700">|</span>
                <button onClick={() => setIsVirtual(false)} className={`text-sm font-bold flex items-center gap-2 ${!isVirtual ? 'text-emerald-400' : 'text-slate-500'}`}>{!isVirtual && <MapPin className="w-4 h-4" />} Presencial</button>
              </div>
            </div>

            <div className="mb-6 space-y-4">
              {isVirtual ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Enlace de Sala Virtual</label>
                  <input type="url" value={linkVirtual} onChange={(e) => setLinkVirtual(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Auditorio / Ubicación Física</label>
                    <input type="text" value={ubicacionFisica} onChange={(e) => setUbicacionFisica(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Enlace de Google Maps</label>
                    <input type="url" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500" />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0f172a] border border-slate-700 p-4 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1"><CalendarDays className="w-3 h-3 inline mr-1"/> Inicio *</label>
                <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none border-b border-slate-700 pb-1" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1"><CalendarDays className="w-3 h-3 inline mr-1"/> Fin *</label>
                <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full bg-transparent text-white text-sm outline-none border-b border-slate-700 pb-1" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1"><Clock className="w-3 h-3 inline mr-1"/> Horario</label>
                <input type="text" value={horariosDetalle} onChange={(e) => setHorariosDetalle(e.target.value)} placeholder="Ej: 15:00 a 18:00 hrs" className="w-full bg-transparent text-white text-sm outline-none border-b border-slate-700 pb-1" />
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* AQUÍ ESTÁN LAS OPCIONES DE ACREDITACIÓN QUE ME SALTEÉ ANTES */}
          {/* ========================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Caja 1: Asistencia y QR */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" /> Acreditación y Asistencia
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Asistencia Mínima Requerida</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={asistenciaReq} onChange={(e) => setAsistenciaReq(Number(e.target.value))} className="w-20 bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-white text-center outline-none focus:border-indigo-500" /> 
                    <span className="text-slate-500 text-sm">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-[#0f172a] border border-slate-700 p-3 rounded-lg">
                  <div>
                    <span className="text-sm font-bold text-slate-300 block">Check-in por código QR</span>
                    <span className="text-[10px] text-slate-500 block">Generar QR de evento para escaneo rápido</span>
                  </div>
                  <button onClick={() => setQrCheckin(!qrCheckin)}>
                    {qrCheckin ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Caja 2: Cupos y Público Objetivo */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 shadow-lg">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Opciones de Evento
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Cupo Límite de Alumnos</label>
                  <input type="number" value={cupo} onChange={(e) => setCupo(e.target.value)} placeholder="Ej: 200 (Vacío = Ilimitado)" className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <label className="block text-xs font-bold text-slate-400 mb-2">Dirigido A:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Estudiantes', 'Docentes', 'Egresados', 'Público G.'].map((opcion) => (
                      <label key={opcion} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                        <input 
                          type="checkbox" 
                          checked={dirigidoA.includes(opcion)}
                          onChange={() => toggleDirigido(opcion)}
                          className="rounded border-slate-700 bg-[#0f172a] text-indigo-500 focus:ring-indigo-500" 
                        /> {opcion}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          <button onClick={handleGuardarEvento} disabled={guardando} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg py-5 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20">
            {guardando ? <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</> : (eventoAEditar ? "** Actualizar Cambios **" : "** Publicar Evento Oficial **")}
          </button>
        </div>
      </div>
    </div>
  );
}