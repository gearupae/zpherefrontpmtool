import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PAIWorkspace from '../../components/AI/PAIWorkspace';
import AILanding from '../../components/AI/AILanding';
import { detectTenantContext } from '../../utils/tenantUtils';

const AIDashboardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tenantSlug = useMemo(() => {
    try {
      const tc = detectTenantContext(undefined, undefined);
      return tc?.tenantSlug || null;
    } catch {
      return null;
    }
  }, []);

  const historyKey = useMemo(() => {
    if (tenantSlug) return `pai_chat_history:${tenantSlug}`;
    // fallback to first path segment if slug unknown
    try {
      const parts = (window.location.pathname || '').split('/').filter(Boolean);
      if (parts.length >= 1) return `pai_chat_history:${parts[0]}`;
    } catch {}
    return 'pai_chat_history:default';
  }, [tenantSlug]);

  const params = new URLSearchParams(location.search);
  const chatParam = params.get('chat');

  const [hasHistory, setHasHistory] = useState<boolean>(false);
  const [hasIntent, setHasIntent] = useState<boolean>(() => {
    try { return sessionStorage.getItem('pai_start_intent') === '1'; } catch { return false; }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(historyKey);
      if (raw) {
        const arr = JSON.parse(raw);
        setHasHistory(Array.isArray(arr) && arr.length > 0);
      }
    } catch {
      setHasHistory(false);
    }
  }, [historyKey]);

  const startChat = ({ message, attachments }: { message: string; attachments: { filename: string; url: string }[] }) => {
    // Guard: only navigate to chat if there is a real message or at least one attachment
    const raw = message ?? '';
    const trimmed = raw.trim();
    const hasMessage = trimmed.length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!hasMessage && !hasAttachments) {
      return; // do nothing if the landing page is interacted with but nothing was provided
    }

    // Compose a bootstrap message including attachment links
    let composed = trimmed;
    if (hasAttachments) {
      const parts = attachments.map((a) => `${a.filename}: ${a.url}`);
      const attachText = `Attached files:\n${parts.join('\n')}`;
      composed = composed ? `${composed}\n\n${attachText}` : attachText;
    }

    // Mark explicit chat start intent + stash bootstrap message
    try {
      sessionStorage.setItem('pai_start_intent', '1');
      sessionStorage.setItem('pai_bootstrap_message', composed);
    } catch {}
    setHasIntent(true);

    const u = new URL(window.location.href);
    u.searchParams.set('chat', '1');
    navigate(`${u.pathname}${u.search}`, { replace: true });
  };

  // If deep-linked with chat=1, auto-start chat
  useEffect(() => {
    if (chatParam) {
      try { sessionStorage.setItem('pai_start_intent', '1'); } catch {}
      setHasIntent(true);
    }
  }, [chatParam]);

  // Clear intent when not in chat
  useEffect(() => {
    if (!chatParam) {
      try { sessionStorage.removeItem('pai_start_intent'); } catch {}
      setHasIntent(false);
    }
  }, [chatParam]);

  // Only show chat if we have chat=1
  const showLanding = !chatParam;

  // Lock body scroll when on AI page
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
    
  return (
    <div className="overflow-hidden -mx-3 sm:-mx-4 lg:-mx-6 -mt-4 -mb-4" style={{ height: 'calc(100vh - 64px)' }}>
      {showLanding ? (
        <AILanding
          onStartChat={startChat}
          onFocusToChat={() => {
            try {
              sessionStorage.setItem('pai_start_intent', '1');
              sessionStorage.removeItem('pai_bootstrap_message');
            } catch {}
            const u = new URL(window.location.href);
            u.searchParams.set('chat', '1');
            navigate(`${u.pathname}${u.search}`, { replace: true });
          }}
        />
      ) : (
        <PAIWorkspace />
      )}
    </div>
  );
};

export default AIDashboardPage;

