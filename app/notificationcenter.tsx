import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const H_PAD = 20;

const FILTERS = ['All', 'Payments', 'Property', 'Updates'];

type Notif = {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  unread: boolean;
  group: 'today' | 'yesterday';
};

const NOTIFICATIONS: Notif[] = [
  {
    id: '1', group: 'today', unread: true,
    title: 'Escrow Funds Released',
    desc: 'The payment of 450,000 XAF for your rental in Akwa has been successfully released.',
    time: '2m ago',
    icon: 'credit-card', iconBg: '#EDE9FE', iconColor: '#7C3AED',
  },
  {
    id: '2', group: 'today', unread: true,
    title: 'New Casa-Match Found!',
    desc: 'We found a new 3-bedroom villa in Bastos that matches 95% of your lifestyle preferences.',
    time: '1h ago',
    icon: 'home', iconBg: '#EDE9FE', iconColor: '#7C3AED',
  },
  {
    id: '3', group: 'today', unread: false,
    title: 'Upcoming Viewing',
    desc: 'Reminder: You have a scheduled viewing for "Sunshine Apartments" tomorrow at 2:00 PM.',
    time: '4h ago',
    icon: 'calendar', iconBg: '#F3F4F6', iconColor: '#6B7280',
  },
  {
    id: '4', group: 'yesterday', unread: false,
    title: 'Login from New Device',
    desc: "A new login was detected from a Samsung S21 in Douala. If this wasn't you, please secure your account.",
    time: 'Yesterday',
    icon: 'alert-circle', iconBg: '#FEE2E2', iconColor: '#EF4444',
  },
  {
    id: '5', group: 'yesterday', unread: false,
    title: 'Deposit Successful',
    desc: 'Your deposit of 50,000 XAF via MTN Mobile Money has been confirmed in your escrow wallet.',
    time: 'Yesterday',
    icon: 'credit-card', iconBg: '#F3F4F6', iconColor: '#6B7280',
  },
];

function NotifRow({ item }: { item: Notif }) {
  return (
    <TouchableOpacity
      style={[styles.notifRow, item.unread && styles.notifRowUnread]}
      activeOpacity={0.75}
    >
      <View style={[styles.notifIcon, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon as any} size={17} color={item.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.notifTitleRow}>
          <Text style={[styles.notifTitle, item.unread && { color: '#7C3AED' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.notifTimeRow}>
            <Text style={styles.notifTime}>{item.time}</Text>
            {item.unread && <View style={styles.unreadDot} />}
          </View>
        </View>
        <Text style={styles.notifDesc} numberOfLines={2}>{item.desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationCenterScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  const todayItems = NOTIFICATIONS.filter(n => n.group === 'today');
  const yesterdayItems = NOTIFICATIONS.filter(n => n.group === 'yesterday');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      

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
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipTxt, activeFilter === f && styles.filterChipTxtActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Notifications List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Today */}
        <Text style={styles.groupLabel}>Today</Text>
        <View style={styles.notifGroup}>
          {todayItems.map((n, i) => (
            <View key={n.id}>
              <NotifRow item={n} />
              {i < todayItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Yesterday */}
        <View style={styles.groupLabelRow}>
          <Text style={styles.groupLabel}>Yesterday</Text>
          <TouchableOpacity>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notifGroup}>
          {yesterdayItems.map((n, i) => (
            <View key={n.id}>
              <NotifRow item={n} />
              {i < yesterdayItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Empty state */}
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={36} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No more notifications</Text>
          <Text style={styles.emptyDesc}>
            Check back later for updates on your property matches and payments.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Filter FAB ── */}
      <TouchableOpacity style={styles.filterFab}>
        <Feather name="sliders" size={20} color="#fff" />
      </TouchableOpacity>
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