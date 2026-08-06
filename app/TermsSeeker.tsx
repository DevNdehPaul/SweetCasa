import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme'; // adjust relative path if needed

// ─── Section data ─────────────────────────────────────────────────────────────
const TOS_SECTIONS = [
  {
    num: '1',
    title: 'Eligibility & Registration',
    content: [
      { bold: 'Who can register: ', text: 'You must be at least 18 years old to create a seeker account and use our platform to search for properties.' },
      { bold: 'Accurate information: ', text: 'You agree to provide truthful and accurate personal information during registration and to keep it up to date.' },
    ],
  },
  {
    num: '2',
    title: 'Use of the Platform',
    content: [
      { bold: '', text: 'You may use this platform solely to search for and inquire about properties. Any misuse, including scraping, spamming owners, or submitting fraudulent applications, is strictly prohibited.' },
    ],
  },
  {
    num: '3',
    title: 'Payments & Escrow',
    content: [
      { bold: '', text: 'Rental payments are securely held in escrow and distributed to the house owner exactly 7 days after the house seeker has moved in.' },
    ],
  },
  {
    num: '4',
    title: 'Platform Disintermediation Protection',
    content: [
      { bold: '', text: 'House owners and agents are strictly prohibited from collecting direct cash or off-platform payments from house seekers. Any transaction conducted outside the SWEETCASA platform is not backed, secured, or recognized by SweetCasa. SweetCasa accepts zero liability for losses or disputes arising from off-platform agreements.' },
    ],
  },
  {
    num: '5',
    title: 'Negotiated Price Updates',
    content: [
      { bold: '', text: 'If a house seeker and house owner agree on a customized price, the house owner must update the listing price inside the app before payment is processed. This ensures the SWEETCASA matching and escrow flow uses the newly agreed, accurate amount.' },
    ],
  },
  {
    num: '6',
    title: 'Seeker Responsibilities',
    content: [
      { bold: '', text: 'You are responsible for maintaining rented properties in good condition, paying rent on time, and communicating respectfully with property owners and our support team.' },
    ],
  },
  {
    num: '7',
    title: 'Termination',
    content: [
      { bold: '', text: 'We reserve the right to suspend or terminate your account for violations of these terms, fraudulent activity, or abusive behaviour without prior notice.' },
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    num: '1',
    title: 'Data We Collect',
    body: 'We collect personal information including your name, email, phone number, national ID, and location details necessary to operate the platform and match you with suitable properties.',
  },
  {
    num: '2',
    title: 'How We Use Your Data',
    body: 'Your data is used to verify your identity, facilitate property searches, process payments, and send important account notifications. We do not sell your data to third parties.',
  },
  {
    num: '3',
    title: 'Data Security',
    body: 'We use industry-standard encryption and secure servers to protect your personal information. Your national ID is stored securely and used solely for identity verification.',
  },
  {
    num: '4',
    title: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data at any time by contacting our support team. Deleting your account will remove all associated personal data within 30 days.',
  },
  {
    num: '5',
    title: 'Payments & Escrow Data',
    body: 'We process escrow balances, payout records, and payment references only to operate the SweetCasa wallet, reconcile transactions, prevent fraud, and resolve disputes. This information is not used for unrelated marketing purposes.',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TermsSeeker() {
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Seeker Agreement</Text>
          <Text style={s.heroSub}>House Seeker / Tenant</Text>
          <Text style={s.heroDate}>Last updated: January 2025</Text>
          <Text style={s.heroDesc}>
            Please read these terms carefully before searching for a property. By creating an account,
            you agree to be bound by these terms and our privacy policy.
          </Text>
        </View>

        {/* Terms of Service */}
        <View style={s.groupHeader}>
          <View style={s.groupDot} />
          <Text style={s.groupTitle}>Terms of Service</Text>
        </View>

        {TOS_SECTIONS.map(sec => (
          <View key={sec.num} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.numBadge}><Text style={s.numTxt}>{sec.num}</Text></View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            {sec.content.map((item, i) => (
              <Text key={i} style={s.cardBody}>
                {item.bold ? <Text style={s.bold}>{item.bold}</Text> : null}
                {item.text}
              </Text>
            ))}
          </View>
        ))}

        {/* Privacy Policy */}
        <View style={[s.groupHeader, { marginTop: 8 }]}>
          <View style={[s.groupDot, { backgroundColor: colors.primaryDark }]} />
          <Text style={s.groupTitle}>Privacy Policy</Text>
        </View>

        {PRIVACY_SECTIONS.map(sec => (
          <View key={sec.num} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.numBadge}><Text style={s.numTxt}>{sec.num}</Text></View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <Text style={s.cardBody}>{sec.body}</Text>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.declineBtn}
          onPress={() => router.push('/house_seekers_login_signup?termsAccepted=false&tab=signup')}
        >
          <Text style={s.declineTxt}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.acceptBtn, accepted && s.acceptedBtn]}
          onPress={() => {
            setAccepted(true);
            router.push('/house_seekers_login_signup?termsAccepted=true&tab=signup');
          }}
        >
          <Text style={s.acceptTxt}>
            {accepted ? '✓ Accepted' : 'Accept & Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      backgroundColor: colors.background, position: 'relative',
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 17, fontWeight: '700', color: colors.text,
      position: 'absolute', left: 0, right: 0, textAlign: 'center',
    },
    scroll: { paddingHorizontal: 16, paddingTop: 16 },
    hero: {
      backgroundColor: colors.card, borderRadius: 18, padding: 20, marginBottom: 20,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
    heroSub: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 6 },
    heroDate: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
    heroDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    groupHeader: {
      flexDirection: 'row', alignItems: 'center',
      gap: 8, marginBottom: 12, paddingHorizontal: 4,
    },
    groupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    groupTitle: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: 0.2 },
    card: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    numBadge: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    numTxt: { fontSize: 12, fontWeight: '700', color: colors.primary },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
    cardBody: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
    bold: { fontWeight: '700', color: colors.text },
    bottomBar: {
      flexDirection: 'row', gap: 12, padding: 16,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 60,
    },
    declineBtn: {
      flex: 1, paddingVertical: 14, borderRadius: 14,
      borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center',
    },
    declineTxt: { fontSize: 14, fontWeight: '700', color: colors.primary },
    acceptBtn: {
      flex: 2, paddingVertical: 14, borderRadius: 14,
      backgroundColor: colors.primary, alignItems: 'center',
    },
    acceptedBtn: { backgroundColor: colors.success },
    acceptTxt: { fontSize: 14, fontWeight: '700', color: '#fff' }, // white on solid button — same in both themes
  });
}