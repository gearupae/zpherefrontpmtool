import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../../components/Views/CalendarView';
import apiClient from '../../api/client';
import DateRangeCalendar from '../../components/UI/DateRangeCalendar';
import { FunnelIcon } from '@heroicons/react/24/outline';

interface CalendarEventDTO {
  id: string;
  entity_type: 'task' | 'project' | 'goal' | string;
  title: string;
  start: string;
  end?: string;
  status?: string;
  priority?: string;
  url?: string;
}

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterTypes, setFilterTypes] = useState<{task: boolean; project: boolean; goal: boolean; user_expiry: boolean}>({ task: true, project: true, goal: true, user_expiry: true });
  const navigate = useNavigate();

  const loadEvents = async (opts?: { start?: string | null; end?: string | null }) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (opts?.start) params.start = opts.start;
      if (opts?.end) params.end = opts.end;
      const res = await apiClient.get('/calendar/events/', { params });
      const payload: any = res.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.results)
          ? payload.results
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload?.events)
                ? payload.events
                : [];
      setEvents(list);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEvents = useMemo(() => {
    const activeTypes = new Set(Object.entries(filterTypes).filter(([_, v]) => v).map(([k]) => k));
    return (events || []).filter((ev: any) => activeTypes.has(ev.entity_type || ev.type || ev.kind || 'project'));
  }, [events, filterTypes]);

  const handleClick = (id: string, url?: string) => {
    if (url) navigate(url);
  };

  const handleDateRangeChange = (from: string | null, to: string | null) => {
    setFromDate(from || '');
    setToDate(to || '');
  };

  const applyDateFilter = () => {
    // Use ISO-like strings without 'Z' to satisfy Python datetime.fromisoformat
    const startStr = fromDate ? `${fromDate}T00:00:00` : null;
    const endStr = toDate ? `${toDate}T23:59:59` : null;
    loadEvents({ start: startStr, end: endStr });
    setShowDateFilter(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-600 mt-1">All projects, tasks, goals, and key dates</p>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowDateFilter(v => !v)}
            className="inline-flex items-center space-x-2 rounded-md text-sm font-medium transition-colors shadow-sm border bg-white text-gray-900 border-gray-200 hover:bg-gray-50"
            title="Filter by date range"
          >
            <FunnelIcon className="w-4 h-4" />
            <span>Date range</span>
            {(fromDate || toDate) && (
              <span className="ml-1 text-xs text-gray-500">{fromDate || '...'} → {toDate || '...'}</span>
            )}
          </button>
          {showDateFilter && (
            <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow-lg p-3 z-50" onClick={(e) => e.stopPropagation()}>
              <DateRangeCalendar initialFrom={fromDate || null} initialTo={toDate || null} onChange={handleDateRangeChange} size="sm" />
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-3">
                  {(['task','project','goal','user_expiry'] as const).map((k) => (
                    <label key={k} className="flex items-center space-x-1 text-xs text-gray-700">
                      <input type="checkbox" className="rounded" checked={(filterTypes as any)[k]} onChange={(e) => setFilterTypes(prev => ({ ...prev, [k]: e.target.checked }))} />
                      <span className="capitalize">{k.replace('_',' ')}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="text-sm px-2 py-1 rounded border" onClick={() => { setFromDate(''); setToDate(''); setFilterTypes({task:true,project:true,goal:true,user_expiry:true}); loadEvents(); setShowDateFilter(false); }}>Reset</button>
                  <button className="text-sm px-2 py-1 rounded bg-black text-white" onClick={applyDateFilter}>Apply</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <CalendarView type="mixed" events={filteredEvents as any} onItemClick={handleClick} />
    </div>
  );
};

export default CalendarPage;
