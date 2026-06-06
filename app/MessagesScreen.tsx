import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const BUBBLE_MAX = width * 0.72;

// ─── API config ───────────────────────────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────
type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  seen?: boolean;
};

type Listing = {
  id: number;
  title: string;
  location: string;
  price: string;
  imageUrl: string | null;
} | null;

type ConversationData = {
  id: number;
  otherUser: { id: number; name: string };
  listing: Listing;
  messages: Message[];
};

const QUICK_REPLIES = ['Schedule viewing', 'Request location', 'Negotiate price'];

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({
  msg,
  showAvatar,
  isLast,
  otherName,
}: {
  msg: Message;
  showAvatar: boolean;
  isLast: boolean;
  otherName: string;
}) {
  if (msg.fromMe) {
    return (
      <View style={{ alignItems: 'flex-end', marginBottom: isLast ? 2 : 6 }}>
        <View style={[styles.bubbleMe, { borderBottomRightRadius: isLast ? 4 : 18 }]}>
          <Text style={styles.bubbleMeTxt}>{msg.text}</Text>
        </View>
        <View style={styles.timeRowMe}>
          <Text style={styles.timeText}>{msg.time}</Text>
          <Ionicons
            name={msg.seen ? 'checkmark-done' : 'checkmark'}
            size={12}
            color={msg.seen ? '#7C3AED' : '#C0C0C0'}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: isLast ? 2 : 6, marginRight: width * 0.14 }}>
      <View style={{ width: 34, marginRight: 8 }}>
        {showAvatar ? (
          <View style={styles.agentAvatarWrap}>
            <View style={[styles.agentAvatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9FE' }]}>
              <Text style={{ color: '#7C3AED', fontWeight: '700', fontSize: 13 }}>
                {otherName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={[styles.bubbleThem, { borderBottomLeftRadius: isLast ? 4 : 18 }]}>
          <Text style={styles.bubbleThemTxt}>{msg.text}</Text>
        </View>
        {isLast && (
          <Text style={[styles.timeText, { marginTop: 3, marginLeft: 2 }]}>{msg.time}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  const [input, setInput]       = useState('');
  const [conv, setConv]         = useState<ConversationData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const getToken = async () => AsyncStorage.getItem('token');

  // ── Fetch conversation + messages ──────────────────────────────────────────
  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConv(data.conversation);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load conversation.');
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    fetchConversation().finally(() => setLoading(false));
  }, [fetchConversation]);

  // ── Send message ───────────────────────────────────────────────────────────
  const send = async (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt || !conversationId || sending) return;

    setSending(true);
    setInput('');

    // Optimistic update
    const optimistic: Message = {
      id:     `opt-${Date.now()}`,
      fromMe: true,
      text:   txt,
      time:   new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seen:   false,
    };
    setConv((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}/messages`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: txt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Replace optimistic with server message
      setConv((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === optimistic.id ? data.message : m,
          ),
        };
      });
    } catch {
      // On failure remove optimistic and restore input
      setConv((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimistic.id),
        };
      });
      setInput(txt);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  if (error || !conv) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          {error ?? 'Conversation not found.'}
        </Text>
        <TouchableOpacity onPress={fetchConversation} style={{ backgroundColor: '#7C3AED', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Group consecutive messages from same sender
  const grouped = conv.messages.map((msg, i) => {
    const next = conv.messages[i + 1];
    const prev = conv.messages[i - 1];
    return {
      msg,
      isLastInGroup:  !next || next.fromMe !== msg.fromMe,
      isFirstInGroup: !prev || prev.fromMe !== msg.fromMe,
    };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{conv.otherUser.name}</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="camera" size={18} color="#111" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="more-vertical" size={18} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Safety Banner ── */}
      <View style={styles.safetyBanner}>
        <Ionicons name="warning-outline" size={14} color="#a16207" style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyBold}>Never pay landlords directly.</Text>
          <Text style={styles.safetyText}>
            To be protected by SweetCasa, all payments must stay inside the Escrow Wallet.
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Date */}
          <Text style={styles.dateLabel}>Today</Text>

          {/* Listing Preview */}
          {conv.listing && (
            <View style={styles.listingCard}>
              {conv.listing.imageUrl ? (
                <Image
                  source={{ uri: conv.listing.imageUrl }}
                  style={styles.listingImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.listingImg, { backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }]}>
                  <Feather name="home" size={20} color="#7C3AED" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.listingTitle}>{conv.listing.title}</Text>
                <Text style={styles.listingLoc}>{conv.listing.location}</Text>
                <Text style={styles.listingPrice}>{conv.listing.price}</Text>
              </View>
            </View>
          )}

          {/* Messages */}
          {grouped.map(({ msg, isLastInGroup, isFirstInGroup }) => (
            <Bubble
              key={msg.id}
              msg={msg}
              showAvatar={isFirstInGroup && !msg.fromMe}
              isLast={isLastInGroup}
              otherName={conv.otherUser.name}
            />
          ))}
        </ScrollView>

        {/* ── Quick Replies ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
          keyboardShouldPersistTaps="handled"
          style={styles.quickRowWrap}
        >
          {QUICK_REPLIES.map((r) => (
            <TouchableOpacity
              key={r}
              style={styles.quickChip}
              activeOpacity={0.7}
              onPress={() => send(r)}
            >
              <Text style={styles.quickChipTxt}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <TouchableOpacity>
            <Feather name="smile" size={22} color="#C0C0C0" />
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder="Type a message..."
            placeholderTextColor="#BDBDBD"
            value={input}
            onChangeText={setInput}
            multiline
          />

          {input.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={() => send()} activeOpacity={0.85} disabled={sending}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Feather name="paperclip" size={22} color="#C0C0C0" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  safetyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fefce8',
    borderBottomWidth: 1, borderBottomColor: '#fde047',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  safetyBold: { fontSize: 11.5, fontWeight: '600', color: '#854d0e', marginBottom: 1 },
  safetyText: { fontSize: 11, color: '#713f12', lineHeight: 16 },

  chatArea: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  dateLabel: { textAlign: 'center', fontSize: 11, color: '#B8B8B8', fontWeight: '500', marginBottom: 14 },

  listingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFA', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 18,
  },
  listingImg: { width: 58, height: 58, borderRadius: 10 },
  listingTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 1 },
  listingLoc: { fontSize: 11, color: '#A0A0A0', marginBottom: 2 },
  listingPrice: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  bubbleMe: {
    backgroundColor: '#6D28D9', borderRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: BUBBLE_MAX,
  },
  bubbleMeTxt: { fontSize: 14, color: '#fff', lineHeight: 21, fontWeight: '400' },
  timeRowMe: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  timeText: { fontSize: 10, color: '#B8B8B8' },

  bubbleThem: {
    backgroundColor: '#F2F2F2', borderRadius: 18, borderTopLeftRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: BUBBLE_MAX,
  },
  bubbleThemTxt: { fontSize: 14, color: '#111', lineHeight: 21, fontWeight: '400' },

  agentAvatarWrap: { position: 'relative' },
  agentAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#EDE9FE' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff',
  },

  quickRowWrap: { height: 54, flexGrow: 0, flexShrink: 0, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  quickRow: { paddingHorizontal: 14, alignItems: 'center', gap: 8, flex: 1 },
  quickChip: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff',
  },
  quickChipTxt: { fontSize: 12.5, color: '#333', fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#fff',
  },
  inputField: {
    flex: 1, backgroundColor: '#F5F5F5', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14, color: '#111', maxHeight: 100,
    borderWidth: 1, borderColor: '#EFEFEF',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center',
  },
});
