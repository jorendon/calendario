import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  RefreshCw,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  currentDate: Date;
  onPrevDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  viewMode: 'month' | 'week' | 'day' | 'agenda';
  onChangeView: (mode: 'month' | 'week' | 'day' | 'agenda') => void;
  activeUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
  onOpenNewTask: () => void;
  onOpenUserManagement: () => void;
  onOpenGoogleSync: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onPrevDate,
  onNextDate,
  onToday,
  viewMode,
  onChangeView,
  activeUser,
  users,
  onSwitchUser,
  onOpenNewTask,
  onOpenUserManagement,
  onOpenGoogleSync,
  onOpenLogin
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const monthName = currentDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Brand & Date navigation */}
        <div className="flex items-center justify-between sm:justify-start space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                Calendario
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Compartido
              </span>
            </div>
          </div>

          {/* Month / Period Selector */}
          <div className="flex items-center space-x-1 sm:space-x-2 pl-2 sm:pl-4 border-l border-slate-800">
            <button
              onClick={onToday}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg overflow-hidden">
              <button
                onClick={onPrevDate}
                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNextDate}
                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-sm sm:text-base font-semibold capitalize text-slate-100 min-w-[140px]">
              {monthName}
            </h2>
          </div>
        </div>

        {/* Center: View Switcher (Mes, Semana, Día, Agenda) */}
        <div className="flex items-center justify-center">
          <div className="flex p-1 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-medium w-full sm:w-auto">
            {(['month', 'week', 'day', 'agenda'] as const).map(mode => {
              const labels = {
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda'
              };
              return (
                <button
                  key={mode}
                  onClick={() => onChangeView(mode)}
                  className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg transition-all ${
                    viewMode === mode
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions, Google Sync, Users, New Task */}
        <div className="flex items-center justify-between sm:justify-end space-x-2">
          {/* Google Sync Button */}
          <button
            onClick={onOpenGoogleSync}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Importar tareas de Google"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Google Tasks</span>
          </button>

          {/* User selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(prev => !prev)}
              className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                {activeUser.name.charAt(0)}
              </div>
              <span className="text-slate-200 font-medium max-w-[90px] sm:max-w-[110px] truncate">
                {activeUser.name}
              </span>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-700/80 mb-1">
                  <p className="text-xs font-semibold text-slate-400">Usuario activo:</p>
                  <p className="text-sm font-bold text-white truncate">{activeUser.name}</p>
                  <p className="text-xs text-indigo-300 truncate">{activeUser.email}</p>
                </div>

                <div className="py-1">
                  <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Cambiar usuario
                  </p>
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        activeUser.id === u.id
                          ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                          : 'text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[9px] text-white">
                          {u.name.charAt(0)}
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                      {activeUser.id === u.id && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-700/80 mt-2 pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenUserManagement();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Administrar usuarios</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-700 flex items-center space-x-2"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Iniciar sesión con contraseña</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New Task Button */}
          <button
            onClick={onOpenNewTask}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>
    </header>
  );
};
