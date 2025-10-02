import React, { useEffect, useState } from 'react';
import { EmailConfig, EmailConfigUpdate, getEmailConfig, updateEmailConfig, sendEmailTest } from '../../api/email';

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Status flags from server
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Form fields
  const [provider, setProvider] = useState<string>('smtp');
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<number>(587);
  const [security, setSecurity] = useState<string>('starttls');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fromEmail, setFromEmail] = useState<string>('');
  const [fromName, setFromName] = useState<string>('');

  // Test send
  const [testTo, setTestTo] = useState<string>('');
  const [testSubject, setTestSubject] = useState<string>('Test Email from Zphere');
  const [testBody, setTestBody] = useState<string>('Hello! This is a test email.');
  const [testHtml, setTestHtml] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getEmailConfig();
        if (!mounted) return;
        setProvider(cfg.provider || 'smtp');
        setHost(cfg.host || '');
        setPort(cfg.port ?? 587);
        setSecurity(cfg.security || 'starttls');
        setUsername(cfg.username || '');
        setFromEmail(cfg.from_email || '');
        setFromName(cfg.from_name || '');
        setIsActive(cfg.is_active);
        setIsConfigured(Boolean(cfg.is_configured));
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to load email config');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const validate = (): string | null => {
    if (provider === 'smtp') {
      if (!host.trim()) return 'Host is required for SMTP provider.';
      if (!port || port <= 0) return 'Port must be a positive number.';
    }
    if (password && !username) return 'Username is required when setting a new password.';
    if (!fromEmail) return 'From Email is recommended for proper delivery.';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      const payload: EmailConfigUpdate = {
        provider,
        host: provider === 'smtp' ? host : undefined,
        port: provider === 'smtp' ? port : undefined,
        security: provider === 'smtp' ? security : undefined,
        username: username || undefined,
        password: password || undefined, // only set if provided
        from_email: fromEmail || undefined,
        from_name: fromName || undefined,
        is_active: isActive,
      };
      const saved = await updateEmailConfig(payload);
      setIsConfigured(Boolean(saved.is_configured));
      setIsActive(Boolean(saved.is_active));
      setMessage('Email configuration saved.');
      setPassword(''); // don't keep password in memory
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!testTo) {
      setError('Please provide a recipient address for the test email.');
      return;
    }
    setTesting(true);
    try {
      await sendEmailTest({ to: testTo, subject: testSubject, body: testBody, html: testHtml });
      setMessage('Test email sent successfully.');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const renderProviderHelp = () => {
    if (provider === 'gmail') {
      return (
        <div className="p-3 border rounded bg-gray-50 text-sm text-gray-700">
          Gmail notes:
          <ul className="list-disc ml-5">
            <li>Use an App Password if 2FA is enabled.</li>
            <li>From email should match your Gmail address.</li>
            <li>SMTP host/port/security are preconfigured server-side (smtp.gmail.com:587 STARTTLS).</li>
          </ul>
        </div>
      );
    }
    if (provider === 'outlook') {
      return (
        <div className="p-3 border rounded bg-gray-50 text-sm text-gray-700">
          Outlook/Office 365 notes:
          <ul className="list-disc ml-5">
            <li>Use an App Password or mailbox password per your org policy.</li>
            <li>From email should be your mailbox address.</li>
            <li>SMTP host/port/security are preconfigured server-side (smtp.office365.com:587 STARTTLS).</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Email Settings</h1>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs rounded ${isConfigured ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'}`}>
            {isConfigured ? 'Configured' : 'Not Configured'}
          </span>
          <span className={`px-2 py-1 text-xs rounded ${isActive ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {(message || error) && (
            <div className={`p-3 rounded border ${error ? 'text-red-700 border-red-300 bg-red-50' : 'text-green-700 border-green-300 bg-green-50'}`}>
              {error || message}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm text-gray-600">Provider</label>
              <select
                className="border rounded p-2"
                value={provider}
                onChange={(e) => {
                  const val = e.target.value;
                  setProvider(val);
                  // Reset SMTP-only fields when switching away to avoid confusion
                  if (val !== 'smtp') {
                    setHost('');
                    setPort(587);
                    setSecurity('starttls');
                  }
                }}
              >
                <option value="smtp">SMTP</option>
                <option value="gmail">Gmail / GSuite</option>
                <option value="outlook">Outlook / Office 365</option>
              </select>
              <p className="text-xs text-gray-500">Gmail/Outlook usually require an app password when 2FA is enabled.</p>
            </div>

            {provider === 'smtp' && (
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div>
                  <label className="block text-sm text-gray-600">Host</label>
                  <input className="border rounded p-2 w-full" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Port</label>
                  <input type="number" className="border rounded p-2 w-full" value={port} onChange={(e) => setPort(parseInt(e.target.value || '587', 10))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Security</label>
                  <select className="border rounded p-2 w-full" value={security} onChange={(e) => setSecurity(e.target.value)}>
                    <option value="starttls">STARTTLS</option>
                    <option value="ssl">SSL/TLS</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            )}

            {renderProviderHelp()}

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-sm text-gray-600">Username</label>
                <input className="border rounded p-2 w-full" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">Password (app password)</label>
                <input type="password" className="border rounded p-2 w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-gray-500">We only store new passwords you provide (encrypted). Leave blank to keep existing.</p>
              </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-sm text-gray-600">From Email</label>
                <input className="border rounded p-2 w-full" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm text-gray-600">From Name</label>
                <input className="border rounded p-2 w-full" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Name or Org" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>

            <div>
              <button type="submit" className="border rounded p-2 bg-white" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          <div className="space-y-2 pt-6">
            <h2 className="text-lg font-semibold">Send Test Email</h2>
            <form onSubmit={handleTest} className="space-y-3">
              <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="block text-sm text-gray-600">To</label>
                  <input className="border rounded p-2 w-full" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="recipient@example.com" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Subject</label>
                  <input className="border rounded p-2 w-full" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Body</label>
                <textarea className="border rounded p-2 w-full" rows={4} value={testBody} onChange={(e) => setTestBody(e.target.value)} />
              </div>
              <div className="flex items-center space-x-2">
                <input id="html" type="checkbox" checked={testHtml} onChange={(e) => setTestHtml(e.target.checked)} />
                <label htmlFor="html" className="text-sm text-gray-700">Send as HTML</label>
              </div>
              <div>
                <button type="submit" className="border rounded p-2 bg-white" disabled={testing}>
                  {testing ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500">Note: Gmail/Outlook often require an App Password if 2FA is enabled.</p>
          </div>
        </>
      )}
    </div>
  );
}
