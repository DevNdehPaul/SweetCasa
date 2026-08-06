import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";
import { ThemeColors } from "../constants/theme"; // adjust relative path to match this screen's location
import { useAppTheme } from "../hooks/use-app-theme"; // adjust relative path to match this screen's location
import { useConversationSocket } from "../hooks/useChatSocket";

const { width } = Dimensions.get("window");
const BUBBLE_MAX = width * 0.72;

// ─── API config ───────────────────────────────────────────────────────────────
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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

const QUICK_REPLIES = [
  "Schedule viewing",
  "Request location",
  "Negotiate price",
];

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({
  msg,
  showAvatar,
  isLast,
  otherName,
  colors,
}: {
  msg: Message;
  showAvatar: boolean;
  isLast: boolean;
  otherName: string;
  colors: ThemeColors;
}) {
  const s = useMemo(() => getStyles(colors), [colors]);

  if (msg.fromMe) {
    return (
      <View style={{ alignItems: "flex-end", marginBottom: isLast ? 2 : 6 }}>
        <View
          style={[
            s.bubbleMe,
            { borderBottomRightRadius: isLast ? 4 : 18 },
          ]}
        >
          <Text style={s.bubbleMeTxt}>{msg.text}</Text>
        </View>
        <View style={s.timeRowMe}>
          <Text style={s.timeText}>{msg.time}</Text>
          <Ionicons
            name={msg.seen ? "checkmark-done" : "checkmark"}
            size={12}
            color={msg.seen ? colors.primary : colors.textLight}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: isLast ? 2 : 6,
        marginRight: width * 0.14,
      }}
    >
      <View style={{ width: 34, marginRight: 8 }}>
        {showAvatar ? (
          <View style={s.agentAvatarWrap}>
            <View
              style={[
                s.agentAvatar,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primaryBorder,
                },
              ]}
            >
              <Text
                style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}
              >
                {otherName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.onlineDot} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <View
          style={[
            s.bubbleThem,
            { borderBottomLeftRadius: isLast ? 4 : 18 },
          ]}
        >
          <Text style={s.bubbleThemTxt}>{msg.text}</Text>
        </View>
        {isLast && (
          <Text style={[s.timeText, { marginTop: 3, marginLeft: 2 }]}>
            {msg.time}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [input, setInput] = useState("");
  const [conv, setConv] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Live incoming messages via Socket.IO
  const { liveMessages } = useConversationSocket(conversationId);

  // Append any live (incoming) messages to the conversation
  useEffect(() => {
    if (!liveMessages.length) return;
    setConv((prev) => {
      if (!prev) return prev;
      const existingIds = new Set(prev.messages.map((m) => m.id));
      const fresh = liveMessages.filter((lm) => !existingIds.has(lm.id));
      if (!fresh.length) return prev;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          ...fresh.map((lm) => ({
            id: lm.id,
            text: lm.text,
            time: lm.time,
            fromMe: lm.fromMe,
            seen: lm.seen,
          })),
        ],
      };
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [liveMessages]);

  const getToken = async () => AsyncStorage.getItem("token");

  // ── Fetch conversation + messages ──────────────────────────────────────────
  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/messages/conversations/${conversationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConv(data.conversation);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load conversation.");
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
    setInput("");

    // Optimistic update
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      fromMe: true,
      text: txt,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      seen: false,
    };
    setConv((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev,
    );
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE}/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: txt }),
        },
      );

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
      <SafeAreaView
        style={[
          s.safe,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !conv) {
    return (
      <SafeAreaView
        style={[
          s.safe,
          { alignItems: "center", justifyContent: "center", padding: 32 },
        ]}
      >
        <Text
          style={{
            color: colors.danger,
            fontSize: 14,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {error ?? "Conversation not found."}
        </Text>
        <TouchableOpacity
          onPress={fetchConversation}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 24,
          }}
        >
          <Text style={{ color: colors.textInverse, fontWeight: "700" }}>Retry</Text>
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
      isLastInGroup: !next || next.fromMe !== msg.fromMe,
      isFirstInGroup: !prev || prev.fromMe !== msg.fromMe,
    };
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{conv.otherUser.name}</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity style={s.iconBtn}>
            <Feather name="camera" size={18} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn}>
            <Feather name="more-vertical" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Safety Banner ── */}
      <View style={s.safetyBanner}>
        <Ionicons
          name="warning-outline"
          size={14}
          color={colors.warning}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={s.safetyBold}>Never pay landlords directly.</Text>
          <Text style={s.safetyText}>
            To be protected by SweetCasa, all payments must stay inside the
            Escrow Wallet.
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.chatArea}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Date */}
          <Text style={s.dateLabel}>Today</Text>

          {/* Listing Preview */}
          {conv.listing && (
            <View style={s.listingCard}>
              {conv.listing.imageUrl ? (
                <Image
                  source={{ uri: conv.listing.imageUrl }}
                  style={s.listingImg}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    s.listingImg,
                    {
                      backgroundColor: colors.primaryBorder,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Feather name="home" size={20} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.listingTitle}>{conv.listing.title}</Text>
                <Text style={s.listingLoc}>{conv.listing.location}</Text>
                <Text style={s.listingPrice}>{conv.listing.price}</Text>
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
              colors={colors}
            />
          ))}
        </ScrollView>

        {/* ── Quick Replies ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.quickRow}
          keyboardShouldPersistTaps="handled"
          style={s.quickRowWrap}
        >
          {QUICK_REPLIES.map((r) => (
            <TouchableOpacity
              key={r}
              style={s.quickChip}
              activeOpacity={0.7}
              onPress={() => send(r)}
            >
              <Text style={s.quickChipTxt}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Input Bar ── */}
        <View style={s.inputBar}>
          <TouchableOpacity>
            <Feather name="smile" size={22} color={colors.textLight} />
          </TouchableOpacity>

          <TextInput
            style={s.inputField}
            placeholder="Type a message..."
            placeholderTextColor={colors.textLight}
            value={input}
            onChangeText={setInput}
            multiline
          />

          {input.trim() ? (
            <TouchableOpacity
              style={s.sendBtn}
              onPress={() => send()}
              activeOpacity={0.85}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Feather name="send" size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Feather name="paperclip" size={22} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    iconBtn: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
    },

    safetyBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.warningBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.warning,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    safetyBold: {
      fontSize: 11.5,
      fontWeight: "600",
      color: colors.warning,
      marginBottom: 1,
    },
    safetyText: { fontSize: 11, color: colors.warning, lineHeight: 16 },

    chatArea: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
    dateLabel: {
      textAlign: "center",
      fontSize: 11,
      color: colors.textLight,
      fontWeight: "500",
      marginBottom: 14,
    },

    listingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.cardMuted,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.borderLight,
      marginBottom: 18,
    },
    listingImg: { width: 58, height: 58, borderRadius: 10 },
    listingTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 1,
    },
    listingLoc: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
    listingPrice: { fontSize: 12, fontWeight: "700", color: colors.primary },

    bubbleMe: {
      backgroundColor: colors.primaryDark,
      borderRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: BUBBLE_MAX,
    },
    bubbleMeTxt: {
      fontSize: 14,
      color: colors.textInverse,
      lineHeight: 21,
      fontWeight: "400",
    },
    timeRowMe: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 3,
    },
    timeText: { fontSize: 10, color: colors.textLight },

    bubbleThem: {
      backgroundColor: colors.cardMuted,
      borderRadius: 18,
      borderTopLeftRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
      maxWidth: BUBBLE_MAX,
    },
    bubbleThemTxt: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 21,
      fontWeight: "400",
    },

    agentAvatarWrap: { position: "relative" },
    agentAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.primaryBorder,
    },
    onlineDot: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.success,
      borderWidth: 1.5,
      borderColor: colors.background,
    },

    quickRowWrap: {
      height: 54,
      flexGrow: 0,
      flexShrink: 0,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    quickRow: { paddingHorizontal: 14, alignItems: "center", gap: 8, flex: 1 },
    quickChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.card,
    },
    quickChipTxt: { fontSize: 12.5, color: colors.textSecondary, fontWeight: "500" },

    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === "ios" ? 28 : 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      backgroundColor: colors.background,
    },
    inputField: {
      flex: 1,
      backgroundColor: colors.cardMuted,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
      fontSize: 14,
      color: colors.text,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sendBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}