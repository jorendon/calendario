import React from 'react';
import { Task } from '../../types';
import { filterTaskReminders } from '../../utils/reminders';
import { formatReadableDate, formatCurrency } from '../../utils/dateUtils';
import { CheckCircle2, Circle, AlertCircle, Clock, DollarSign, Calendar } from 'lucide-react';

interface AgendaViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onSelectTask: (task: Task) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  onToggleTask,
  onSelectTask
}) => {
  const { dueToday, overdue, upcoming, completedRecently } = filterTaskReminders(tasks);

  const renderSection = (
    title: string,
    sectionTasks: Task[],
    icon: React.ReactNode,
    badgeColor: string,
    isOverdueSection = false
  ) => {
    if (sectionTasks.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 pb-1 border-b border-slate-800">
          {icon}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {title}
          </h3>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {sectionTasks.length}
          </span>
        </div>

        <div className="space-y-2">
          {sectionTasks.map(task => {
            const isDone = task.status === 'DONE';

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                    : isOverdueSection
                    ? 'bg-rose-950/30 border-rose-500/40 text-slate-100 hover:border-rose-400'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-100 hover:border-indigo-500'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleTask(task.id);
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors flex-shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-400" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <h4 className={`text-sm font-semibold truncate ${isDone ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        <span>{formatReadableDate(task.dueDate)}</span>
                      </span>
                      {task.dueTime && <span>({task.dueTime})</span>}
                      <span className="capitalize text-slate-500">• {task.category}</span>
                    </div>
                  </div>
                </div>

                {task.amount ? (
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-extrabold text-emerald-400">
                      {formatCurrency(task.amount)}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 shadow-xl">
      {tasks.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <p>No tienes tareas registradas en este calendario.</p>
        </div>
      ) : (
        <>
          {renderSection(
            'Atrasadas / Pendientes por pagar',
            overdue,
            <AlertCircle className="w-4 h-4 text-rose-400" />,
            'bg-rose-500/20 text-rose-300 border border-rose-500/30',
            true
          )}

          {renderSection(
            'Vencen Hoy',
            dueToday,
            <Clock className="w-4 h-4 text-amber-400" />,
            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          )}

          {renderSection(
            'Próximas Tareas',
            upcoming,
            <Calendar className="w-4 h-4 text-indigo-400" />,
            'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          )}

          {renderSection(
            'Completadas',
            completedRecently,
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          )}
        </>
      )}
    </div>
  );
};
