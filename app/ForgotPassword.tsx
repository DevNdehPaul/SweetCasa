import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../constants/api';

const H_PAD = 20;
const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#F0EBFF';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Missing Email', 'Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to send reset email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>

          {sent ? (
            // ── Success state ────────────────────────────────────────────────
            <View style={styles.successWrap}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open-outline" size={40} color="#7C3AED" />
              </View>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successDesc}>
                If an account exists for <Text style={styles.successEmail}>{email.trim()}</Text>,
                we've sent you a link to reset your password. The link expires in 30 minutes.
              </Text>
              <View style={styles.successTip}>
                <Feather name="info" size={13} color="#9CA3AF" style={{ marginTop: 2 }} />
                <Text style={styles.successTipTxt}>
                  Don't see the email? Check your spam or junk folder.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.back()}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryBtnTxt}>Back to Login</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            // ── Form state ───────────────────────────────────────────────────
            <>
              <View style={styles.hero}>
                <View style={styles.shieldWrap}>
                  <Ionicons name="key-outline" size={30} color="#7C3AED" />
                </View>
                <Text style={styles.heroTitle}>Forgot Password?</Text>
                <Text style={styles.heroDesc}>
                  No worries. Enter the email address you registered with and we'll send
                  you a link to reset your password.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={15} color="#9CA3AF" />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. john@example.com"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                disabled={loading}
                onPress={handleSubmit}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnTxt}>Send Reset Link</Text>
                    <Feather name="arrow-right" size={17} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.helpCard}>
                <Feather name="shield" size={13} color="#7C3AED" style={{ marginTop: 2 }} />
                <Text style={styles.helpText}>
                  <Text style={{ fontWeight: '700', color: '#7C3AED' }}>Tip: </Text>
                  The reset link is single-use and expires after 30 minutes for your security.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FB' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 40, flexGrow: 1 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  hero: { alignItems: 'center', marginBottom: 28 },
  shieldWrap: {
    width: 64, height: 64, backgroundColor: '#F5F3FF', borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: PURPLE, shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.4 },
  heroDesc: { fontSize: 13.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  fieldInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#6D28D9', borderRadius: 18, paddingVertical: 17, marginBottom: 20,
    shadowColor: '#5B21B6', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  helpCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
  },
  helpText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  successWrap: { alignItems: 'center', paddingTop: 40 },
  successIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: PURPLE, shadowOpacity: 0.15, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  successTitle: { fontSize: 21, fontWeight: '800', color: '#111827', marginBottom: 8, letterSpacing: -0.3 },
  successDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 18, maxWidth: 320 },
  successEmail: { fontWeight: '700', color: '#7C3AED' },
  successTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 24,
  },
  successTipTxt: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
});

