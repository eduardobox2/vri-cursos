"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode'; // <-- LIBRERÍA NUEVA PARA EL QR REAL
import { 
  BookOpen, Award, User, LogOut, Loader2, Search, 
  CheckCircle2, Clock, Download, BarChart3, LayoutDashboard, ShieldCheck,
  Compass, PlusCircle, Globe, Video, MapPin, X, CalendarDays, AlignLeft, Users
} from 'lucide-react';

export default function StudentDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [inscripciones, setInscripciones] = useState<any[]>([]);
  const [todosLosEventos, setTodosLosEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const [busqueda, setBusqueda] = useState('');
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const [inscribiendoId, setInscribiendoId] = useState<string | null>(null);
  
  // NUEVO: ESTADO PARA EL MODAL DE DETALLES
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/'; return; }

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profileData) setProfile(profileData);

    const { data: enrollData } = await supabase
      .from('enrollments')
      .select(`*, events (*), certificates (*)`)
      .eq('profile_id', user.id);

    if (enrollData) setInscripciones(enrollData);

    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('start_date', { ascending: true });

    if (eventsData) setTodosLosEventos(eventsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInscribirse = async (eventId: string) => {
    setInscribiendoId(eventId);
    try {
      const { error } = await supabase.from('enrollments').insert([{ event_id: eventId, profile_id: profile.id }]);
      if (error) throw error;
      alert("🎉 ¡Te has inscrito exitosamente!");
      await fetchData(); 
      setEventoSeleccionado(null); // Cerrar modal si estaba abierto
    } catch (error: any) {
      alert("Error al inscribirse: " + error.message);
    } finally {
      setInscribiendoId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // =========================================================================
  // 🖨️ MOTOR DE PDF CON CÓDIGO QR REAL
  // =========================================================================
  const handleDescargarCertificado = async (inscripcion: any) => {
    setDescargandoId(inscripcion.id);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas no encontrado");
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Contexto 2D no soportado");

      const evento = inscripcion.events;
      const certData = Array.isArray(inscripcion.certificates) ? inscripcion.certificates[0] : inscripcion.certificates;

      if (!certData || !certData.certificate_code) throw new Error("No se encontró el código oficial del certificado.");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = evento.certificate_template_url || '/certificado_base.jpg';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Textos Centrales
      ctx.fillStyle = evento.cert_text_color || '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = `bold ${evento.cert_name_size || 60}px ${evento.cert_font_family || 'Arial'}`;
      ctx.fillText(`${profile.first_names} ${profile.last_names}`.toUpperCase(), canvas.width / 2, evento.cert_name_y || 300);
      ctx.font = `bold ${evento.cert_course_size || 35}px ${evento.cert_font_family || 'Arial'}`;
      ctx.fillText(evento.title.toUpperCase(), canvas.width / 2, evento.cert_course_y || 450);

      // =========================================================
      // 📱 GENERACIÓN DEL QR REAL
      // =========================================================
      const qrX = evento.cert_qr_x || 100;
      const qrY = evento.cert_qr_y || 550;
      const qrSize = 160;
      
      // Creamos la URL a la que apuntará el QR (Tu página de verificación)
      const urlVerificacion = `${window.location.origin}/verificar/${certData.certificate_code}`;
      
      // Generamos la imagen del QR en base64
      const qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
        width: qrSize,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      });

      // Dibujamos el QR en el Canvas
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => { qrImg.onload = resolve; });
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      
      // Texto del ID debajo del QR
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.fillText(`ID: ${certData.certificate_code}`, evento.cert_code_x || qrX, evento.cert_code_y || (qrY + qrSize + 20));

      // =========================================================
      // SELLO FIRMA PERÚ
      // =========================================================
      const firmaX = evento.cert_firma_x || 650;
      const firmaY = evento.cert_firma_y || 600;
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
      ctx.fillText(`Fecha: ${new Date(certData.issue_date || new Date()).toLocaleDateString()}`, firmaX + 20, firmaY + 100);

      // Ensamblaje en Servidor
      const base64Image = canvas.toDataURL('image/jpeg', 0.9);
      const response = await fetch('/api/certificados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, idUnico: certData.certificate_code })
      });

      if (!response.ok) throw new Error(`Fallo en servidor: ${await response.text()}`);

      const data = await response.json();
      if (!data.pdfFirmadoBase64) throw new Error("El servidor no devolvió el documento PDF.");

      const byteCharacters = atob(data.pdfFirmadoBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificado_${certData.certificate_code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      alert("Error al descargar: " + error.message);
    } finally {
      setDescargandoId(null);
    }
  };

  const cursosAprobados = inscripciones.filter(i => i.final_grade >= 11);
  const cursosFiltrados = inscripciones.filter(i => i.events?.title?.toLowerCase().includes(busqueda.toLowerCase()));
  const eventosParaExplorar = todosLosEventos.filter(ev => !inscripciones.some(ins => ins.event_id === ev.id));
  
  let promedioGlobal = 0;
  if (inscripciones.length > 0) {
    const notasValidas = inscripciones.filter(i => i.final_grade > 0);
    const suma = notasValidas.reduce((acc, curr) => acc + curr.final_grade, 0);
    promedioGlobal = notasValidas.length > 0 ? (suma / notasValidas.length) : 0;
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
        <div className="p-8 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20"><ShieldCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="font-black text-slate-900 text-xl tracking-tight leading-none">VRI</h2>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-1">Portal Estudiantil</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-black text-slate-600 text-xl">{profile?.first_names?.charAt(0) || 'U'}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate uppercase">{profile?.first_names}</p>
              <p className="text-xs font-medium text-slate-500 truncate">{profile?.document_number}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <button onClick={() => setVistaActiva('inicio')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${vistaActiva === 'inicio' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><LayoutDashboard className="w-5 h-5" /> Mi Resumen</button>
          <button onClick={() => setVistaActiva('cursos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${vistaActiva === 'cursos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><BookOpen className="w-5 h-5" /> Mis Cursos</button>
          <button onClick={() => setVistaActiva('explorar')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${vistaActiva === 'explorar' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}><Compass className="w-5 h-5" /> Explorar Eventos</button>
          <button onClick={() => setVistaActiva('certificados')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${vistaActiva === 'certificados' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Award className="w-5 h-5" /> Mis Certificados</button>
          <button onClick={() => setVistaActiva('perfil')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${vistaActiva === 'perfil' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><User className="w-5 h-5" /> Mi Perfil</button>
        </nav>
        
        <div className="p-6 border-t border-slate-100">
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"><LogOut className="w-4 h-4" /> Cerrar Sesión</button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 h-screen overflow-y-auto p-10 xl:p-14 custom-scrollbar">  
        
        {/* VISTA 1: INICIO (Resumen) */}
        {vistaActiva === 'inicio' && (
          <div className="animate-in fade-in max-w-5xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 md:p-12 text-white shadow-2xl shadow-blue-600/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Cuenta Verificada
                </span>
                <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">¡Hola, {profile?.first_names}! 👋</h1>
                <p className="text-blue-100 font-medium text-lg max-w-xl">Bienvenido a tu portal académico. Aquí puedes ver tu progreso y gestionar tus certificados.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><BookOpen className="w-8 h-8" /></div>
                <div><p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Inscrito</p><p className="text-4xl font-black text-slate-900">{inscripciones.length}</p></div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Award className="w-8 h-8" /></div>
                <div><p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Certificados</p><p className="text-4xl font-black text-slate-900">{cursosAprobados.filter(c => c.certificates && (!Array.isArray(c.certificates) || c.certificates.length > 0)).length}</p></div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><BarChart3 className="w-8 h-8" /></div>
                <div><p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Promedio</p><p className="text-4xl font-black text-slate-900">{promedioGlobal.toFixed(1)} <span className="text-lg text-slate-400 font-medium">/ 20</span></p></div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: MIS CURSOS */}
        {vistaActiva === 'cursos' && (
          <div className="animate-in fade-in max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900">Mis Cursos y Eventos</h2>
                <p className="text-slate-500 font-medium mt-1">Revisa tus calificaciones y progreso de asistencia.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                <input type="text" placeholder="Buscar curso..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursosFiltrados.length === 0 ? (
                <div className="col-span-2 py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white"><BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="font-bold text-slate-500">No estás inscrito en ningún curso aún.</p></div>
              ) : (
                cursosFiltrados.map((inscripcion) => {
                  const asis = inscripcion.attendance_percent || 0;
                  const nota = inscripcion.final_grade || 0;
                  const reqAsis = inscripcion.events?.attendance_required_percent || 70;
                  const aprobado = nota >= 11;
                  const ev = inscripcion.events;

                  return (
                    <div key={inscripcion.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group hover:border-blue-200 transition-colors">
                      {aprobado && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-sm">Aprobado</div>}
                      
                      <div className="mb-4">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{ev?.organizer_entity || 'VRI UNA PUNO'}</p>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">{ev?.title}</h3>
                        
                        <button 
                          onClick={() => setEventoSeleccionado(ev)}
                          className="mt-3 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                        >
                          Ver detalles completos <Compass className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Detalles Operativos Resumidos */}
                      <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {ev?.is_virtual ? (
                          <div className="flex items-center gap-2 text-sm font-bold text-blue-600">
                            <Video className="w-4 h-4 shrink-0" /> 
                            {ev?.meeting_link && ev.meeting_link.trim() !== '' ? (
                              <a href={ev.meeting_link.startsWith('http') ? ev.meeting_link : `https://${ev.meeting_link}`} target="_blank" rel="noreferrer" className="hover:underline hover:text-blue-700 truncate">
                                Unirse a sala virtual
                              </a>
                            ) : (
                              <span className="text-slate-400">Enlace pendiente</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                            <MapPin className="w-4 h-4 shrink-0" /> 
                            <span className="truncate">{ev?.location && ev.location.trim() !== '' ? ev.location : 'Sede presencial por confirmar'}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6 mt-auto">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nota Final</p>
                          <p className={`text-2xl font-black ${nota >= 11 ? 'text-emerald-600' : nota > 0 ? 'text-red-500' : 'text-slate-900'}`}>{nota > 0 ? nota : '--'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Asistencia</p>
                          <p className="text-2xl font-black text-slate-900">{asis}%</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-bold mb-2 uppercase">
                          <span className={asis >= reqAsis ? 'text-emerald-600' : 'text-slate-400'}>Progreso Asistencia</span>
                          <span className="text-slate-400">Meta: {reqAsis}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${asis >= reqAsis ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(asis, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VISTA 3: EXPLORAR EVENTOS */}
        {vistaActiva === 'explorar' && (
          <div className="animate-in fade-in max-w-6xl mx-auto space-y-8">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Explorar <span className="text-blue-600">Nuevos Retos</span></h2>
              <p className="text-slate-500 font-medium">Inscríbete en los próximos cursos y talleres.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {eventosParaExplorar.length === 0 ? (
                <div className="col-span-3 py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                  <Globe className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-bold text-slate-400">No hay nuevos eventos disponibles por ahora.</p>
                </div>
              ) : (
                eventosParaExplorar.map(ev => (
                  <div key={ev.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all group">
                    <div className="h-44 bg-slate-900 relative overflow-hidden">
                      {ev.poster_url ? <img src={ev.poster_url} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-700">VRI UNA</div>}
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                        {ev.is_virtual ? <Video className="w-3 h-3 text-blue-600"/> : <MapPin className="w-3 h-3 text-emerald-600"/>} {ev.is_virtual ? 'VIRTUAL' : 'PRESENCIAL'}
                      </div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{ev.organizer_entity}</p>
                      <h3 className="text-xl font-black text-slate-900 mb-4 leading-tight line-clamp-2">{ev.title}</h3>
                      
                      <button 
                        onClick={() => setEventoSeleccionado(ev)}
                        className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors mb-6 self-start"
                      >
                        Ver Info Completa
                      </button>

                      <button 
                        onClick={() => handleInscribirse(ev.id)}
                        disabled={inscribiendoId === ev.id}
                        className="w-full mt-auto bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                      >
                        {inscribiendoId === ev.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />} Inscribirme Ahora
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VISTA 4: MIS CERTIFICADOS (La Vitrina) */}
        {vistaActiva === 'certificados' && (
          <div className="animate-in fade-in max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3"><Award className="w-8 h-8 text-blue-600" /> Vitrina de Certificados</h2>
              <p className="text-slate-500 font-medium mt-1">Tus logros académicos avalados criptográficamente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursosAprobados.length === 0 ? (
                <div className="col-span-2 py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white"><Award className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="font-bold text-slate-500">Aún no tienes certificados emitidos.</p></div>
              ) : (
                cursosAprobados.map((inscripcion) => {
                  const cert = Array.isArray(inscripcion.certificates) 
                    ? inscripcion.certificates[0] 
                    : inscripcion.certificates;
                  
                  const tieneCertificado = cert && cert.certificate_code ? true : false;
                  
                  return (
                    <div key={inscripcion.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-blue-900/5 transition-all group">
                      <div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100"><ShieldCheck className="w-6 h-6" /></div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-2">{inscripcion.events?.title}</h3>
                        <p className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-6"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Aprobado con {inscripcion.final_grade}</p>
                      </div>
                      
                      {tieneCertificado ? (
                        <button 
                          onClick={() => handleDescargarCertificado(inscripcion)}
                          disabled={descargandoId === inscripcion.id}
                          className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-slate-900/10"
                        >
                          {descargandoId === inscripcion.id ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando Firma...</> : <><Download className="w-5 h-5" /> Obtener Certificado PDF</>}
                        </button>
                      ) : (
                        <div className="w-full bg-slate-50 border border-slate-200 border-dashed text-slate-400 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm">
                          <Clock className="w-4 h-4" /> En proceso de firma institucional
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VISTA 5: MI PERFIL */}
        {vistaActiva === 'perfil' && (
          <div className="animate-in fade-in max-w-3xl mx-auto space-y-8 pb-20">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Configuración de Perfil</h2>
              <p className="text-slate-500 font-medium mt-1">Tus datos personales aparecerán exactamente así en tus diplomas.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="h-32 bg-slate-900 relative">
                <div className="absolute -bottom-12 left-8 w-24 h-24 bg-white rounded-2xl p-2 shadow-lg">
                  <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center font-black text-3xl text-slate-400">
                    {profile?.first_names?.charAt(0)}
                  </div>
                </div>
              </div>
              
              <div className="pt-16 p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombres</label>
                    <div className="mt-1 font-bold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{profile?.first_names}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apellidos</label>
                    <div className="mt-1 font-bold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{profile?.last_names}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento de Identidad</label>
                    <div className="mt-1 font-bold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{profile?.document_number}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Vinculado</label>
                    <div className="mt-1 font-bold text-slate-900 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">{profile?.email}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL EMERGENTE DE DETALLES DEL EVENTO */}
      {/* ========================================================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="relative h-64 bg-slate-950 shrink-0 flex items-center justify-center">
              {eventoSeleccionado.poster_url ? (
                <img src={eventoSeleccionado.poster_url} className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="text-slate-600">VRI UNA PUNO</div>
              )}
              <button onClick={() => setEventoSeleccionado(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white text-white hover:text-slate-900 p-2 rounded-full backdrop-blur transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto custom-scrollbar">
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-3">{eventoSeleccionado.organizer_entity || 'VRI UNA Puno'}</p>
              <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight">{eventoSeleccionado.title}</h2>
              
              <div className="flex flex-wrap gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm"><CalendarDays className="w-5 h-5" /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inicio del Curso</p>
                    <p className="text-sm font-bold text-slate-700">
                      {eventoSeleccionado.start_date ? new Date(eventoSeleccionado.start_date).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' }) : 'Por definir'}
                    </p>
                  </div>
                </div>
                <div className="w-px h-12 bg-slate-200 hidden md:block mx-2"></div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                    {eventoSeleccionado.is_virtual ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ubicación / Modalidad</p>
                    {eventoSeleccionado.is_virtual ? (
                      <p className="text-sm font-bold text-blue-600">
                        {eventoSeleccionado.meeting_link && eventoSeleccionado.meeting_link.trim() !== '' ? (
                          <a href={eventoSeleccionado.meeting_link.startsWith('http') ? eventoSeleccionado.meeting_link : `https://${eventoSeleccionado.meeting_link}`} target="_blank" rel="noreferrer" className="hover:underline">Unirse a la sala (Link)</a>
                        ) : 'Link pendiente'}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-slate-700">{eventoSeleccionado.location && eventoSeleccionado.location.trim() !== '' ? eventoSeleccionado.location : 'Por confirmar'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-blue-600"/> Descripción Oficial</h4>
                <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">{eventoSeleccionado.summary || 'No hay descripción detallada para este evento.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Users className="w-3 h-3"/> Requisito Asistencia</p>
                  <p className="text-xl font-black text-blue-900">{eventoSeleccionado.attendance_required_percent || 70}% mínimo</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Award className="w-3 h-3"/> Nota Aprobatoria</p>
                  <p className="text-xl font-black text-emerald-900">11 a 20 pts</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}