"use client";

import React, { useEffect, useState } from 'react';
import UsuariosRoles from '@/components/admin/UsuariosRoles';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, LayoutDashboard, CalendarDays, Users, Award, 
  LogOut, Loader2, Download, Trash2, Edit, FileSpreadsheet, 
  UserPlus, Palette 
} from 'lucide-react';

import CrearEventoForm from '@/components/admin/CrearEventoForm';
import EditorCertificado from '@/components/admin/EditorCertificado';

export default function SuperAdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [vistaActiva, setVistaActiva] = useState('eventos'); 
  const [creandoEvento, setCreandoEvento] = useState(false);
  
  const [misEventos, setMisEventos] = useState<any[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [eventoAEditar, setEventoAEditar] = useState<any>(null);

  const [eventoEnGestion, setEventoEnGestion] = useState<any>(null);
  
  const [alumnosInscritos, setAlumnosInscritos] = useState<any[]>([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);

  // NUEVO ESTADO PARA EL DISEÑADOR
  const [eventoParaDisenar, setEventoParaDisenar] = useState<any>(null);

  useEffect(() => {
    async function checkConnection() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/'; return; }
      
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (data) {
        // =======================================================
        // ⏱️ EL CADENERO: Verifica si el tiempo del Ponente expiró
        // =======================================================
        if (data.role === 'admin' && data.role_expires_at) {
          const ahora = new Date();
          const fechaExpiracion = new Date(data.role_expires_at);
          
          if (ahora > fechaExpiracion) {
            // ¡Se le acabó el tiempo! Lo bajamos a estudiante en la base de datos
            await supabase.from('profiles').update({ role: 'student', role_expires_at: null }).eq('id', user.id);
            alert("⏳ Tu acceso temporal como Ponente / Administrador ha expirado. Regresando al portal de estudiante.");
            window.location.href = '/dashboard'; // Lo echamos del panel oscuro
            return;
          }
        }
        
        setProfile(data);
      }
      setLoading(false);
    }
    checkConnection();
  }, []);

  const fetchMisEventos = async () => {
    setCargandoLista(true);
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) setMisEventos(data);
    setCargandoLista(false);
  };

  useEffect(() => {
    // Solo recargamos la lista si estamos en la vista base (sin editores ni diseñadores abiertos)
    if ((vistaActiva === 'eventos' || vistaActiva === 'certificados') && !creandoEvento && !eventoEnGestion && !eventoParaDisenar) {
      fetchMisEventos();
    }
  }, [vistaActiva, creandoEvento, eventoEnGestion, eventoParaDisenar]);

  useEffect(() => {
    async function fetchAlumnos() {
      if (!eventoEnGestion) return;
      setCargandoAlumnos(true);
      const { data, error } = await supabase
        .from('enrollments')
        .select(`*, profiles(document_number, first_names, last_names, email)`)
        .eq('event_id', eventoEnGestion.id);
      if (!error && data) setAlumnosInscritos(data);
      setCargandoAlumnos(false);
    }
    fetchAlumnos();
  }, [eventoEnGestion]);

  const handleGuardarNota = async (inscripcionId: string, asis: number, nota: number) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ attendance_percent: asis, final_grade: nota })
      .eq('id', inscripcionId);

    if (error) {
      alert("❌ Error al guardar: " + error.message);
    } else {
      alert("✅ Calificación guardada en la base de datos.");
      setAlumnosInscritos(prev => prev.map(al => al.id === inscripcionId ? { ...al, attendance_percent: asis, final_grade: nota } : al));
    }
  };

  const handleEmitirCertificados = async (eventId: string) => {
    const confirmar = window.confirm("¿Deseas emitir certificados para los alumnos APROBADOS de este evento?");
    if (!confirmar) return;

    const { data: aprobados } = await supabase
      .from('enrollments')
      .select('id, final_grade')
      .eq('event_id', eventId)
      .gte('final_grade', 11);

    if (!aprobados || aprobados.length === 0) {
      alert("⚠️ No hay alumnos aprobados en este evento todavía.");
      return;
    }

    let emitidos = 0;
    for (const alumno of aprobados) {
      const codigoUnico = `VRI-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { error } = await supabase.from('certificates').insert([{
        enrollment_id: alumno.id,
        certificate_code: codigoUnico
      }]);
      
      if (error) {
        // 23505 es el código oficial de PostgreSQL para "Duplicado / Ya existe"
        if (error.code === '23505') {
          console.log(`El alumno ${alumno.id} ya tenía certificado. Omitiendo...`);
        } else {
          alert("❌ ERROR DE SUPABASE: " + error.message);
        }
      } else {
        emitidos++; 
      }
    }

    if (emitidos > 0) {
      alert(`🎉 ¡Motor Finalizado! Se generaron ${emitidos} certificados oficiales NUEVOS.`);
    } else {
      alert("ℹ️ Todos los alumnos aprobados de este evento ya tenían su certificado emitido. No se generaron nuevos.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleEliminarEvento = async (id: string) => {
    const confirmar = window.confirm("🚨 ¿Estás seguro de eliminar este evento?");
    if (!confirmar) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      alert("✅ Evento eliminado.");
      setMisEventos((prev) => prev.filter(ev => ev.id !== id));
    }
  };

  const handleClickEditar = (evento: any) => {
    setEventoAEditar(evento);
    setCreandoEvento(true);
  };

  const handleVolverDelFormulario = () => {
    setCreandoEvento(false);
    setEventoAEditar(null);
    fetchMisEventos();
  };

  const exportarAExcel = () => {
    if (alumnosInscritos.length === 0) {
      alert("⚠️ No hay alumnos inscritos para exportar todavía.");
      return;
    }
    const cabeceras = ["DNI", "Nombres", "Apellidos", "Asistencia (%)", "Nota Final", "Estado"];
    const filas = alumnosInscritos.map(alumno => [
      alumno.profiles?.document_number || "",
      alumno.profiles?.first_names || "",
      alumno.profiles?.last_names || "",
      alumno.attendance_percent || "0",
      alumno.final_grade || "0",
      alumno.final_grade >= 11 ? "APROBADO" : "INSCRITO"
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + cabeceras.join(",") + "\n" + filas.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_${eventoEnGestion?.title?.replace(/\s+/g, '_') || 'evento'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-200">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col z-20 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck className="w-6 h-6 text-white" /></div>
            <div>
              <h2 className="font-black text-white text-xl tracking-tight">VRI Admin</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Consola Root</p>
            </div>
          </div>
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-300">{profile?.first_names?.charAt(0) || 'A'}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{profile?.first_names || 'Administrador'} {profile?.last_names || ''}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => {setVistaActiva('dashboard'); setCreandoEvento(false); setEventoEnGestion(null); setEventoParaDisenar(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${vistaActiva === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><LayoutDashboard className="w-5 h-5" /> Resumen Global</button>
          <button onClick={() => {setVistaActiva('eventos'); setEventoEnGestion(null); setEventoParaDisenar(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${vistaActiva === 'eventos' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><CalendarDays className="w-5 h-5" /> Gestión de Eventos</button>
          <button onClick={() => {setVistaActiva('usuarios'); setCreandoEvento(false); setEventoEnGestion(null); setEventoParaDisenar(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${vistaActiva === 'usuarios' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><Users className="w-5 h-5" /> Usuarios y Roles</button>
          <button onClick={() => {setVistaActiva('certificados'); setCreandoEvento(false); setEventoEnGestion(null); setEventoParaDisenar(null);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${vistaActiva === 'certificados' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><Award className="w-5 h-5" /> Motor de Certificados</button>
        </nav>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 h-screen overflow-y-auto p-10 bg-[#0b1120]">  
        
        {/* VISTA 1: LISTA DE EVENTOS PRINCIPAL */}
        {vistaActiva === 'eventos' && !creandoEvento && !eventoEnGestion && !eventoParaDisenar && (
          <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-white">Gestión de Eventos</h2>
                <p className="text-slate-400 text-sm mt-1">Administra tus cursos y talleres publicados.</p>
              </div>
              <button onClick={() => { setEventoAEditar(null); setCreandoEvento(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">
                + Crear Nuevo Evento
              </button>
            </div>

            {cargandoLista ? (
              <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : misEventos.length === 0 ? (
              <div className="bg-[#1e293b] border border-slate-700 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
                <CalendarDays className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-xl font-bold text-slate-300">No hay eventos publicados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {misEventos.map((ev) => (
                  <div key={ev.id} className="bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden flex flex-col hover:border-slate-500 transition-colors shadow-lg">
                    <div className="h-40 bg-slate-900 relative">
                      {ev.poster_url ? (
                        <img src={ev.poster_url} alt="poster" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">Sin Póster</div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{ev.title}</h3>
                      <p className="text-slate-400 text-xs mb-4 line-clamp-1">{ev.organizer_entity}</p>
                      
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => setEventoEnGestion(ev)}
                          className="col-span-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-bold transition-colors mb-2 shadow-lg shadow-indigo-600/20"
                        >
                          <Users className="w-4 h-4" /> Gestionar Alumnos y Notas
                        </button>
                        
                        {/* NUEVO BOTÓN: DISEÑAR DIPLOMA */}
                        <button 
                          onClick={() => setEventoParaDisenar(ev)}
                          className="col-span-2 flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-colors mb-2"
                        >
                          <Palette className="w-4 h-4" /> Diseñar Diploma
                        </button>

                        <button onClick={() => handleClickEditar(ev)} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors">
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => handleEliminarEvento(ev.id)} className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-2.5 rounded-xl text-xs font-bold transition-colors">
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: FORMULARIO DE CREAR/EDITAR EVENTO */}
        {vistaActiva === 'eventos' && creandoEvento && (
          <CrearEventoForm onVolver={handleVolverDelFormulario} eventoAEditar={eventoAEditar} />
        )}

        {/* VISTA 3: SALA DE CONTROL DE ALUMNOS */}
        {vistaActiva === 'eventos' && eventoEnGestion && (
          <div className="animate-in fade-in max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setEventoEnGestion(null)} className="text-slate-400 hover:text-white font-bold px-4 py-2 bg-slate-900 rounded-lg border border-slate-700">← Volver</button>
                <div>
                  <h2 className="text-2xl font-black text-white">Sala de Control</h2>
                  <p className="text-indigo-400 text-sm font-bold">{eventoEnGestion.title}</p>
                </div>
              </div>

              <button 
                onClick={exportarAExcel}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20"
              >
                <FileSpreadsheet className="w-5 h-5" /> Exportar a Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Inscritos Reales</p>
                <p className="text-3xl font-black text-white">{alumnosInscritos.length} <span className="text-sm font-normal text-slate-500">/ {eventoEnGestion.capacity || '∞'}</span></p>
              </div>
              <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Aprobados</p>
                <p className="text-3xl font-black text-emerald-400">{alumnosInscritos.filter(a => a.final_grade >= 11).length}</p>
              </div>
              <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Desaprobados</p>
                <p className="text-3xl font-black text-red-400">{alumnosInscritos.filter(a => a.final_grade > 0 && a.final_grade < 11).length}</p>
              </div>
              <div className="bg-[#1e293b] border border-slate-700 p-5 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Req. Asistencia</p>
                <p className="text-3xl font-black text-blue-400">{eventoEnGestion.attendance_required_percent}%</p>
              </div>
            </div>

            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0f172a] text-xs uppercase font-bold text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4">Documento</th>
                      <th className="px-6 py-4">Apellidos y Nombres</th>
                      <th className="px-6 py-4 text-center">Asistencia %</th>
                      <th className="px-6 py-4 text-center">Nota /20</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cargandoAlumnos ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                    ) : alumnosInscritos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-lg font-bold">Aún no hay inscritos</p>
                        </td>
                      </tr>
                    ) : (
                      alumnosInscritos.map((alumno) => (
                        <tr key={alumno.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-slate-400">{alumno.profiles?.document_number}</td>
                          <td className="px-6 py-4 font-bold text-white uppercase">{alumno.profiles?.last_names}, {alumno.profiles?.first_names}</td>
                          <td className="px-6 py-4 text-center">
                            <input id={`ast-${alumno.id}`} type="number" defaultValue={alumno.attendance_percent || 0} className="w-16 bg-[#0f172a] border border-slate-700 rounded p-1 text-center text-white outline-none focus:border-indigo-500" />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input id={`nota-${alumno.id}`} type="number" defaultValue={alumno.final_grade || 0} className="w-16 bg-[#0f172a] border border-slate-700 rounded p-1 text-center text-white outline-none focus:border-indigo-500 font-bold" />
                          </td>
                          <td className="px-6 py-4 text-center">
                            {alumno.final_grade >= 11 ? (
                              <span className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-full text-[10px] uppercase border border-emerald-500/20">Aprobado</span>
                            ) : (
                              <span className="bg-slate-500/10 text-slate-400 font-bold px-3 py-1 rounded-full text-[10px] uppercase border border-slate-500/20">Inscrito</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                const ast = parseInt((document.getElementById(`ast-${alumno.id}`) as HTMLInputElement).value);
                                const nota = parseInt((document.getElementById(`nota-${alumno.id}`) as HTMLInputElement).value);
                                handleGuardarNota(alumno.id, ast, nota);
                              }}
                              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors shadow-md"
                            >
                              Guardar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 4: DISEÑADOR VISUAL DE DIPLOMAS */}
        {vistaActiva === 'eventos' && eventoParaDisenar && (
          <EditorCertificado
            evento={eventoParaDisenar} 
            onVolver={() => setEventoParaDisenar(null)} 
          />
        )}
        {/* PESTAÑA: USUARIOS Y ROLES */}
        {vistaActiva === 'usuarios' && (
          <UsuariosRoles />
        )}

        {/* PESTAÑA: MOTOR DE CERTIFICADOS */}
        {vistaActiva === 'certificados' && (
          <div className="animate-in fade-in max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-white">Motor de Emisión de Certificados</h2>
                <p className="text-slate-400 text-sm mt-1">Genera masivamente los códigos oficiales para los alumnos aprobados.</p>
              </div>
            </div>

            {misEventos.length === 0 ? (
              <p className="text-slate-500">No hay eventos para emitir certificados.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {misEventos.map((ev) => (
                  <div key={ev.id} className="bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col hover:border-emerald-500/50 transition-colors">
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                          <Award className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h3 className="text-white font-bold leading-tight line-clamp-2">{ev.title}</h3>
                      </div>
                      <p className="text-slate-400 text-xs mb-6 mt-auto">Solo se emitirán certificados a estudiantes con nota registrada mayor o igual a 11.</p>
                      <button 
                        onClick={() => handleEmitirCertificados(ev.id)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-600/20"
                      >
                        <Award className="w-4 h-4" /> Emitir Certificados
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}