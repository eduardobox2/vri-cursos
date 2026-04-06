"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, User, Lock, Mail, ShieldCheck, Loader2, CalendarDays, MapPin, Video, X, CheckCircle2, LayoutDashboard, LogOut, ArrowRight, Award } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  
  const [pestañaActiva, setPestañaActiva] = useState("nuevos");
  const [eventos, setEventos] = useState<any[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any>(null);

  // NUEVO: ESTADO PARA EL BUSCADOR DE CURSOS
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  // ESTADO PARA EL BUSCADOR DE CERTIFICADOS
  const [codigoVerificacion, setCodigoVerificacion] = useState("");

  // ESTADO PARA SABER SI HAY ALGUIEN LOGUEADO
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const [inscribiendo, setInscribiendo] = useState(false);

  // CONTROL DE VISTAS EN EL PANEL DERECHO
  const [vistaAuth, setVistaAuth] = useState("login");
  const [tipoDocumento, setTipoDocumento] = useState("dni");

  const [emailLogin, setEmailLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [docReg, setDocReg] = useState("");
  const [nombresReg, setNombresReg] = useState("");
  const [apellidosReg, setApellidosReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [passwordReg, setPasswordReg] = useState("");
  const [buscandoDni, setBuscandoDni] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [errorReg, setErrorReg] = useState("");

  // TRAER EVENTOS Y VERIFICAR SESIÓN
  useEffect(() => {
    async function inicializar() {
      // Traer eventos
      const { data: dataEventos } = await supabase.from('events').select('*').eq('status', 'published').order('created_at', { ascending: false });
      if (dataEventos) setEventos(dataEventos);
      setCargandoEventos(false);

      // Revisar si hay alguien logueado en este navegador
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
        if (profile) setUsuarioActual(profile);
      }
    }
    inicializar();
  }, []);

  // FUNCIÓN: LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLogin(true); setErrorLogin("");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: passwordLogin,
    });

    if (authError) {
      setErrorLogin("Credenciales incorrectas.");
      setLoadingLogin(false);
      return;
    }

    if (authData.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
      if (profile?.role === 'admin' || profile?.role === 'superadmin') {
        window.location.href = "/admin";
      } else if (profile?.role === 'student') {
        window.location.href = "/dashboard"; 
      }
    }
  };

  // FUNCIÓN: CERRAR SESIÓN
  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    setUsuarioActual(null);
    window.location.reload();
  };

  // FUNCIÓN: BUSCAR DNI
  const buscarDNI = async () => {
    if (docReg.length !== 8) return;
    setBuscandoDni(true); setErrorReg("");
    try {
      const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://api.apis.net.pe/v1/dni?numero=${docReg}`)}`);
      if (!res.ok) throw new Error("DNI no encontrado.");
      const data = await res.json();
      setNombresReg(data.nombres);
      setApellidosReg(`${data.apellidoPaterno} ${data.apellidoMaterno}`);
      setTipoDocumento("dni"); 
    } catch (error) {
      setTipoDocumento("ce");
      setNombresReg(""); setApellidosReg("");
    } finally {
      setBuscandoDni(false);
    }
  };

  // FUNCIÓN: REGISTRO
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorReg("");
    setRegistrando(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: emailReg, password: passwordReg });
      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id, document_type: tipoDocumento, document_number: docReg,
          first_names: nombresReg, last_names: apellidosReg, email: emailReg, role: 'student'
        }]);
        if (profileError) throw profileError;
      }
      setVistaAuth("exito");
    } catch (error: any) {
      setErrorReg(error.message);
    } finally {
      setRegistrando(false);
    }
  };

  // FUNCIÓN: INSCRIBIRSE A UN EVENTO
  const handleInscripcion = async () => {
    if (!usuarioActual) {
      alert("⚠️ Debes iniciar sesión o registrarte primero para poder inscribirte a un evento.");
      setEventoSeleccionado(null);
      return;
    }

    if (usuarioActual.role !== 'student') {
      alert("⚠️ Solo las cuentas de Estudiantes pueden inscribirse a eventos.");
      return;
    }

    setInscribiendo(true);
    try {
      const { error } = await supabase.from('enrollments').insert([{
        event_id: eventoSeleccionado.id,
        profile_id: usuarioActual.id
      }]);

      if (error) {
        if (error.code === '23505') {
          alert("✅ ¡Ya estabas inscrito en este evento! Revisa tu Panel de Estudiante.");
        } else {
          throw error;
        }
      } else {
        alert("🎉 ¡Inscripción exitosa! Tu cupo ha sido reservado. Te esperamos.");
      }
      
      setEventoSeleccionado(null);
    } catch (error: any) {
      alert("❌ Hubo un error al intentar inscribirte: " + error.message);
    } finally {
      setInscribiendo(false);
    }
  };

  // FUNCIÓN: REDIRIGIR A VERIFICAR CERTIFICADO
  const handleVerificarCertificado = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoVerificacion.trim().length > 5) {
      router.push(`/verificar/${codigoVerificacion.trim()}`);
    }
  };

  // LÓGICA DE FILTRADO DE EVENTOS (Busca y recorta según la pestaña)
  const eventosMostrados = eventos
    .filter(ev => 
      ev.title.toLowerCase().includes(terminoBusqueda.toLowerCase()) || 
      (ev.summary && ev.summary.toLowerCase().includes(terminoBusqueda.toLowerCase()))
    )
    .slice(0, pestañaActiva === 'nuevos' ? 6 : undefined); // Si es "nuevos", solo muestra los 6 más recientes

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans relative overflow-hidden">
      
      {/* ========================================================= */}
      {/* FONDO ANIMADO DE NEBULOSA / PARTÍCULAS (Solo CSS puro) */}
      {/* ========================================================= */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Orbe Azul Superior */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        {/* Orbe Índigo Inferior */}
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
        {/* Orbe Esmeralda Centro */}
        <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '5s' }}></div>
        {/* Malla de puntos (opcional para dar textura) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* LADO IZQUIERDO: CONTENIDO PRINCIPAL (Transparente para ver el fondo) */}
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="max-w-5xl mx-auto p-10">
          
          <header className="text-center mb-16 mt-8">
            <div className="flex justify-center mb-8">
              {/* LOGO MEJORADO, MÁS GRANDE E IMPONENTE */}
              <div className="relative group cursor-default">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500 rounded-[3rem]"></div>
                <div className="relative w-32 h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/50 rounded-[2.5rem] flex flex-col items-center justify-center shadow-2xl overflow-hidden transform group-hover:scale-105 transition-all duration-500">
                  <Award className="w-16 h-16 text-blue-500 absolute -bottom-3 -right-3 opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
                  <ShieldCheck className="w-8 h-8 text-blue-400 mb-1" />
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-300 to-emerald-300 tracking-tighter">VRI</span>
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-white">
              Plataforma de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Certificación</span>
            </h1>
            <h2 className="text-xl text-slate-300 font-medium mb-2">Vicerrectorado de Investigación</h2>
            <h3 className="text-xs font-bold text-slate-500 tracking-[0.3em] uppercase">Universidad Nacional del Altiplano</h3>
          </header>

          <div className="flex flex-col items-center mb-10">
            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
              <button onClick={() => {setPestañaActiva("nuevos"); setTerminoBusqueda("");}} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${pestañaActiva === 'nuevos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>Nuevos eventos</button>
              <button onClick={() => {setPestañaActiva("todos"); setTerminoBusqueda("");}} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${pestañaActiva === 'todos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>Todos los eventos</button>
              <button onClick={() => setPestañaActiva("certificados")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${pestañaActiva === 'certificados' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'text-emerald-400/70 hover:text-emerald-400 hover:bg-slate-800'}`}><ShieldCheck className="w-4 h-4"/> Validar Certificado</button>
            </div>
          </div>

          {/* BUSCADOR DE CURSOS (Se oculta si estamos en la pestaña de certificados) */}
          {pestañaActiva !== "certificados" && (
            <div className="max-w-xl mx-auto mb-10 relative animate-in fade-in duration-500">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Busca por nombre del curso, diploma o tema..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl py-3 pl-12 pr-4 text-white font-medium focus:outline-none focus:border-blue-500 focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner backdrop-blur-md"
              />
              {terminoBusqueda && (
                <button onClick={() => setTerminoBusqueda("")} className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {pestañaActiva === "certificados" ? (
             <div className="max-w-2xl mx-auto bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-[2.5rem] p-12 text-center shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
               {/* Efecto de luz dentro de la tarjeta */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[80px] pointer-events-none"></div>
               
               <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-blue-400" />
               </div>
               <h4 className="text-3xl font-black text-white mb-4">Verificación Oficial</h4>
               <p className="text-slate-400 font-medium mb-10 max-w-md mx-auto text-sm leading-relaxed">
                 Ingresa el código único alfanumérico impreso en el certificado para validar su autenticidad e integridad criptográfica en nuestra base de datos.
               </p>

               {/* EL BUSCADOR CONECTADO AL SISTEMA */}
               <form onSubmit={handleVerificarCertificado} className="flex flex-col md:flex-row items-center gap-3 bg-slate-950/80 border border-slate-700 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-inner">
                 <div className="flex items-center flex-1 w-full">
                    <Search className="w-5 h-5 text-slate-500 ml-4 hidden md:block" />
                    <input
                      type="text"
                      placeholder="Ej: VRI-2026-XXXX"
                      value={codigoVerificacion}
                      onChange={(e) => setCodigoVerificacion(e.target.value.toUpperCase())}
                      className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white font-bold placeholder:text-slate-600 placeholder:font-normal uppercase text-center md:text-left w-full"
                    />
                 </div>
                 <button 
                   type="submit" 
                   disabled={codigoVerificacion.length < 5}
                   className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-blue-600/20"
                 >
                   Verificar <ArrowRight className="w-4 h-4" />
                 </button>
               </form>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {cargandoEventos ? (
                 <div className="col-span-2 py-20 flex flex-col items-center justify-center text-blue-400">
                   <Loader2 className="w-10 h-10 animate-spin mb-4" />
                   <p className="font-bold tracking-widest uppercase text-xs">Sincronizando con Servidor...</p>
                 </div>
               ) : eventosMostrados.length === 0 ? (
                 <div className="col-span-2 border border-slate-800 bg-slate-900/30 backdrop-blur-sm rounded-3xl p-20 flex flex-col items-center justify-center text-slate-500 animate-in fade-in">
                   <CalendarDays className="w-12 h-12 mb-4 opacity-20" />
                   <p className="text-lg font-bold text-center">No se encontraron eventos<br/><span className="text-sm font-normal text-slate-600">Intenta buscar con otras palabras</span></p>
                 </div>
               ) : (
                 eventosMostrados.map((ev, index) => (
                   <div key={ev.id} className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-3xl h-80 shadow-xl overflow-hidden flex flex-col hover:border-blue-500/50 hover:shadow-blue-900/20 transition-all cursor-pointer group animate-in fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                     <div className="h-40 bg-slate-950 flex items-center justify-center relative overflow-hidden group-hover:opacity-90 transition-opacity">
                       {ev.poster_url ? <img src={ev.poster_url} alt={ev.title} className="w-full h-full object-contain" /> : <div className="text-slate-700 font-medium text-sm flex items-center gap-2"><div className="w-2 h-2 bg-slate-700 rounded-full"></div> Sin Imagen Promocional</div>}
                       
                       {/* Badge de Modalidad */}
                       <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white shadow-lg">
                         {ev.is_virtual ? <Video className="w-3 h-3 text-blue-400"/> : <MapPin className="w-3 h-3 text-emerald-400"/>} {ev.is_virtual ? 'VIRTUAL' : 'PRESENCIAL'}
                       </div>
                     </div>
                     <div className="p-6 flex-1 flex flex-col">
                       <h3 className="font-bold text-lg leading-tight mb-2 text-white line-clamp-2 group-hover:text-blue-400 transition-colors">{ev.title}</h3>
                       <p className="text-sm text-slate-400 line-clamp-2">{ev.summary}</p>
                       <div className="mt-auto pt-4 flex justify-between items-center">
                         <button onClick={() => setEventoSeleccionado(ev)} className="text-xs font-bold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl hover:bg-blue-500/20 transition-colors">Ver Detalles</button>
                         <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{new Date(ev.start_date).toLocaleDateString()}</span>
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* LADO DERECHO: PANEL DE AUTENTICACIÓN (Se mantiene Blanco/Claro) */}
      {/* ========================================================= */}
      <div className="w-[450px] bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col justify-center p-10 relative z-20 shrink-0 border-l border-slate-200 overflow-y-auto">
        
        {usuarioActual ? (
          <div className="text-center space-y-6 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-blue-50 rounded-[2rem] mx-auto flex items-center justify-center border-2 border-blue-100 shadow-xl shadow-blue-100 rotate-3 transition-transform hover:rotate-0">
              <span className="text-4xl font-black text-blue-600">{usuarioActual.first_names.charAt(0)}</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> En Línea
              </div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{usuarioActual.first_names} {usuarioActual.last_names}</h2>
              <p className="text-slate-500 font-medium text-sm mt-1">{usuarioActual.role === 'student' ? 'Cuenta de Estudiante' : 'Administrador del Sistema'}</p>
            </div>
            
            <div className="space-y-3 mt-8">
              <button 
                onClick={() => window.location.href = usuarioActual.role === 'student' ? '/dashboard' : '/admin'}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
              >
                <LayoutDashboard className="w-5 h-5" /> Ir a mi Panel Principal
              </button>
              
              <button 
                onClick={handleCerrarSesion}
                className="w-full bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200 hover:border-red-200"
              >
                <LogOut className="w-5 h-5" /> Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          <>
            {vistaAuth !== "exito" && (
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl mx-auto flex items-center justify-center border border-slate-200 mb-6 shadow-inner rotate-3">
                  <User className="w-8 h-8 text-slate-800" />
                </div>
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl mb-8">
                  <button onClick={() => setVistaAuth("login")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${vistaAuth === "login" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Acceder</button>
                  <button onClick={() => setVistaAuth("registro")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${vistaAuth === "registro" ? "bg-slate-900 shadow-md text-white" : "text-slate-500 hover:text-slate-700"}`}>Registrarme</button>
                </div>
              </div>
            )}

            {vistaAuth === "login" && (
              <form onSubmit={handleLogin} className="space-y-5 animate-in slide-in-from-right-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Institucional / Personal</label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
                    <input type="email" value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="tu@correo.com" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
                    <input type="password" value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="••••••••" required />
                  </div>
                </div>
                {errorLogin && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl border border-red-100 text-center font-bold animate-in zoom-in">{errorLogin}</div>}
                <button type="submit" disabled={loadingLogin} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70">
                  {loadingLogin ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</> : "Ingresar al Portal"}
                </button>
              </form>
            )}

            {vistaAuth === "registro" && (
              <form onSubmit={handleRegistro} className="space-y-4 animate-in slide-in-from-left-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-2">Identificación Oficial</label>
                  <div className="flex gap-2">
                    <select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3.5 text-sm outline-none font-bold text-slate-700 cursor-pointer focus:border-blue-500 focus:bg-white transition-colors">
                      <option value="dni">🇵🇪 DNI</option>
                      <option value="ce">🌎 C.E.</option>
                    </select>
                    <div className="relative flex-1">
                      <input type="text" value={docReg} onChange={(e) => setDocReg(e.target.value)} maxLength={tipoDocumento === 'dni' ? 8 : 12} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 focus:outline-none focus:border-blue-500 focus:bg-white font-medium transition-colors" placeholder="Número..." required />
                    </div>
                    {tipoDocumento === "dni" && (
                      <button type="button" onClick={buscarDNI} disabled={buscandoDni || docReg.length < 8} className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        {buscandoDni ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reniec"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={nombresReg} onChange={(e) => setNombresReg(e.target.value)} disabled={tipoDocumento === "dni"} className={`w-full border rounded-2xl py-3.5 px-4 font-medium transition-colors outline-none ${tipoDocumento === "dni" ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white"}`} placeholder="Nombres" required />
                  <input type="text" value={apellidosReg} onChange={(e) => setApellidosReg(e.target.value)} disabled={tipoDocumento === "dni"} className={`w-full border rounded-2xl py-3.5 px-4 font-medium transition-colors outline-none ${tipoDocumento === "dni" ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white"}`} placeholder="Apellidos" required />
                </div>
                <div>
                  <div className="relative mt-2">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
                    <input type="email" value={emailReg} onChange={(e) => setEmailReg(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="Correo electrónico" required />
                  </div>
                </div>
                <div>
                  <div className="relative mt-2">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-300" />
                    <input type="password" value={passwordReg} onChange={(e) => setPasswordReg(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" placeholder="Crear contraseña" required />
                  </div>
                </div>
                {errorReg && <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-2xl border border-red-100 text-center">{errorReg}</div>}
                <button type="submit" disabled={registrando} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl mt-4 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70 flex items-center justify-center gap-2">
                  {registrando ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando cuenta...</> : "Crear Mi Cuenta"}
                </button>
              </form>
            )}

            {vistaAuth === "exito" && (
              <div className="text-center space-y-6 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] mx-auto flex items-center justify-center border-2 border-emerald-100 shadow-xl shadow-emerald-100 rotate-3"><CheckCircle2 className="w-10 h-10 text-emerald-500" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">¡Bienvenido!</h2>
                  <p className="text-slate-500 text-sm font-medium">Tu cuenta ha sido creada y verificada correctamente.</p>
                </div>
                <button onClick={() => setVistaAuth("login")} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl mt-4 transition-colors shadow-lg">Iniciar Sesión Ahora</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DEL EVENTO (Con vidrio esmerilado oscuro) */}
      {/* ========================================================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative h-72 bg-black shrink-0 flex items-center justify-center p-2 group">
              {eventoSeleccionado.poster_url ? <img src={eventoSeleccionado.poster_url} alt="Poster" className="w-full h-full object-contain" /> : <div className="text-slate-600 font-medium">Sin Imagen Oficial</div>}
              <button onClick={() => setEventoSeleccionado(null)} className="absolute top-6 right-6 bg-black/40 hover:bg-white hover:text-black text-white p-3 rounded-full backdrop-blur-md transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-10 overflow-y-auto custom-scrollbar">
              <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">{eventoSeleccionado.organizer_entity}</p>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-8 leading-tight">{eventoSeleccionado.title}</h2>
              
              <div className="flex flex-wrap gap-4 mb-8 bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400"><CalendarDays className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inicio</p><p className="text-base font-bold text-slate-200">{new Date(eventoSeleccionado.start_date).toLocaleDateString()}</p></div>
                </div>
                <div className="w-px h-12 bg-slate-800 hidden md:block mx-4"></div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400">{eventoSeleccionado.is_virtual ? <Video className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}</div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modalidad</p><p className="text-base font-bold text-slate-200">{eventoSeleccionado.is_virtual ? 'Aula Virtual' : 'Sede Presencial'}</p></div>
                </div>
              </div>
              
              <button 
                onClick={handleInscripcion} 
                disabled={inscribiendo}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
              >
                {inscribiendo ? <><Loader2 className="w-6 h-6 animate-spin" /> Procesando inscripción...</> : "Inscribirme a este evento"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}