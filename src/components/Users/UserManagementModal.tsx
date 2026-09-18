import React, { useState } from 'react';
import { User } from '../../types';
import { X, UserPlus, Shield, User as UserIcon, Check, Key } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAddUser: (name: string, email: string, password?: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddUser
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Calendario2006*');
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onAddUser(name.trim(), email.trim(), password.trim());
    setName('');
    setEmail('');
    setPassword('Calendario2006*');
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Administrar Usuarios</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Active users list */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Usuarios con acceso ({users.length})
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
              {users.map(u => (
                <div
                  key={u.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate text-xs">{u.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {u.role === 'admin' ? 'Admin' : 'Miembro'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add new user form */}
          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Agregar / Invitar nuevo usuario
            </h4>

            {addedSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Usuario agregado! Ahora puede ingresar con su correo y contraseña.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nombre completo:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Gómez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Correo electrónico:</label>
                <input
                  type="email"
                  required
                  placeholder="nuevo.usuario@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center space-x-1">
                  <Key className="w-3 h-3 text-indigo-400" />
                  <span>Contraseña de acceso para este usuario:</span>
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                💡 Los usuarios agregados podrán iniciar sesión para ver, marcar como hechas, crear y eliminar tareas en los calendarios compartidos.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow transition-all"
                >
                  Agregar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
