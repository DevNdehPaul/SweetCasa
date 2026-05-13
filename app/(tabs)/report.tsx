import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const PURPLE      = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GRAY_BORDER  = '#E5E7EB';
const TEXT_DARK    = '#111827';
const TEXT_MID     = '#6B7280';
const TEXT_LIGHT   = '#9CA3AF';
const BG           = '#F5F6FA';
const WHITE        = '#FFFFFF';

// ─── Category options ─────────────────────────────────────────────────────────
type Category = 'Fraud / Scam' | 'App Bug' | 'Suggestion' | 'Other';

const CATEGORIES: { label: Category; icon: string }[] = [
  { label: 'Fraud / Scam', icon: '⚠️' },
  { label: 'App Bug',      icon: '🐛' },
  { label: 'Suggestion',   icon: '💡' },
  { label: 'Other',        icon: '❓' },
];

type SelectedMedia = { uri: string; fileName?: string | null; mimeType?: string | null };

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportIssue() {
  const [category, setCategory] = useState<Category>('Fraud / Scam');
  const [subject, setSubject]   = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia]       = useState<SelectedMedia[]>([]);
  const [followUp, setFollowUp] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Image picker ──
  const handleAddMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
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
      Alert.alert('Subject required', 'Please briefly describe the topic.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description required', 'Please provide more detail so we can help you.');
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
      if (!res.ok) throw new Error(data?.error || 'Failed to submit report.');

      Alert.alert(
        'Report submitted ✅',
        'Thank you! Our team will review your report and get back to you if needed.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Submission failed', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Report Issue</Text>
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
            <Text style={s.heroTitle}>How can we help?</Text>
            <Text style={s.heroSub}>
              Let us know about an issue, report suspicious activity, or suggest an improvement
              to make SweetCasa better.
            </Text>
          </View>

          {/* ── Category ── */}
          <Text style={s.sectionTitle}>What is this regarding?</Text>
          <View style={s.categoryGrid}>
            {CATEGORIES.map(({ label, icon }) => {
              const active = category === label;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setCategory(label)}
                  style={[s.categoryChip, active && s.categoryChipActive]}>
                  <Text style={s.categoryIcon}>{icon}</Text>
                  <Text style={[s.categoryLabel, active && s.categoryLabelActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Subject & Description ── */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>Subject</Text>
            <TextInput
              style={s.input}
              placeholder="Briefly describe the topic"
              placeholderTextColor={TEXT_LIGHT}
              value={subject}
              onChangeText={setSubject}
              returnKeyType="next"
            />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder={
                'Please provide as much detail as possible so our team can assist you effectively…'
              }
              placeholderTextColor={TEXT_LIGHT}
              multiline
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* ── Evidence ── */}
          <View style={s.card}>
            <View style={s.evidenceHeader}>
              <Text style={s.fieldLabel}>Screenshots or Evidence</Text>
              <Text style={s.maxBadge}>Max 3</Text>
            </View>

            <View style={s.mediaRow}>
              {/* Add button — only shown when < 3 files */}
              {media.length < 3 && (
                <TouchableOpacity onPress={handleAddMedia} style={s.addBox}>
                  <Text style={s.addPlus}>+</Text>
                  <Text style={s.addLabel}>Add</Text>
                </TouchableOpacity>
              )}

              {/* Previews */}
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

            <Text style={s.evidenceHint}>
              Upload images or documents that help explain your report.
            </Text>
          </View>

          {/* ── Follow-up toggle ── */}
          <View style={s.card}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleTitle}>Follow up with me</Text>
                <Text style={s.toggleSub}>Allow support to contact you</Text>
              </View>
              <Switch
                value={followUp}
                onValueChange={setFollowUp}
                trackColor={{ false: GRAY_BORDER, true: PURPLE }}
                thumbColor={WHITE}
                ios_backgroundColor={GRAY_BORDER}
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
          <Text style={s.submitTxt}>{submitting ? 'Submitting…' : 'Submit Report'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heroIcon: { fontSize: 32 },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: TEXT_DARK,
    marginBottom: 10, textAlign: 'center',
  },
  heroSub: {
    fontSize: 14, color: TEXT_MID, textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 8,
  },

  // Category
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: TEXT_DARK,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 50, borderWidth: 1.5, borderColor: GRAY_BORDER,
    backgroundColor: WHITE,
  },
  categoryChipActive: {
    backgroundColor: PURPLE, borderColor: PURPLE,
  },
  categoryIcon: { fontSize: 15 },
  categoryLabel: { fontSize: 13.5, fontWeight: '600', color: TEXT_DARK },
  categoryLabelActive: { color: WHITE },

  // Card
  card: {
    backgroundColor: WHITE, borderRadius: 18,
    padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, elevation: 2,
  },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 8 },

  // Inputs
  input: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT_DARK, backgroundColor: '#FAFAFA',
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },

  // Evidence
  evidenceHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  maxBadge: {
    fontSize: 12, fontWeight: '600', color: TEXT_MID,
    backgroundColor: '#F3F4F6', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  mediaRow: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  addBox: {
    width: 90, height: 90, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  addPlus: { fontSize: 26, color: PURPLE, lineHeight: 30 },
  addLabel: { fontSize: 12, color: PURPLE, fontWeight: '600', marginTop: 2 },
  previewWrap: { position: 'relative' },
  previewImg: { width: 90, height: 90, borderRadius: 14 },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: TEXT_DARK,
    alignItems: 'center', justifyContent: 'center',
  },
  removeTxt: { color: WHITE, fontSize: 10, fontWeight: '800' },
  evidenceHint: { fontSize: 12, color: TEXT_LIGHT, lineHeight: 18 },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK, marginBottom: 3 },
  toggleSub: { fontSize: 12, color: TEXT_MID },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: GRAY_BORDER,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: PURPLE,
    borderRadius: 18, paddingVertical: 17,
    shadowColor: PURPLE, shadowOpacity: 0.35,
    shadowRadius: 12, elevation: 6,
  },
  submitIcon: { fontSize: 18, color: WHITE },
  submitTxt: { fontSize: 16, fontWeight: '800', color: WHITE, letterSpacing: 0.3 },
});