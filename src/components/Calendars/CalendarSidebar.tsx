import React, { useState } from 'react';
import { Calendar as CalendarType, CalendarSummary } from '../../types';
import { Plus, Calendar, AlertCircle, Clock, CheckCircle, DollarSign, Layers } from 'lucide-react';
import { formatCurrency } from '../../utils/dateUtils';

interface CalendarSidebarProps {
  calendars: CalendarType[];
  selectedCalendarId: string;
  onSelectCalendar: (id: string) => void;
  summary: CalendarSummary;
  onCreateCalendar: (name: string, color: string, description?: string) => void;
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
  onCreateCalendar
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
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Vencen hoy:</span>
            </span>
            <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {summary.dueTodayTasks}
            </span>
          </div>

          {summary.overdueTasks > 0 && (
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Atrasadas:</span>
              </span>
              <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                {summary.overdueTasks}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completadas:</span>
            </span>
            <span className="font-semibold text-emerald-400">
              {summary.completedTasks} / {summary.totalTasks}
            </span>
          </div>

          {summary.totalPendingAmount > 0 && (
            <div className="pt-2 mt-2 border-t border-indigo-500/20 flex items-center justify-between">
              <span className="flex items-center space-x-1 text-slate-300">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total a Pagar:</span>
              </span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {formatCurrency(summary.totalPendingAmount)}
              </span>
            </div>
          )}
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
            <button
              key={cal.id}
              onClick={() => onSelectCalendar(cal.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                selectedCalendarId === cal.id
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cal.color }}
                />
                <span className="truncate">{cal.name}</span>
              </div>
              {cal.isDefault && (
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  Principal
                </span>
              )}
            </button>
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
