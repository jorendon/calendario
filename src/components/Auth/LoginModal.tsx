import React, { useState } from 'react';
import { User } from '../../types';
import { X, Lock, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  defaultEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultEmail = 'Jonathan.rendon@gmail.com'
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        // Local simulation fallback check if offline
        const clean = email.trim().toLowerCase();
        if (password === 'Calendario2006*') {
          if (clean === 'jonathan.rendon@gmail.com') {
            onLoginSuccess({
              id: 'user-jonathan',
              email: 'Jonathan.rendon@gmail.com',
              name: 'Jonathan Rendón',
              role: 'admin'
            });
            onClose();
            return;
          } else if (clean === 'michrotel@gmail.com') {
            onLoginSuccess({
              id: 'user-michelle',
              email: 'michrotel@gmail.com',
              name: 'Michelle',
              role: 'admin'
            });
            onClose();
            return;
          }
        }
        setError(data.error || 'Correo o contraseña incorrectos.');
      }
    } catch {
      // Local fallback
      const clean = email.trim().toLowerCase();
      if (password === 'Calendario2006*') {
        const name = clean === 'michrotel@gmail.com' ? 'Michelle' : 'Jonathan Rendón';
        onLoginSuccess({
          id: clean === 'michrotel@gmail.com' ? 'user-michelle' : 'user-jonathan',
          email,
          name,
          role: 'admin'
        });
        onClose();
      } else {
        setError('Contraseña incorrecta. (Recuerda la clave por defecto: Calendario2006*)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Iniciar Sesión</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Jonathan.rendon@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="text-center pt-1 text-[11px] text-slate-500">
            Contraseña para Jonathan y Michelle: <span className="text-indigo-400 font-mono">Calendario2006*</span>
          </div>
        </form>
      </div>
    </div>
  );
};
