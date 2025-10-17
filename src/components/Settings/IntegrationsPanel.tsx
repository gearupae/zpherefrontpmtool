import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';

interface MeetForm {
  title: string;
  start: string; // datetime-local value
  duration_minutes: number;
  attendees: string; // comma-separated
  add_to_calendar: boolean;
}

interface WhatsAppForm {
  to_phone: string;
  message: string;
}

const IntegrationsPanel: React.FC = () => {
  // Connection statuses
  const [googleConnected, setGoogleConnected] = useState(false);
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [waConnected, setWaConnected] = useState(false);

  // Forms
  const [googleForm, setGoogleForm] = useState<MeetForm>({
    title: '',
    start: '',
    duration_minutes: 30,
    attendees: '',
    add_to_calendar: true,
  });

  const [teamsForm, setTeamsForm] = useState<MeetForm>({
    title: '',
    start: '',
    duration_minutes: 30,
    attendees: '',
    add_to_calendar: true,
  });

  const [waForm, setWaForm] = useState<WhatsAppForm>({
    to_phone: '',
    message: 'Hello from Zphere — this is a test notification.'
  });

  const attendeeListGoogle = useMemo(() => googleForm.attendees.split(/[,\s]+/).filter(Boolean), [googleForm.attendees]);
  const attendeeListTeams = useMemo(() => teamsForm.attendees.split(/[,\s]+/).filter(Boolean), [teamsForm.attendees]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const [g, m, w] = await Promise.all([
          apiClient.get('/integrations/google/status/'),
          apiClient.get('/integrations/microsoft/status/'),
          apiClient.get('/notifications/whatsapp/status/'),
        ]);
        setGoogleConnected(Boolean(g.data?.connected));
        setTeamsConnected(Boolean(m.data?.connected));
        setWaConnected(Boolean(w.data?.connected));
      } catch (e) {
        // leave defaults if any call fails
      }
    };
    fetchStatuses();
  }, []);

  const startOAuth = async (provider: 'google' | 'microsoft' | 'whatsapp') => {
    try {
      const res = await apiClient.get(`/integrations/${provider}/oauth/start/`);
      const url = (res.data && (res.data.auth_url || res.data.url)) || '';
      if (url) {
        window.location.href = url;
        return;
      }
    } catch (e) {
      // Fallback to direct API path if backend returns a redirect directly
      window.location.href = `/api/v1/integrations/${provider}/oauth/start/`;
    }
  };

  const scheduleGoogleMeet = async () => {
    try {
      const payload = {
        title: googleForm.title,
        start: new Date(googleForm.start).toISOString(),
        duration_minutes: Number(googleForm.duration_minutes) || 30,
        attendees: attendeeListGoogle,
        add_to_calendar: googleForm.add_to_calendar,
      };
      const res = await apiClient.post('/calendar/google/meet/schedule/', payload);
      alert('Google Meet created. Join link: ' + (res.data?.join_url || res.data?.hangoutLink || 'created'));
    } catch (e: any) {
      alert('Failed to create Google Meet. Configure OAuth first.');
    }
  };

  const scheduleTeamsMeeting = async () => {
    try {
      const payload = {
        title: teamsForm.title,
        start: new Date(teamsForm.start).toISOString(),
        duration_minutes: Number(teamsForm.duration_minutes) || 30,
        attendees: attendeeListTeams,
        add_to_calendar: teamsForm.add_to_calendar,
      };
      const res = await apiClient.post('/calendar/teams/meeting/schedule/', payload);
      alert('Teams meeting created. Join link: ' + (res.data?.join_url || 'created'));
    } catch (e: any) {
      alert('Failed to create Teams meeting. Configure OAuth first.');
    }
  };

  const sendWhatsApp = async () => {
    try {
      const payload = {
        to: waForm.to_phone,
        message: waForm.message,
      };
      await apiClient.post('/notifications/whatsapp/send/', payload);
      alert('WhatsApp message sent');
    } catch (e: any) {
      alert('Failed to send WhatsApp message. Configure provider first.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Google Meet */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VideoCameraIcon className="h-5 w-5 text-black" />
            <div>
              <h3 className="text-base font-medium text-black">Google Meet</h3>
              <p className="text-xs text-gray-600">Create Meet links and optionally add to Google Calendar</p>
            </div>
          </div>
          <div>
            {googleConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800"><CheckCircleIcon className="h-4 w-4"/> Connected</span>
            ) : (
              <button onClick={() => startOAuth('google')} className="px-3.5 text-sm rounded-md bg-black text-white hover:bg-gray-800">Connect</button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={googleForm.title} onChange={(e) => setGoogleForm(prev => ({...prev, title: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" placeholder="Project sync meeting" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="datetime-local" value={googleForm.start} onChange={(e) => setGoogleForm(prev => ({...prev, start: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" min={5} step={5} value={googleForm.duration_minutes} onChange={(e) => setGoogleForm(prev => ({...prev, duration_minutes: Number(e.target.value)}))} className="w-full py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attendees (emails)</label>
              <input type="text" value={googleForm.attendees} onChange={(e) => setGoogleForm(prev => ({...prev, attendees: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" placeholder="a@x.com, b@y.com" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={googleForm.add_to_calendar} onChange={(e) => setGoogleForm(prev => ({...prev, add_to_calendar: e.target.checked}))} />
              <CalendarIcon className="h-4 w-4" />
              Add to Google Calendar
            </label>
            <button onClick={scheduleGoogleMeet} className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">Create Meet</button>
          </div>
        </div>
      </div>

      {/* Microsoft Teams */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VideoCameraIcon className="h-5 w-5 text-black" />
            <div>
              <h3 className="text-base font-medium text-black">Microsoft Teams</h3>
              <p className="text-xs text-gray-600">Create Teams meetings and optionally add to Outlook calendar</p>
            </div>
          </div>
          <div>
            {teamsConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800"><CheckCircleIcon className="h-4 w-4"/> Connected</span>
            ) : (
              <button onClick={() => startOAuth('microsoft')} className="px-3.5 text-sm rounded-md bg-black text-white hover:bg-gray-800">Connect</button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={teamsForm.title} onChange={(e) => setTeamsForm(prev => ({...prev, title: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" placeholder="Stakeholder review" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="datetime-local" value={teamsForm.start} onChange={(e) => setTeamsForm(prev => ({...prev, start: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" min={5} step={5} value={teamsForm.duration_minutes} onChange={(e) => setTeamsForm(prev => ({...prev, duration_minutes: Number(e.target.value)}))} className="w-full py-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attendees (emails)</label>
              <input type="text" value={teamsForm.attendees} onChange={(e) => setTeamsForm(prev => ({...prev, attendees: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" placeholder="a@x.com, b@y.com" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={teamsForm.add_to_calendar} onChange={(e) => setTeamsForm(prev => ({...prev, add_to_calendar: e.target.checked}))} />
              <CalendarIcon className="h-4 w-4" />
              Add to Outlook Calendar
            </label>
            <button onClick={scheduleTeamsMeeting} className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">Create Teams Meeting</button>
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-black" />
            <div>
              <h3 className="text-base font-medium text-black">WhatsApp Notifications</h3>
              <p className="text-xs text-gray-600">Send project/task updates to WhatsApp</p>
            </div>
          </div>
          <div>
            {waConnected ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800"><CheckCircleIcon className="h-4 w-4"/> Connected</span>
            ) : (
              <button onClick={() => startOAuth('whatsapp')} className="px-3.5 text-sm rounded-md bg-black text-white hover:bg-gray-800">Connect</button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To (phone with country code)</label>
              <input type="tel" value={waForm.to_phone} onChange={(e) => setWaForm(prev => ({...prev, to_phone: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" placeholder="+15551234567" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={waForm.message} onChange={(e) => setWaForm(prev => ({...prev, message: e.target.value}))} className="w-full py-2 border border-gray-300 rounded-md" rows={3} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Configure Meta Cloud API or Twilio credentials in backend .env
            </div>
            <button onClick={sendWhatsApp} className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">Send Test</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;
