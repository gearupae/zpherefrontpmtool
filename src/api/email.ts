import apiClient from './client';

export interface EmailConfig {
  provider?: string; // smtp | gmail | outlook
  host?: string;
  port?: number;
  security?: string; // starttls | ssl | none
  username?: string;
  from_email?: string;
  from_name?: string;
  is_active: boolean;
  is_configured: boolean;
}

export interface EmailConfigUpdate {
  provider?: string;
  host?: string;
  port?: number;
  security?: string;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
  is_active?: boolean;
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const res = await apiClient.get('/email/config');
  return res.data as EmailConfig;
}

export async function updateEmailConfig(payload: EmailConfigUpdate): Promise<EmailConfig> {
  const res = await apiClient.post('/email/config', payload);
  return res.data as EmailConfig;
}

export async function sendEmailTest(payload: { to: string; subject?: string; body?: string; html?: boolean; }): Promise<{ message: string }>{
  const res = await apiClient.post('/email/test', payload);
  return res.data as { message: string };
}
