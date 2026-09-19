import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Server,
  Key,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EmailDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUserEmail: string;
}

export const EmailDiagnosticsModal: React.FC<EmailDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  activeUserEmail
}) => {
  const [config, setConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [testEmail, setTestEmail] = useState(activeUserEmail || 'Jonathan.rendon@gmail.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'gmail' | 'resend'>('gmail');

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
      setTestEmail(activeUserEmail || 'Jonathan.rendon@gmail.com');
      setTestResult(null);
    }
  }, [isOpen, activeUserEmail]);

  const fetchDiagnostics = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/email/diagnostics');
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setConfig(data.config);
        } catch {
          // not json
        }
      }
    } catch (err) {
      console.error('Error fetching email diagnostics:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: testEmail })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          success: false,
          message: 'El servidor de Vercel devolvió un error de ejecución.',
          error: text.length > 200 ? text.substring(0, 200) + '...' : text,
          troubleshooting: 'Verifica en Vercel Logs para ver el detalle de la función serverless.'
        };
      }
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Error de red o conexión al intentar enviar el correo de prueba.',
        error: err.message
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen) return null;

  const isConfigured = config?.isConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Estado del Servicio de Correos</h3>
              <p className="text-xs text-slate-400">Diagnóstico de notificaciones automáticas</p>
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
              isConfigured
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-bold text-sm text-white">
                {isConfigured
                  ? `Proveedor activo: ${config?.provider?.toUpperCase()} (${
                      config?.provider === 'smtp' ? 'Gmail / SMTP' : 'Resend'
                    })`
                  : '⚠️ No hay servicio de correo configurado en Vercel'}
              </h4>
              <p className="text-xs mt-1 text-slate-300">
                {isConfigured
                  ? config?.provider === 'smtp'
                    ? `Enviando desde: ${config.smtp.user || 'Cuenta Gmail'}`
                    : `Remitente configurado: ${config.resend.from}`
                  : 'Para que los correos lleguen a Jonathan y Michelle, debes ingresar las variables de entorno en tu panel de Vercel.'}
              </p>
              {config?.detectedEnvKeys && config.detectedEnvKeys.length > 0 ? (
                <p className="text-[11px] text-indigo-300 mt-1">
                  Variables de correo encontradas en el servidor:{' '}
                  <strong>{config.detectedEnvKeys.join(', ')}</strong>
                </p>
              ) : !isConfigured ? (
                <p className="text-[11px] text-amber-300/90 mt-1">
                  No se detectó ninguna variable de correo en el servidor. Asegúrate de marcarlas para el entorno <strong>Production</strong> en Vercel.
                </p>
              ) : null}
            </div>
          </div>

          {/* Test Email Form */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <h5 className="font-bold text-white text-xs flex items-center space-x-2">
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>Probar Envío de Correo en Vivo</span>
            </h5>
            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Ingresa tu correo para probar"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={sendingTest || !testEmail}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
                <span>{sendingTest ? 'Enviando...' : 'Enviar Prueba'}</span>
              </button>
            </form>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-150 ${
                  testResult.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.error && (
                  <p className="font-mono text-[11px] bg-black/40 p-2 rounded text-rose-300">
                    {testResult.error}
                  </p>
                )}
                {testResult.troubleshooting && (
                  <p className="text-[11px] text-slate-300 mt-1">
                    💡 <strong>Solución:</strong> {testResult.troubleshooting}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Setup Guide Accordion */}
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs flex items-center space-x-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>¿Cómo configurar los correos para que lleguen a Jonathan y Michelle?</span>
            </h5>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                type="button"
                onClick={() => setActiveGuideTab('gmail')}
                className={`pb-2 px-3 text-xs font-semibold transition-colors border-b-2 ${
                  activeGuideTab === 'gmail'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Opción A: Gmail SMTP (⭐ Recomendada, 100% Gratis y sin comprar dominio)
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('resend')}
                className={`pb-2 px-3 text-xs font-semibold transition-colors border-b-2 ${
                  activeGuideTab === 'resend'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Opción B: Resend
              </button>
            </div>

            {activeGuideTab === 'gmail' && (
              <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-300">
                <p className="font-semibold text-white">
                  Con Gmail puedes enviar correos a cualquier persona sin costo ni necesidad de comprar un dominio:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>
                    Entra a tu cuenta de Google en:{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>myaccount.google.com/apppasswords</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>
                    Escribe "Calendario" como nombre de la app y genera una <strong>contraseña de aplicación de 16 letras</strong>.
                  </li>
                  <li>
                    Ve a tu panel de Vercel:{' '}
                    <strong>Settings → Environment Variables</strong> y agrega estas dos variables:
                    <div className="bg-slate-950 p-2 rounded font-mono text-[11px] text-indigo-300 mt-1 space-y-1">
                      <div>SMTP_USER = tu_correo@gmail.com</div>
                      <div>SMTP_PASS = las_16_letras_generadas</div>
                    </div>
                  </li>
                  <li>
                    Haz clic en <strong>Redeploy</strong> en Vercel para aplicar los cambios. ¡Listo!
                  </li>
                </ol>
              </div>
            )}

            {activeGuideTab === 'resend' && (
              <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-300">
                <p className="font-semibold text-white">Si prefieres utilizar Resend:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                  <li>Crea una API Key en <strong>resend.com/api-keys</strong>.</li>
                  <li>
                    Agrégala en Vercel: <code className="text-indigo-300">RESEND_API_KEY</code> = <code className="text-slate-400">re_...</code>
                  </li>
                  <li>
                    <strong className="text-amber-300">Nota crítica sobre Resend:</strong> Si usas el remitente por defecto (<code className="text-slate-400">onboarding@resend.dev</code>), Resend <strong>bloquea</strong> los correos a cualquier dirección que no sea la tuya registrada. Para enviar a Michelle y Jonathan a la vez, debes verificar un dominio propio en <strong>resend.com/domains</strong> y configurar <code className="text-indigo-300">EMAIL_FROM</code>.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-850 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
