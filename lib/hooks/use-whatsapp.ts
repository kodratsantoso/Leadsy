import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/apiFetch';

/* ── Types ── */

export type WaStatus = 'disconnected' | 'qr_ready' | 'connected' | 'connecting' | 'expired' | 'failed';

export interface WaSessionState {
  status: WaStatus;
  number: string | null;
  qr_payload: string | null;
  connected_at: string | null;
}

export interface WaConversation {
  id: number;
  external_chat_id: string;
  contact: { id: number; name: string | null; phone_number: string; linked_lead_id: number | null } | null;
  relevance_status: string;
  approved_for_sync: boolean;
  last_message_at: string | null;
  ai_analysis: {
    analysis_result: string;
    confidence_score: number;
    reasoning_summary: string;
    provider: string;
    analyzed_at: string;
  } | null;
}

export interface WaMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  body: string;
  message_type: string;
  sent_at: string;
  received_at: string | null;
}

export interface WaCampaign {
  id: number;
  campaign_name: string;
  message_template: string;
  total_targets: number;
  status: string;
  executed_at: string | null;
  recipients: { id: number; phone_number: string; send_status: string; sent_at: string | null }[];
}

export interface WaSyncRule {
  id?: number;
  rule_type: string;
  rule_key: string | null;
  rule_value: string | null;
  enabled: boolean;
}

/* ── Hook ── */

export function useWhatsApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ── Session ──
  const getStatus = useCallback(async (): Promise<WaSessionState> => {
    try {
      const res = await apiFetch('/whatsapp/session/status');
      const data = await res.json();
      if (res.ok) setError(null);
      return {
        status: data.status || 'disconnected',
        number: data.number || null,
        qr_payload: data.qr_payload || null,
        connected_at: data.connected_at || null,
      };
    } catch {
      return { status: 'disconnected', number: null, qr_payload: null, connected_at: null };
    }
  }, []);

  const initSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/whatsapp/session/init', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQr = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/whatsapp/session/refresh-qr', { method: 'POST' });
    } catch {
      setError('QR refresh failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      await apiFetch('/whatsapp/session/disconnect', { method: 'POST' });
    } catch {
      setError('Disconnect failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Direct Messaging ──
  const sendMessage = useCallback(async (phone: string, text: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/whatsapp/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Conversations ──
  const getConversations = useCallback(async (): Promise<WaConversation[]> => {
    try {
      const res = await apiFetch('/whatsapp/conversations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
      setError(null);
      return data.data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      return [];
    }
  }, []);

  const getMessages = useCallback(async (convId: number): Promise<WaMessage[]> => {
    try {
      const res = await apiFetch(`/whatsapp/conversations/${convId}/messages`);
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }, []);

  const analyzeConversation = useCallback(async (convId: number) => {
    try {
      await apiFetch(`/whatsapp/conversations/${convId}/analyze`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Campaigns ──
  const getCampaigns = useCallback(async (): Promise<WaCampaign[]> => {
    try {
      const res = await apiFetch('/whatsapp/campaigns');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load campaigns');
      setError(null);
      return data.data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      return [];
    }
  }, []);

  const createCampaign = useCallback(async (name: string, message: string, leadIds: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/whatsapp/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_name: name, message_template: message, lead_ids: leadIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Create failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeCampaign = useCallback(async (campaignId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/whatsapp/campaigns/${campaignId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execute failed');
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execute failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCampaign = useCallback(async (campaignId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/whatsapp/campaigns/${campaignId}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json(); throw new Error(data.message || 'Delete failed'); }
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sync Rules ──
  const getSyncRules = useCallback(async (): Promise<WaSyncRule[]> => {
    try {
      const res = await apiFetch('/whatsapp/sync-rules');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sync rules');
      setError(null);
      return data.data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sync rules');
      return [];
    }
  }, []);

  const updateSyncRules = useCallback(async (rules: WaSyncRule[]) => {
    setLoading(true);
    try {
      const res = await apiFetch('/whatsapp/sync-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
      return res.ok;
    } catch {
      setError('Failed to save sync rules');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading, error, clearError,
    // Session
    getStatus, initSession, refreshQr, disconnect,
    // Messaging
    sendMessage,
    // Conversations
    getConversations, getMessages, analyzeConversation,
    // Campaigns
    getCampaigns, createCampaign, executeCampaign, deleteCampaign,
    // Sync Rules
    getSyncRules, updateSyncRules,
  };
}
