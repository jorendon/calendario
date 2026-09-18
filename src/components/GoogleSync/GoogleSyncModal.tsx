import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (customTasks?: any[]) => void;
  activeUserEmail: string;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onImport,
  activeUserEmail
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSync = async () => {
    setLoading(true);
    try {
      await onImport();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Sincronizar Google Tasks</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs sm:text-sm">
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 mx-auto flex items-center justify-center text-blue-400 mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">
              Importar Tareas de Google
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Trae tus tareas existentes de Google Tasks a este calendario compartido para que ambos puedan verlas y marcarlas como realizadas.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Cuenta de Google:</span>
              <span className="font-semibold text-indigo-300">{activeUserEmail}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Destino:</span>
              <span className="font-semibold text-white">Hogar & Finanzas Compartidas</span>
            </div>
          </div>

          {success && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>¡Tareas de Google Tasks importadas exitosamente!</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Importando...' : 'Importar a mi Calendario'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
