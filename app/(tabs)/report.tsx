import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../constants/api';
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

// ─── Category IDs (stable, never translated) ─────────────────────────────────
type CategoryId = 'Fraud / Scam' | 'App Bug' | 'Suggestion' | 'Other';

const CATEGORY_ICONS: Record<CategoryId, string> = {
  'Fraud / Scam': '⚠️',
  'App Bug':      '🐛',
  'Suggestion':   '💡',
  'Other':        '❓',
};

// Keys that map to report.fraud / report.bug / report.suggestion / report.other
const CATEGORY_KEYS: Record<CategoryId, string> = {
  'Fraud / Scam': 'report.fraud',
  'App Bug':      'report.bug',
  'Suggestion':   'report.suggestion',
  'Other':        'report.other',
};

const CATEGORY_IDS: CategoryId[] = ['Fraud / Scam', 'App Bug', 'Suggestion', 'Other'];

type SelectedMedia = { uri: string; fileName?: string | null; mimeType?: string | null };

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportIssue() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [category, setCategory] = useState<CategoryId>('Fraud / Scam');
  const [subject, setSubject]   = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia]       = useState<SelectedMedia[]>([]);
  const [followUp, setFollowUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Image picker ──
  const handleAddMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('report.permissionNeeded'), t('report.permissionDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const incoming = result.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName,
        mimeType: a.mimeType,
      }));
      const slots = Math.max(0, 3 - media.length);
      setMedia((prev) => [...prev, ...incoming.slice(0, slots)]);
    }
  };

  const removeMedia = (uri: string) =>
    setMedia((prev) => prev.filter((m) => m.uri !== uri));

  // ── Submit ──
  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert(t('report.subjectRequired'), t('report.subjectRequiredDesc'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('report.descriptionRequired'), t('report.descriptionRequiredDesc'));
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body  = new FormData();
      body.append('category',    category);
      body.append('subject',     subject.trim());
      body.append('description', description.trim());
      body.append('followUp',    String(followUp));

      media.forEach((m, i) => {
        const ext  = m.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
        const mime = m.mimeType ?? (ext === 'png' ? 'image/png' : 'image/jpeg');
        body.append('evidence', {
          uri:  m.uri,
          name: m.fileName ?? `evidence-${i + 1}.${ext}`,
          type: mime,
        } as any);
      });

      const res = await fetch(`${BASE_URL}/reports`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || t('report.failedTitle'));

      Alert.alert(
        t('report.successTitle'),
        t('report.successDesc'),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert(t('report.failedTitle'), err?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('report.title')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ── Hero ── */}
          <View style={s.hero}>
            <View style={s.iconCircle}>
              <Text style={s.heroIcon}>💬</Text>
            </View>
            <Text style={s.heroTitle}>{t('report.heroTitle')}</Text>
            <Text style={s.heroSub}>{t('report.heroSub')}</Text>
          </View>

          {/* ── Category ── */}
          <Text style={s.sectionTitle}>{t('report.whatRegarding')}</Text>
          <View style={s.categoryGrid}>
            {CATEGORY_IDS.map((id) => {
              const active = category === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setCategory(id)}
                  style={[s.categoryChip, active && s.categoryChipActive]}>
                  <Text style={s.categoryIcon}>{CATEGORY_ICONS[id]}</Text>
                  <Text style={[s.categoryLabel, active && s.categoryLabelActive]}>
                    {t(CATEGORY_KEYS[id])}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Subject & Description ── */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>{t('report.subject')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('report.subjectPlaceholder')}
              placeholderTextColor={colors.textLight}
              value={subject}
              onChangeText={setSubject}
              returnKeyType="next"
            />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>{t('report.description')}</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder={t('report.descriptionPlaceholder')}
              placeholderTextColor={colors.textLight}
              multiline
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* ── Evidence ── */}
          <View style={s.card}>
            <View style={s.evidenceHeader}>
              <Text style={s.fieldLabel}>{t('report.evidence')}</Text>
              <Text style={s.maxBadge}>{t('report.maxFiles')}</Text>
            </View>

            <View style={s.mediaRow}>
              {media.length < 3 && (
                <TouchableOpacity onPress={handleAddMedia} style={s.addBox}>
                  <Text style={s.addPlus}>+</Text>
                  <Text style={s.addLabel}>{t('report.addEvidence')}</Text>
                </TouchableOpacity>
              )}

              {media.map((m) => (
                <View key={m.uri} style={s.previewWrap}>
                  <Image source={{ uri: m.uri }} style={s.previewImg} />
                  <TouchableOpacity
                    onPress={() => removeMedia(m.uri)}
                    style={s.removeBtn}>
                    <Text style={s.removeTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <Text style={s.evidenceHint}>{t('report.evidenceHint')}</Text>
          </View>

          {/* ── Follow-up toggle ── */}
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleTitle}>{t('report.followUp')}</Text>
                <Text style={s.toggleSub}>{t('report.followUpSub')}</Text>
              </View>
              <Switch
                value={followUp}
                onValueChange={setFollowUp}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Submit button ── */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}>
          <Text style={s.submitIcon}>✈</Text>
          <Text style={s.submitTxt}>
            {submitting ? t('report.submitting') : t('report.submitReport')}
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
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },

    scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },

    hero: { alignItems: 'center', marginBottom: 28 },
    iconCircle: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primaryTint,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
    },
    heroIcon: { fontSize: 32 },
    heroTitle: {
      fontSize: 22, fontWeight: '800', color: colors.text,
      marginBottom: 10, textAlign: 'center',
    },
    heroSub: {
      fontSize: 14, color: colors.textMuted, textAlign: 'center',
      lineHeight: 22, paddingHorizontal: 8,
    },

    sectionTitle: {
      fontSize: 15, fontWeight: '700', color: colors.text,
      marginBottom: 12,
    },
    categoryGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
    },
    categoryChip: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      paddingHorizontal: 16, paddingVertical: 11,
      borderRadius: 50, borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    categoryChipActive: {
      backgroundColor: colors.primary, borderColor: colors.primary,
    },
    categoryIcon: { fontSize: 15 },
    categoryLabel: { fontSize: 13.5, fontWeight: '600', color: colors.text },
    // Text sits directly on the solid primary chip — stays white in both themes.
    categoryLabelActive: { color: '#FFFFFF' },

    card: {
      backgroundColor: colors.card, borderRadius: 18,
      padding: 18, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.05,
      shadowRadius: 6, elevation: 2,
    },
    fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },

    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, color: colors.text, backgroundColor: colors.cardMuted,
    },
    inputMulti: { minHeight: 120, textAlignVertical: 'top' },

    evidenceHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', marginBottom: 14,
    },
    maxBadge: {
      fontSize: 12, fontWeight: '600', color: colors.textMuted,
      backgroundColor: colors.divider, paddingHorizontal: 10,
      paddingVertical: 4, borderRadius: 20,
    },
    mediaRow: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
    addBox: {
      width: 90, height: 90, borderRadius: 14,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
      alignItems: 'center', justifyContent: 'center',
    },
    addPlus: { fontSize: 26, color: colors.primary, lineHeight: 30 },
    addLabel: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
    previewWrap: { position: 'relative' },
    previewImg: { width: 90, height: 90, borderRadius: 14 },
    // Fixed dark overlay chip sitting on top of a photo thumbnail — stays the
    // same in both themes on purpose, since it needs to contrast against an
    // arbitrary image, not the app background.
    removeBtn: {
      position: 'absolute', top: -6, right: -6,
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: 'rgba(17,24,39,0.85)',
      alignItems: 'center', justifyContent: 'center',
    },
    removeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    evidenceHint: { fontSize: 12, color: colors.textLight, lineHeight: 18 },

    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    toggleTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
    toggleSub: { fontSize: 12, color: colors.textMuted },

    footer: {
      paddingHorizontal: 20, paddingVertical: 14,
      backgroundColor: colors.card,
      borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, backgroundColor: colors.primary,
      borderRadius: 18, paddingVertical: 17,
      shadowColor: colors.primary, shadowOpacity: 0.35,
      shadowRadius: 12, elevation: 6,
    },
    // Icon + label sit directly on the solid primary button — stay white in both themes.
    submitIcon: { fontSize: 18, color: '#FFFFFF' },
    submitTxt: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  });
}