import React, { useEffect, useRef, useState } from 'react';
import { useAppDispatch } from '../../hooks/redux';
import { addNotification } from '../../store/slices/notificationSlice';
import { transcribeAudio, summarizeProject, extractTasks, ExtractedTask } from '../../services/grokService';
import apiClient from '../../api/client';
import { MicrophoneIcon, StopIcon, CheckCircleIcon, DocumentTextIcon, MusicalNoteIcon } from '@heroicons/react/24/outline';

interface ListenMeetingButtonProps {
  context?: 'project' | 'task';
  projectId?: string; // optional; inferred from URL if missing
}

const ListenMeetingButton: React.FC<ListenMeetingButtonProps> = ({ context, projectId }) => {
  const dispatch = useAppDispatch();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState<'idle' | 'transcribing' | 'summarizing' | 'creating'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<{ description?: string; details?: any } | null>(null);
  const [createdTasks, setCreatedTasks] = useState<number>(0);
  const [showPanel, setShowPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
    };
  }, []);

  function getContextFromLocation(): { inferredContext: 'project' | 'task' | null; projectId?: string; taskId?: string } {
    try {
      const path = window.location.pathname || '';
      const parts = path.split('/').filter(Boolean);
      // Support tenant slug at index 0 (e.g., /{slug}/projects/:id)
      let idx = 0;
      if (parts.length >= 2 && !['projects','tasks'].includes(parts[0]) && ['projects','tasks'].includes(parts[1])) {
        idx = 1;
      }
      const section = parts[idx];
      const id = parts[idx + 1];
      if (section === 'projects' && id) {
        return { inferredContext: 'project', projectId: id };
      }
      if (section === 'tasks' && id) {
        return { inferredContext: 'task', taskId: id };
      }
    } catch {}
    return { inferredContext: null };
  }

  const startRecording = async () => {
    setError(null);
    setTranscript('');
    setSummary(null);
    setCreatedTasks(0);
    setShowPanel(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ];
      let mimeType = '';
      for (const cand of mimeCandidates) {
        if ((window as any).MediaRecorder && MediaRecorder.isTypeSupported(cand)) { mimeType = cand; break; }
      }
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        try {
          setProcessing('transcribing');
          const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
          const tr = await transcribeAudio(blob);
          setTranscript(tr.text || '');
          setProcessing('idle');
          dispatch(addNotification({ type: 'success', title: 'Transcribed', message: 'Audio transcription completed.', duration: 3000 }));

          const inferred = getContextFromLocation();
          const ctx = context || inferred.inferredContext || 'project';
          if (ctx === 'project') {
            // Await manual click to create project
          } else if (ctx === 'task') {
            // Extract and auto-create tasks (infer projectId if not provided)
            await handleExtractAndCreateTasks(tr.text || '', projectId || inferred.projectId, inferred.taskId);
          }
        } catch (e: any) {
          console.error(e);
          setProcessing('idle');
          setError(e?.response?.data?.detail || e?.message || 'Transcription failed');
          dispatch(addNotification({ type: 'error', title: 'Transcription failed', message: String(error || 'Please try again.'), duration: 5000 }));
        }
      };
      mr.start(250);
      setRecording(true);
      dispatch(addNotification({ type: 'info', title: 'Recording', message: 'Listening… click again to stop.', duration: 2000 }));
    } catch (e: any) {
      console.error('Mic access failed', e);
      setError('Microphone access denied or unavailable.');
      setShowPanel(true);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    } catch (e) {
      console.warn('Stop recording failed', e);
      setRecording(false);
    }
  };

  const handleSummarizeAndCreateProject = async () => {
    if (!transcript) return;
    try {
      setProcessing('summarizing');
      const result = await summarizeProject(transcript);
      setSummary(result);
      const name = result.details?.name || 'AI Project from Meeting';
      const description = result.description || transcript.slice(0, 2000);
      const priority = (result.details?.priority as any) || 'medium';
      const dueDateIso = result.details?.due_date ? new Date(result.details.due_date).toISOString() : undefined;
      const tags = Array.isArray(result.details?.tags) ? (result.details?.tags as string[]) : [];

      setProcessing('creating');
      const payload: any = {
        name,
        description,
        status: 'planning',
        priority,
        due_date: dueDateIso,
        custom_fields: { tags },
      };
      const resp = await apiClient.post('/projects/', payload);
      setProcessing('idle');
      dispatch(addNotification({ type: 'success', title: 'Project Created', message: `Created: ${resp.data?.name || name}`, duration: 4000 }));
    } catch (e: any) {
      console.error(e);
      setProcessing('idle');
      setError(e?.response?.data?.detail || e?.message || 'Summarization or project creation failed');
      dispatch(addNotification({ type: 'error', title: 'Create Project failed', message: String(error || 'Please try again.'), duration: 5000 }));
    }
  };

  const handleExtractAndCreateTasks = async (fullText: string, projectId?: string, taskIdFromUrl?: string) => {
    try {
      setProcessing('summarizing');
      // Determine projectId if missing
      let pid = projectId;
      if (!pid) {
        // If we have a task id, fetch it to get project_id
        const inferred = getContextFromLocation();
        const tid = taskIdFromUrl || inferred.taskId;
        if (tid) {
          try {
            const res = await apiClient.get(`/tasks/${tid}`);
            pid = res.data?.project_id || pid;
          } catch (e) {
            console.warn('Failed to fetch task to infer project_id', e);
          }
        }
        // Or check URL for /projects/:id
        if (!pid && inferred.projectId) {
          pid = inferred.projectId;
        }
      }
      if (!pid) {
        setProcessing('idle');
        setError('Cannot determine project to create tasks. Please navigate to a Project or Task page.');
        return;
      }
      const tasks = await extractTasks(fullText, pid);
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setProcessing('idle');
        dispatch(addNotification({ type: 'info', title: 'No Tasks Found', message: 'No actionable tasks were extracted.', duration: 4000 }));
        return;
      }
      setProcessing('creating');
      let created = 0;
      for (const t of tasks) {
        try {
          const data: any = {
            title: (t.title || '').slice(0, 100) || 'Untitled Task',
            description: t.description || undefined,
            project_id: projectId,
            status: 'todo', // treat as draft
            priority: (t.priority || 'medium').toLowerCase(),
          };
          if (t.due_date) {
            const d = new Date(t.due_date);
            if (!isNaN(d.getTime())) data.due_date = d.toISOString();
          }
          await apiClient.post('/tasks/', data);
          created += 1;
          setCreatedTasks(created);
        } catch (e) {
          console.warn('Task create failed for', t.title, e);
        }
      }
      setProcessing('idle');
      dispatch(addNotification({ type: 'success', title: 'Tasks Created', message: `Created ${created} tasks.`, duration: 4000 }));
    } catch (e: any) {
      console.error(e);
      setProcessing('idle');
      setError(e?.response?.data?.detail || e?.message || 'Task extraction failed');
      dispatch(addNotification({ type: 'error', title: 'Task Extraction failed', message: String(error || 'Please try again.'), duration: 5000 }));
    }
  };

  const onClick = () => {
    if (recording) return stopRecording();
    startRecording();
  };

  const busy = recording || processing !== 'idle';

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors shadow-sm border ${recording ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'}`}
        title={recording ? 'Stop Recording' : 'Listen Meeting'}
        aria-label="Listen Meeting"
        disabled={busy && !recording}
      >
        {recording ? (
          <StopIcon className="h-5 w-5 mr-2" />
        ) : (
          <MicrophoneIcon className="h-5 w-5 mr-2" />
        )}
        {recording ? 'Stop' : 'Listen Meeting'}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-[420px] bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-medium">Meeting Assistant</div>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowPanel(false)}>×</button>
          </div>
          <div className="p-3 space-y-3 max-h-[60vh] overflow-auto">
            {recording && (
              <div className="text-sm text-red-600 flex items-center"><MusicalNoteIcon className="h-4 w-4 mr-1" />Recording… speak now</div>
            )}
            {processing === 'transcribing' && (
              <div className="text-sm text-gray-600">Transcribing audio…</div>
            )}
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            {transcript && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Transcription</div>
                <div className="text-sm whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-2 max-h-40 overflow-auto">{transcript}</div>
              </div>
            )}
            {context === 'project' && transcript && (
              <div className="pt-2">
                <button
                  onClick={handleSummarizeAndCreateProject}
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-user-blue text-white hover:bg-user-blue"
                  disabled={processing !== 'idle'}
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Create Project from Summary
                </button>
                {summary?.description && (
                  <div className="mt-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded p-2">
                    {summary.description}
                  </div>
                )}
              </div>
            )}
            {context === 'task' && createdTasks > 0 && (
              <div className="flex items-center text-sm text-green-700"><CheckCircleIcon className="h-4 w-4 mr-1" />Created {createdTasks} tasks</div>
            )}
            {processing !== 'idle' && !recording && (
              <div className="text-xs text-gray-500">Working…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ListenMeetingButton;
