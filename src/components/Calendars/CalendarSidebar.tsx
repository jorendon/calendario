import React, { useState } from 'react';
import { Calendar as CalendarType, CalendarSummary } from '../../types';
import { Plus, Calendar, AlertCircle, Clock, CheckCircle, DollarSign, Layers, Trash2, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/dateUtils';

interface CalendarSidebarProps {
  calendars: CalendarType[];
  selectedCalendarId: string;
  onSelectCalendar: (id: string) => void;
  summary: CalendarSummary;
  onCreateCalendar: (name: string, color: string, description?: string) => void;
  onDeleteCalendar?: (id: string) => void;
  onOpenOverdueModal?: () => void;
  onOpenDueTodayModal?: () => void;
  onOpenMonthPendingModal?: () => void;
}

const PRESET_COLORS = [
  '#4f46e5', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ef4444'  // Rose
];

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  calendars,
  selectedCalendarId,
  onSelectCalendar,
  summary,
  onCreateCalendar,
  onDeleteCalendar,
  onOpenOverdueModal,
  onOpenDueTodayModal,
  onOpenMonthPendingModal
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState(PRESET_COLORS[0]);
  const [newCalDesc, setNewCalDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalName.trim()) return;
    onCreateCalendar(newCalName.trim(), newCalColor, newCalDesc.trim());
    setNewCalName('');
    setNewCalDesc('');
    setIsCreating(false);
  };

  return (
    <aside className="w-full lg:w-64 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col space-y-6">
      {/* Quick Summary Card */}
      <div className="bg-gradient-to-br from-indigo-950/80 to-slate-900/90 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Resumen de Tareas</span>
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
        </h3>

        <div className="space-y-2 text-xs">
          {/* Vencen hoy clickable row */}
          <div
            onClick={onOpenDueTodayModal}
            className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-xl transition-all cursor-pointer group select-none ${
              summary.dueTodayTasks > 0
                ? 'hover:bg-amber-950/40 text-slate-200'
                : 'hover:bg-slate-800/60 text-slate-400'
            }`}
            title="Ver tareas que vencen hoy"
          >
            <span className="flex items-center space-x-1.5 group-hover:text-amber-300 transition-colors">
              <Clock className={`w-3.5 h-3.5 ${summary.dueTodayTasks > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={`font-medium ${summary.dueTodayTasks > 0 ? 'text-amber-200 underline decoration-amber-500/40 underline-offset-2' : ''}`}>
                Vencen hoy:
              </span>
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full border transition-all flex items-center space-x-1 ${
                summary.dueTodayTasks > 0
                  ? 'text-amber-300 bg-amber-500/20 border-amber-500/30 group-hover:bg-amber-500/30 group-hover:border-amber-500/50'
                  : 'text-slate-400 bg-slate-800/50 border-slate-700/50'
              }`}
            >
              <span>{summary.dueTodayTasks}</span>
              <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </span>
          </div>

          {/* Atrasadas clickable row */}
          <div
            onClick={onOpenOverdueModal}
            className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-xl transition-all cursor-pointer group select-none ${
              summary.overdueTasks > 0
                ? 'hover:bg-rose-950/40 text-slate-200'
                : 'hover:bg-slate-800/60 text-slate-400'
            }`}
            title="Ver tareas atrasadas"
          >
            <span className="flex items-center space-x-1.5 group-hover:text-rose-300 transition-colors">
              <AlertCircle className={`w-3.5 h-3.5 ${summary.overdueTasks > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
              <span className={`font-medium ${summary.overdueTasks > 0 ? 'text-rose-200 underline decoration-rose-500/40 underline-offset-2' : ''}`}>
                Atrasadas:
              </span>
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full border transition-all flex items-center space-x-1 ${
                summary.overdueTasks > 0
                  ? 'text-rose-300 bg-rose-500/20 border-rose-500/30 group-hover:bg-rose-500/30 group-hover:border-rose-500/50'
                  : 'text-slate-400 bg-slate-800/50 border-slate-700/50'
              }`}
            >
              <span>{summary.overdueTasks}</span>
              <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completadas:</span>
            </span>
            <span className="font-semibold text-emerald-400">
              {summary.completedTasks} / {summary.totalTasks}
            </span>
          </div>
        </div>

        {/* Presupuesto del Mes */}
        <div className="pt-3 mt-3 border-t border-indigo-500/20 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Presupuesto {summary.monthName ? `(${summary.monthName.split(' ')[0]})` : ''}</span>
            </span>
            <span className="font-extrabold text-white">
              {formatCurrency(summary.monthTotalBudget || 0)}
            </span>
          </div>

          {/* Progress bar */}
          {(summary.monthTotalBudget || 0) > 0 && (
            <div className="space-y-1">
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((summary.monthPaidAmount || 0) / summary.monthTotalBudget) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{Math.round(((summary.monthPaidAmount || 0) / summary.monthTotalBudget) * 100)}% pagado</span>
                <span>Restante: {formatCurrency(summary.monthPendingAmount || 0)}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Total Pagado:</span>
              </span>
              <span className="font-extrabold text-emerald-400">
                {formatCurrency(summary.monthPaidAmount || 0)}
              </span>
            </div>

            <div
              onClick={onOpenMonthPendingModal}
              className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-xl transition-all cursor-pointer group select-none ${
                (summary.monthPendingTasks || 0) > 0 || (summary.monthPendingAmount || 0) > 0
                  ? 'hover:bg-amber-950/40 text-slate-200'
                  : 'hover:bg-slate-800/60 text-slate-400'
              }`}
              title="Ver tareas pendientes del mes"
            >
              <span className="flex items-center space-x-1.5 text-amber-400 group-hover:text-amber-300 transition-colors">
                <Clock className="w-3.5 h-3.5" />
                <span className={`font-medium ${(summary.monthPendingTasks || 0) > 0 ? 'underline decoration-amber-500/40 underline-offset-2' : ''}`}>
                  Por Pagar:
                </span>
                {(summary.monthPendingTasks || 0) > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {summary.monthPendingTasks}
                  </span>
                )}
              </span>
              <span className="flex items-center space-x-1">
                <span className="font-extrabold text-amber-400">
                  {formatCurrency(summary.monthPendingAmount || 0)}
                </span>
                <ChevronRight className="w-3 h-3 text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendars List */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Mis Calendarios
          </h4>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors"
            title="Crear nuevo calendario"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => onSelectCalendar('all')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center space-x-2.5 transition-all ${
              selectedCalendarId === 'all'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Todos los calendarios</span>
          </button>

          {calendars.map(cal => (
            <div
              key={cal.id}
              onClick={() => onSelectCalendar(cal.id)}
              className={`group/cal w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                selectedCalendarId === cal.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cal.color }}
                />
                <span className="truncate">{cal.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {cal.isDefault ? (
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                    Principal
                  </span>
                ) : (
                  onDeleteCalendar && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Deseas eliminar el calendario "${cal.name}"? Sus tareas pasarán al calendario principal.`)) {
                          onDeleteCalendar(cal.id);
                        }
                      }}
                      className="opacity-0 group-hover/cal:opacity-100 p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-all"
                      title="Eliminar calendario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Calendar Form Modal / Inline */}
      {isCreating && (
        <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-xl animate-in fade-in duration-150">
          <h5 className="text-xs font-semibold text-white mb-2">Crear Calendario</h5>
          <form onSubmit={handleCreate} className="space-y-2.5 text-xs">
            <div>
              <input
                type="text"
                placeholder="Nombre del calendario"
                value={newCalName}
                onChange={e => setNewCalName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Color distintivo:</label>
              <div className="flex items-center space-x-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCalColor(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newCalColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-2.5 py-1 rounded text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded shadow"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
