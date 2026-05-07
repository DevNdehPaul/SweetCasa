import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    SafeAreaView, ScrollView, StyleSheet, Text,
    TouchableOpacity, View,
} from 'react-native';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const BG = '#F5F6FA';
const GRAY_BORDER = '#E5E7EB';

const SECTIONS = [
  {
    num: '1',
    title: 'General Provisions',
    content: [
      { bold: 'Platform Role:', text: ' SWEETCASA acts as a verified intermediary. We do not own the properties. We provide the technology to facilitate "Trust-as-a-Service" between Seekers and Owners.' },
      { bold: 'Age Requirement:', text: ' All users must be at least 18 years of age.' },
    ],
  },
  {
    num: '2',
    title: 'The SweetCasa Trust Guarantee',
    content: [
      { bold: '', text: 'By using this platform, you agree that SweetCasa acts as a secure intermediary. When you pay for a property, your funds are held in a Secure Escrow Wallet and are not released to the owner until 7 days after your move-in date.' },
    ],
  },
  {
    num: '3',
    title: 'Reporting and Refunds',
    content: [
      { bold: '', text: 'You have exactly 7 days from your official move-in date to report any major issues (e.g., the house does not exist, it is structurally unsafe, or it is already occupied). If no dispute is raised within this window, the funds are automatically released to the owner and SweetCasa is no longer liable for refunds.' },
    ],
  },
  {
    num: '4',
    title: 'Direct Payments Prohibited',
    content: [
      { bold: '', text: 'You are strictly forbidden from paying "viewing fees" or rental deposits directly to owners outside the SweetCasa app. Paying outside the platform voids all "Trust-as-a-Service" protections and may result in a permanent ban from the platform.' },
    ],
  },
  {
    num: '5',
    title: 'User Accountability',
    content: [
      { bold: '', text: 'You agree to provide truthful identification. Any attempt to use a stolen National ID card or provide false information will be reported to the authorities.' },
    ],
  },
];

const PRIVACY = [
  {
    num: '1',
    title: 'Data Collection for Safety',
    content: 'We collect your full name, phone number, and a scan of your National Identity Card (CNI). This data is used solely to verify your identity and ensure the safety of our community.',
  },
  {
    num: '2',
    title: 'Casa-Match AI Usage',
    content: 'Your search preferences and the results of your lifestyle quiz are used by our AI to provide personalized home recommendations. This data is kept internal and is never sold to third-party advertisers.',
  },
  {
    num: '3',
    title: 'Financial Privacy',
    content: 'Your wallet balance and transaction history are encrypted. SweetCasa staff do not have access to your private payment credentials or Mobile Money pins.',
  },
  {
    num: '4',
    title: 'Data Retention',
    content: 'Even if you delete your account, SweetCasa will archive transaction records and ID data for a period of 5 years to comply with Cameroonian anti-fraud and financial regulations.',
  },
];

export default function TermsSeeker() {
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>SweetCasa Agreement</Text>
          <Text style={s.heroSub}>For House Seekers</Text>
          <Text style={s.heroDate}>Last Updated: October 24, 2023</Text>
          <Text style={s.heroDesc}>
            Please read these terms and conditions carefully before using the SweetCasa mobile application.
            By accessing or using our platform, you agree to be bound by these terms.
          </Text>
        </View>

        {/* Terms of Service */}
        <View style={s.groupHeader}>
          <View style={s.groupDot} />
          <Text style={s.groupTitle}>Terms of Service</Text>
        </View>

        {SECTIONS.map(sec => (
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
          <View style={[s.groupDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={s.groupTitle}>Privacy Policy</Text>
        </View>

        {PRIVACY.map(sec => (
          <View key={sec.num} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.numBadge}><Text style={s.numTxt}>{sec.num}</Text></View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <Text style={s.cardBody}>{sec.content}</Text>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={s.declineBtn}
          onPress={() => {
            // Go back to signup with declined state
            router.push('/house_seekers_login_signup?termsAccepted=false&tab=signup');
          }}
        >
          <Text style={s.declineTxt}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.acceptBtn, accepted && s.acceptedBtn]}
          onPress={() => {
            setAccepted(true);
            // Navigate back to signup tab with acceptance flag
            router.push('/house_seekers_login_signup?termsAccepted=true&tab=signup');
          }}
        >
          <Text style={s.acceptTxt}>{accepted ? '✓ Accepted' : 'Accept & Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 12,
    backgroundColor: BG, position: 'relative',
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: TEXT_DARK,
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  hero: {
    backgroundColor: '#fff', borderRadius: 18,
    padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  heroSub: { fontSize: 14, fontWeight: '600', color: PURPLE, marginBottom: 6 },
  heroDate: { fontSize: 12, color: TEXT_MID, marginBottom: 12 },
  heroDesc: { fontSize: 13, color: TEXT_MID, lineHeight: 20 },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12, paddingHorizontal: 4,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  groupTitle: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: 0.2 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  numBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  numTxt: { fontSize: 12, fontWeight: '700', color: PURPLE },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, flex: 1 },
  cardBody: { fontSize: 13, color: TEXT_MID, lineHeight: 20 },
  bold: { fontWeight: '700', color: TEXT_DARK },

  bottomBar: {
    flexDirection: 'row', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: GRAY_BORDER,
  },
  declineBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: PURPLE, alignItems: 'center',
  },
  declineTxt: { fontSize: 14, fontWeight: '700', color: PURPLE },
  acceptBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 14,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  acceptedBtn: { backgroundColor: '#16A34A' },
  acceptTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});