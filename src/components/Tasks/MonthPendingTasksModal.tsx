import React from 'react';
import {
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Repeat,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCheck
} from 'lucide-react';
import { Task, Calendar as CalendarType } from '../../types';
import { getMonthPendingTaskItems, MonthPendingTaskItem } from '../../utils/reminders';
import { formatCurrency, parseISODate } from '../../utils/dateUtils';
import confetti from 'canvas-confetti';

interface MonthPendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  calendars: CalendarType[];
  currentDate?: Date;
  onToggleTask: (taskId: string, targetDate?: string) => void;
  onSelectTask?: (task: Task, dateStr?: string) => void;
}

export const MonthPendingTasksModal: React.FC<MonthPendingTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  calendars,
  currentDate = new Date(),
  onToggleTask,
  onSelectTask
}) => {
  if (!isOpen) return null;

  const pendingItems: MonthPendingTaskItem[] = getMonthPendingTaskItems(tasks, currentDate);

  const totalPendingAmount = pendingItems.reduce(
    (acc, item) => acc + (item.task.amount ? Number(item.task.amount) : 0),
    0
  );

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const handleToggle = (taskId: string, dateStr: string) => {
    onToggleTask(taskId, dateStr);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsDone = () => {
    if (pendingItems.length === 0) return;
    for (const item of pendingItems) {
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

  const formatItemDate = (dateStr: string) => {
    const d = parseISODate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/40">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Pendientes de {monthLabel}</h3>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {pendingItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tareas y pagos programados pendientes en este mes
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
        {pendingItems.length > 0 && (
          <div className="px-6 py-3 bg-slate-850/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
            {totalPendingAmount > 0 ? (
              <div className="flex items-center space-x-1.5 text-slate-300">
                <span>Por pagar este mes:</span>
                <span className="font-extrabold text-amber-400 text-sm">
                  {formatCurrency(totalPendingAmount)}
                </span>
              </div>
            ) : (
              <span className="text-slate-400">
                {pendingItems.length} tarea(s) pendiente(s) por realizar este mes
              </span>
            )}

            {pendingItems.length > 1 && (
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
          {pendingItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">¡Mes al día!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tienes ninguna tarea ni pago pendiente para {monthLabel}.
              </p>
            </div>
          ) : (
            pendingItems.map(({ task, occurrenceDate, isOverdue, isToday }) => {
              const cal = getCalendarInfo(task.calendarId);
              const isRecurring = task.recurrence && task.recurrence !== 'NONE';
              const dueTime = task.dueTime || (task as any).due_time;

              return (
                <div
                  key={`${task.id}-${occurrenceDate}`}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start space-x-3 group ${
                    isOverdue
                      ? 'border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/30'
                      : isToday
                      ? 'border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800/70'
                  }`}
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

                      {isOverdue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Atrasada</span>
                        </span>
                      )}

                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Hoy</span>
                        </span>
                      )}

                      {dueTime && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                          {dueTime}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-300/80 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-3 mt-2 text-[11px] text-slate-400 flex-wrap gap-y-1">
                      {/* Date */}
                      <span className={`flex items-center space-x-1 font-medium ${
                        isOverdue ? 'text-rose-300' : isToday ? 'text-amber-300' : 'text-slate-300'
                      }`}>
                        <CalendarIcon className="w-3 h-3" />
                        <span>{formatItemDate(occurrenceDate)}</span>
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
            {pendingItems.length === 0
              ? 'Todas las tareas del mes están completadas'
              : `${pendingItems.length} tarea(s) pendiente(s) en ${monthLabel}`}
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
