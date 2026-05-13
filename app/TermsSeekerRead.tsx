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
      'To use SweetCasa as a House Seeker, you must be at least 18 years of age and a legal resident of or visitor to Cameroon. By creating an account, you confirm that the information you provide is truthful and accurate.',
  },
  {
    title: '2. Use of the Platform',
    body:
      'SweetCasa is a marketplace connecting House Seekers with verified property owners. You agree to use the platform solely for the purpose of finding residential or commercial properties to rent or purchase. Any misuse, including scraping listings or submitting false enquiries, is prohibited.',
  },
  {
    title: '3. Verified Listings',
    body:
      'All listings on SweetCasa undergo a 12-point verification process conducted by our local agents. While we strive for accuracy, SweetCasa does not guarantee the continued availability of any listed property and recommends you confirm details directly with the owner before making any payment.',
  },
  {
    title: '4. Payments & Escrow',
    body:
      'Any payments made through the SweetCasa platform are processed via our secure escrow wallet. Funds are held safely until tenancy or purchase conditions are satisfied. SweetCasa strongly advises against making payments outside the platform, as these are not protected by our escrow system.',
  },
  {
    title: '5. Booking & Viewings',
    body:
      'Requesting a viewing or showing interest in a listing does not constitute a binding agreement. A tenancy or purchase agreement is only formed when both parties have signed the relevant documents and payment has been confirmed through the platform.',
  },
  {
    title: '6. Communication Standards',
    body:
      'When contacting property owners through SweetCasa messaging, you agree to communicate respectfully and in good faith. Harassment, offensive language, or fraudulent communication is strictly prohibited and may result in account suspension.',
  },
  {
    title: '7. Personal Data',
    body:
      'SweetCasa collects and processes your personal data in accordance with our Privacy Policy. Your data is used solely to provide and improve the platform experience. We do not sell your information to third parties without your explicit consent.',
  },
  {
    title: '8. Favourites & Saved Listings',
    body:
      'Saving a listing to your favourites does not reserve or hold the property. Listings may become unavailable at any time. SweetCasa is not liable for the unavailability of a property you have saved.',
  },
  {
    title: '9. CasaMatch AI',
    body:
      'The CasaMatch AI quiz is a recommendation tool designed to help you find compatible properties based on your lifestyle preferences. Recommendations are suggestions only and do not constitute professional real estate advice.',
  },
  {
    title: '10. Prohibited Actions',
    body:
      'You agree not to: (a) post false reviews or reports; (b) impersonate another person or entity; (c) attempt to access another user\'s account; (d) use the platform for any unlawful purpose; or (e) circumvent platform fees by arranging transactions outside of SweetCasa.',
  },
  {
    title: '11. Limitation of Liability',
    body:
      'SweetCasa is a marketplace platform and is not a party to any tenancy or sale agreement between House Seekers and House Owners. We are not liable for any loss, damage, or dispute arising from transactions conducted outside our platform.',
  },
  {
    title: '12. Amendments',
    body:
      'SweetCasa may update these Terms & Conditions at any time. You will be notified of significant changes via the app or email. Continued use of SweetCasa after changes take effect constitutes your acceptance of the revised terms.',
  },
];

export default function TermsSeeker() {
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
          <Text style={s.heroTitle}>House Seeker Agreement</Text>
          <Text style={s.heroSub}>
            These terms govern your use of SweetCasa as a House Seeker looking for
            properties to rent or buy across Cameroon.
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
            By using SweetCasa as a House Seeker, you confirm that you have read, understood,
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