import React from 'react';
import apiClient from '../../api/client';

declare global {
  interface Window {
    google?: any;
  }
}

interface Props {
  onSuccess?: () => void;
}

const GoogleSignIn: React.FC<Props> = ({ onSuccess }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  React.useEffect(() => {
    if (!clientId) return; // not configured
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [clientId]);

  React.useEffect(() => {
    if (!ready || !clientId || !ref.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        const id_token = response.credential;
        try {
          const resp = await apiClient.post('auth/google', { id_token });
          const { access_token, refresh_token } = resp.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          window.location.href = '/pricing';
          onSuccess?.();
        } catch (e) {
          console.error('Google login failed', e);
        }
      },
    });
    window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', width: 320 });
  }, [ready, clientId, onSuccess]);

  if (!clientId) return null; // hide if not configured
  return <div className="flex justify-center"><div ref={ref} /></div>;
};

export default GoogleSignIn;
