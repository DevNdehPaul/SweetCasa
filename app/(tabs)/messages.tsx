import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
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

type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  seen?: boolean;
};

const LISTING = {
  image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=300&q=80',
  title: 'Modern 2-Bedroom Apartment',
  location: 'Bastos, Yaoundé',
  price: '350,000 FCFA / month',
};

const AGENT = {
  name: 'Agent John',
  avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    fromMe: true,
    text: 'Hello! I saw your listing for the modern 2-bedroom apartment in Bastos. Is it still available for viewing?',
    time: '10:15 AM',
    seen: true,
  },
  {
    id: '2',
    fromMe: false,
    text: 'Hi there! Yes, it is. We actually have a viewing session scheduled for tomorrow afternoon. Would you like to join?',
    time: '10:18 AM',
  },
  {
    id: '3',
    fromMe: true,
    text: 'That sounds great! What time exactly? Also, are the utilities included in the monthly rent?',
    time: '10:20 AM',
    seen: true,
  },
  {
    id: '4',
    fromMe: false,
    text: 'The viewing is at 2:00 PM. Regarding utilities, water is included but electricity is on a prepaid meter system. The apartment has a backup generator as well.',
    time: '10:25 AM',
  },
  {
    id: '5',
    fromMe: true,
    text: "Perfect. Please send me the exact location pin. I'll be there!",
    time: '10:30 AM',
    seen: false,
  },
];

const QUICK_REPLIES = ['Schedule viewing', 'Request location', 'Negotiate price'];

// ─── Bubble ───────────────────────────────────────────────────────────────────
function Bubble({
  msg,
  showAvatar,
  isLast,
}: {
  msg: Message;
  showAvatar: boolean;
  isLast: boolean;
}) {
  if (msg.fromMe) {
    return (
      <View style={{ alignItems: 'flex-end', marginBottom: isLast ? 2 : 6 }}>
        <View
          style={[
            styles.bubbleMe,
            { borderBottomRightRadius: isLast ? 4 : 18 },
          ]}
        >
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
      {/* Avatar column — always 34px wide for alignment */}
      <View style={{ width: 34, marginRight: 8 }}>
        {showAvatar ? (
          <View style={styles.agentAvatarWrap}>
            <Image source={{ uri: AGENT.avatar }} style={styles.agentAvatar} />
            <View style={styles.onlineDot} />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={[
            styles.bubbleThem,
            { borderBottomLeftRadius: isLast ? 4 : 18 },
          ]}
        >
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
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const scrollRef = useRef<ScrollView>(null);

  const send = (text?: string) => {
    const txt = (text ?? input).trim();
    if (!txt) return;
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        fromMe: true,
        text: txt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        seen: false,
      },
    ]);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  };

  // Group consecutive messages from same sender
  const grouped = messages.map((msg, i) => {
    const next = messages[i + 1];
    const isLastInGroup = !next || next.fromMe !== msg.fromMe;
    const prev = messages[i - 1];
    const isFirstInGroup = !prev || prev.fromMe !== msg.fromMe;
    return { msg, isLastInGroup, isFirstInGroup };
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{AGENT.name}</Text>
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
          <View style={styles.listingCard}>
            <Image source={{ uri: LISTING.image }} style={styles.listingImg} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.listingTitle}>{LISTING.title}</Text>
              <Text style={styles.listingLoc}>{LISTING.location}</Text>
              <Text style={styles.listingPrice}>{LISTING.price}</Text>
            </View>
          </View>

          {/* Messages */}
          {grouped.map(({ msg, isLastInGroup, isFirstInGroup }) => (
            <Bubble
              key={msg.id}
              msg={msg}
              showAvatar={isFirstInGroup && !msg.fromMe}
              isLast={isLastInGroup}
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
          {QUICK_REPLIES.map(r => (
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
            <TouchableOpacity style={styles.sendBtn} onPress={() => send()} activeOpacity={0.85}>
              <Feather name="send" size={16} color="#fff" />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBtn: {
    width: 38, height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
  },

  // Safety Banner
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fefce8',
    borderBottomWidth: 1,
    borderBottomColor: '#fde047',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  safetyBold: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#854d0e',
    marginBottom: 1,
  },
  safetyText: {
    fontSize: 11,
    color: '#713f12',
    lineHeight: 16,
  },

  // Chat
  chatArea: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  dateLabel: {
    textAlign: 'center',
    fontSize: 11,
    color: '#B8B8B8',
    fontWeight: '500',
    marginBottom: 14,
  },

  // Listing card
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 18,
  },
  listingImg: {
    width: 58, height: 58,
    borderRadius: 10,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    marginBottom: 1,
  },
  listingLoc: {
    fontSize: 11,
    color: '#A0A0A0',
    marginBottom: 2,
  },
  listingPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Bubbles
  bubbleMe: {
    backgroundColor: '#6D28D9',
    borderRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: BUBBLE_MAX,
  },
  bubbleMeTxt: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 21,
    fontWeight: '400',
  },
  timeRowMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  timeText: {
    fontSize: 10,
    color: '#B8B8B8',
  },

  bubbleThem: {
    backgroundColor: '#F2F2F2',
    borderRadius: 18,
    borderTopLeftRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: BUBBLE_MAX,
  },
  bubbleThemTxt: {
    fontSize: 14,
    color: '#111',
    lineHeight: 21,
    fontWeight: '400',
  },

  // Agent avatar
  agentAvatarWrap: { position: 'relative' },
  agentAvatar: {
    width: 30, height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 9, height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Quick replies
  quickRowWrap: {
    height: 54,
    flexGrow: 0,
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickRow: {
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  quickChipTxt: {
    fontSize: 12.5,
    color: '#333',
    fontWeight: '500',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#111',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});