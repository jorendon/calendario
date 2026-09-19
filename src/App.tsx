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
import { CategoryModal } from './components/Categories/CategoryModal';
import { UserManagementModal } from './components/Users/UserManagementModal';
import { LoginModal } from './components/Auth/LoginModal';
import { LoginGate } from './components/Auth/LoginGate';
import { GoogleSyncModal } from './components/GoogleSync/GoogleSyncModal';
import { PWAInstallBanner } from './components/PWA/PWAInstallBanner';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const {
    tasks,
    allTasks,
    calendars,
    categories,
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
    createCategory,
    createCalendar,
    addUser,
    importGoogleTasks
  } = useTasks();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'agenda'>('month');

  // Modals state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | undefined>(undefined);
  const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>(undefined);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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

  const handleSelectTask = (task: Task, occurrenceDate?: string) => {
    setSelectedTaskForDetail(task);
    setSelectedOccurrenceDate(occurrenceDate);
  };

  // 1. First Page MUST be LoginGate if user is not authenticated
  if (!activeUser) {
    return (
      <LoginGate
        users={users}
        onLoginSuccess={user => {
          setActiveUser(user);
        }}
      />
    );
  }

  // 2. Main Authenticated Application
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 selection:bg-indigo-600 selection:text-white">
      {/* PWA Install Banner */}
      <PWAInstallBanner />

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
              onSelectTask={handleSelectTask}
              onSelectDate={handleSelectDate}
            />
          )}

          {viewMode === 'week' && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks}
              onToggleTask={toggleTaskStatus}
              onSelectTask={handleSelectTask}
              onSelectDate={handleSelectDate}
            />
          )}

          {viewMode === 'day' && (
            <DayView
              currentDate={currentDate}
              tasks={tasks}
              onToggleTask={toggleTaskStatus}
              onSelectTask={handleSelectTask}
              onSelectDate={handleSelectDate}
            />
          )}

          {viewMode === 'agenda' && (
            <AgendaView
              tasks={tasks}
              onToggleTask={toggleTaskStatus}
              onSelectTask={handleSelectTask}
            />
          )}
        </main>
      </div>

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
        categories={categories}
        onOpenNewCategory={() => setIsCategoryModalOpen(true)}
        initialDate={initialTaskDate}
        defaultCalendarId={selectedCalendarId}
        activeUserEmail={activeUser.email}
      />

      <TaskDetailModal
        task={selectedTaskForDetail}
        occurrenceDate={selectedOccurrenceDate}
        isOpen={Boolean(selectedTaskForDetail)}
        onClose={() => {
          setSelectedTaskForDetail(null);
          setSelectedOccurrenceDate(undefined);
        }}
        onToggleStatus={toggleTaskStatus}
        onDelete={deleteTask}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onAddCategory={createCategory}
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
        defaultEmail={activeUser.email}
      />

      <GoogleSyncModal
        isOpen={isGoogleSyncOpen}
        onClose={() => setIsGoogleSyncOpen(false)}
        onImport={importGoogleTasks}
        activeUserEmail={activeUser.email}
      />
    </div>
  );
};

export default App;
