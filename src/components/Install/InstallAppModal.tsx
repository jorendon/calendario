import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Laptop,
  Apple,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [platform, setPlatform] = useState<'mac' | 'windows' | 'other'>('mac');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setPlatform('mac');
    } else if (userAgent.includes('win')) {
      setPlatform('windows');
    } else {
      setPlatform('other');
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstalled();
        onClose();
      }
    } catch (err) {
      console.error('Error invoking install prompt:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
                <span>Instalar Calendario en tu Equipo</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  App Nativa
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Úsala como aplicación independiente con ventana propia y acceso directo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-slate-300 text-xs sm:text-sm">
          {/* Direct 1-Click Install Button if supported */}
          {deferredPrompt && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/70 to-purple-950/70 border border-indigo-500/40 rounded-2xl text-center space-y-3">
              <div className="flex items-center justify-center space-x-2 text-indigo-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Instalación automática disponible</span>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Instalando...' : 'Instalar en 1 Clic'}</span>
              </button>
            </div>
          )}

          {/* Platform tabs / instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Guía rápida según tu navegador o sistema:
            </h4>

            {/* Mac Instructions */}
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white text-xs">
                <Apple className="w-4 h-4 text-slate-300" />
                <span>En macOS (MacBook / iMac)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong className="text-white">Safari:</strong> En la barra superior de Mac, haz clic en{' '}
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-100 font-mono text-[11px]">
                    Archivo &gt; Agregar al Dock
                  </span>
                  . Tendrá su propio ícono en el Dock y en Launchpad.
                </li>
                <li>
                  <strong className="text-white">Chrome / Brave / Edge:</strong> Haz clic en el ícono de instalar{' '}
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-100 font-mono text-[11px]">
                    ⊕ Instalar
                  </span>{' '}
                  en el extremo derecho de la barra de direcciones.
                </li>
              </ul>
            </div>

            {/* Windows Instructions */}
            <div className="p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 font-bold text-white text-xs">
                <Laptop className="w-4 h-4 text-blue-400" />
                <span>En Windows (PC / Laptop)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong className="text-white">Google Chrome:</strong> Clic en el icono de descarga/pantalla en la barra de URL o Menú (3 puntos) &gt;{' '}
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-100 font-mono text-[11px]">
                    Guardar y compartir &gt; Instalar Calendario
                  </span>
                  .
                </li>
                <li>
                  <strong className="text-white">Microsoft Edge:</strong> Clic en el icono de app en la barra de direcciones o Menú &gt;{' '}
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-100 font-mono text-[11px]">
                    Aplicaciones &gt; Instalar este sitio como aplicación
                  </span>
                  .
                </li>
              </ul>
            </div>
          </div>

          {/* Benefits */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-emerald-200">Ventajas de instalarla:</p>
              <p className="text-[11px] text-emerald-300/80">
                Se abre en una ventana limpia sin pestañas de navegador, con acceso directo desde tu escritorio y soporte sin conexión (offline).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-850 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
