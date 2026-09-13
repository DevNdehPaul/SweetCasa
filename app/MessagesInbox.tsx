import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BASE_URL } from '../constants/api';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

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

type ChatMessage = {
  id: string;
  text: string;
  fromMe: boolean;
  seen: boolean;
  time: string;
};

type ChatConversation = {
  id: number;
  otherUser: { id: number; name: string };
  listing: {
    id: number;
    title: string;
    location: string;
    price: string;
    imageUrl: string | null;
  } | null;
  messages: ChatMessage[];
};

async function getToken() {
  return AsyncStorage.getItem('token');
}

async function readResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  const text = await res.text().catch(() => '');
  return { error: text || `HTTP ${res.status}` };
}

function UserAvatar({ name, colors, size = 54 }: { name: string; colors: ThemeColors; size?: number }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const avatarColors = ['#7C3AED', '#6B4EFF', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];
  const color = avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '22',
        borderWidth: 2,
        borderColor: color + '44',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.37 }}>{initial}</Text>
    </View>
  );
}

function ConversationRow({
  item,
  onPress,
  onDelete,
  colors,
}: {
  item: Conversation;
  onPress: () => void;
  onDelete: () => void;
  colors: ThemeColors;
}) {
  const s = useMemo(() => getStyles(colors), [colors]);
  const hasUnread = item.unreadCount > 0;
  const tag = item.listing
    ? `${(item.listing.type || 'PROPERTY').toUpperCase()} · ${item.listing.location}`
    : 'SWEETCASA';
  const preview = item.lastMessage?.text ?? 'No messages yet.';
  const time = item.lastMessage?.time ?? '';

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
      <View style={s.avatarWrap}>
        <UserAvatar name={item.otherUser.name} colors={colors} />
        <View style={s.onlineDot} />
      </View>

      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowName, hasUnread && s.rowNameBold]} numberOfLines={1}>
            {item.otherUser.name}
          </Text>
          <Text style={[s.rowTime, hasUnread && s.rowTimePurple]}>{time}</Text>
        </View>

        {item.listing && (
          <Text style={s.rowTag} numberOfLines={1}>
            {tag}
          </Text>
        )}

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
}

function MessagesInbox() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login' as any);
        return;
      }

      const res = await fetch(`${BASE_URL}/messages/conversations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const body = await readResponse(res);
      if (!res.ok) {
        console.error('Messages inbox API error:', res.status, `${BASE_URL}/messages/conversations`, body);
        throw new Error(body?.error || body?.message || `Could not load messages (HTTP ${res.status})`);
      }

      setConversations(Array.isArray(body?.conversations) ? body.conversations : []);
      setError(null);
    } catch (err: any) {
      console.error('fetchConversations error:', err);
      setError(err?.message || 'Failed to load conversations. Please try again.');
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
      const token = await getToken();
      if (!token) {
        router.replace('/login' as any);
        return;
      }

      const res = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const body = await readResponse(res);
      if (!res.ok) {
        throw new Error(body?.error || body?.message || `Delete failed (HTTP ${res.status})`);
      }

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not delete the conversation. Please try again.');
    }
  };

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const displayed =
    activeTab === 'unread'
      ? conversations.filter((c) => c.unreadCount > 0)
      : conversations;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <Text style={s.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Messages</Text>
        <View style={s.headerSpacer} />
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
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
                  params: { conversationId: String(item.id) },
                } as any)
              }
              onDelete={() => handleDelete(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ChatView({ conversationId }: { conversationId: number }) {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  const fetchMessages = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login' as any);
        return;
      }

      const res = await fetch(`${BASE_URL}/messages/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const body = await readResponse(res);
      if (!res.ok) {
        console.error(
          'Conversation API error:',
          res.status,
          `${BASE_URL}/messages/conversations/${conversationId}`,
          body,
        );
        throw new Error(body?.error || body?.message || `Could not load conversation (HTTP ${res.status})`);
      }

      if (!body?.conversation) {
        throw new Error('The server returned an invalid conversation response.');
      }

      setConversation(body.conversation);
      setError(null);

      fetch(`${BASE_URL}/messages/conversations/${conversationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } catch (err: any) {
      console.error('fetchMessages error:', err);
      setError(err?.message || 'Failed to load this conversation.');
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  useEffect(() => {
    if (conversation?.messages?.length) {
      const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
      return () => clearTimeout(timer);
    }
  }, [conversation?.messages?.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  const handleSend = async () => {
    const cleanText = text.trim();
    if (!cleanText || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login' as any);
        return;
      }

      const res = await fetch(`${BASE_URL}/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ text: cleanText }),
      });

      const body = await readResponse(res);
      if (!res.ok) {
        throw new Error(body?.error || body?.message || `Could not send message (HTTP ${res.status})`);
      }

      const sentMessage = body?.message as ChatMessage | undefined;
      if (!sentMessage) {
        throw new Error('The server did not return the sent message.');
      }

      setConversation((prev) =>
        prev
          ? { ...prev, messages: [...(prev.messages || []), sentMessage] }
          : prev,
      );
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err: any) {
      Alert.alert('Could not send message', err?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !conversation) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.chatHeader}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={s.chatHeaderTitle}>Conversation</Text>
          <View style={s.headerSpacer} />
        </View>
        <View style={s.center}>
          <Text style={s.errorTxt}>{error || 'Conversation not found.'}</Text>
          <TouchableOpacity onPress={fetchMessages} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
      >
        <View style={s.chatHeader}>
          <TouchableOpacity style={s.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={s.chatPerson}>
            <UserAvatar name={conversation.otherUser.name} colors={colors} size={38} />
            <View style={s.chatPersonText}>
              <Text style={s.chatHeaderTitle} numberOfLines={1}>
                {conversation.otherUser.name}
              </Text>
              {conversation.listing ? (
                <Text style={s.chatProperty} numberOfLines={1}>
                  {conversation.listing.title}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={s.headerSpacer} />
        </View>

        {conversation.listing ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={s.propertyStrip}
            onPress={() =>
              router.push({
                pathname: '/propertydetail',
                params: { id: String(conversation.listing!.id) },
              } as any)
            }
          >
            <View style={s.propertyStripText}>
              <Text style={s.propertyTitle} numberOfLines={1}>
                {conversation.listing.title}
              </Text>
              <Text style={s.propertyMeta} numberOfLines={1}>
                {conversation.listing.location}
                {conversation.listing.price ? ` · ${conversation.listing.price} XAF` : ''}
              </Text>
            </View>
            <Text style={s.propertyArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <FlatList
          ref={listRef}
          data={conversation.messages || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={
            conversation.messages?.length ? s.messagesContent : s.messagesEmptyContent
          }
          renderItem={({ item }) => (
            <View style={[s.messageRow, item.fromMe ? s.messageRowMe : s.messageRowOther]}>
              <View style={[s.bubble, item.fromMe ? s.bubbleMe : s.bubbleOther]}>
                <Text style={[s.bubbleText, item.fromMe && s.bubbleTextMe]}>{item.text}</Text>
                <Text style={[s.messageTime, item.fromMe && s.messageTimeMe]}>
                  {item.time}
                  {item.fromMe && item.seen ? '  ✓✓' : ''}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.emptyTxt}>No messages yet. Say hello.</Text>}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onContentSizeChange={() => {
            if (!refreshing) listRef.current?.scrollToEnd({ animated: false });
          }}
        />

        <View style={s.composerWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message..."
            placeholderTextColor={colors.textLight}
            style={s.composerInput}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            disabled={!text.trim() || sending}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={s.sendTxt}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function MessagesScreen() {
  const params = useLocalSearchParams<{ conversationId?: string | string[] }>();
  const rawId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const parsedId = rawId ? Number(rawId) : NaN;

  // One Expo Router file now handles both states:
  // /MessagesScreen                       -> inbox
  // /MessagesScreen?conversationId=123    -> individual chat
  if (rawId && Number.isFinite(parsedId)) {
    return <ChatView conversationId={parsedId} />;
  }

  return <MessagesInbox />;
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backArrow: {
      fontSize: 30,
      color: colors.primary,
      lineHeight: 36,
      fontWeight: '300',
      marginTop: -2,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSpacer: { width: 44, height: 44 },

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
      backgroundColor: colors.primaryTint,
    },
    tabActive: { backgroundColor: colors.primary },
    tabTxt: { fontSize: 14, fontWeight: '600', color: colors.primary },
    tabTxtActive: { color: colors.textInverse },

    separator: { height: 1, backgroundColor: colors.divider, marginLeft: 84 },
    listContent: { paddingBottom: 8 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.background,
    },
    avatarWrap: { position: 'relative', marginRight: 14 },
    onlineDot: {
      position: 'absolute',
      bottom: 1,
      right: 1,
      width: 13,
      height: 13,
      borderRadius: 6.5,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.background,
    },
    rowBody: { flex: 1 },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    rowName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    rowNameBold: { fontWeight: '800' },
    rowTime: { fontSize: 12, color: colors.textLight, fontWeight: '400' },
    rowTimePurple: { color: colors.primary, fontWeight: '600' },
    rowTag: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
      letterSpacing: 0.2,
      marginBottom: 3,
    },
    rowBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowPreview: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '400',
      flex: 1,
      marginRight: 8,
    },
    rowPreviewBold: { fontWeight: '600', color: colors.text },
    badge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeTxt: { color: colors.textInverse, fontSize: 11, fontWeight: '800' },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    errorTxt: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
    emptyTxt: { color: colors.textLight, fontSize: 14, textAlign: 'center' },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.primary,
      borderRadius: 24,
    },
    retryTxt: { color: colors.textInverse, fontWeight: '700', fontSize: 14 },

    chatPerson: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 10,
      minWidth: 0,
    },
    chatPersonText: { flex: 1, marginLeft: 10 },
    chatHeaderTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    chatProperty: { marginTop: 1, fontSize: 11, color: colors.textSecondary },

    propertyStrip: {
      marginHorizontal: 14,
      marginTop: 10,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.primaryTint,
      flexDirection: 'row',
      alignItems: 'center',
    },
    propertyStripText: { flex: 1 },
    propertyTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
    propertyMeta: { marginTop: 2, fontSize: 11, color: colors.textSecondary },
    propertyArrow: { fontSize: 24, color: colors.primary, marginLeft: 8 },

    messagesContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
    messagesEmptyContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    messageRow: { flexDirection: 'row', marginBottom: 10 },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowOther: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '82%',
      paddingHorizontal: 13,
      paddingTop: 10,
      paddingBottom: 7,
      borderRadius: 16,
    },
    bubbleMe: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 5,
    },
    bubbleOther: {
      backgroundColor: colors.primaryTint,
      borderBottomLeftRadius: 5,
    },
    bubbleText: { fontSize: 14, lineHeight: 20, color: colors.text },
    bubbleTextMe: { color: colors.textInverse },
    messageTime: {
      marginTop: 4,
      fontSize: 10,
      color: colors.textLight,
      alignSelf: 'flex-end',
    },
    messageTimeMe: { color: colors.textInverse, opacity: 0.75 },

    composerWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 10 : 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      backgroundColor: colors.background,
    },
    composerInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: 22,
      paddingHorizontal: 15,
      paddingTop: Platform.OS === 'ios' ? 11 : 9,
      paddingBottom: Platform.OS === 'ios' ? 11 : 9,
      color: colors.text,
      backgroundColor: colors.background,
      fontSize: 14,
    },
    sendBtn: {
      minWidth: 66,
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },
    sendTxt: { color: colors.textInverse, fontWeight: '800', fontSize: 13 },
  });
}
