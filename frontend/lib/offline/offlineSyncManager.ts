'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiFetch';

export interface OfflineAction {
  id: string;
  type: 'field_checkin' | 'lead_note' | 'activity';
  endpoint: string;
  payload: any;
  leadId?: number;
  leadName?: string;
  createdAt: string;
}

const STORAGE_KEY = 'leadsy_offline_queue_v1';

export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineSync] Failed to read queue from localStorage', e);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: { count: queue.length } }));
  } catch (e) {
    console.error('[OfflineSync] Failed to save queue to localStorage', e);
  }
}

export function queueOfflineAction(action: Omit<OfflineAction, 'id' | 'createdAt'>): OfflineAction {
  const current = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: 'offline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
    createdAt: new Date().toISOString(),
  };
  const updated = [...current, newAction];
  saveOfflineQueue(updated);
  return newAction;
}

export async function flushOfflineQueue(): Promise<{ syncedCount: number; errors: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;
  const remaining: OfflineAction[] = [];

  for (const item of queue) {
    try {
      const res = await apiFetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        syncedCount++;
      } else {
        errors++;
        remaining.push(item);
      }
    } catch (err) {
      errors++;
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);

  if (syncedCount > 0) {
    window.dispatchEvent(
      new CustomEvent('offline-sync-completed', {
        detail: { syncedCount, remainingCount: remaining.length },
      })
    );
  }

  return { syncedCount, errors };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(getOfflineQueue().length);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush queue when back online
      setIsSyncing(true);
      flushOfflineQueue().finally(() => {
        setIsSyncing(false);
        setPendingCount(getOfflineQueue().length);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      setPendingCount(getOfflineQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return { syncedCount: 0, errors: 0 };
    setIsSyncing(true);
    try {
      const res = await flushOfflineQueue();
      setPendingCount(getOfflineQueue().length);
      return res;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    queueOfflineAction,
  };
}
