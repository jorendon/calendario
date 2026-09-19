import React from 'react';
import { Task } from '../../types';
import {
  getMonthMatrix,
  toISODateString,
  isSameDay,
  formatCurrency,
  isTaskScheduledForDate,
  isTaskOccurrenceCompleted
} from '../../utils/dateUtils';
import { CheckCircle2, Circle, DollarSign, Plus, Repeat } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  onToggleTask: (taskId: string, occurrenceDate?: string) => void;
  onSelectTask: (task: Task, occurrenceDate?: string) => void;
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  tasks,
  onToggleTask,
  onSelectTask,
  onSelectDate
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthMatrix(year, month);
  const today = new Date();
  const todayStr = toISODateString(today);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80 py-2.5 text-center text-xs font-semibold text-slate-400">
        {WEEKDAYS.map(day => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-slate-800/80 overflow-y-auto custom-scrollbar">
        {days.map((day, idx) => {
          const dateStr = toISODateString(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayTasks = tasks.filter(t => isTaskScheduledForDate(t, day));

          return (
            <div
              key={idx}
              className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 transition-colors flex flex-col group ${
                isCurrentMonth ? 'bg-slate-950/95' : 'bg-slate-950/40 text-slate-600'
              } hover:bg-slate-900/80`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/40'
                      : isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {day.getDate()}
                </span>

                <button
                  onClick={() => onSelectDate(dateStr)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-opacity"
                  title="Agregar tarea en este día"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day Tasks List */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[105px] custom-scrollbar pr-0.5">
                {dayTasks.map(task => {
                  const isDone = isTaskOccurrenceCompleted(task, dateStr);
                  const isOverdue = !isDone && dateStr < todayStr;
                  const isRecurring = task.recurrence && task.recurrence !== 'NONE';

                  return (
                    <div
                      key={`${task.id}-${dateStr}`}
                      className={`text-[11px] p-1.5 rounded-lg border flex items-start space-x-1.5 transition-all cursor-pointer ${
                        isDone
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 hover:border-emerald-400 shadow-sm'
                          : isOverdue
                          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 hover:border-rose-500/70'
                          : 'bg-slate-900/90 border-slate-700/60 text-slate-200 hover:border-indigo-500/60 hover:bg-slate-850'
                      }`}
                      onClick={() => onSelectTask(task, dateStr)}
                    >
                      {/* Checkbox toggle button */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onToggleTask(task.id, dateStr);
                        }}
                        className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-indigo-400 transition-colors"
                        title={isDone ? 'Marcar como pendiente' : 'Marcar como LISTA'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
                        )}
                      </button>

                      {/* Task info */}
                      <div className="flex-1 truncate">
                        <div className="flex items-center space-x-1.5 truncate">
                          {isDone ? (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex-shrink-0">
                              LISTA
                            </span>
                          ) : isRecurring ? (
                            <span title="Tarea repetitiva" className="inline-flex items-center">
                              <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                            </span>
                          ) : null}
                          <span className={`font-medium truncate leading-tight ${isDone ? 'line-through text-slate-200' : ''}`}>
                            {task.title}
                          </span>
                        </div>
                        {task.amount ? (
                          <div className="text-[10px] font-semibold text-emerald-400 flex items-center mt-0.5">
                            <DollarSign className="w-2.5 h-2.5" />
                            <span>{formatCurrency(task.amount)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
