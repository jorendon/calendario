import React, { useState, useEffect } from 'react';
import { Calendar as CalendarType, Task, Category, TaskRecurrence } from '../../types';
import { X, Calendar, DollarSign, Tag, Clock, Repeat, Plus, Send } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt' | 'status'>) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  taskToEdit?: Task | null;
  calendars: CalendarType[];
  categories: Category[];
  onOpenNewCategory: () => void;
  initialDate?: string;
  defaultCalendarId?: string;
  activeUserEmail: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  taskToEdit,
  calendars,
  categories,
  onOpenNewCategory,
  initialDate,
  defaultCalendarId,
  activeUserEmail
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState<string>('rent');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('NONE');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(25);
  const [calendarId, setCalendarId] = useState(defaultCalendarId || (calendars[0]?.id || 'cal-shared-home'));

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || '');
        setDueDate(taskToEdit.dueDate || '');
        setDueTime(taskToEdit.dueTime || '');
        setAmount(taskToEdit.amount !== undefined && taskToEdit.amount !== null ? String(taskToEdit.amount) : '');
        setCurrency(taskToEdit.currency || 'USD');
        setCategory(taskToEdit.category || 'rent');
        setRecurrence(taskToEdit.recurrence || 'NONE');
        setRecurrenceDay(taskToEdit.recurrenceDay || Number(taskToEdit.dueDate?.split('-')[2]) || 25);
        setCalendarId(taskToEdit.calendarId || calendars[0]?.id || 'cal-shared-home');
      } else {
        const today = new Date().toISOString().split('T')[0];
        const targetDate = initialDate || today;
        setTitle('');
        setDescription('');
        setAmount('');
        setDueDate(targetDate);
        setDueTime('');
        setRecurrence('NONE');
        
        const dayNum = Number(targetDate.split('-')[2]) || 25;
        setRecurrenceDay(dayNum);

        if (defaultCalendarId && defaultCalendarId !== 'all') {
          setCalendarId(defaultCalendarId);
        } else if (calendars.length > 0) {
          setCalendarId(calendars[0].id);
        }

        if (categories.length > 0) {
          setCategory(categories[0].id);
        }
      }
    }
  }, [isOpen, taskToEdit, initialDate, defaultCalendarId, calendars, categories]);

  if (!isOpen) return null;

  const isEditing = Boolean(taskToEdit);
  const isRecurring = recurrence !== 'NONE' || (taskToEdit?.recurrence && taskToEdit.recurrence !== 'NONE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    if (isEditing && taskToEdit && onUpdate) {
      onUpdate(taskToEdit.id, {
        calendarId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime: dueTime || undefined,
        amount: amount ? Number(amount) : undefined,
        currency,
        category,
        recurrence,
        recurrenceDay: recurrence === 'MONTHLY' ? recurrenceDay : undefined
      });
    } else {
      onSubmit({
        calendarId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime: dueTime || undefined,
        amount: amount ? Number(amount) : undefined,
        currency,
        category,
        recurrence,
        recurrenceDay: recurrence === 'MONTHLY' ? recurrenceDay : undefined,
        createdBy: activeUserEmail
      });
    }

    setTitle('');
    setDescription('');
    setAmount('');
    setRecurrence('NONE');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isEditing ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400' : 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-400'
            }`}>
              {isRecurring ? <Repeat className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? (isRecurring ? 'Editar Tarea Repetitiva' : 'Editar Tarea') : 'Nueva Tarea o Pago'}
              </h3>
              {isEditing && isRecurring && (
                <p className="text-[11px] text-purple-300">
                  Se actualizará en todas sus repeticiones
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
          {isEditing && isRecurring && (
            <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-purple-200">
              <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
              <p>
                <strong>Nota sobre repetición:</strong> Esta tarea es repetitiva. Cualquier cambio que realices aquí (título, notas, monto, fecha/día o frecuencia) se reflejará automáticamente en <strong>todas sus repeticiones</strong> del calendario.
              </p>
            </div>
          )}
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Título de la tarea o pago *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Pagar la luz, Pagar la renta, Compras..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
          </div>

          {/* Calendar & Category selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Calendario
              </label>
              <select
                value={calendarId}
                onChange={e => setCalendarId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
              >
                {calendars.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Categoría
                </label>
                <button
                  type="button"
                  onClick={onOpenNewCategory}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-0.5 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear nueva</span>
                </button>
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence (Tareas repetitivas) */}
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
              <Repeat className="w-4 h-4 text-indigo-400" />
              <span>¿Es una tarea repetitiva? (Frecuencia)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as TaskRecurrence)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              >
                <option value="NONE">No se repite (Única vez)</option>
                <option value="DAILY">Diario (Todos los días)</option>
                <option value="WEEKLY">Semanal (Una vez por semana)</option>
                <option value="MONTHLY">Mensual (Un día fijo de cada mes)</option>
                <option value="YEARLY">Anual (Una vez al año)</option>
              </select>

              {recurrence === 'MONTHLY' && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Día del mes:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={recurrenceDay}
                    onChange={e => setRecurrenceDay(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs text-center font-bold"
                  />
                  <span className="text-[11px] text-indigo-400 font-medium whitespace-nowrap">
                    (Todos los {recurrenceDay})
                  </span>
                </div>
              )}
            </div>

            {recurrence !== 'NONE' && (
              <p className="text-[11px] text-slate-400 italic">
                💡 Esta tarea se repetirá automáticamente en el calendario según la frecuencia seleccionada.
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Fecha de inicio / vencimiento *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  const d = Number(e.target.value.split('-')[2]);
                  if (d) setRecurrenceDay(d);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Hora (opcional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Amount / Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Monto a pagar (opcional para facturas o renta)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Notas o detalles (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Instrucciones, detalles de la factura o recordatorios..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Notice about email notifications */}
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-indigo-300">
            <Send className="w-4 h-4 flex-shrink-0 mt-0.5 text-indigo-400" />
            <p>
              {isEditing
                ? 'Los miembros del calendario verán los cambios actualizados automáticamente.'
                : 'Al crear esta tarea, se enviará un correo automático a los miembros de este calendario informando la tarea.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-all ${
                isEditing
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
              }`}
            >
              {isEditing ? 'Guardar Cambios' : 'Guardar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
