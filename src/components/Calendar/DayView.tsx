import React from 'react';
import { Task } from '../../types';
import { toISODateString, formatFullDate, formatCurrency } from '../../utils/dateUtils';
import { CheckCircle2, Circle, Clock, DollarSign, Plus, Tag, User } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
  onSelectDate: (dateStr: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  tasks,
  onToggleTask,
  onSelectTask,
  onSelectDate
}) => {
  const dateStr = toISODateString(currentDate);
  const dayTasks = tasks.filter(t => t.dueDate === dateStr);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Vista del Día
          </span>
          <h2 className="text-xl sm:text-2xl font-bold capitalize text-white">
            {formatFullDate(dateStr)}
          </h2>
        </div>

        <button
          onClick={() => onSelectDate(dateStr)}
          className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva tarea hoy</span>
        </button>
      </div>

      {/* Task List */}
      {dayTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500">
          <p className="text-sm">No hay tareas programadas para este día.</p>
          <button
            onClick={() => onSelectDate(dateStr)}
            className="mt-3 text-xs text-indigo-400 hover:underline font-medium"
          >
            + Crear tarea o pago para hoy
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayTasks.map(task => {
            const isDone = task.status === 'DONE';

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isDone
                    ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-white hover:border-indigo-500 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 min-w-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onToggleTask(task.id);
                      }}
                      className="mt-1 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-400" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <h3 className={`text-base font-semibold ${isDone ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
                        {task.dueTime && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{task.dueTime}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 capitalize">
                          <Tag className="w-3.5 h-3.5 text-purple-400" />
                          <span>{task.category}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-teal-400" />
                          <span>{task.createdBy}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {task.amount ? (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-extrabold text-emerald-400 flex items-center justify-end">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatCurrency(task.amount)}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 uppercase">{task.currency || 'USD'}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
