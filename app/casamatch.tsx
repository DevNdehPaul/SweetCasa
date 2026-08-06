/**
 * CasaMatch — Conversational AI real-estate agent
 *
 * Screens:
 *   HistoryScreen  — list of past AI conversations + "New Chat" button
 *   ChatScreen     — active conversation (bubbles, input bar, typing indicator)
 *
 * Dependencies already used in the project:
 *   expo-router, react-i18next, @expo/vector-icons, react-native
 *
 * New dependencies needed (add to your package.json):
 *   expo-image-picker   — for image attachments
 *   expo-av             — for voice recording & audio playback
 *   expo-file-system    — used by expo-av
 */

import { Feather, Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
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
  View
} from 'react-native';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

// White text/icons sitting directly on a solid-color bubble/button (e.g. the
// user's purple chat bubble, the score chip, the send button) stay hardcoded —
// that swatch doesn't change between light/dark, so the text on it shouldn't
// either.
const WHITE = '#FFFFFF';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MatchResult {
  id:          string;
  score:       number;
  matchReason: string;
  name:        string;
  location:    string;
  price:       string;
  tags:        string[];
  badge:       string | null;
  images:      string[];
  listingType: 'rent' | 'sale';
}

interface AiConversation {
  id:        number;
  title:     string;
  language:  string;
  createdAt: string;
  updatedAt: string;
  messages?: AiChatMessage[];
}

interface AiChatMessage {
  id:              number;
  conversationId:  number;
  role:            'user' | 'assistant';
  content:         string;
  imageUrl?:       string | null;
  audioUrl?:       string | null;
  audioTranscript?:string | null;
  listingResults?: MatchResult[] | null;
  createdAt:       string;
}

type Screen = 'history' | 'chat';
type Styles = ReturnType<typeof getStyles>;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── API helpers ──────────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Reuse however you store the JWT in your app (AsyncStorage, SecureStore, context, etc.)
  // Replace this with your actual token retrieval:
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/api/casamatch-chat${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers as Record<string, string> || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ s }: { s: Styles }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    animDot(dot1, 0);
    animDot(dot2, 150);
    animDot(dot3, 300);
  }, []);

  return (
    <View style={s.typingWrap}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[s.typingDot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

// ─── Audio Player (for voice messages) ───────────────────────────────────────
function AudioPlayer({ uri, colors, s }: { uri: string; colors: ThemeColors; s: Styles }) {
  const [sound,     setSound]     = useState<Audio.Sound | null>(null);
  const [playing,   setPlaying]   = useState(false);
  const [duration,  setDuration]  = useState(0);
  const [position,  setPosition]  = useState(0);

  useEffect(() => () => { sound?.unloadAsync(); }, [sound]);

  const toggle = async () => {
    if (!sound) {
      const { sound: snd } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis ?? 0);
            setDuration(status.durationMillis ?? 0);
            if (status.didJustFinish) { setPlaying(false); setPosition(0); }
          }
        }
      );
      setSound(snd);
      setPlaying(true);
    } else if (playing) {
      await sound.pauseAsync();
      setPlaying(false);
    } else {
      await sound.playAsync();
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? position / duration : 0;
  const elapsed  = Math.floor(position / 1000);
  const total    = Math.floor(duration / 1000);
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  return (
    <View style={s.audioPlayer}>
      <TouchableOpacity onPress={toggle} style={s.audioPlayBtn}>
        <Feather name={playing ? 'pause' : 'play'} size={16} color={colors.primary} />
      </TouchableOpacity>
      <View style={s.audioTrack}>
        <View style={s.audioTrackBg}>
          <View style={[s.audioTrackFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>
      <Text style={s.audioTime}>{fmt(elapsed)}/{fmt(total || 0)}</Text>
    </View>
  );
}

// ─── Listing Card (inline, compact) ──────────────────────────────────────────
function ListingCard({ item, colors, s }: { item: MatchResult; colors: ThemeColors; s: Styles }) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/listings/${item.id}`, { headers });
      if (res.ok) {
        const listingData = await res.json();
        router.push({ pathname: '/propertydetail', params: { id: item.id, listingData: JSON.stringify(listingData) } });
      } else {
        router.push({ pathname: '/propertydetail', params: { id: item.id } });
      }
    } catch {
      router.push({ pathname: '/propertydetail', params: { id: item.id } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={s.listingCard} onPress={handlePress} activeOpacity={0.85}>
      <View style={s.listingImgWrap}>
        {item.images?.[0]
          ? <Image source={{ uri: item.images[0] }} style={s.listingImg} resizeMode="cover" />
          : <View style={[s.listingImg, s.listingImgPlaceholder]}><Ionicons name="home-outline" size={24} color={colors.primarySoft} /></View>
        }
        <View style={s.scoreChip}>
          <Text style={s.scoreChipTxt}>{item.score}%</Text>
        </View>
        {item.badge && (
          <View style={s.listingBadge}>
            <Text style={s.listingBadgeTxt}>{item.badge}</Text>
          </View>
        )}
      </View>
      <View style={s.listingBody}>
        <Text style={s.listingName} numberOfLines={1}>{item.name}</Text>
        <View style={s.listingLocRow}>
          <Ionicons name="location-outline" size={11} color={colors.textLight} />
          <Text style={s.listingLoc} numberOfLines={1}>{item.location}</Text>
        </View>
        <Text style={s.listingPrice}>{item.price}</Text>
        <View style={s.listingTagRow}>
          {item.tags.slice(0, 3).map(tag => (
            <View key={tag} style={s.listingTag}>
              <Text style={s.listingTagTxt}>{tag}</Text>
            </View>
          ))}
        </View>
        <View style={s.matchReasonRow}>
          <Ionicons name="sparkles" size={11} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={s.matchReasonTxt} numberOfLines={2}>"{item.matchReason}"</Text>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={colors.primaryDark} style={{ marginTop: 8 }} />
          : <View style={s.viewBtn}><Text style={s.viewBtnTxt}>View Property</Text><Feather name="arrow-right" size={12} color={colors.primary} /></View>
        }
      </View>
    </TouchableOpacity>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, colors, s }: { msg: AiChatMessage; colors: ThemeColors; s: Styles }) {
  const isUser   = msg.role === 'user';
  const listings = msg.listingResults ?? [];

  return (
    <View style={[s.bubbleRow, isUser && s.bubbleRowUser]}>
      {!isUser && (
        <View style={s.avatarWrap}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </View>
      )}
      <View style={[s.bubbleOuter, isUser && s.bubbleOuterUser]}>
        {/* Text content */}
        {!!msg.content && (
          <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
            <Text style={[s.bubbleTxt, isUser && s.bubbleTxtUser]}>
              {msg.content}
            </Text>
          </View>
        )}

        {/* Image attachment */}
        {!!msg.imageUrl && (
          <View style={s.attachImgWrap}>
            <Image source={{ uri: msg.imageUrl }} style={s.attachImg} resizeMode="cover" />
          </View>
        )}

        {/* Audio attachment */}
        {!!msg.audioUrl && (
          <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI, { paddingVertical: 10 }]}>
            <AudioPlayer uri={msg.audioUrl} colors={colors} s={s} />
            {!!msg.audioTranscript && (
              <Text style={[s.transcriptTxt, isUser && { color: '#E9D5FF' }]}>
                "{msg.audioTranscript}"
              </Text>
            )}
          </View>
        )}

        {/* Inline listing cards */}
        {listings.length > 0 && (
          <View style={s.listingsBlock}>
            <Text style={s.listingsHeading}>
              {listings.length} {listings.length === 1 ? 'match' : 'matches'} found
            </Text>
            {listings.map(item => (
              <ListingCard key={item.id} item={item} colors={colors} s={s} />
            ))}
          </View>
        )}

        <Text style={[s.timeStamp, isUser && s.timeStampUser]}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────
function ChatScreen({
  convId,
  onBack,
  colors,
  isDark,
  s,
}: {
  convId: number;
  onBack: () => void;
  colors: ThemeColors;
  isDark: boolean;
  s: Styles;
}) {
  const { t } = useTranslation();

  const [messages,  setMessages]  = useState<AiChatMessage[]>([]);
  const [title,     setTitle]     = useState('CasaMatch AI');
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [text,      setText]      = useState('');
  const [pendingImg,setPendingImg] = useState<{ uri: string; base64?: string; mimeType: string } | null>(null);

  // Voice recording state
  const [recording,    setRecording]    = useState<Audio.Recording | null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // ── Load conversation ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/conversations/${convId}`);
        setMessages(data.conversation.messages ?? []);
        setTitle(data.conversation.title || 'CasaMatch AI');
      } catch (err: any) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [convId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => { if (!loading) scrollToBottom(); }, [messages.length, loading]);

  // ── Image picker ───────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingImg({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow microphone access to send voice messages.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingSec(0);
      recordTimer.current = setInterval(() => setRecordingSec(sec => sec + 1), 1000);
    } catch (err: any) {
      Alert.alert('Recording failed', err.message);
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording) return;
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setIsRecording(false);
    setRecordingSec(0);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      if (uri) await sendMessage(undefined, undefined, uri);
    } catch (err: any) {
      Alert.alert('Error', 'Could not process voice message.');
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    if (recordTimer.current) { clearInterval(recordTimer.current); recordTimer.current = null; }
    setIsRecording(false);
    setRecordingSec(0);
    try {
      await recording.stopAndUnloadAsync();
    } catch { /* ignore */ }
    setRecording(null);
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async (
    overrideText?: string,
    overrideImg?: { uri: string; mimeType: string } | null,
    audioUri?: string
  ) => {
    const msgText    = overrideText  ?? text.trim();
    const imgToSend  = overrideImg   !== undefined ? overrideImg : pendingImg;

    if (!msgText && !imgToSend && !audioUri) return;

    setSending(true);
    setText('');
    setPendingImg(null);

    // Optimistic user message
    const optimisticId = -Date.now();
    const optimisticMsg: AiChatMessage = {
      id:            optimisticId,
      conversationId: convId,
      role:          'user',
      content:       msgText,
      imageUrl:      imgToSend?.uri ?? null,
      audioUrl:      audioUri ?? null,
      createdAt:     new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const headers = await getAuthHeaders();
      const form    = new FormData();
      if (msgText)  form.append('content', msgText);

      if (imgToSend?.uri) {
        const ext = imgToSend.uri.split('.').pop() ?? 'jpg';
        form.append('image', {
          uri:  imgToSend.uri,
          name: `photo.${ext}`,
          type: imgToSend.mimeType,
        } as any);
      }

      if (audioUri) {
        const ext = audioUri.split('.').pop() ?? 'm4a';
        form.append('audio', {
          uri:  audioUri,
          name: `voice.${ext}`,
          type: 'audio/m4a',
        } as any);
      }

      const res = await fetch(`${BASE_URL}/api/casamatch-chat/conversations/${convId}/messages`, {
        method:  'POST',
        headers: { ...headers },
        body:    form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');

      // Replace optimistic message + add AI response
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticId),
        data.userMessage,
        data.aiMessage,
      ]);

      // Update title if first message
      if (messages.length === 0 && data.userMessage.content) {
        const newTitle = data.userMessage.content.slice(0, 60);
        setTitle(newTitle);
      }
    } catch (err: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      Alert.alert('Error', err.message || 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const fmtSec = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* Header */}
      <View style={s.chatHeader}>
        <TouchableOpacity style={s.chatBackBtn} onPress={onBack}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.chatHeaderCenter}>
          <View style={s.agentAvatar}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={s.chatHeaderTitle} numberOfLines={1}>{title}</Text>
            <Text style={s.chatHeaderSub}>CasaMatch AI • SweetCasa</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => String(m.id)}
            renderItem={({ item }) => <MessageBubble msg={item} colors={colors} s={s} />}
            contentContainerStyle={s.messagesList}
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <View style={s.emptyChatIcon}>
                  <Ionicons name="sparkles" size={32} color={colors.primary} />
                </View>
                <Text style={s.emptyChatTitle}>Hi! I'm CasaMatch</Text>
                <Text style={s.emptyChatSub}>
                  Tell me what kind of home you're looking for in Cameroon — budget, city, type — and I'll find your perfect match.
                </Text>
                <View style={s.suggestionRow}>
                  {[
                    "I'm looking for a 2-bedroom apartment in Douala",
                    "Je cherche une villa à Yaoundé à louer",
                    "Show me studios under 100k XAF",
                  ].map(sugg => (
                    <TouchableOpacity key={sugg} style={s.suggestionChip} onPress={() => sendMessage(sugg)}>
                      <Text style={s.suggestionTxt}>{sugg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={
              sending ? (
                <View style={[s.bubbleRow, { marginBottom: 8 }]}>
                  <View style={s.avatarWrap}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                  <View style={[s.bubble, s.bubbleAI]}>
                    <TypingIndicator s={s} />
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Pending image preview */}
        {pendingImg && (
          <View style={s.pendingImgBar}>
            <Image source={{ uri: pendingImg.uri }} style={s.pendingImgThumb} />
            <Text style={s.pendingImgTxt}>Image attached</Text>
            <TouchableOpacity onPress={() => setPendingImg(null)}>
              <Feather name="x" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Recording bar */}
        {isRecording && (
          <View style={s.recordingBar}>
            <View style={s.recordingDot} />
            <Text style={s.recordingTxt}>Recording… {fmtSec(recordingSec)}</Text>
            <TouchableOpacity style={s.cancelRecordBtn} onPress={cancelRecording}>
              <Feather name="x" size={16} color={colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity style={s.sendRecordBtn} onPress={stopAndSendRecording}>
              <Feather name="send" size={16} color={WHITE} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        {!isRecording && (
          <View style={s.inputBar}>
            <TouchableOpacity style={s.inputIcon} onPress={pickImage}>
              <Feather name="image" size={20} color={colors.textLight} />
            </TouchableOpacity>

            <TextInput
              style={s.textInput}
              placeholder="Message CasaMatch…"
              placeholderTextColor={colors.textLight}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />

            {text.trim() || pendingImg ? (
              <TouchableOpacity
                style={[s.sendBtn, sending && { opacity: 0.6 }]}
                onPress={() => sendMessage()}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color={WHITE} />
                  : <Feather name="send" size={18} color={WHITE} />
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.recordBtn} onPress={startRecording}>
                <Feather name="mic" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── History Screen ───────────────────────────────────────────────────────────
function HistoryScreen({
  onSelectConv, onNewChat, colors, isDark, s,
}: {
  onSelectConv: (id: number) => void;
  onNewChat:    (id: number) => void;
  colors: ThemeColors;
  isDark: boolean;
  s: Styles;
}) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/conversations');
      setConversations(data.conversations ?? []);
    } catch (err: any) {
      // If 401, the user isn't logged in — redirect
      if (err.message === 'Not authenticated') {
        Alert.alert('Sign in required', 'Please sign in to use CasaMatch AI.', [
          { text: 'OK', onPress: () => router.replace('/house_seekers_login_signup') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleNew = async () => {
    try {
      const data = await apiFetch('/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      onNewChat(data.conversation.id);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete chat?', 'This conversation will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(id);
          try {
            await apiFetch(`/conversations/${id}`, { method: 'DELETE' });
            setConversations(prev => prev.filter(c => c.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)   return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* Header */}
      <View style={s.historyHeader}>
        <TouchableOpacity style={s.chatBackBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.historyTitle}>CasaMatch AI</Text>
          <Text style={s.historySubtitle}>Your property search assistant</Text>
        </View>
        <TouchableOpacity style={s.newChatBtn} onPress={handleNew}>
          <Feather name="plus" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* New Chat CTA */}
      <TouchableOpacity style={s.newChatCard} onPress={handleNew} activeOpacity={0.85}>
        <View style={s.newChatIconWrap}>
          <Ionicons name="sparkles" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.newChatCardTitle}>Start new conversation</Text>
          <Text style={s.newChatCardSub}>Find your perfect home in Cameroon</Text>
        </View>
        <Feather name="arrow-right" size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* Past conversations */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primaryDark} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.textLight} style={{ marginBottom: 12 }} />
          <Text style={s.emptyChatTitle}>No conversations yet</Text>
          <Text style={[s.emptyChatSub, { textAlign: 'center' }]}>
            Start a new chat to find your dream home.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}>
          <Text style={s.sectionLabel}>Recent chats</Text>
          {conversations.map(conv => {
            const lastMsg = (conv as any).messages?.[0];
            return (
              <TouchableOpacity
                key={conv.id}
                style={s.convRow}
                onPress={() => onSelectConv(conv.id)}
                activeOpacity={0.8}
              >
                <View style={s.convIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.convTitle} numberOfLines={1}>{conv.title}</Text>
                  {lastMsg && (
                    <Text style={s.convPreview} numberOfLines={1}>
                      {lastMsg.role === 'user' ? 'You: ' : ''}{lastMsg.content}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={s.convTime}>{relativeTime(conv.updatedAt)}</Text>
                  <TouchableOpacity
                    onPress={() => handleDelete(conv.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {deleting === conv.id
                      ? <ActivityIndicator size="small" color={colors.textLight} />
                      : <Feather name="trash-2" size={14} color={colors.border} />
                    }
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CasaMatchAIScreen() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [screen,     setScreen]     = useState<Screen>('history');
  const [activeConv, setActiveConv] = useState<number | null>(null);

  const openConv = (id: number) => { setActiveConv(id); setScreen('chat'); };
  const goBack   = ()           => { setScreen('history'); setActiveConv(null); };

  if (screen === 'chat' && activeConv !== null) {
    return <ChatScreen convId={activeConv} onBack={goBack} colors={colors} isDark={isDark} s={s} />;
  }

  return (
    <HistoryScreen
      onSelectConv={openConv}
      onNewChat={openConv}
      colors={colors}
      isDark={isDark}
      s={s}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: colors.background },
    centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

    // ── History ──
    historyHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    historyTitle:    { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
    historySubtitle: { fontSize: 12, color: colors.textLight, marginTop: 1 },
    newChatBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center',
      marginLeft: 'auto',
    },
    newChatCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      margin: 16, padding: 18, borderRadius: 18,
      backgroundColor: colors.primaryTintAlt, borderWidth: 1.5, borderColor: colors.primaryBorder,
    },
    newChatIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primaryDark, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
    },
    newChatCardTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDarker },
    newChatCardSub:   { fontSize: 12, color: colors.textLight, marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
    convRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    convIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center' },
    convTitle:   { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    convPreview: { fontSize: 12, color: colors.textLight },
    convTime:    { fontSize: 11, color: colors.textLight },

    // ── Chat header ──
    chatHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 12, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      backgroundColor: colors.card,
    },
    chatBackBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center',
    },
    chatHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    agentAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center' },
    chatHeaderTitle: { fontSize: 15, fontWeight: '700', color: colors.text, maxWidth: 200 },
    chatHeaderSub:   { fontSize: 11, color: colors.textLight, marginTop: 1 },

    // ── Messages ──
    messagesList: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
    bubbleRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
    bubbleRowUser: { flexDirection: 'row-reverse' },
    bubbleOuter:   { maxWidth: '80%' },
    bubbleOuterUser: {},
    avatarWrap: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center',
      marginBottom: 4,
    },
    bubble:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
    bubbleAI:    { backgroundColor: colors.primaryTintAlt, borderBottomLeftRadius: 4 },
    bubbleUser:  { backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 },
    bubbleTxt:     { fontSize: 14.5, color: colors.text, lineHeight: 21 },
    bubbleTxtUser: { color: WHITE },
    timeStamp:     { fontSize: 10, color: colors.textLight, marginTop: 2, textAlign: 'left' },
    timeStampUser: { textAlign: 'right' },

    attachImgWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
    attachImg:     { width: 220, height: 160, borderRadius: 14 },

    transcriptTxt: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 4, lineHeight: 17 },

    // ── Typing indicator ──
    typingWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 4 },
    typingDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary },

    // ── Audio player ──
    audioPlayer:  { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 160 },
    audioPlayBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center' },
    audioTrack:   { flex: 1, height: 20, justifyContent: 'center' },
    audioTrackBg: { height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
    audioTrackFill:{ height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
    audioTime:    { fontSize: 11, color: colors.textLight, width: 42, textAlign: 'right' },

    // ── Listings inline ──
    listingsBlock:   { marginTop: 8, gap: 10 },
    listingsHeading: { fontSize: 13, fontWeight: '700', color: colors.primaryDarker, marginBottom: 4 },
    listingCard:     { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primaryBorder, overflow: 'hidden', width: 280 },
    listingImgWrap:  { width: '100%', height: 140, position: 'relative' },
    listingImg:      { width: '100%', height: '100%' },
    listingImgPlaceholder: { backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center' },
    scoreChip:  { position: 'absolute', top: 8, right: 8, backgroundColor: colors.primaryDark, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    scoreChipTxt: { fontSize: 11, fontWeight: '700', color: WHITE },
    listingBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.overlay, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    listingBadgeTxt: { fontSize: 10, color: WHITE, fontWeight: '700' },
    listingBody:  { padding: 12, gap: 4 },
    listingName:  { fontSize: 13, fontWeight: '700', color: colors.text },
    listingLocRow:{ flexDirection: 'row', alignItems: 'center', gap: 3 },
    listingLoc:   { fontSize: 11, color: colors.textLight, flex: 1 },
    listingPrice: { fontSize: 13, fontWeight: '800', color: colors.primaryDarker, marginTop: 2 },
    listingTagRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    listingTag:   { backgroundColor: colors.divider, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    listingTagTxt:{ fontSize: 10.5, color: colors.textMuted, fontWeight: '600' },
    matchReasonRow:{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, backgroundColor: colors.primaryTintAlt, borderRadius: 10, padding: 8 },
    matchReasonTxt:{ fontSize: 11.5, color: colors.primaryDarker, flex: 1, fontStyle: 'italic', lineHeight: 16 },
    viewBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.primaryTintAlt },
    viewBtnTxt:   { fontSize: 12, fontWeight: '700', color: colors.primaryDarker },

    // ── Empty chat ──
    emptyChat:        { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
    emptyChatIcon:    { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyChatTitle:   { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 8 },
    emptyChatSub:     { fontSize: 14, color: colors.textLight, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
    suggestionRow:    { width: '100%', gap: 8 },
    suggestionChip:   { backgroundColor: colors.primaryTintAlt, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.primaryBorder },
    suggestionTxt:    { fontSize: 13, color: colors.primaryDarker, fontWeight: '500' },

    // ── Input bar ──
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: colors.borderLight,
      backgroundColor: colors.card,
    },
    inputIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    textInput: {
      flex: 1, maxHeight: 100, fontSize: 14.5, color: colors.text,
      backgroundColor: colors.primaryTintAlt, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 10,
      borderWidth: 1.5, borderColor: colors.primaryBorder,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    recordBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.primaryBorder,
    },

    pendingImgBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 8,
      backgroundColor: colors.primaryTintAlt, borderTopWidth: 1, borderTopColor: colors.primaryBorder,
    },
    pendingImgThumb: { width: 40, height: 40, borderRadius: 8 },
    pendingImgTxt:   { flex: 1, fontSize: 13, color: colors.primaryDarker, fontWeight: '600' },

    recordingBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: colors.dangerBg, borderTopWidth: 1, borderTopColor: colors.danger + '55',
    },
    recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
    recordingTxt: { flex: 1, fontSize: 14, color: colors.danger, fontWeight: '600' },
    cancelRecordBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
    sendRecordBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  });
}