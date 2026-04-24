import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const H_PAD = 20;

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'login' | 'signup' | 'company';

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secure,
  keyboardType,
  hint,
  rightEl,
  topRight,
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

// ─── Reg Label (uppercase) ────────────────────────────────────────────────────
function RegLabel({ children }: { children: string }) {
  return <Text style={styles.regLabel}>{children}</Text>;
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [terms, setTerms] = useState(false);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      {/* Hero */}
      <View style={styles.authHero}>
        <View style={styles.shieldWrap}>
          <Ionicons name="shield-checkmark-outline" size={30} color="#7C3AED" />
        </View>
        <Text style={styles.authHeroTitle}>Secure Access</Text>
        <Text style={styles.authHeroDesc}>
          Login to manage your property search and escrow wallet safely.
        </Text>
      </View>

      {/* Email */}
      <Field
        label="Email or Phone Number"
        placeholder="e.g. name@email.com"
        value={email}
        onChangeText={setEmail}
        icon="mail"
        keyboardType="email-address"
      />

      {/* Password */}
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

      {/* 2FA Card */}
      <View style={styles.twofaCard}>
        <View style={styles.twofaIcon}>
          <Ionicons name="shield-outline" size={18} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.twofaTitleRow}>
            <Text style={styles.twofaTitle}>Two-Factor Auth</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedTxt}>Recommended</Text>
            </View>
          </View>
          <Text style={styles.twofaDesc}>
            Protect your wallet with an extra layer of security via SMS/Email.
          </Text>
        </View>
        <Switch
          value={twoFA}
          onValueChange={setTwoFA}
          trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
          thumbColor="#fff"
        />
      </View>

      {/* Terms */}
      <View style={styles.termsRow}>
        <TouchableOpacity
          style={[styles.checkbox, terms && styles.checkboxChecked]}
          onPress={() => setTerms(p => !p)}
        >
          {terms && <Feather name="check" size={11} color="#fff" />}
        </TouchableOpacity>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.primaryBtn, !terms && styles.primaryBtnDisabled]}
        activeOpacity={terms ? 0.85 : 1}
        disabled={!terms}
      >
        <Text style={styles.primaryBtnTxt}>Secure Login</Text>
        <Feather name="arrow-right" size={17} color="#fff" />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orTxt}>OR CONTINUE WITH</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social */}
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

      {/* Register Link */}
      <Text style={styles.registerLink}>
        New to SweetCasa?{' '}
        <Text style={styles.registerNow}>Register Now</Text>
      </Text>

      {/* Tip */}
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
    fullName: '', email: '', phone: '',
    country: '', region: '', city: '', street: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      <Text style={styles.stepTitle}>Tell us about you</Text>

      {/* Personal Details */}
      <SectionCard icon="user" title="Personal Details">
        <View style={styles.fieldGroup}>
          <RegLabel>FULL NAME</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="user" size={14} color="#9CA3AF" />
            <TextInput
              style={styles.fieldInput}
              placeholder="John Doe"
              placeholderTextColor="#9CA3AF"
              value={form.fullName}
              onChangeText={set('fullName')}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>EMAIL ADDRESS</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={14} color="#9CA3AF" />
            <TextInput
              style={styles.fieldInput}
              placeholder="john@example.com"
              placeholderTextColor="#9CA3AF"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
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
              <TextInput
                style={styles.fieldInput}
                placeholder="6XX XXX XXX"
                placeholderTextColor="#9CA3AF"
                value={form.phone}
                onChangeText={set('phone')}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>
      </SectionCard>

      {/* Location Details */}
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

      {/* Security Note */}
      <View style={styles.securityNote}>
        <Feather name="check-circle" size={15} color="#9CA3AF" style={{ marginTop: 2 }} />
        <Text style={styles.securityText}>
          Your data is secured with AES-256 encryption. By continuing, you agree to SWEETCASA's{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.saveBtn}>
          <Feather name="save" size={15} color="#374151" />
          <Text style={styles.saveBtnTxt}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn}>
          <Text style={styles.nextBtnTxt}>Next Step</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Company Tab ──────────────────────────────────────────────────────────────
function CompanyTab() {
  const [form, setForm] = useState({
    companyName: '', businessEmail: '', phone: '',
    country: '', region: '', city: '', street: '',
  });
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const isValid =
    form.companyName.trim() &&
    form.businessEmail.trim() &&
    form.phone.trim() &&
    form.country.trim() &&
    form.city.trim();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      {/* Partner Banner */}
      <View style={styles.partnerBanner}>
        <View style={styles.partnerIcon}>
          <Feather name="credit-card" size={24} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.partnerTitleRow}>
            <Text style={styles.partnerTitle}>Partner Program</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeTxt}>PRO</Text>
            </View>
          </View>
          <Text style={styles.partnerDesc}>
            Join Cameroon's most trusted real estate network.
          </Text>
        </View>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <View style={styles.benefitsIcon}>
          <Ionicons name="shield-outline" size={19} color="#7C3AED" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.benefitsTitle}>Verified Status Benefits</Text>
          {[
            'Featured listing priority in search results',
            'Access to SweetCasa Escrow Wallet',
            'Direct integration with Neighborhood Intelligence',
          ].map(b => (
            <Text key={b} style={styles.benefitItem}>• {b}</Text>
          ))}
        </View>
      </View>

      {/* Business Identity */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionLabelRow}>
          <View style={styles.stepBadgeRound}><Text style={styles.stepBadgeNum}>1</Text></View>
          <Text style={styles.sectionLabelTxt}>BUSINESS IDENTITY</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Company Name</Text>
          <TextInput style={styles.standaloneInput} placeholder="e.g. BlueSky Estates Ltd"
            placeholderTextColor="#9CA3AF" value={form.companyName} onChangeText={set('companyName')} />
          <Text style={styles.fieldHint}>This will be displayed on your verified listings.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Business Email</Text>
          <TextInput style={styles.standaloneInput} placeholder="contact@company.cm"
            placeholderTextColor="#9CA3AF" value={form.businessEmail} onChangeText={set('businessEmail')}
            keyboardType="email-address" autoCapitalize="none" />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Professional Phone</Text>
          <TextInput style={styles.standaloneInput} placeholder="+237 6XX XXX XXX"
            placeholderTextColor="#9CA3AF" value={form.phone} onChangeText={set('phone')}
            keyboardType="phone-pad" />
        </View>
      </View>

      {/* Office Location */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionLabelRow}>
          <View style={styles.stepBadgeRound}><Text style={styles.stepBadgeNum}>2</Text></View>
          <Text style={styles.sectionLabelTxt}>OFFICE LOCATION</Text>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Country</Text>
            <TextInput style={styles.standaloneInput} placeholder="Cameroon"
              placeholderTextColor="#9CA3AF" value={form.country} onChangeText={set('country')} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Region</Text>
            <TextInput style={styles.standaloneInput} placeholder="Centre"
              placeholderTextColor="#9CA3AF" value={form.region} onChangeText={set('region')} />
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>City</Text>
            <TextInput style={styles.standaloneInput} placeholder="Yaoundé"
              placeholderTextColor="#9CA3AF" value={form.city} onChangeText={set('city')} />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>Street</Text>
            <TextInput style={styles.standaloneInput} placeholder="Bastos 102"
              placeholderTextColor="#9CA3AF" value={form.street} onChangeText={set('street')} />
          </View>
        </View>
      </View>

      {/* Terms Notice */}
      <View style={styles.securityNote}>
        <Feather name="info" size={14} color="#9CA3AF" style={{ marginTop: 2 }} />
        <Text style={styles.securityText}>
          By clicking "Create Professional Account", you agree to our verification process and Agent Terms of Service.
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.primaryBtn, !isValid && styles.primaryBtnDisabled]}
        activeOpacity={isValid ? 0.85 : 1}
        disabled={!isValid}
      >
        <Text style={styles.primaryBtnTxt}>Create Professional Account</Text>
        <Feather name="arrow-right" size={17} color="#fff" />
      </TouchableOpacity>

      {/* Register as User */}
      <View style={styles.userLinkRow}>
        <Text style={styles.registerLink}>
          Looking for a home?{'  '}
          <Text style={styles.registerNow}>Register as User</Text>
        </Text>
        <Feather name="chevron-right" size={13} color="#7C3AED" />
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginSignupScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('login');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" />

    <View style={{ height: 16 }} />
    <View style={{ height: 16 }} />

      {/* Tab Row */}
      <View style={styles.tabRow}>
        {(['login', 'signup', 'company'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnTxt, activeTab === t && styles.tabBtnTxtActive]}>
              {t === 'login' ? 'Login' : t === 'signup' ? 'Sign Up' : 'Company'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header Title */}
      <View style={styles.formHeader}>
        <Text style={styles.formHeaderTitle}>
          {activeTab === 'login'
            ? 'Welcome Back'
            : activeTab === 'signup'
            ? 'Create Profile'
            : 'Agent Registration'}
        </Text>
      </View>

      {/* Tab Content */}
      {activeTab === 'login' && <LoginTab />}
      {activeTab === 'signup' && <SignupTab />}
      {activeTab === 'company' && <CompanyTab />}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FB' },

  // Logo
  logoWrap: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 4 },
  logoIcon: {
    width: 44, height: 44,
    backgroundColor: '#111827',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    marginHorizontal: H_PAD,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#5B21B6',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  tabBtnTxtActive: {
    color: '#5B21B6',
    fontWeight: '700',
  },

  // Form header
  formHeader: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 4,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.2,
  },

  // Scroll
  tabScroll: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // Auth Hero
  authHero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  shieldWrap: {
    width: 60, height: 60,
    backgroundColor: '#F5F3FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  authHeroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  authHeroDesc: {
    fontSize: 13.5,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Field
  fieldGroup: { marginBottom: 14 },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  forgotLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#7C3AED',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  standaloneInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#111827',
  },
  fieldHint: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 5,
    fontStyle: 'italic',
    paddingLeft: 2,
  },

  // 2FA
  twofaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  twofaIcon: {
    width: 40, height: 40,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twofaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  twofaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  recommendedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recommendedTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  twofaDesc: {
    fontSize: 11.5,
    color: '#9CA3AF',
    lineHeight: 17,
  },

  // Terms
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 20, height: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  termsText: {
    flex: 1,
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 19,
  },
  termsLink: {
    color: '#7C3AED',
    fontWeight: '600',
  },

  // Primary Button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6D28D9',
    borderRadius: 18,
    paddingVertical: 17,
    marginBottom: 18,
    shadowColor: '#5B21B6',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  // Divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 13,
  },
  socialBtnTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // Register link
  registerLink: {
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  registerNow: {
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Signup specific
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  regLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  phoneWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  phonePrefixTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  saveBtnTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6D28D9',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#5B21B6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  nextBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Company
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  partnerIcon: {
    width: 56, height: 56,
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  partnerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  proBadge: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  partnerDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  benefitsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FDF8FF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  benefitsIcon: {
    width: 36, height: 36,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  benefitsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5B21B6',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 12,
    color: '#7C3AED',
    opacity: 0.85,
    lineHeight: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stepBadgeRound: {
    width: 24, height: 24,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  stepBadgeNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sectionLabelTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  userLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 20,
  },
});