import React from 'react';
import { Task } from '../../types';
import {
  getWeekDays,
  toISODateString,
  isSameDay,
  formatReadableDate,
  formatCurrency,
  isTaskScheduledForDate,
  isTaskOccurrenceCompleted
} from '../../utils/dateUtils';
import { CheckCircle2, Circle, Clock, DollarSign, Plus, Repeat } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  tasks: Task[];
  onToggleTask: (taskId: string, occurrenceDate?: string) => void;
  onSelectTask: (task: Task, occurrenceDate?: string) => void;
  onSelectDate: (dateStr: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  tasks,
  onToggleTask,
  onSelectTask,
  onSelectDate
}) => {
  const weekDays = getWeekDays(currentDate);
  const today = new Date();
  const todayStr = toISODateString(today);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-y-auto custom-scrollbar">
        {weekDays.map((day, idx) => {
          const dateStr = toISODateString(day);
          const isToday = isSameDay(day, today);
          const dayTasks = tasks.filter(t => isTaskScheduledForDate(t, day));

          return (
            <div key={idx} className="flex-1 p-3 bg-slate-950/80 flex flex-col min-h-[160px] md:min-h-0">
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40'
                        : 'text-slate-300'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="text-xs font-semibold capitalize text-slate-400">
                    {formatReadableDate(dateStr)}
                  </span>
                </div>

                <button
                  onClick={() => onSelectDate(dateStr)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                  title="Añadir tarea"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Tasks for the day */}
              <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                {dayTasks.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic py-2">Sin tareas programadas</p>
                ) : (
                  dayTasks.map(task => {
                    const isDone = isTaskOccurrenceCompleted(task, dateStr);
                    const isOverdue = !isDone && dateStr < todayStr;
                    const isRecurring = task.recurrence && task.recurrence !== 'NONE';

                    return (
                      <div
                        key={`${task.id}-${dateStr}`}
                        onClick={() => onSelectTask(task, dateStr)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-950/35 border-emerald-500/50 text-emerald-100 hover:border-emerald-400 shadow-sm'
                            : isOverdue
                            ? 'bg-rose-950/30 border-rose-500/40 text-rose-100 hover:border-rose-400'
                            : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:border-indigo-500 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onToggleTask(task.id, dateStr);
                            }}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 flex-shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 truncate">
                              {isDone ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                                  LISTA
                                </span>
                              ) : isRecurring ? (
                                <span title="Tarea repetitiva" className="inline-flex items-center">
                                  <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                </span>
                              ) : null}
                              <h4 className={`text-xs font-semibold truncate ${isDone ? 'line-through text-slate-200' : ''}`}>
                                {task.title}
                              </h4>
                            </div>
                            {task.dueTime && (
                              <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{task.dueTime}</span>
                              </div>
                            )}
                            {task.amount ? (
                              <div className="text-[11px] font-bold text-emerald-400 flex items-center mt-1">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(task.amount)}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
