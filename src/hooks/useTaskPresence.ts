import { useEffect, useMemo, useRef, useState } from 'react';

export type PresenceMode = 'viewing' | 'editing';

export type PresenceMember = {
  userId: string;
  user?: { id: string; name?: string; avatar?: string | null };
  mode: PresenceMode;
  cursor?: any;
  ts: number;
};

export type TypingEvent = {
  taskId: string;
  field: string;
  preview?: string;
  userId: string;
  ts: number;
};

export type CommentEvent = {
  taskId: string;
  authorId?: string;
  authorName?: string;
  content: string;
  ts: number;
};

export function useTaskPresence(taskId: string | undefined, initialMode: PresenceMode = 'viewing') {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [mode, setModeState] = useState<PresenceMode>(initialMode);
  const [lastTyping, setLastTyping] = useState<TypingEvent | null>(null);
  const [lastComment, setLastComment] = useState<CommentEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null), []);

  // Helper to upsert a member in local state
  const upsertMember = (patch: Partial<PresenceMember> & { userId: string }) => {
    setMembers((prev) => {
      const i = prev.findIndex((m) => m.userId === patch.userId);
      if (i === -1) return [...prev, { mode: 'viewing', ts: Date.now(), ...patch } as PresenceMember];
      const next = [...prev];
      next[i] = { ...next[i], ...patch, ts: patch.ts ?? Date.now() } as PresenceMember;
      return next;
    });
  };

  useEffect(() => {
    if (!taskId || !token) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host || 'localhost:8000';
    const wsUrl = `${proto}://${host}/api/v1/ws/tasks/${taskId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Join presence right away
      try {
        ws.send(JSON.stringify({ type: 'presence:join', mode }));
      } catch {}
      // Start heartbeat
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = window.setInterval(() => {
        try { ws.send(JSON.stringify({ type: 'presence:heartbeat', mode })); } catch {}
      }, 5000) as any;
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'presence:snapshot') {
          const snapshot = Array.isArray(msg.members) ? msg.members : [];
          // Normalize to PresenceMember shape
          const normalized: PresenceMember[] = snapshot.map((m: any) => ({
            userId: m.userId || m.user?.id,
            user: m.user,
            mode: (m.mode === 'editing' ? 'editing' : 'viewing') as PresenceMode,
            cursor: m.cursor,
            ts: Number(m.ts) || Date.now(),
          })).filter((m: PresenceMember) => !!m.userId);
          setMembers(normalized);
        } else if (msg.type === 'presence:update') {
          const userId = msg.user?.id;
          if (userId) {
            upsertMember({ userId, user: msg.user, mode: msg.mode === 'editing' ? 'editing' : 'viewing', cursor: msg.cursor, ts: Number(msg.ts) || Date.now() });
          }
        } else if (msg.type === 'cursor:update') {
          if (msg.userId) upsertMember({ userId: msg.userId, cursor: msg.cursor, ts: Number(msg.ts) || Date.now() });
        } else if (msg.type === 'typing:update') {
          setLastTyping({ taskId: msg.taskId, field: msg.field, preview: msg.preview, userId: msg.userId, ts: Number(msg.ts) || Date.now() });
        } else if (msg.type === 'task:patched') {
          // No-op here; pages may refetch if needed
        } else if (msg.type === 'task_comment' || msg.type === 'comment:new') {
          const ts = (typeof msg.timestamp === 'string' ? Date.parse(msg.timestamp) : Number(msg.ts)) || Date.now();
          const authorName = msg.author || (msg.user ? `${msg.user.first_name || ''} ${msg.user.last_name || ''}`.trim() : undefined);
          setLastComment({ taskId, authorId: msg.author_id, authorName, content: msg.content, ts });
        }
      } catch (e) {
        // ignore JSON errors
      }
    };

    ws.onclose = () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null as any;
      }
      wsRef.current = null;
    };

    ws.onerror = () => {
      // just drop; onclose will cleanup
    };

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null as any;
      }
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [taskId, token]);

  const setMode = (m: PresenceMode) => {
    setModeState(m);
    try { wsRef.current?.send(JSON.stringify({ type: 'presence:heartbeat', mode: m })); } catch {}
  };

  const sendTyping = useMemo(() => {
    let t: number | null = null;
    return (field: string, preview?: string) => {
      if (!wsRef.current) return;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        try { wsRef.current?.send(JSON.stringify({ type: 'typing:update', taskId, field, preview })); } catch {}
      }, 180) as any;
    };
  }, [taskId]);

  const sendCursor = useMemo(() => {
    let last = 0;
    return (cursor: any) => {
      const now = performance.now();
      if (now - last > 70) {
        last = now;
        try { wsRef.current?.send(JSON.stringify({ type: 'cursor:update', taskId, cursor })); } catch {}
      }
    };
  }, [taskId]);

  const patchTask = (patch: Record<string, any>) => {
    try { wsRef.current?.send(JSON.stringify({ type: 'task:patch', taskId, patch })); } catch {}
  };

  const addComment = (content: string, parent_comment_id?: string) => {
    try { wsRef.current?.send(JSON.stringify({ type: 'comment:new', taskId, content, parent_comment_id })); } catch {}
  };

  return { members, mode, setMode, sendTyping, sendCursor, patchTask, addComment, lastTyping, lastComment };
}
