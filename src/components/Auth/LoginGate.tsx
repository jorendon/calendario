import React, { useState } from 'react';
import { User } from '../../types';
import { Calendar as CalendarIcon, Lock, Mail, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface LoginGateProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ users, onLoginSuccess }) => {
  const [selectedUser, setSelectedUser] = useState<'jonathan' | 'michelle' | 'custom'>('jonathan');
  const [customEmail, setCustomEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getEmail = () => {
    if (selectedUser === 'jonathan') return 'Jonathan.rendon@gmail.com';
    if (selectedUser === 'michelle') return 'michrotel@gmail.com';
    return customEmail.trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = getEmail();

    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLoginSuccess(data.user);
        return;
      }

      // Offline / Local fallback check
      const clean = email.toLowerCase();
      if (password === 'Calendario2006*') {
        const found = users.find(u => u.email.toLowerCase() === clean);
        if (found) {
          onLoginSuccess(found);
          return;
        } else if (clean === 'jonathan.rendon@gmail.com') {
          onLoginSuccess({
            id: 'user-jonathan',
            email: 'Jonathan.rendon@gmail.com',
            name: 'Jonathan Rendón',
            role: 'admin'
          });
          return;
        } else if (clean === 'michrotel@gmail.com') {
          onLoginSuccess({
            id: 'user-michelle',
            email: 'michrotel@gmail.com',
            name: 'Michelle',
            role: 'admin'
          });
          return;
        }
      }

      setError(data.error || 'Correo o contraseña incorrectos.');
    } catch {
      // Local fallback
      const clean = email.toLowerCase();
      if (password === 'Calendario2006*') {
        const found = users.find(u => u.email.toLowerCase() === clean) || {
          id: clean === 'michrotel@gmail.com' ? 'user-michelle' : 'user-jonathan',
          email,
          name: clean === 'michrotel@gmail.com' ? 'Michelle' : 'Jonathan Rendón',
          role: 'admin' as const
        };
        onLoginSuccess(found);
      } else {
        setError('Contraseña incorrecta. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Calendario Compartido
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa tus credenciales para acceder a tus tareas y pagos
              </p>
            </div>
          </div>

          {/* Quick Profile Selectors */}
          <div className="space-y-3 mb-5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Selecciona tu usuario:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser('jonathan');
                  setError(null);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center space-x-2.5 ${
                  selectedUser === 'jonathan'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  J
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">Jonathan</p>
                  <p className="text-[10px] text-slate-400 truncate">Rendón</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser('michelle');
                  setError(null);
                }}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center space-x-2.5 ${
                  selectedUser === 'michelle'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  M
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">Michelle</p>
                  <p className="text-[10px] text-slate-400 truncate">Admin</p>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedUser('custom');
                setError(null);
              }}
              className={`w-full py-1.5 text-xs text-center rounded-xl transition-colors ${
                selectedUser === 'custom'
                  ? 'text-indigo-300 font-semibold underline'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              O ingresar con otro correo invitado...
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* If custom email selected */}
            {selectedUser === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xl shadow-indigo-600/30 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Ingresando al calendario...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Acceso privado protegido • Michelle & Jonathan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
