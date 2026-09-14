import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE_URL } from "../constants/api";
import { useTranslation } from 'react-i18next';

type Message = { id: string; text: string; fromMe: boolean; seen: boolean; time: string };
type Conversation = {
  id: number;
  otherUser?: { id: number; name?: string };
  listing?: { id: number; title: string; location?: string; price?: string } | null;
  messages: Message[];
};

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    const id = Number(conversationId);
    if (!Number.isFinite(id)) {
      setError("Invalid conversation.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login" as any);
        return;
      }
      const res = await fetch(`${BASE_URL}/messages/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Could not load conversation (HTTP ${res.status}).`);
      setConversation(data.conversation);
    } catch (e: any) {
      setError(e?.message || "Could not load conversation.");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { loadConversation(); }, [loadConversation]);

  const sendMessage = async () => {
    const body = text.trim();
    const id = Number(conversationId);
    if (!body || sending || !Number.isFinite(id)) return;
    setSending(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/login" as any);
        return;
      }
      const res = await fetch(`${BASE_URL}/messages/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Could not send message (HTTP ${res.status}).`);
      setText("");
      await loadConversation();
    } catch (e: any) {
      Alert.alert("Could not send message", e?.message || "Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></SafeAreaView>;
  }
  if (error || !conversation) {
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.error}>{error || "Conversation not found."}</Text>
        <TouchableOpacity style={s.retry} onPress={() => { setLoading(true); loadConversation(); }}>
          <Text style={s.retryText}>{t('chat.retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.header}>
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.name} numberOfLines={1}>{conversation.otherUser?.name || "Property agent"}</Text>
            {!!conversation.listing?.title && <Text style={s.listing} numberOfLines={1}>{conversation.listing.title}</Text>}
          </View>
        </View>

        <FlatList
          data={conversation.messages || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.messages}
          renderItem={({ item }) => (
            <View style={[s.bubble, item.fromMe ? s.mine : s.theirs]}>
              <Text style={[s.messageText, item.fromMe && s.mineText]}>{item.text}</Text>
              <Text style={[s.time, item.fromMe && s.mineTime]}>{item.time}</Text>
            </View>
          )}
        />

        <View style={s.composer}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={t('chat.typeMessage')}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={3000}
          />
          <TouchableOpacity style={[s.send, (!text.trim() || sending) && s.disabled]} onPress={sendMessage} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F0F1F4" },
  back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, paddingRight: 12 },
  name: { fontSize: 16, fontWeight: "800", color: "#111827" },
  listing: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  messages: { padding: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", borderRadius: 17, paddingHorizontal: 13, paddingVertical: 9 },
  mine: { alignSelf: "flex-end", backgroundColor: "#7C3AED", borderBottomRightRadius: 5 },
  theirs: { alignSelf: "flex-start", backgroundColor: "#F3F4F6", borderBottomLeftRadius: 5 },
  messageText: { color: "#111827", fontSize: 14, lineHeight: 20 },
  mineText: { color: "#fff" },
  time: { color: "#9CA3AF", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  mineTime: { color: "rgba(255,255,255,0.72)" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: "#F0F1F4", backgroundColor: "#fff" },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11, color: "#111827", fontSize: 14 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.45 },
  error: { color: "#B91C1C", textAlign: "center", marginBottom: 16, fontSize: 14 },
  retry: { backgroundColor: "#7C3AED", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "800" },
});