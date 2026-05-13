import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#F3F0FF';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const GRAY_BORDER = '#E5E7EB';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Eligibility',
    body:
      'To list properties on SweetCasa as a House Owner, you must be at least 18 years of age, a legal resident or registered entity in Cameroon, and hold verifiable ownership or authorised management rights over any property you list.',
  },
  {
    title: '2. Listing Accuracy',
    body:
      'All property details — including photos, videos, pricing, location, and room counts — must be truthful, accurate, and up to date. Misleading or fraudulent listings will result in immediate removal and may lead to permanent account suspension.',
  },
  {
    title: '3. Verification Process',
    body:
      'Every listing submitted on SweetCasa undergoes a 12-point verification review by our local agents before going live. You agree to cooperate with this process and to provide any requested supporting documents promptly.',
  },
  {
    title: '4. Legal Documents',
    body:
      'You are required to upload valid proof of ownership or authorisation (title deed, lease agreement, power of attorney, etc.) when submitting a listing. SweetCasa reserves the right to reject any listing lacking adequate documentation.',
  },
  {
    title: '5. Pricing & Payments',
    body:
      'All rental or sale prices must be stated in XAF (Central African Franc). Payments facilitated through the SweetCasa platform are processed via a secure escrow wallet. Funds are held until tenancy or sale conditions are met, protecting both parties.',
  },
  {
    title: '6. Communication',
    body:
      'House Seekers may contact you through the SweetCasa messaging system. You agree to respond to enquiries in good faith and within a reasonable timeframe. Harassment, discrimination, or abuse of any kind is strictly prohibited.',
  },
  {
    title: '7. Fees & Commission',
    body:
      'SweetCasa charges a platform service fee on successful transactions. The applicable rate will be clearly communicated before any listing is published. Attempting to circumvent platform fees by conducting transactions outside SweetCasa is a violation of these terms.',
  },
  {
    title: '8. Removal of Listings',
    body:
      'SweetCasa reserves the right to remove any listing at any time for violations of these terms, inaccurate information, or reports from other users. Repeated violations may result in permanent account deactivation.',
  },
  {
    title: '9. Intellectual Property',
    body:
      'By uploading photos, videos, and other media to SweetCasa, you grant SweetCasa a non-exclusive, royalty-free licence to display and promote that content on our platform and in marketing materials. You retain full ownership of your content.',
  },
  {
    title: '10. Limitation of Liability',
    body:
      'SweetCasa acts as a marketplace platform and is not responsible for disputes arising between House Owners and House Seekers once a transaction has been completed outside the platform. We strongly encourage all parties to use our in-platform escrow and messaging systems.',
  },
  {
    title: '11. Privacy',
    body:
      'Your personal data is handled in accordance with the SweetCasa Privacy Policy. We do not sell or share your information with third parties for marketing purposes without your explicit consent.',
  },
  {
    title: '12. Amendments',
    body:
      'SweetCasa reserves the right to update these Terms & Conditions at any time. Continued use of the platform after changes are published constitutes acceptance of the updated terms. We will notify you of material changes via the app or email.',
  },
];

export default function TermsOwner() {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIconWrap}>
            <Feather name="file-text" size={28} color={PURPLE} />
          </View>
          <Text style={s.heroTitle}>House Owner Agreement</Text>
          <Text style={s.heroSub}>
            Please read these terms carefully. They govern your use of SweetCasa as a property
            owner listing homes for rent or sale in Cameroon.
          </Text>
          <View style={s.lastUpdated}>
            <Feather name="clock" size={11} color={TEXT_MID} />
            <Text style={s.lastUpdatedTxt}>Last updated: May 2026</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((sec) => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        {/* Footer note */}
        <View style={s.footerNote}>
          <Feather name="info" size={14} color={PURPLE} />
          <Text style={s.footerNoteTxt}>
            By using SweetCasa as a House Owner, you confirm that you have read, understood,
            and agree to these Terms & Conditions.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },

  hero: {
    alignItems: 'center', marginBottom: 28,
    backgroundColor: PURPLE_LIGHT, borderRadius: 20, padding: 24,
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PURPLE, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: TEXT_DARK, textAlign: 'center', marginBottom: 8 },
  heroSub: { fontSize: 13, color: TEXT_MID, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  lastUpdated: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lastUpdatedTxt: { fontSize: 11, color: TEXT_MID },

  section: {
    marginBottom: 20, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: PURPLE, marginBottom: 8 },
  sectionBody: { fontSize: 13.5, color: TEXT_MID, lineHeight: 22 },

  footerNote: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: PURPLE_LIGHT, borderRadius: 14, padding: 16, marginTop: 8,
  },
  footerNoteTxt: { flex: 1, fontSize: 12.5, color: TEXT_DARK, lineHeight: 19 },
});