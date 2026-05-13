import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  purple:      '#6B4EFF',
  purpleLight: '#EDE8FF',
  purpleTab:   '#6B4EFF',
  bg:          '#FFFFFF',
  textDark:    '#0D0D0D',
  textMid:     '#5A5A72',
  textLight:   '#A0A0B8',
  accent:      '#6B4EFF',
  green:       '#22C55E',
  divider:     '#F0F0F5',
  badgeBg:     '#6B4EFF',
  tabBg:       '#FFFFFF',
  tabBorder:   '#EFEFEF',
  dot:         '#F43F5E',
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CONVERSATIONS = [
  {
    id: '1',
    name: 'Sarah Johnson',
    tag: 'MODERN VILLA, BASTOS',
    preview: 'Is the price negotiable?',
    time: '10:42 AM',
    unread: 2,
    online: true,
    avatar: 'https://i.pravatar.cc/150?img=47',
  },
  {
    id: '2',
    name: 'Michael O. (Agent)',
    tag: 'STUDIO, BONAMOUSSADI',
    preview: 'I can show you the place tomorro…',
    time: '9:15 AM',
    unread: 1,
    online: true,
    avatar: 'https://i.pravatar.cc/150?img=12',
  },
  {
    id: '3',
    name: 'Grace T.',
    tag: 'DUPLEX, SANTA BARBARA',
    preview: 'Great, thanks! I will send the documents.',
    time: 'Yesterday',
    unread: 0,
    online: false,
    avatar: 'https://i.pravatar.cc/150?img=32',
  },
  {
    id: '4',
    name: 'Support Team',
    tag: 'SWEETCASA',
    preview: 'Your listing has been approved.',
    time: 'Tuesday',
    unread: 0,
    online: false,
    avatar: 'https://i.pravatar.cc/150?img=20',
  },
  {
    id: '5',
    name: 'Emmanuel N.',
    tag: '2BR APARTMENT, MVAN',
    preview: 'Are pets allowed in the building?',
    time: 'Monday',
    unread: 0,
    online: false,
    avatar: 'https://i.pravatar.cc/150?img=53',
  },
  {
    id: '6',
    name: 'David K.',
    tag: 'OFFICE SPACE, AKWA',
    preview: 'Thanks for the virtual tour link.',
    time: 'Oct 20',
    unread: 0,
    online: false,
    avatar: 'https://i.pravatar.cc/150?img=60',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'all' | 'unread';

type Conversation = {
  id: string;
  name: string;
  tag: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
};

// ─── ConversationRow ──────────────────────────────────────────────────────────
const ConversationRow = ({ item }: { item: Conversation }) => {
  const hasUnread = item.unread > 0;

  return (
    <TouchableOpacity activeOpacity={0.7} style={s.row}>
      {/* Avatar */}
      <View style={s.avatarWrap}>
        <Image source={{ uri: item.avatar }} style={s.avatar} />
        {item.online && <View style={s.onlineDot} />}
      </View>

      {/* Text block */}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowName, hasUnread && s.rowNameBold]}>{item.name}</Text>
          <Text style={[s.rowTime, hasUnread && s.rowTimePurple]}>{item.time}</Text>
        </View>
        <Text style={s.rowTag}>{item.tag}</Text>
        <View style={s.rowBottomRow}>
          <Text
            style={[s.rowPreview, hasUnread && s.rowPreviewBold]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {item.preview}
          </Text>
          {hasUnread ? (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{item.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesInbox() {
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const unreadCount = CONVERSATIONS.filter((c) => c.unread > 0).length;

  const displayed =
    activeTab === 'unread'
      ? CONVERSATIONS.filter((c) => c.unread > 0)
      : CONVERSATIONS;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={s.header}>
        {/* Back button */}
        <TouchableOpacity
          style={s.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}>
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
          onPress={() => setActiveTab('all')}>
          <Text style={[s.tabTxt, activeTab === 'all' && s.tabTxtActive]}>All Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[s.tab, activeTab === 'unread' && s.tabActive]}
          onPress={() => setActiveTab('unread')}>
          <Text style={[s.tabTxt, activeTab === 'unread' && s.tabTxtActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ConversationRow item={item} />}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 30,
    color: C.purple,
    lineHeight: 36,
    fontWeight: '300',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textDark,
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 22,
    color: C.purple,
    lineHeight: 26,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 14,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: C.purpleLight,
  },
  tabActive: {
    backgroundColor: C.purple,
  },
  tabTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: C.purple,
  },
  tabTxtActive: {
    color: '#FFFFFF',
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: C.divider,
    marginLeft: 84,
  },

  listContent: {
    paddingBottom: 8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.bg,
  },

  // Avatar
  avatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.purpleLight,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.bg,
  },

  // Row body
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textDark,
    flex: 1,
    marginRight: 8,
  },
  rowNameBold: {
    fontWeight: '800',
  },
  rowTime: {
    fontSize: 12,
    color: C.textLight,
    fontWeight: '400',
  },
  rowTimePurple: {
    color: C.purple,
    fontWeight: '600',
  },
  rowTag: {
    fontSize: 11,
    fontWeight: '700',
    color: C.purple,
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  rowBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPreview: {
    fontSize: 13,
    color: C.textMid,
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  rowPreviewBold: {
    fontWeight: '600',
    color: C.textDark,
  },

  // Badge
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.badgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
});