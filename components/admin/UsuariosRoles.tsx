"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, Shield, User, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function UsuariosRoles() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [actualizando, setActualizando] = useState<string | null>(null);

  // Traer todos los usuarios de la base de datos
  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setCargando(true);
    // Traemos los perfiles ordenados por fecha de creación (los más nuevos primero)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setUsuarios(data);
    if (error) console.error("Error cargando usuarios:", error);
    setCargando(false);
  };

  // Función para cambiar el rol en la base de datos
  // Función para cambiar el rol en la base de datos con expiración
  const handleCambiarRol = async (userId: string, nuevoRol: string) => {
    let fechaExpiracion = null;

    // Si lo estamos haciendo Ponente (admin temporal), le preguntamos los días
    if (nuevoRol === 'admin') {
      const diasStr = window.prompt("⏱️ ¿Por cuántos DÍAS tendrá acceso este ponente al sistema? (Ej: 15, 30, 60)\nSi lo dejas en blanco, será para siempre.");
      
      if (diasStr !== null && diasStr.trim() !== "") {
        const dias = parseInt(diasStr);
        if (isNaN(dias)) {
          alert("❌ Debes ingresar un número válido de días.");
          return;
        }
        // Calculamos la fecha exacta de expiración sumando los días a hoy
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + dias);
        fechaExpiracion = fechaLimite.toISOString();
      }
    }

    const confirmar = window.confirm(`¿Estás seguro de cambiar el rol a ${nuevoRol.toUpperCase()}?`);
    if (!confirmar) return;

    setActualizando(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ role: nuevoRol, role_expires_at: fechaExpiracion })
      .eq('id', userId);

    if (error) {
      alert("❌ Error al actualizar el rol: " + error.message);
    } else {
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, role: nuevoRol, role_expires_at: fechaExpiracion } : u));
      if (fechaExpiracion) {
        alert(`✅ Rol asignado temporalmente. Expirará automáticamente el: ${new Date(fechaExpiracion).toLocaleDateString()}`);
      } else {
        alert("✅ Rol asignado de forma permanente.");
      }
    }
    setActualizando(null);
  };

  // Filtrado de usuarios por DNI, Nombres o Apellidos
  const usuariosFiltrados = usuarios.filter(u => 
    (u.document_number && u.document_number.includes(terminoBusqueda)) ||
    (u.first_names && u.first_names.toLowerCase().includes(terminoBusqueda.toLowerCase())) ||
    (u.last_names && u.last_names.toLowerCase().includes(terminoBusqueda.toLowerCase()))
  );

  return (
    <div className="animate-in fade-in max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3"><Users className="w-8 h-8 text-indigo-500" /> Control de Accesos</h2>
          <p className="text-slate-400 text-sm mt-1">Otorga permisos de Administrador a ponentes o docentes.</p>
        </div>
        
        {/* BUSCADOR */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por DNI o Apellidos..."
            value={terminoBusqueda}
            onChange={(e) => setTerminoBusqueda(e.target.value)}
            className="w-full bg-[#1e293b] border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-[#1e293b] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0f172a] text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-700">
              <tr>
                <th className="px-6 py-5">Usuario</th>
                <th className="px-6 py-5">Documento</th>
                <th className="px-6 py-5">Correo / Contacto</th>
                <th className="px-6 py-5">Nivel de Acceso</th>
                <th className="px-6 py-5 text-right">Acción de Seguridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {cargando ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 mb-4" />
                    <p className="font-bold text-slate-500 uppercase tracking-widest text-xs">Cargando base de datos...</p>
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-bold">No se encontraron usuarios</p>
                    <p className="text-xs mt-1">Intenta buscar con otro DNI o nombre.</p>
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          usuario.role === 'superadmin' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                          usuario.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {usuario.first_names ? usuario.first_names.charAt(0).toUpperCase() : <User className="w-5 h-5"/>}
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase">{usuario.last_names}, {usuario.first_names}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {usuario.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      {usuario.document_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4">
                      {usuario.role === 'superadmin' && (
                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border border-amber-500/20">
                          <ShieldAlert className="w-3 h-3" /> Root VRI
                        </span>
                      )}
                      {usuario.role === 'admin' && (
                        <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border border-indigo-500/20">
                          <Shield className="w-3 h-3" /> Ponente / Org
                        </span>
                      )}
                      {usuario.role === 'student' && (
                        <span className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-400 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider border border-slate-700">
                          <User className="w-3 h-3" /> Estudiante
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {actualizando === usuario.id ? (
                        <div className="flex justify-end pr-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                      ) : (
                        <select 
                          value={usuario.role}
                          onChange={(e) => handleCambiarRol(usuario.id, e.target.value)}
                          className={`bg-slate-900 border text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer transition-colors ${
                            usuario.role === 'superadmin' ? 'border-amber-500/30 text-amber-500 focus:border-amber-500' :
                            usuario.role === 'admin' ? 'border-indigo-500/30 text-indigo-400 focus:border-indigo-500' :
                            'border-slate-700 text-slate-300 focus:border-slate-500'
                          }`}
                        >
                          <option value="student">Estudiante (Básico)</option>
                          <option value="admin">Ponente (Crear Eventos)</option>
                          <option value="superadmin">VRI Root (Acceso Total)</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}