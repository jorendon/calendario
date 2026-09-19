import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  Layers,
  Repeat
} from 'lucide-react';
import { Calendar as CalendarType } from '../../types';

interface JsonImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendars: CalendarType[];
  selectedCalendarId: string;
  onImportSuccess: () => void;
  activeUserEmail: string;
}

interface ParsedTaskPreview {
  title: string;
  due_date: string;
  amount?: number;
  category: string;
  recurrence?: string;
  description?: string;
}

const SAMPLE_JSON = `[
  {
    "title": "Pagar la luz (Enel)",
    "description": "Factura de energía del hogar",
    "due_date": "2026-09-25",
    "due_time": "10:00",
    "amount": 65.00,
    "category": "bills",
    "recurrence": "MONTHLY",
    "recurrence_day": 25
  },
  {
    "title": "Comprar despensa y mercado",
    "description": "Supermercado quincenal",
    "due_date": "2026-09-20",
    "due_time": "14:00",
    "amount": 120.00,
    "category": "groceries",
    "recurrence": "NONE"
  },
  {
    "title": "Pagar arriendo / alquiler",
    "description": "Transferencia compartida",
    "due_date": "2026-10-01",
    "due_time": "09:00",
    "amount": 800.00,
    "category": "bills",
    "recurrence": "MONTHLY",
    "recurrence_day": 1
  }
]`;

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  isOpen,
  onClose,
  calendars,
  selectedCalendarId,
  onImportSuccess,
  activeUserEmail
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [jsonText, setJsonText] = useState('');
  const [targetCalendar, setTargetCalendar] = useState(
    selectedCalendarId !== 'all' ? selectedCalendarId : calendars[0]?.id || 'cal-shared-home'
  );
  const [parsedTasks, setParsedTasks] = useState<ParsedTaskPreview[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copiedSample, setCopiedSample] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseAndValidate = (rawText: string) => {
    setErrorMsg(null);
    setParsedTasks([]);

    if (!rawText.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(rawText);
      let items: any[] = [];

      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items)) {
          // Google Takeout / Tasks format
          items = parsed.items;
        } else if (Array.isArray(parsed.tasks)) {
          items = parsed.tasks;
        } else if (Array.isArray(parsed.data)) {
          items = parsed.data;
        } else {
          // Single task object
          items = [parsed];
        }
      }

      if (items.length === 0) {
        setErrorMsg('El JSON no contiene una lista de tareas.');
        return;
      }

      const previews: ParsedTaskPreview[] = items
        .filter(it => it && typeof it === 'object')
        .map(it => {
          const title = String(it.title || it.titulo || it.name || it.nombre || it.task || 'Sin título').trim();
          let rawDate = it.due_date || it.dueDate || it.due || it.fecha || it.date || it.fecha_vencimiento;
          let dueDate = new Date().toISOString().split('T')[0];
          if (rawDate) {
            dueDate = String(rawDate).split('T')[0];
          }

          let amount: number | undefined = undefined;
          const rawAmount = it.amount ?? it.monto ?? it.valor;
          if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
            const parsedAmt = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ''));
            if (!isNaN(parsedAmt)) amount = parsedAmt;
          }

          const category = String(it.category || it.categoria || 'other');
          const recurrence = String(it.recurrence || it.recurrencia || it.repeticion || 'NONE').toUpperCase();

          return {
            title,
            due_date: dueDate,
            amount,
            category,
            recurrence: recurrence !== 'NONE' ? recurrence : undefined,
            description: it.description || it.descripcion || it.notes || it.notas || undefined
          };
        })
        .filter(t => t.title && t.title !== 'Sin título');

      if (previews.length === 0) {
        setErrorMsg('No se encontraron tareas con título válido en el JSON.');
        return;
      }

      setParsedTasks(previews);
    } catch (err: any) {
      setErrorMsg(`Error de sintaxis JSON: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setJsonText(content);
      parseAndValidate(content);
    };
    reader.onerror = () => {
      setErrorMsg('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    parseAndValidate(val);
  };

  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_JSON);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleUseSample = () => {
    setJsonText(SAMPLE_JSON);
    setActiveTab('paste');
    parseAndValidate(SAMPLE_JSON);
  };

  const handleImport = async () => {
    if (parsedTasks.length === 0) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Re-parse the text to pass all original or normalized task fields
      const parsed = JSON.parse(jsonText);
      let items: any[] = [];
      if (Array.isArray(parsed)) items = parsed;
      else if (parsed.items) items = parsed.items;
      else if (parsed.tasks) items = parsed.tasks;
      else items = [parsed];

      const res = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendar_id: targetCalendar,
          user_email: activeUserEmail,
          tasks: items
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('El servidor devolvió una respuesta no válida: ' + text.substring(0, 100));
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al importar las tareas');
      }

      setSuccessCount(data.count || parsedTasks.length);
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la importación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Importador de Tareas (JSON)</h3>
              <p className="text-xs text-slate-400">Carga tareas masivas o sincroniza listas generadas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {/* Success message */}
          {successCount !== null && (
            <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center space-x-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">¡Importación exitosa!</p>
                <p className="text-xs text-emerald-300/80">
                  Se importaron {successCount} tarea(s) correctamente al calendario.
                </p>
              </div>
            </div>
          )}

          {/* Calendar Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calendario destino</span>
            </label>
            <select
              value={targetCalendar}
              onChange={e => setTargetCalendar(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500"
            >
              {calendars.map(cal => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`pb-2 px-3 text-xs font-semibold transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === 'file'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Archivo .json</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-2 px-3 text-xs font-semibold transition-colors border-b-2 flex items-center space-x-2 ${
                activeTab === 'paste'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Pegar Texto JSON</span>
            </button>
          </div>

          {/* Tab: Upload File */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition-all"
              >
                <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200 text-xs sm:text-sm">
                  {fileName ? fileName : 'Haz clic aquí o arrastra un archivo .json'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Formatos compatibles: Export de Google Tasks / Takeout o lista de objetos JSON
                </p>
              </div>
            </div>
          )}

          {/* Tab: Paste JSON */}
          {activeTab === 'paste' && (
            <div>
              <textarea
                value={jsonText}
                onChange={handlePasteChange}
                placeholder="Pega aquí tu JSON con las tareas..."
                rows={6}
                className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Example Drawer / Toggle */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300">
                ¿Necesitas ver un ejemplo de estructura JSON?
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleUseSample}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Usar ejemplo
                </button>
                <button
                  type="button"
                  onClick={() => setShowSample(!showSample)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  {showSample ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {showSample && (
              <div className="mt-2.5 pt-2 border-t border-slate-700/60 relative">
                <button
                  onClick={handleCopySample}
                  className="absolute top-3 right-2 flex items-center space-x-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-slate-200"
                >
                  {copiedSample ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSample ? 'Copiado' : 'Copiar'}</span>
                </button>
                <pre className="text-[10px] text-slate-300 bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-36">
                  {SAMPLE_JSON}
                </pre>
              </div>
            )}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tasks Preview */}
          {parsedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{parsedTasks.length} tareas detectadas listas para importar:</span>
                </span>
              </div>
              <div className="border border-slate-700/80 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-950">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2">Título</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Monto</th>
                      <th className="p-2">Cat.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {parsedTasks.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-900/60">
                        <td className="p-2 font-medium text-white truncate max-w-[180px]">
                          <div className="flex items-center space-x-1">
                            {t.recurrence && (
                              <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{t.title}</span>
                          </div>
                        </td>
                        <td className="p-2 text-slate-400 whitespace-nowrap">{t.due_date}</td>
                        <td className="p-2 text-emerald-400 font-semibold whitespace-nowrap">
                          {t.amount ? `$${t.amount}` : '-'}
                        </td>
                        <td className="p-2 capitalize text-slate-400">{t.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-850 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedTasks.length === 0 || isLoading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Upload className={`w-3.5 h-3.5 ${isLoading ? 'animate-bounce' : ''}`} />
            <span>{isLoading ? 'Importando...' : `Importar ${parsedTasks.length} Tareas`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
