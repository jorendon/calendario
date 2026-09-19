import React, { useState } from 'react';
import { Task } from '../../types';
import { filterTaskReminders } from '../../utils/reminders';
import { formatReadableDate, formatCurrency } from '../../utils/dateUtils';
import { CheckCircle2, Circle, AlertCircle, Clock, DollarSign, Calendar, ListFilter } from 'lucide-react';

interface AgendaViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string, occurrenceDate?: string) => void;
  onSelectTask: (task: Task, occurrenceDate?: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  tasks,
  onToggleTask,
  onSelectTask
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const { dueToday, overdue, upcoming, completedRecently } = filterTaskReminders(tasks);

  const pendingTasks = tasks.filter(t => t.status !== 'DONE');
  const completedTasks = tasks.filter(t => t.status === 'DONE');

  const filteredTasks = filter === 'pending'
    ? pendingTasks
    : filter === 'completed'
    ? completedTasks
    : tasks;

  const renderTaskItem = (task: Task, isOverdueSection = false) => {
    const isDone = task.status === 'DONE';

    return (
      <div
        key={task.id}
        onClick={() => onSelectTask(task, task.dueDate)}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isDone
            ? 'bg-emerald-950/30 border-emerald-500/40 text-slate-100 hover:border-emerald-400 shadow-sm'
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
              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
            ) : (
              <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-400" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              {isDone && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                  ✓ LISTA
                </span>
              )}
              <h4 className={`text-sm font-semibold truncate ${isDone ? 'line-through text-slate-200' : ''}`}>
                {task.title}
              </h4>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>{formatReadableDate(task.dueDate)}</span>
              </span>
              {task.dueTime && <span>({task.dueTime})</span>}
              <span className="capitalize text-slate-500">• {task.category}</span>
              {isDone && task.completedBy && (
                <span className="text-emerald-400 text-[11px] font-medium truncate">
                  • Hecha por {task.completedBy}
                </span>
              )}
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
  };

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
          {sectionTasks.map(t => renderTaskItem(t, isOverdueSection))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 shadow-xl">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ListFilter className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">Filtro de visualización:</span>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'pending'
                ? 'bg-amber-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pendientes ({pendingTasks.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completadas ({completedTasks.length})
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <p>No hay tareas que mostrar con este filtro.</p>
        </div>
      ) : filter !== 'all' ? (
        <div className="space-y-2">
          {filteredTasks.map(t => renderTaskItem(t))}
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
            'Tareas Completadas / Realizadas',
            completedRecently,
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          )}
        </>
      )}
    </div>
  );
};
