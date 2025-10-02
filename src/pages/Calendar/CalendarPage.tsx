import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CalendarView from '../../components/Views/CalendarView';
import apiClient from '../../api/client';

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
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/calendar/events');
        setEvents(res.data || []);
      } catch (e) {
        // ignore for now; could add toast
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleClick = (id: string, url?: string) => {
    if (url) navigate(url);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-gray-500">All projects, tasks, and goals with dates</p>
      </div>
      <CalendarView type="mixed" events={events as any} onItemClick={handleClick} />
    </div>
  );
};

export default CalendarPage;
