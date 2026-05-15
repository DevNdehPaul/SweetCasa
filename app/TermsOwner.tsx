import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

const PURPLE       = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const TEXT_DARK    = '#111827';
const TEXT_MID     = '#6B7280';
const BG           = '#F5F6FA';
const GRAY_BORDER  = '#E5E7EB';

// ─── Section data — all text pulled from i18n ─────────────────────────────────
// Keys follow the pattern: terms.owner.tos.sN.title / terms.owner.tos.sN.body
// For sections with bold+text pairs: terms.owner.tos.sN.bold1 / terms.owner.tos.sN.text1

const TOS_SECTION_KEYS = [
  {
    num: '1',
    titleKey: 'terms.owner.tos.s1.title',
    content: [
      { boldKey: 'terms.owner.tos.s1.bold1', textKey: 'terms.owner.tos.s1.text1' },
      { boldKey: 'terms.owner.tos.s1.bold2', textKey: 'terms.owner.tos.s1.text2' },
    ],
  },
  {
    num: '2',
    titleKey: 'terms.owner.tos.s2.title',
    content: [{ boldKey: '', textKey: 'terms.owner.tos.s2.body' }],
  },
  {
    num: '3',
    titleKey: 'terms.owner.tos.s3.title',
    content: [{ boldKey: '', textKey: 'terms.owner.tos.s3.body' }],
  },
  {
    num: '4',
    titleKey: 'terms.owner.tos.s4.title',
    content: [{ boldKey: '', textKey: 'terms.owner.tos.s4.body' }],
  },
  {
    num: '5',
    titleKey: 'terms.owner.tos.s5.title',
    content: [{ boldKey: '', textKey: 'terms.owner.tos.s5.body' }],
  },
];

const PRIVACY_SECTION_KEYS = [
  { num: '1', titleKey: 'terms.owner.privacy.s1.title', bodyKey: 'terms.owner.privacy.s1.body' },
  { num: '2', titleKey: 'terms.owner.privacy.s2.title', bodyKey: 'terms.owner.privacy.s2.body' },
  { num: '3', titleKey: 'terms.owner.privacy.s3.title', bodyKey: 'terms.owner.privacy.s3.body' },
  { num: '4', titleKey: 'terms.owner.privacy.s4.title', bodyKey: 'terms.owner.privacy.s4.body' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TermsOwner() {
  const { t } = useTranslation();
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('terms.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>{t('terms.agreementTitle')}</Text>
          <Text style={s.heroSub}>{t('terms.owner.heroSub')}</Text>
          <Text style={s.heroDate}>{t('terms.lastUpdated')}</Text>
          <Text style={s.heroDesc}>{t('terms.owner.heroDesc')}</Text>
        </View>

        {/* Warning banner — owner-specific */}
        <View style={s.warningBanner}>
          <Text style={s.warningIcon}>⚠️</Text>
          <Text style={s.warningTxt}>{t('terms.owner.warning')}</Text>
        </View>

        {/* Terms of Service */}
        <View style={s.groupHeader}>
          <View style={s.groupDot} />
          <Text style={s.groupTitle}>{t('terms.tosLabel')}</Text>
        </View>

        {TOS_SECTION_KEYS.map(sec => (
          <View key={sec.num} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.numBadge}><Text style={s.numTxt}>{sec.num}</Text></View>
              <Text style={s.cardTitle}>{t(sec.titleKey)}</Text>
            </View>
            {sec.content.map((item, i) => (
              <Text key={i} style={s.cardBody}>
                {item.boldKey ? <Text style={s.bold}>{t(item.boldKey)}</Text> : null}
                {t(item.textKey)}
              </Text>
            ))}
          </View>
        ))}

        {/* Privacy Policy */}
        <View style={[s.groupHeader, { marginTop: 8 }]}>
          <View style={[s.groupDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={s.groupTitle}>{t('terms.privacyLabel')}</Text>
        </View>

        {PRIVACY_SECTION_KEYS.map(sec => (
          <View key={sec.num} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.numBadge}><Text style={s.numTxt}>{sec.num}</Text></View>
              <Text style={s.cardTitle}>{t(sec.titleKey)}</Text>
            </View>
            <Text style={s.cardBody}>{t(sec.bodyKey)}</Text>
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
          <Text style={s.declineTxt}>{t('terms.decline')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.acceptBtn, accepted && s.acceptedBtn]}
          onPress={() => {
            setAccepted(true);
            router.push('/house_owners_login_signup?termsAccepted=true&tab=signup');
          }}
        >
          <Text style={s.acceptTxt}>
            {accepted ? t('terms.accepted') : t('terms.acceptContinue')}
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
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: GRAY_BORDER,
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