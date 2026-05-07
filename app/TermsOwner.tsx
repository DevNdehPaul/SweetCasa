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
    title: 'Listing Integrity',
    content: [
      { bold: '', text: 'You certify that you have the legal right to rent out the property listed. All photos and video tours must accurately represent the current state of the house. Misrepresentation of a property is grounds for account termination and legal action.' },
    ],
  },
  {
    num: '3',
    title: 'The 7-Day Payment Hold',
    content: [
      { bold: '', text: 'You acknowledge and agree that your payment will be held by SweetCasa and disbursed to you 7 days after the tenant successfully moves in, provided no valid dispute is raised by the seeker regarding the existence or safety of the property.' },
    ],
  },
  {
    num: '4',
    title: 'Platform Commission',
    content: [
      { bold: '', text: 'SweetCasa will deduct a fixed commission fee from the total rental amount for providing the verification and escrow service. By listing a house, you agree to this deduction.' },
    ],
  },
  {
    num: '5',
    title: 'Dispute Resolution',
    content: [
      { bold: '', text: 'In the event of a dispute, you agree to submit to a mandatory audit by the SweetCasa team. If a property is found to be a scam or significantly misrepresented, SweetCasa reserves the right to refund the seeker in full and charge the owner a processing fine.' },
    ],
  },
];

const PRIVACY = [
  {
    num: '1',
    title: 'Verification Document Security',
    content: 'We collect sensitive documents, including Property Titles and CNI scans. These documents are encrypted and stored on secure servers. They are used strictly for internal auditing and are never shared with seekers or the public.',
  },
  {
    num: '2',
    title: 'Public Information Display',
    content: 'Only the property details (photos, videos, amenities, general location) are visible to the public. Your personal ID and exact contact information are only revealed to a seeker once a booking/payment has been initiated through the app.',
  },
  {
    num: '3',
    title: 'Proximity and Location Data',
    content: 'We use the precise location of your property to calculate "Nearby Facilities" (schools, hospitals, markets). This ensures your listing is matched with the right high-intent seekers.',
  },
  {
    num: '4',
    title: 'Audit Trail',
    content: 'SweetCasa maintains a record of all listings and transactions for government tax compliance and to protect against the listing of fraudulent or contested land/properties.',
  },
];

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
        <Text style={s.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>SweetCasa Agreement</Text>
          <Text style={s.heroSub}>For House Owners</Text>
          <Text style={s.heroDate}>Last Updated: October 24, 2023</Text>
          <Text style={s.heroDesc}>
            Please read these terms and conditions carefully before listing properties on SweetCasa.
            By accessing or using our platform as a House Owner, you agree to be bound by these terms.
          </Text>
        </View>

        {/* Warning banner */}
        <View style={s.warningBanner}>
          <Text style={s.warningIcon}>⚠️</Text>
          <Text style={s.warningTxt}>
            Misrepresentation of any property is grounds for account termination and potential legal action under Cameroonian law.
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
            router.push('/house_owners_login_signup?termsAccepted=false&tab=signup');
          }}
        >
          <Text style={s.declineTxt}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.acceptBtn, accepted && s.acceptedBtn]}
          onPress={() => {
            setAccepted(true);
            // Navigate back to signup tab with acceptance flag
            router.push('/house_owners_login_signup?termsAccepted=true&tab=signup');
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
    padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: TEXT_DARK, marginBottom: 4 },
  heroSub: { fontSize: 14, fontWeight: '600', color: PURPLE, marginBottom: 6 },
  heroDate: { fontSize: 12, color: TEXT_MID, marginBottom: 12 },
  heroDesc: { fontSize: 13, color: TEXT_MID, lineHeight: 20 },

  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: 14,
    padding: 14, marginBottom: 20,
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