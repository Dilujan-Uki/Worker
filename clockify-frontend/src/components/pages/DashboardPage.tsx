import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';
import type { TimeEntry } from '../types';
import './Dashboard.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const totalSeconds = (entries: TimeEntry[]): number =>
  entries.reduce((acc, e) => acc + (e.duration || 0), 0);

// ── Component ──────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [fetching, setFetching] = useState(true);

  // Timer state
  const [task, setTask] = useState('');
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry modal
  const [showManual, setShowManual] = useState(false);
  const [manualTask, setManualTask] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualError, setManualError] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Edit modal
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [timerLoading, setTimerLoading] = useState(false);

  // ── Fetch entries ────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    try {
      const res = await api.get('/entries');
      const data: TimeEntry[] = res.data.data;
      setEntries(data);
      const live = data.find(e => e.isRunning);
      if (live) {
        setRunning(live);
        const secs = Math.floor((Date.now() - new Date(live.startTime).getTime()) / 1000);
        setElapsed(secs);
      }
    } catch {
      // errors handled by axios interceptor (401 → redirect)
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Tick ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (running) {
      tickRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [running]);

  // ── Timer controls ────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!task.trim()) return;
    setTimerLoading(true);
    try {
      const res = await api.post('/entries/start', { task: task.trim() });
      const entry: TimeEntry = res.data.data;
      setRunning(entry);
      setElapsed(0);
      setTask('');
      setEntries(prev => [entry, ...prev.filter(e => !e.isRunning)]);
    } catch { /* silent */ } finally {
      setTimerLoading(false);
    }
  };

  const handleStop = async () => {
    if (!running) return;
    setTimerLoading(true);
    try {
      const res = await api.patch(`/entries/${running._id}/stop`);
      const updated: TimeEntry = res.data.data;
      setRunning(null);
      setElapsed(0);
      setEntries(prev => prev.map(e => e._id === updated._id ? updated : e));
    } catch { /* silent */ } finally {
      setTimerLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await api.delete(`/entries/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
      if (running?._id === id) { setRunning(null); setElapsed(0); }
    } catch { /* silent */ } finally {
      setActionLoading(null);
    }
  };

  // ── Manual entry ──────────────────────────────────────────────────────

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    if (!manualTask.trim() || !manualStart || !manualEnd) {
      setManualError('All fields are required.');
      return;
    }
    setManualLoading(true);
    try {
      const res = await api.post('/entries/manual', {
        task: manualTask.trim(),
        startTime: manualStart,
        endTime: manualEnd,
      });
      setEntries(prev => [res.data.data, ...prev]);
      setShowManual(false);
      setManualTask(''); setManualStart(''); setManualEnd('');
    } catch (err: unknown) {
      setManualError(err instanceof Error ? err.message : 'Failed to add entry.');
    } finally {
      setManualLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────

  const openEdit = (entry: TimeEntry) => { setEditEntry(entry); setEditTask(entry.task); };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry || !editTask.trim()) return;
    setEditLoading(true);
    try {
      const res = await api.patch(`/entries/${editEntry._id}`, { task: editTask.trim() });
      setEntries(prev => prev.map(en => en._id === editEntry._id ? res.data.data : en));
      if (running?._id === editEntry._id) setRunning(res.data.data);
      setEditEntry(null);
    } catch { /* silent */ } finally {
      setEditLoading(false);
    }
  };

  // ── Group by date ─────────────────────────────────────────────────────

  const grouped = entries
    .filter(e => !e.isRunning)
    .reduce<Record<string, TimeEntry[]>>((acc, e) => {
      const d = formatDate(e.createdAt);
      if (!acc[d]) acc[d] = [];
      acc[d].push(e);
      return acc;
    }, {});

  const todayTotal = entries
    .filter(e => {
      const d = new Date(e.createdAt);
      return d.toDateString() === new Date().toDateString();
    })
    .reduce((a, e) => a + (e.isRunning ? elapsed : e.duration), 0);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="dash">

      {/* HEADER */}
      <header className="dash-header">
        <div className="dash-logo">
          <span className="dash-dot" />
          WORKER
        </div>
        <div className="dash-user">
          <span className="dash-name">{user?.name}</span>
          <button className="dash-logout" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* TIMER BAR */}
      <div className="timer-bar">
        <div className="timer-input-wrap">
          <input
            className="timer-input"
            type="text"
            placeholder={running ? running.task : 'What are you working on?'}
            value={task}
            onChange={e => setTask(e.target.value)}
            disabled={!!running}
            onKeyDown={e => { if (e.key === 'Enter' && !running) handleStart(); }}
          />
        </div>

        <div className="timer-right">
          {running && (
            <span className="timer-elapsed">{formatDuration(elapsed)}</span>
          )}
          <button
            className={`timer-btn ${running ? 'timer-btn--stop' : 'timer-btn--start'}`}
            onClick={running ? handleStop : handleStart}
            disabled={timerLoading || (!running && !task.trim())}
          >
            {timerLoading
              ? <span className="btn-loading" />
              : running ? '\u25A0 Stop' : '\u25B6 Start'}
          </button>
          <button className="timer-manual-btn" onClick={() => setShowManual(true)} title="Add manual entry">
            + Manual
          </button>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stat">
          <span className="stat-label">Today</span>
          <span className="stat-val">{formatDuration(todayTotal)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">All time</span>
          <span className="stat-val">{formatDuration(totalSeconds(entries))}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Entries</span>
          <span className="stat-val">{entries.filter(e => !e.isRunning).length}</span>
        </div>
      </div>

      {/* ENTRIES */}
      <main className="dash-main">
        {fetching ? (
          <div className="empty-state">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No entries yet</p>
            <p className="empty-sub">Start a timer or add a manual entry to begin.</p>
          </div>
        ) : (
          <>
            {/* Running entry */}
            {running && (
              <div className="entry-group">
                <div className="group-label">
                  <span><span className="live-dot" />Live</span>
                </div>
                <div className="entry-row entry-row--live">
                  <div className="entry-task">{running.task}</div>
                  <div className="entry-meta">
                    <span className="entry-time">{formatTime(running.startTime)} \u2192 now</span>
                    <span className="entry-dur entry-dur--live">{formatDuration(elapsed)}</span>
                  </div>
                  <div className="entry-actions">
                    <button className="act-btn act-edit" onClick={() => openEdit(running)} title="Edit">\u270E</button>
                  </div>
                </div>
              </div>
            )}

            {/* Grouped past entries */}
            {Object.entries(grouped).map(([date, dayEntries]) => (
              <div className="entry-group" key={date}>
                <div className="group-label">
                  <span>{date}</span>
                  <span className="group-total">{formatDuration(totalSeconds(dayEntries))}</span>
                </div>
                {dayEntries.map(entry => (
                  <div className="entry-row" key={entry._id}>
                    <div className="entry-task">{entry.task}</div>
                    <div className="entry-meta">
                      <span className="entry-time">
                        {formatTime(entry.startTime)}
                        {entry.endTime ? ` \u2192 ${formatTime(entry.endTime)}` : ''}
                      </span>
                      <span className="entry-dur">{formatDuration(entry.duration)}</span>
                    </div>
                    <div className="entry-actions">
                      <button className="act-btn act-edit" onClick={() => openEdit(entry)} title="Edit">\u270E</button>
                      <button
                        className="act-btn act-del"
                        onClick={() => handleDelete(entry._id)}
                        disabled={actionLoading === entry._id}
                        title="Delete"
                      >
                        {actionLoading === entry._id ? '\u2026' : '\u00D7'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </main>

      {/* MANUAL ENTRY MODAL */}
      {showManual && (
        <div className="modal-overlay" onClick={() => setShowManual(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Manual Entry</h2>
              <button className="modal-close" onClick={() => setShowManual(false)}>\u00D7</button>
            </div>
            {manualError && <div className="modal-error">{manualError}</div>}
            <form onSubmit={handleManual} className="modal-form">
              <div className="field">
                <label>Task</label>
                <input
                  type="text"
                  value={manualTask}
                  onChange={e => setManualTask(e.target.value)}
                  placeholder="What did you work on?"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={manualStart}
                  onChange={e => setManualStart(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>End Time</label>
                <input
                  type="datetime-local"
                  value={manualEnd}
                  onChange={e => setManualEnd(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setShowManual(false)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={manualLoading}>
                  {manualLoading ? <span className="btn-loading btn-loading--dark" /> : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editEntry && (
        <div className="modal-overlay" onClick={() => setEditEntry(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Entry</h2>
              <button className="modal-close" onClick={() => setEditEntry(null)}>\u00D7</button>
            </div>
            <form onSubmit={handleEdit} className="modal-form">
              <div className="field">
                <label>Task Name</label>
                <input
                  type="text"
                  value={editTask}
                  onChange={e => setEditTask(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setEditEntry(null)}>Cancel</button>
                <button type="submit" className="modal-submit" disabled={editLoading}>
                  {editLoading ? <span className="btn-loading btn-loading--dark" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
