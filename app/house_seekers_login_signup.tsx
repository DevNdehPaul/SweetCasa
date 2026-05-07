import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import api from '../constants/api';
import { persistAuthSession, routeForRole } from '../constants/auth';

const { width } = Dimensions.get('window');
const H_PAD = 20;

type Tab = 'login' | 'signup';

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({
  label, placeholder, value, onChangeText,
  icon, secure, keyboardType, hint, rightEl, topRight,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon?: string;
  secure?: boolean;
  keyboardType?: any;
  hint?: string;
  rightEl?: React.ReactNode;
  topRight?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      {(label || topRight) && (
        <View style={styles.fieldLabelRow}>
          {label && <Text style={styles.fieldLabel}>{label}</Text>}
          {topRight}
        </View>
      )}
      <View style={styles.inputWrap}>
        {icon && <Feather name={icon as any} size={15} color="#9CA3AF" />}
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
        {rightEl}
      </View>
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function RegLabel({ children }: { children: string }) {
  return <Text style={styles.regLabel}>{children}</Text>;
}

function SectionCard({ icon, title, children }: {
  icon: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Feather name={icon as any} size={15} color="#7C3AED" />
        <Text style={styles.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Login Tab ────────────────────────────────────────────────────────────────
function LoginTab() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        expectedRole: 'BUYER',
      })
      const { token, role, profile } = res.data;
      await persistAuthSession({ token, role, profile });
      router.replace(routeForRole(role) as any);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      <View style={styles.authHero}>
        <View style={styles.shieldWrap}>
          <Ionicons name="shield-checkmark-outline" size={30} color="#7C3AED" />
        </View>
        <Text style={styles.authHeroTitle}>Welcome Back</Text>
        <Text style={styles.authHeroDesc}>
          Login to continue your property search and find your dream home.
        </Text>
      </View>

      <Field
        label="Email Address"
        placeholder="e.g. name@email.com"
        value={email}
        onChangeText={setEmail}
        icon="mail"
        keyboardType="email-address"
      />

      <Field
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        icon="lock"
        secure={!showPass}
        topRight={
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.forgotLink}>Forgot?</Text>
          </TouchableOpacity>
        }
        rightEl={
          <TouchableOpacity onPress={() => setShowPass(p => !p)}>
            <Feather name={showPass ? 'eye' : 'eye-off'} size={15} color="#9CA3AF" />
          </TouchableOpacity>
        }
      />

      

      <TouchableOpacity
         style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
  disabled={loading}
  onPress={handleLogin}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <>
            <Text style={styles.primaryBtnTxt}>Secure Login</Text>
            <Feather name="arrow-right" size={17} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orTxt}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn}>
          <Feather name="globe" size={17} color="#374151" />
          <Text style={styles.socialBtnTxt}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn}>
          <Feather name="smartphone" size={17} color="#374151" />
          <Text style={styles.socialBtnTxt}>Apple</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Feather name="info" size={13} color="#9CA3AF" style={{ marginTop: 2 }} />
        <Text style={styles.tipText}>
          <Text style={{ fontWeight: '700' }}>Tip:</Text> Use a strong password and enable 2FA to
          qualify for higher escrow transaction limits in your SweetCasa wallet.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Sign Up Tab ──────────────────────────────────────────────────────────────
function SignupTab() {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    country: '', region: '', city: '', street: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSignup = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing fields', 'Please fill in your name, email, and password.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Your passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        email:    form.email.trim(),
        password: form.password,
        role:     'BUYER',
        fullName: form.fullName.trim(),
        phone:    form.phone,
        country:  form.country.trim(),
        region:   form.region.trim(),
        city:     form.city.trim(),
        street:   form.street.trim(),
      });
      const { token, role, profile } = res.data;
      await persistAuthSession({ token, role, profile });
      router.replace(routeForRole(role) as any);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Sign up failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      <Text style={styles.stepTitle}>Find your dream home</Text>

      <SectionCard icon="user" title="Personal Details">
        <View style={styles.fieldGroup}>
          <RegLabel>FULL NAME</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="user" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="John Doe"
              placeholderTextColor="#9CA3AF" value={form.fullName} onChangeText={set('fullName')} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>EMAIL ADDRESS</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="john@example.com"
              placeholderTextColor="#9CA3AF" value={form.email} onChangeText={set('email')}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>PASSWORD</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="Min 8 chars, letters, numbers & symbols"
              placeholderTextColor="#9CA3AF" value={form.password} onChangeText={set('password')}
              secureTextEntry />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>CONFIRM PASSWORD</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="Repeat your password"
              placeholderTextColor="#9CA3AF" value={form.confirmPassword}
              onChangeText={set('confirmPassword')} secureTextEntry />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>PHONE NUMBER</RegLabel>
          <View style={styles.phoneWrap}>
            <View style={styles.phonePrefix}>
              <Feather name="globe" size={13} color="#374151" />
              <Text style={styles.phonePrefixTxt}>+237</Text>
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Feather name="phone" size={14} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="6XX XXX XXX"
                placeholderTextColor="#9CA3AF" value={form.phone} onChangeText={set('phone')}
                keyboardType="phone-pad" />
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard icon="map-pin" title="Location Details">
        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>COUNTRY</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="globe" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Cameroon"
                placeholderTextColor="#9CA3AF" value={form.country} onChangeText={set('country')} />
            </View>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>REGION</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="map" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Littoral"
                placeholderTextColor="#9CA3AF" value={form.region} onChangeText={set('region')} />
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>CITY</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="grid" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Douala"
                placeholderTextColor="#9CA3AF" value={form.city} onChangeText={set('city')} />
            </View>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>STREET NAME</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="navigation" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Street 1024"
                placeholderTextColor="#9CA3AF" value={form.street} onChangeText={set('street')} />
            </View>
          </View>
        </View>
      </SectionCard>

      <View style={styles.securityNote}>
        <Feather name="check-circle" size={15} color="#9CA3AF" style={{ marginTop: 2 }} />
        <Text style={styles.securityText}>
          Your data is secured with AES-256 encryption. By continuing, you agree to SWEETCASA's{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.saveBtn}>
          <Feather name="save" size={15} color="#374151" />
          <Text style={styles.saveBtnTxt}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, loading && styles.primaryBtnDisabled]}
          disabled={loading}
          onPress={handleSignup}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnTxt}>Create Account</Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HouseSeekersLoginSignup() {
  const [activeTab, setActiveTab] = useState<Tab>('login');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" />
      <View style={{ height: 16 }} />

      <View style={styles.tabRow}>
        {(['login', 'signup'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnTxt, activeTab === t && styles.tabBtnTxtActive]}>
              {t === 'login' ? 'Login' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formHeader}>
        <Text style={styles.formHeaderTitle}>
          {activeTab === 'login' ? 'Welcome Back, Seeker' : 'Create Seeker Profile'}
        </Text>
        <Text style={styles.formHeaderSub}>House Seekers Portal</Text>
      </View>

      {activeTab === 'login'  && <LoginTab />}
      {activeTab === 'signup' && <SignupTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FB' },
  tabRow: {
    flexDirection: 'row', backgroundColor: '#EDE9FE', borderRadius: 14,
    marginHorizontal: H_PAD, padding: 4, gap: 4, marginBottom: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: {
    backgroundColor: '#fff', shadowColor: '#5B21B6', shadowOpacity: 0.15,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  tabBtnTxt: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  tabBtnTxtActive: { color: '#5B21B6', fontWeight: '700' },
  formHeader: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 4 },
  formHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.2 },
  formHeaderSub: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  tabScroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 40 },
  authHero: { alignItems: 'center', marginBottom: 22 },
  shieldWrap: {
    width: 60, height: 60, backgroundColor: '#F5F3FF', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#7C3AED', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  authHeroTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 6, letterSpacing: -0.3 },
  authHeroDesc: { fontSize: 13.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  fieldGroup: { marginBottom: 14 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  forgotLink: { fontSize: 12.5, fontWeight: '700', color: '#7C3AED' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  fieldInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  fieldHint: { fontSize: 11.5, color: '#9CA3AF', marginTop: 5, fontStyle: 'italic', paddingLeft: 2 },
  twofaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#EDE9FE', borderRadius: 16, padding: 14, marginBottom: 14,
  },
  twofaIcon: { width: 40, height: 40, backgroundColor: '#F5F3FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  twofaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  twofaTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  recommendedBadge: { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  recommendedTxt: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  twofaDesc: { fontSize: 11.5, color: '#9CA3AF', lineHeight: 17 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  termsText: { flex: 1, fontSize: 12.5, color: '#6B7280', lineHeight: 19 },
  termsLink: { color: '#7C3AED', fontWeight: '600' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#6D28D9', borderRadius: 18, paddingVertical: 17, marginBottom: 18,
    shadowColor: '#5B21B6', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.2 },
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orTxt: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8 },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingVertical: 13,
  },
  socialBtnTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10,
  },
  tipText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, letterSpacing: -0.3 },
  regLabel: { fontSize: 10.5, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 7 },
  sectionCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  phoneWrap: { flexDirection: 'row', gap: 8 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13,
  },
  phonePrefixTxt: { fontSize: 13, fontWeight: '600', color: '#374151' },
  twoCol: { flexDirection: 'row', gap: 10 },
  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  securityText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
  },
  saveBtnTxt: { fontSize: 13, fontWeight: '700', color: '#374151' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#6D28D9', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#5B21B6', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  nextBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
