import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNotifications, AppNotification } from '../hooks/useNotifications';

const H_PAD = 20;
const FILTERS = ['All', 'listing_approved', 'listing_rejected', 'new_message', 'escrow_update', 'casa_match', 'system'];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

function getIconForType(type: string): { icon: string; bg: string; color: string } {
  switch (type) {
    case 'listing_approved':
      return { icon: 'check-circle', bg: '#ECFDF5', color: '#16A34A' };
    case 'listing_rejected':
      return { icon: 'x-circle', bg: '#FEE2E2', color: '#EF4444' };
    case 'new_message':
      return { icon: 'message-circle', bg: '#EDE9FE', color: '#7C3AED' };
    case 'escrow_update':
      return { icon: 'credit-card', bg: '#FFFBEB', color: '#D97706' };
    case 'casa_match':
      return { icon: 'home', bg: '#EDE9FE', color: '#7C3AED' };
    default:
      return { icon: 'bell', bg: '#F3F4F6', color: '#6B7280' };
  }
}

function getFilterLabel(filter: string): string {
  switch (filter) {
    case 'All': return 'All';
    case 'listing_approved': return 'Approved';
    case 'listing_rejected': return 'Rejected';
    case 'new_message': return 'Messages';
    case 'escrow_update': return 'Payments';
    case 'casa_match': return 'Matches';
    case 'system': return 'System';
    default: return filter;
  }
}

function NotifRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const meta = getIconForType(item.type);

  return (
    <TouchableOpacity
      style={[styles.notifRow, !item.read && styles.notifRowUnread]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon as any} size={17} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, !item.read && { color: '#7C3AED' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.notifTimeRow}>
            <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
        </View>
        <Text style={styles.notifDesc} numberOfLines={2}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationCenterScreen() {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    activeType,
    refresh,
    markAsRead,
    markAllAsRead,
    setFilter,
  } = useNotifications();

  const grouped = notifications.reduce<Record<string, AppNotification[]>>((acc, n) => {
    const group = getGroup(n.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const groupOrder = ['Today', 'Yesterday', 'Earlier'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>{t('notifications.title', { defaultValue: 'Notifications' })}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={markAllAsRead}>
          <Feather name="check-circle" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterWrapper}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeType === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipTxt, activeType === f && styles.filterChipTxtActive]}>
              {getFilterLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Notifications List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7C3AED" />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        ) : (
          <>
            {groupOrder.map(group => {
              const items = grouped[group];
              if (!items?.length) return null;
              return (
                <View key={group}>
                  <View style={styles.groupLabelRow}>
                    <Text style={styles.groupLabel}>{group}</Text>
                    {group === 'Today' && unreadCount > 0 && (
                      <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markAllRead}>Mark all read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.notifGroup}>
                    {items.map((n, i) => (
                      <View key={n.id}>
                        <NotifRow
                          item={n}
                          onPress={() => {
                            if (!n.read) markAsRead(n.id);
                          }}
                        />
                        {i < items.length - 1 && <View style={styles.divider} />}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  // Loading
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },

  // Filter row — fixed height, no wrapping
  filterWrapper: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterContent: {
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    height: 34,
    borderRadius: 30,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterChipTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTxtActive: {
    color: '#fff',
  },

  // Groups
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  groupLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
  },
  markAllRead: { fontSize: 12.5, color: '#7C3AED', fontWeight: '600' },

  // Notification group card
  notifGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
    marginBottom: 4,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  notifRowUnread: { backgroundColor: '#FAF5FF' },
  notifIcon: {
    width: 40, height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111',
    marginRight: 8,
  },
  notifTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  notifTime: { fontSize: 10.5, color: '#B0B0B0' },
  unreadDot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },
  notifDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
  divider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 66 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 32, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  emptyDesc: {
    fontSize: 12, color: '#C0C0C0',
    textAlign: 'center', lineHeight: 18, maxWidth: 240,
  },

  // FAB
  filterFab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});