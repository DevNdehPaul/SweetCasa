import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
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

const SECTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'] as const;

export default function TermsSeeker() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('terms.pageTitle')}</Text>
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
          <Text style={s.heroTitle}>{t('terms.seekerAgreementTitle')}</Text>
          <Text style={s.heroSub}>{t('terms.seekerAgreementSub')}</Text>
          <View style={s.lastUpdated}>
            <Feather name="clock" size={11} color={TEXT_MID} />
            <Text style={s.lastUpdatedTxt}>{t('terms.lastUpdated')}</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTION_KEYS.map((key) => (
          <View key={key} style={s.section}>
            <Text style={s.sectionTitle}>{t(`terms.seeker.${key}_title`)}</Text>
            <Text style={s.sectionBody}>{t(`terms.seeker.${key}_body`)}</Text>
          </View>
        ))}

        {/* Footer note */}
        <View style={s.footerNote}>
          <Feather name="info" size={14} color={PURPLE} />
          <Text style={s.footerNoteTxt}>{t('terms.seekerFooter')}</Text>
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