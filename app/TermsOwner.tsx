import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';

const PURPLE       = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const TEXT_DARK    = '#111827';
const TEXT_MID     = '#6B7280';
const BG           = '#F5F6FA';
const GRAY_BORDER  = '#E5E7EB';

// ─── Section data ─────────────────────────────────────────────────────────────
const TOS_SECTIONS = [
  {
    num: '1',
    title: 'Eligibility & Registration',
    content: [
      { bold: 'Who can register: ', text: 'You must be at least 18 years old and a legal owner or authorized representative of the property you wish to list.' },
      { bold: 'Accurate information: ', text: 'You agree to provide truthful, accurate, and up-to-date information about yourself and your properties at all times.' },
    ],
  },
  {
    num: '2',
    title: 'Property Listings',
    content: [
      { bold: '', text: 'All listings must accurately represent the property. Misleading descriptions, fake photos, or fraudulent listings are strictly prohibited and may result in permanent account suspension.' },
    ],
  },
  {
    num: '3',
    title: 'Payments & Payouts',
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
    title: 'Owner Responsibilities',
    content: [
      { bold: '', text: 'You are responsible for maintaining the property in a habitable condition, complying with all local housing laws, and responding promptly to tenant communications and maintenance requests.' },
    ],
  },
  {
    num: '7',
    title: 'Termination',
    content: [
      { bold: '', text: 'We reserve the right to suspend or terminate your account for violations of these terms, fraudulent activity, or failure to meet platform standards without prior notice.' },
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    num: '1',
    title: 'Data We Collect',
    body: 'We collect personal information including your name, email, phone number, company details, national ID, and property information necessary to operate the platform.',
  },
  {
    num: '2',
    title: 'How We Use Your Data',
    body: 'Your data is used to verify your identity, manage listings, process payments, and communicate important account updates. We do not sell your data to third parties.',
  },
  {
    num: '3',
    title: 'Data Security',
    body: 'We use industry-standard encryption and secure servers to protect your personal information. Your national ID is stored securely and used solely for identity verification purposes.',
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
export default function TermsOwner() {
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Owner Agreement</Text>
          <Text style={s.heroSub}>House Owner / Property Manager</Text>
          <Text style={s.heroDate}>Last updated: January 2025</Text>
          <Text style={s.heroDesc}>
            Please read these terms carefully before listing your property. By creating an account,
            you agree to be bound by these terms and our privacy policy.
          </Text>
        </View>

        {/* Warning banner */}
        <View style={s.warningBanner}>
          <Text style={s.warningIcon}>⚠️</Text>
          <Text style={s.warningTxt}>
            As a property owner, you are legally responsible for the accuracy of your listings and
            compliance with local housing regulations. Violations may result in account suspension.
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
          <View style={[s.groupDot, { backgroundColor: '#8B5CF6' }]} />
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
          onPress={() => router.push('/house_owners_login_signup?termsAccepted=false&tab=signup')}
        >
          <Text style={s.declineTxt}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.acceptBtn, accepted && s.acceptedBtn]}
          onPress={() => {
            setAccepted(true);
            router.push('/house_owners_login_signup?termsAccepted=true&tab=signup');
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
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
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
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  heroSub: { fontSize: 14, fontWeight: '600', color: PURPLE, marginBottom: 6 },
  heroDate: { fontSize: 12, color: TEXT_MID, marginBottom: 12 },
  heroDesc: { fontSize: 13, color: TEXT_MID, lineHeight: 20 },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warningIcon: { fontSize: 16 },
  warningTxt: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18, fontWeight: '500' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12, paddingHorizontal: 4,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  groupTitle: { fontSize: 15, fontWeight: '800', color: TEXT_DARK, letterSpacing: 0.2 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10,
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
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: GRAY_BORDER, paddingBottom: 60,
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
