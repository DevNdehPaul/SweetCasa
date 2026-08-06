import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemeColors } from '../constants/theme'; // adjust relative path to match this screen's location
import { useAppTheme } from '../hooks/use-app-theme'; // adjust relative path to match this screen's location

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Tab = 'all' | 'unread';

type Conversation = {
  id: number;
  otherUser: { id: number; name: string };
  listing: {
    id: number;
    title: string;
    location: string;
    price: string;
    type: string;
    imageUrl: string | null;
  } | null;
  lastMessage: {
    text: string;
    fromMe: boolean;
    seen: boolean;
    time: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

// ─── Avatar: always shows the other person's initial, never the house photo ──
function UserAvatar({ name, colors }: { name: string; colors: ThemeColors }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  // Pick a consistent colour from the name's char code — this small palette is
  // intentionally kept fixed across themes (it's not a UI surface color).
  const avatarColors = ['#7C3AED', '#6B4EFF', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];
  const color = avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
  const s = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[s.avatar, { backgroundColor: color + '22', borderWidth: 2, borderColor: color + '44', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color, fontWeight: '800', fontSize: 20, lineHeight: 24 }}>{initial}</Text>
    </View>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────
const ConversationRow = ({
  item,
  onPress,
  onDelete,
  colors,
}: {
  item: Conversation;
  onPress: () => void;
  onDelete: () => void;
  colors: ThemeColors;
}) => {
  const s = useMemo(() => getStyles(colors), [colors]);
  const hasUnread = item.unreadCount > 0;
  const tag       = item.listing
    ? `${item.listing.type.toUpperCase()} · ${item.listing.location}`
    : 'SWEETCASA';
  const preview   = item.lastMessage?.text ?? 'No messages yet.';
  const time      = item.lastMessage?.time ?? '';

  const handleLongPress = () => {
    Alert.alert(
      'Delete conversation',
      `Delete your conversation with ${item.otherUser.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={s.row}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      {/* Avatar — seller/buyer initial, never the house image */}
      <View style={s.avatarWrap}>
        <UserAvatar name={item.otherUser.name} colors={colors} />
        <View style={s.onlineDot} />
      </View>

      <View style={s.rowBody}>
        {/* Name + time */}
        <View style={s.rowTop}>
          <Text style={[s.rowName, hasUnread && s.rowNameBold]} numberOfLines={1}>
            {item.otherUser.name}
          </Text>
          <Text style={[s.rowTime, hasUnread && s.rowTimePurple]}>{time}</Text>
        </View>

        {/* Listing tag (property info stays as a subtitle) */}
        {item.listing && (
          <Text style={s.rowTag} numberOfLines={1}>{tag}</Text>
        )}

        {/* Preview + unread badge */}
        <View style={s.rowBottomRow}>
          <Text
            style={[s.rowPreview, hasUnread && s.rowPreviewBold]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {preview}
          </Text>
          {hasUnread ? (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MessagesInbox() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [activeTab, setActiveTab]         = useState<Tab>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setConversations((data as any).conversations ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load conversations.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const handleDelete = async (conversationId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      // Remove locally for instant feedback
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch {
      Alert.alert('Error', 'Could not delete the conversation. Please try again.');
    }
  };

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const displayed   =
    activeTab === 'unread'
      ? conversations.filter((c) => c.unreadCount > 0)
      : conversations;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages</Text>
        <TouchableOpacity style={s.searchBtn} activeOpacity={0.7}>
          <Text style={s.searchIcon}>⌕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.tab, activeTab === 'all' && s.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[s.tabTxt, activeTab === 'all' && s.tabTxtActive]}>All Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.tab, activeTab === 'unread' && s.tabActive]}
          onPress={() => setActiveTab('unread')}
        >
          <Text style={[s.tabTxt, activeTab === 'unread' && s.tabTxtActive]}>
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={fetchConversations} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : displayed.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTxt}>
            {activeTab === 'unread' ? 'No unread messages.' : 'No conversations yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              colors={colors}
              onPress={() =>
                router.push({
                  pathname: '/MessagesScreen',
                  params: { conversationId: item.id },
                })
              }
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.background,
    },
    backBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    backArrow: { fontSize: 30, color: colors.primary, lineHeight: 36, fontWeight: '300', marginTop: -2 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    searchBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    searchIcon: { fontSize: 22, color: colors.primary, lineHeight: 26 },

    tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, paddingBottom: 14 },
    tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, backgroundColor: colors.primaryTint },
    tabActive: { backgroundColor: colors.primary },
    tabTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },
    tabTxtActive: { color: colors.textInverse },

    separator: { height: 1, backgroundColor: colors.divider, marginLeft: 84 },
    listContent: { paddingBottom: 8 },

    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.background,
    },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatar: { width: 54, height: 54, borderRadius: 27 },
    onlineDot: {
      position: 'absolute', bottom: 1, right: 1,
      width: 13, height: 13, borderRadius: 6.5,
      backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background,
    },

    rowBody: { flex: 1 },
    rowTop: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 2,
    },
    rowName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
    rowNameBold: { fontWeight: '800' },
    rowTime: { fontSize: 12, color: colors.textLight, fontWeight: '400' },
    rowTimePurple: { color: colors.primary, fontWeight: '600' },
    rowTag: {
      fontSize: 11, fontWeight: '600', color: colors.primary,
      letterSpacing: 0.2, marginBottom: 3,
    },
    rowBottomRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    rowPreview: { fontSize: 13, color: colors.textSecondary, fontWeight: '400', flex: 1, marginRight: 8 },
    rowPreviewBold: { fontWeight: '600', color: colors.text },

    badge: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    badgeTxt: { color: colors.textInverse, fontSize: 11, fontWeight: '800' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    errorTxt: { color: colors.danger, fontSize: 14, textAlign: 'center', marginBottom: 12 },
    emptyTxt: { color: colors.textLight, fontSize: 14, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 24 },
    retryTxt: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },
  });
}