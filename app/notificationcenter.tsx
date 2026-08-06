import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ThemeColors } from '../constants/theme'; // adjust relative path to match this screen's location
import { useAppTheme } from '../hooks/use-app-theme'; // adjust relative path to match this screen's location
import { AppNotification, useNotifications } from '../hooks/useNotifications';

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

function getIconForType(type: string, colors: ThemeColors): { icon: string; bg: string; color: string } {
  switch (type) {
    case 'listing_approved':
      return { icon: 'check-circle', bg: colors.successBg, color: colors.success };
    case 'listing_rejected':
      return { icon: 'x-circle', bg: colors.dangerBg, color: colors.danger };
    case 'new_message':
      return { icon: 'message-circle', bg: colors.primaryBorder, color: colors.primary };
    case 'escrow_update':
      return { icon: 'credit-card', bg: colors.warningBg, color: colors.warning };
    case 'casa_match':
      return { icon: 'home', bg: colors.primaryBorder, color: colors.primary };
    default:
      return { icon: 'bell', bg: colors.divider, color: colors.textMuted };
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

function NotifRow({ item, onPress, colors }: { item: AppNotification; onPress: () => void; colors: ThemeColors }) {
  const s = useMemo(() => getStyles(colors), [colors]);
  const meta = getIconForType(item.type, colors);

  return (
    <TouchableOpacity
      style={[s.notifRow, !item.read && s.notifRowUnread]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[s.notifIcon, { backgroundColor: meta.bg }]}>
        <Feather name={meta.icon as any} size={17} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.notifTitleRow}>
          <Text style={[s.notifTitle, !item.read && { color: colors.primary }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={s.notifTimeRow}>
            <Text style={s.notifTime}>{formatTime(item.createdAt)}</Text>
            {!item.read && <View style={s.unreadDot} />}
          </View>
        </View>
        <Text style={s.notifDesc} numberOfLines={2}>{item.body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationCenterScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
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
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('notifications.title', { defaultValue: 'Notifications' })}</Text>
        <TouchableOpacity style={s.iconBtn} onPress={markAllAsRead}>
          <Feather name="check-circle" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterWrapper}
        contentContainerStyle={s.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, activeType === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipTxt, activeType === f && s.filterChipTxtActive]}>
              {getFilterLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Notifications List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="notifications-outline" size={36} color={colors.textLight} />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyDesc}>
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
                  <View style={s.groupLabelRow}>
                    <Text style={s.groupLabel}>{group}</Text>
                    {group === 'Today' && unreadCount > 0 && (
                      <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={s.markAllRead}>Mark all read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={s.notifGroup}>
                    {items.map((n, i) => (
                      <View key={n.id}>
                        <NotifRow
                          item={n}
                          colors={colors}
                          onPress={() => {
                            if (!n.read) markAsRead(n.id);
                          }}
                        />
                        {i < items.length - 1 && <View style={s.divider} />}
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

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.cardMuted },
    scroll: { paddingHorizontal: H_PAD, paddingTop: 16 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },

    // Loading
    loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },

    // Filter row — fixed height, no wrapping
    filterWrapper: {
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
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
      backgroundColor: colors.divider,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipTxt: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    filterChipTxtActive: {
      color: colors.textInverse,
    },

    // Groups
    groupLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    groupLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      marginTop: 20,
    },
    markAllRead: { fontSize: 12.5, color: colors.primary, fontWeight: '600' },

    // Notification group card
    notifGroup: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
      marginBottom: 4,
    },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
    },
    notifRowUnread: { backgroundColor: colors.primaryTint },
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
      color: colors.text,
      marginRight: 8,
    },
    notifTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexShrink: 0,
    },
    notifTime: { fontSize: 10.5, color: colors.textLight },
    unreadDot: {
      width: 7, height: 7,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notifDesc: { fontSize: 12, color: colors.textLight, lineHeight: 18 },
    divider: { height: 1, backgroundColor: colors.divider, marginLeft: 66 },

    // Empty state
    emptyState: { alignItems: 'center', paddingTop: 32, gap: 8 },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textLight },
    emptyDesc: {
      fontSize: 12, color: colors.textLight,
      textAlign: 'center', lineHeight: 18, maxWidth: 240,
    },

    // FAB
    filterFab: {
      position: 'absolute', bottom: 30, right: 20,
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.4,
      shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
  });
}