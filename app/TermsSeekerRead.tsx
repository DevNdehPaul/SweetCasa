import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
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
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme'; // adjust relative path if needed

const SECTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12'] as const;

export default function TermsSeeker() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
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
            <Feather name="file-text" size={28} color={colors.primary} />
          </View>
          <Text style={s.heroTitle}>{t('terms.seekerAgreementTitle')}</Text>
          <Text style={s.heroSub}>{t('terms.seekerAgreementSub')}</Text>
          <View style={s.lastUpdated}>
            <Feather name="clock" size={11} color={colors.textMuted} />
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
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={s.footerNoteTxt}>{t('terms.seekerFooter')}</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

    scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },

    hero: {
      alignItems: 'center', marginBottom: 28,
      backgroundColor: colors.primaryTint, borderRadius: 20, padding: 24,
    },
    heroIconWrap: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
      shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
    },
    heroTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
    heroSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
    lastUpdated: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    lastUpdatedTxt: { fontSize: 11, color: colors.textMuted },

    section: {
      marginBottom: 20, paddingBottom: 20,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
    sectionBody: { fontSize: 13.5, color: colors.textMuted, lineHeight: 22 },

    footerNote: {
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      backgroundColor: colors.primaryTint, borderRadius: 14, padding: 16, marginTop: 8,
    },
    footerNoteTxt: { flex: 1, fontSize: 12.5, color: colors.text, lineHeight: 19 },
  });
}