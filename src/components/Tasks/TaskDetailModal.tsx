import React from 'react';
import { Task } from '../../types';
import { X, CheckCircle2, Circle, Trash2, Calendar, Clock, DollarSign, User, Send, Repeat } from 'lucide-react';
import { formatFullDate, formatCurrency, formatRecurrenceLabel } from '../../utils/dateUtils';

interface TaskDetailModalProps {
  task: Task | null;
  occurrenceDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (taskId: string, occurrenceDate?: string) => void;
  onDelete: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  occurrenceDate,
  isOpen,
  onClose,
  onToggleStatus,
  onDelete
}) => {
  if (!isOpen || !task) return null;

  const targetDate = occurrenceDate || task.dueDate;
  const isDone = task.recurrence && task.recurrence !== 'NONE'
    ? Boolean(task.completedDates?.includes(targetDate))
    : task.status === 'DONE';

  const handleToggle = () => {
    onToggleStatus(task.id, targetDate);
  };

  const handleDelete = () => {
    if (window.confirm(`¿Estás seguro de eliminar la tarea "${task.title}"?`)) {
      onDelete(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Top bar with category badge & close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {task.category}
            </span>
            {task.recurrence && task.recurrence !== 'NONE' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                <Repeat className="w-3 h-3" />
                <span>{formatRecurrenceLabel(task.recurrence, task.recurrenceDay)}</span>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-4 text-sm">
          <div>
            <h3 className={`text-lg font-bold text-white ${isDone ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                {task.description}
              </p>
            )}
          </div>

          <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center space-x-2 text-slate-400">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Fecha correspondiente:</span>
              </span>
              <span className="font-semibold text-white capitalize">{formatFullDate(targetDate)}</span>
            </div>

            {task.dueTime && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-2 text-slate-400">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Hora:</span>
                </span>
                <span className="font-semibold text-white">{task.dueTime}</span>
              </div>
            )}

            {task.recurrence && task.recurrence !== 'NONE' && (
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="flex items-center space-x-2 text-purple-400">
                  <Repeat className="w-4 h-4" />
                  <span>Frecuencia:</span>
                </span>
                <span className="font-semibold text-purple-300">
                  {formatRecurrenceLabel(task.recurrence, task.recurrenceDay)}
                </span>
              </div>
            )}

            {task.amount ? (
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="flex items-center space-x-2 text-slate-400">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Monto a pagar:</span>
                </span>
                <span className="font-extrabold text-emerald-400 text-base">
                  {formatCurrency(task.amount)} {task.currency || 'USD'}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
              <span className="flex items-center space-x-2 text-slate-400">
                <User className="w-4 h-4 text-slate-500" />
                <span>Creada por:</span>
              </span>
              <span className="text-slate-300">{task.createdBy}</span>
            </div>

            {isDone && task.completedBy && (
              <div className="flex items-center justify-between text-emerald-400 pt-1 border-t border-slate-800">
                <span className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Completada por:</span>
                </span>
                <span className="font-bold">{task.completedBy}</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-300">
            <Send className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <p>
              Cualquiera de los dos puede marcar esta tarea como lista. Al completarse, se mantiene guardada en el calendario.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={handleDelete}
              className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>

            <button
              onClick={handleToggle}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
                isDone
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isDone ? (
                <>
                  <Circle className="w-4 h-4" />
                  <span>Reabrir tarea</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Marcar como LISTA!</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
