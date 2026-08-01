import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import api, { BASE_URL } from '../constants/api';

export type AppNotification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  data: any | null;
  read: boolean;
  sent: boolean;
  createdAt: string;
};

type GetNotificationsParams = {
  type?: string;
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

const POLL_INTERVAL_MS = 30_000; // 30s background refresh

/**
 * Fetches notifications for the current user from the backend.
 */
export async function fetchNotifications(params: GetNotificationsParams = {}): Promise<{
  notifications: AppNotification[];
  total: number;
  unreadCount: number;
}> {
  const token = await AsyncStorage.getItem('token');
  if (!token) return { notifications: [], total: 0, unreadCount: 0 };

  const query = new URLSearchParams();
  if (params.type && params.type !== 'All') query.set('type', params.type);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  if (params.unreadOnly) query.set('unreadOnly', 'true');

  const res = await fetch(`${BASE_URL}/notifications?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load notifications');
  return res.json();
}

/**
 * Fetches just the unread count for badge displays.
 */
export async function fetchUnreadCount(): Promise<number> {
  const token = await AsyncStorage.getItem('token');
  if (!token) return 0;
  const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load unread count');
  const data = await res.json();
  return data?.count ?? 0;
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(id: number): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}

/**
 * React hook that keeps a user's notifications in sync.
 * Polls on an interval so the badge count and list stay fresh
 * without requiring manual refreshes.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState('All');
  const mounted = useRef(true);

  const load = useCallback(async (opts: { showSpinner?: boolean } = {}) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      if (mounted.current) {
        setNotifications([]);
        setUnreadCount(0);
        setTotal(0);
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    if (opts.showSpinner) setLoading(true);
    try {
      const [data, count] = await Promise.all([
        fetchNotifications({ type: activeType, limit: 100 }),
        fetchUnreadCount(),
      ]);
      if (!mounted.current) return;
      setNotifications(data.notifications ?? []);
      setTotal(data.total ?? 0);
      setUnreadCount(count);
      setError(null);
    } catch (e: any) {
      if (mounted.current) setError(e?.message ?? 'Failed to load notifications');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activeType]);

  // Initial load + poll
  useEffect(() => {
    mounted.current = true;
    load({ showSpinner: true });
    const interval = setInterval(() => load(), POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const markAsRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - (notifications.find((n) => n.id === id)?.read ? 0 : 1)));
    try {
      await markNotificationRead(id);
    } catch {
      // Rollback is unnecessary — next poll will correct the state.
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      // Ignore — next poll corrects.
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      // Ignore
    }
  }, []);

  const setFilter = useCallback((type: string) => {
    setActiveType(type);
    setLoading(true);
  }, []);

  return {
    notifications,
    unreadCount,
    total,
    loading,
    refreshing,
    error,
    activeType,
    refresh,
    markAsRead,
    markAllAsRead,
    remove,
    setFilter,
  };
}

/**
 * Hook for components that only need the unread badge count
 * (e.g. the notification bell icon in tab headers).
 */
export function useUnreadBadge() {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        const c = await fetchUnreadCount();
        if (mounted) {
          setCount(c);
          setReady(true);
        }
      } catch {
        // ignore
      }
    };

    tick();
    interval = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  return { count, ready };
}

