import React, { useState } from 'react';
import { useTasks } from './hooks/useTasks';
import { calculateSummary } from './utils/reminders';
import { Task } from './types';
import { Navbar } from './components/Header/Navbar';
import { CalendarSidebar } from './components/Calendars/CalendarSidebar';
import { MonthView } from './components/Calendar/MonthView';
import { WeekView } from './components/Calendar/WeekView';
import { DayView } from './components/Calendar/DayView';
import { AgendaView } from './components/Calendar/AgendaView';
import { TaskModal } from './components/Tasks/TaskModal';
import { TaskDetailModal } from './components/Tasks/TaskDetailModal';
import { UserManagementModal } from './components/Users/UserManagementModal';
import { LoginModal } from './components/Auth/LoginModal';
import { GoogleSyncModal } from './components/GoogleSync/GoogleSyncModal';
import { PWAInstallBanner } from './components/PWA/PWAInstallBanner';
import { Calendar as CalendarIcon, Lock, Sparkles, UserCheck } from 'lucide-react';

export const App: React.FC = () => {
  const {
    tasks,
    allTasks,
    calendars,
    users,
    activeUser,
    setActiveUser,
    logout,
    selectedCalendarId,
    setSelectedCalendarId,
    notificationMsg,
    createTask,
    toggleTaskStatus,
    deleteTask,
    createCalendar,
    addUser,
    importGoogleTasks
  } = useTasks();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Modals state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>(undefined);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);

  const summary = calculateSummary(tasks, currentDate);

  // Date Navigation handlers
  const handlePrevDate = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNextDate = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSelectDate = (dateStr: string) => {
    setInitialTaskDate(dateStr);
    setIsNewTaskOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* PWA Install Notification */}
      <PWAInstallBanner />

      {/* If logged out, show Login Welcome Gate */}
      {!activeUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/40">
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-white">Calendario Compartido</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Tareas, pagos de renta y recordatorios diarios
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 text-left">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                Selecciona tu usuario para ingresar
              </p>
              
              <div className="space-y-2">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setActiveUser(u)}
                    className="w-full p-3 rounded-xl bg-slate-900 hover:bg-indigo-950/50 border border-slate-700/80 hover:border-indigo-500/60 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white group-hover:text-indigo-300">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                      Entrar →
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsLoginOpen(true)}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Ingresar con correo y contraseña</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Contraseña por defecto: <span className="text-indigo-400 font-mono">Calendario2006*</span>
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Top Navbar */}
          <Navbar
            currentDate={currentDate}
            onPrevDate={handlePrevDate}
            onNextDate={handleNextDate}
            onToday={handleToday}
            viewMode={viewMode}
            onChangeView={setViewMode}
            activeUser={activeUser}
            users={users}
            onSwitchUser={setActiveUser}
            onOpenNewTask={() => {
              setInitialTaskDate(undefined);
              setIsNewTaskOpen(true);
            }}
            onOpenUserManagement={() => setIsUserManagementOpen(true)}
            onOpenGoogleSync={() => setIsGoogleSyncOpen(true)}
            onOpenLogin={() => setIsLoginOpen(true)}
            onLogout={logout}
          />

          {/* Main Content Layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-5 gap-4">
            {/* Sidebar */}
            <CalendarSidebar
              calendars={calendars}
              selectedCalendarId={selectedCalendarId}
              onSelectCalendar={setSelectedCalendarId}
              summary={summary}
              onCreateCalendar={createCalendar}
            />

            {/* Calendar View Area */}
            <main className="flex-1 flex flex-col min-h-0">
              {viewMode === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  tasks={tasks}
                  onToggleTask={toggleTaskStatus}
                  onSelectTask={setSelectedTaskForDetail}
                  onSelectDate={handleSelectDate}
                />
              )}

              {viewMode === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  tasks={tasks}
                  onToggleTask={toggleTaskStatus}
                  onSelectTask={setSelectedTaskForDetail}
                  onSelectDate={handleSelectDate}
                />
              )}

              {viewMode === 'day' && (
                <DayView
                  currentDate={currentDate}
                  tasks={tasks}
                  onToggleTask={toggleTaskStatus}
                  onSelectTask={setSelectedTaskForDetail}
                  onSelectDate={handleSelectDate}
                />
              )}

              {viewMode === 'agenda' && (
                <AgendaView
                  tasks={tasks}
                  onToggleTask={toggleTaskStatus}
                  onSelectTask={setSelectedTaskForDetail}
                />
              )}
            </main>
          </div>
        </>
      )}

      {/* Toast Notification Banner */}
      {notificationMsg && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 border border-indigo-500/40 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs sm:text-sm">
            <span className="p-1 rounded-lg bg-indigo-600/30 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="font-medium">{notificationMsg}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <TaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSubmit={createTask}
        calendars={calendars}
        initialDate={initialTaskDate}
        defaultCalendarId={selectedCalendarId}
        activeUserEmail={activeUser?.email || 'Jonathan.rendon@gmail.com'}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        isOpen={Boolean(selectedTaskForDetail)}
        onClose={() => setSelectedTaskForDetail(null)}
        onToggleStatus={toggleTaskStatus}
        onDelete={deleteTask}
      />

      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        users={users}
        onAddUser={addUser}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={user => {
          setActiveUser(user);
        }}
        defaultEmail={activeUser?.email || 'Jonathan.rendon@gmail.com'}
      />

      <GoogleSyncModal
        isOpen={isGoogleSyncOpen}
        onClose={() => setIsGoogleSyncOpen(false)}
        onImport={importGoogleTasks}
        activeUserEmail={activeUser?.email || 'Jonathan.rendon@gmail.com'}
      />
    </div>
  );
};

export default App;
