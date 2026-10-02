import React from 'react';
import {
  X,
  AlertCircle,
  CheckCircle2,
  Circle,
  Repeat,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCheck
} from 'lucide-react';
import { Task, Calendar as CalendarType } from '../../types';
import { getOverdueTaskItems, OverdueTaskItem } from '../../utils/reminders';
import { formatCurrency, parseISODate } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

interface OverdueTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  calendars: CalendarType[];
  currentDate?: Date;
  onToggleTask: (taskId: string, targetDate?: string) => void;
  onSelectTask?: (task: Task, dateStr?: string) => void;
}

export const OverdueTasksModal: React.FC<OverdueTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  calendars,
  currentDate = new Date(),
  onToggleTask,
  onSelectTask
}) => {
  if (!isOpen) return null;

  const overdueItems: OverdueTaskItem[] = getOverdueTaskItems(tasks, currentDate);

  const totalOverdueAmount = overdueItems.reduce(
    (acc, item) => acc + (item.task.amount ? Number(item.task.amount) : 0),
    0
  );

  const handleToggle = (taskId: string, dateStr: string) => {
    onToggleTask(taskId, dateStr);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsDone = () => {
    if (overdueItems.length === 0) return;
    for (const item of overdueItems) {
      onToggleTask(item.task.id, item.occurrenceDate);
    }
    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    } catch {
      // ignore
    }
  };

  const getCalendarInfo = (calendarId: string) => {
    const cal = calendars.find(c => c.id === calendarId);
    return {
      name: cal?.name || 'Calendario',
      color: cal?.color || '#4f46e5'
    };
  };

  const formatDueDateLabel = (dateStr: string) => {
    const d = parseISODate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-900/40">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Tareas Atrasadas</h3>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {overdueItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tareas o pagos pendientes con fecha vencida
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

        {/* Top Summary Banner */}
        {overdueItems.length > 0 && (
          <div className="px-6 py-3 bg-slate-850/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
            {totalOverdueAmount > 0 ? (
              <div className="flex items-center space-x-1.5 text-slate-300">
                <span>Monto atrasado:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {formatCurrency(totalOverdueAmount)}
                </span>
              </div>
            ) : (
              <span className="text-slate-400">
                Marca cada tarea como lista para poner al día tu calendario
              </span>
            )}

            {overdueItems.length > 1 && (
              <button
                type="button"
                onClick={handleMarkAllAsDone}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar todas como listas</span>
              </button>
            )}
          </div>
        )}

        {/* Body / Scrollable Tasks List */}
        <div className="p-4 sm:p-6 space-y-2.5 overflow-y-auto max-h-[60vh] sm:max-h-[65vh] flex-1 custom-scrollbar">
          {overdueItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">¡Todo al día!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tienes ninguna tarea ni pago atrasado en este calendario.
              </p>
            </div>
          ) : (
            overdueItems.map(({ task, occurrenceDate, daysOverdue }) => {
              const cal = getCalendarInfo(task.calendarId);
              const isRecurring = task.recurrence && task.recurrence !== 'NONE';

              return (
                <div
                  key={`${task.id}-${occurrenceDate}`}
                  className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/30 transition-all flex items-start space-x-3 group"
                >
                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id, occurrenceDate)}
                    title="Marcar como LISTA"
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                  >
                    <Circle className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                  </button>

                  {/* Task Details */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectTask && onSelectTask(task, occurrenceDate)}
                  >
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-bold text-white text-sm truncate">
                        {task.title}
                      </span>

                      {isRecurring && (
                        <span
                          title={`Repetición ${task.recurrence}`}
                          className="inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        >
                          <Repeat className="w-2.5 h-2.5" />
                          <span>Recurrente</span>
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {daysOverdue === 1 ? 'Atrasada por 1 día' : `Atrasada por ${daysOverdue} días`}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 mt-2 text-[11px] text-slate-400 flex-wrap gap-y-1">
                      {/* Date */}
                      <span className="flex items-center space-x-1 text-rose-300 font-medium">
                        <CalendarIcon className="w-3 h-3 text-rose-400" />
                        <span>Venció el {formatDueDateLabel(occurrenceDate)}</span>
                      </span>

                      {/* Calendar Tag */}
                      <span className="flex items-center space-x-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cal.color }}
                        />
                        <span className="truncate max-w-[120px]">{cal.name}</span>
                      </span>

                      {/* Category */}
                      {task.category && (
                        <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[10px]">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  {task.amount ? (
                    <div className="flex-shrink-0 text-right">
                      <span className="font-extrabold text-emerald-400 text-sm flex items-center justify-end">
                        <DollarSign className="w-3.5 h-3.5 -mr-0.5" />
                        <span>{formatCurrency(task.amount).replace('$', '')}</span>
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-850 border-t border-slate-800 flex-shrink-0">
          <span className="text-xs text-slate-400">
            {overdueItems.length === 0
              ? 'Todas las tareas están al día'
              : `${overdueItems.length} tarea(s) pendiente(s)`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
