import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      alert('Para instalar en iPhone/iPad:\n1. Toca el botón "Compartir" en Safari (el icono de cuadrado con flecha).\n2. Selecciona "Añadir a la pantalla de inicio".');
    } else {
      alert('Para instalar la aplicación, abre el menú de tu navegador y selecciona "Instalar aplicación" o "Añadir a pantalla de inicio".');
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-900/90 via-indigo-950/90 to-purple-900/90 border-b border-indigo-500/30 px-4 py-2.5 text-xs sm:text-sm text-indigo-100 flex items-center justify-between shadow-lg relative z-40">
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <span className="p-1.5 rounded-lg bg-indigo-600/40 text-indigo-300 flex-shrink-0">
          <Smartphone className="w-4 h-4" />
        </span>
        <span className="truncate">
          <strong>¡Instala la App en tu celular!</strong> Accede más rápido y recibe recordatorios.
        </span>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
        <button
          onClick={handleInstallClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1 rounded-md text-xs transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
