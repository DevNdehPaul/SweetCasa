import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  purple:      '#6B4EFF',
  purpleLight: '#EDE8FF',
  bg:          '#FFFFFF',
  textDark:    '#0D0D0D',
  textMid:     '#5A5A72',
  textLight:   '#A0A0B8',
  green:       '#22C55E',
  divider:     '#F0F0F5',
  badgeBg:     '#6B4EFF',
};

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

const ConversationRow = ({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) => {
  const hasUnread = item.unreadCount > 0;
  const tag     = item.listing
    ? `${item.listing.type.toUpperCase()}, ${item.listing.location.toUpperCase()}`
    : 'SWEETCASA';
  const preview = item.lastMessage?.text ?? 'No messages yet.';
  const time    = item.lastMessage?.time ?? '';

  return (
    <TouchableOpacity activeOpacity={0.7} style={s.row} onPress={onPress}>
      <View style={s.avatarWrap}>
        {item.listing?.imageUrl ? (
          <Image source={{ uri: item.listing.imageUrl }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, { backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: C.purple, fontWeight: '700', fontSize: 18 }}>
              {item.otherUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={s.onlineDot} />
      </View>

      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowName, hasUnread && s.rowNameBold]}>{item.otherUser.name}</Text>
          <Text style={[s.rowTime, hasUnread && s.rowTimePurple]}>{time}</Text>
        </View>
        <Text style={s.rowTag}>{tag}</Text>
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

export default function MessagesInbox() {
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

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const displayed   =
    activeTab === 'unread'
      ? conversations.filter((c) => c.unreadCount > 0)
      : conversations;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages</Text>
        <TouchableOpacity style={s.searchBtn} activeOpacity={0.7}>
          <Text style={s.searchIcon}>⌕</Text>
        </TouchableOpacity>
      </View>

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
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.purple} /></View>
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
              onPress={() =>
                router.push({
                  pathname: '/MessagesScreen',
                  params: { conversationId: item.id },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.purple} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: C.bg,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, color: C.purple, lineHeight: 36, fontWeight: '300', marginTop: -2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.textDark, letterSpacing: -0.5 },
  searchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' },
  searchIcon: { fontSize: 22, color: C.purple, lineHeight: 26 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, paddingBottom: 14 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, backgroundColor: C.purpleLight },
  tabActive: { backgroundColor: C.purple },
  tabTxt: { fontSize: 14, fontWeight: '600', color: C.purple },
  tabTxtActive: { color: '#FFFFFF' },
  separator: { height: 1, backgroundColor: C.divider, marginLeft: 84 },
  listContent: { paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.bg },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.purpleLight },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 6.5, backgroundColor: C.green, borderWidth: 2, borderColor: C.bg },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: C.textDark, flex: 1, marginRight: 8 },
  rowNameBold: { fontWeight: '800' },
  rowTime: { fontSize: 12, color: C.textLight, fontWeight: '400' },
  rowTimePurple: { color: C.purple, fontWeight: '600' },
  rowTag: { fontSize: 11, fontWeight: '700', color: C.purple, letterSpacing: 0.3, marginBottom: 3, textTransform: 'uppercase' },
  rowBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowPreview: { fontSize: 13, color: C.textMid, fontWeight: '400', flex: 1, marginRight: 8 },
  rowPreviewBold: { fontWeight: '600', color: C.textDark },
  badge: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.badgeBg, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorTxt: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  emptyTxt: { color: C.textLight, fontSize: 14, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.purple, borderRadius: 24 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
