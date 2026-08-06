import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  findNodeHandle,
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
import { persistAuthSession, routeForRole } from '../constants/auth';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

const H_PAD = 20;
const GOOGLE_EMAIL_SIGNUP_URL =
  'https://accounts.google.com/signup/v2/webcreateaccount?flowName=GlifWebSignIn&flowEntry=SignUp';

// White text sitting directly on a solid-color button (primary CTA, checkbox
// check) stays hardcoded — that swatch doesn't change between light/dark, so
// the text/icon on it shouldn't either.
const WHITE = '#FFFFFF';

type Styles = ReturnType<typeof getStyles>;

// Opens Google's account creation page directly in the browser — no
// intermediate provider-choice dialog.
function openEmailSignupOptions() {
  WebBrowser.openBrowserAsync(GOOGLE_EMAIL_SIGNUP_URL);
}

// ─── Scroll-into-view helper ───────────────────────────────────────────────
// Measures a field's position relative to the enclosing ScrollView and
// scrolls it fully clear of the keyboard when the field is focused.
function scrollFieldIntoView(
  scrollRef: React.RefObject<ScrollView | null>,
  fieldRef: React.RefObject<View | null>,
  offset = 24
) {
  if (!scrollRef.current || !fieldRef.current) return;
  setTimeout(() => {
    const scrollNode = findNodeHandle(scrollRef.current);
    if (!scrollNode) return;
    fieldRef.current?.measureLayout(
      scrollNode,
      (_x: number, y: number) => {
        scrollRef.current?.scrollTo({ y: Math.max(y - offset, 0), animated: true });
      },
      () => {}
    );
  }, 60);
}

type Tab = 'login' | 'signup';

const EMPTY_FORM = {
  fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  country: '', region: '', city: '', street: '',
};

type NationalIdFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
} | null;

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({
  label, placeholder, value, onChangeText,
  icon, secure, keyboardType, hint, rightEl, topRight,
  scrollRef, scrollOffset, colors, s,
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
  scrollRef?: React.RefObject<ScrollView | null>;
  scrollOffset?: number;
  colors: ThemeColors;
  s: Styles;
}) {
  const fieldRef = useRef<View>(null);

  const handleFocus = () => {
    if (scrollRef) scrollFieldIntoView(scrollRef, fieldRef, scrollOffset);
  };

  return (
    <View style={s.fieldGroup} ref={fieldRef}>
      {(label || topRight) && (
        <View style={s.fieldLabelRow}>
          {label && <Text style={s.fieldLabel}>{label}</Text>}
          {topRight}
        </View>
      )}
      <View style={s.inputWrap}>
        {icon && <Feather name={icon as any} size={15} color={colors.textLight} />}
        <TextInput
          style={s.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={handleFocus}
        />
        {rightEl}
      </View>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

function RegLabel({ children, s }: { children: string; s: Styles }) {
  return <Text style={s.regLabel}>{children}</Text>;
}

function SectionCard({ icon, title, children, colors, s }: {
  icon: string; title: string; children: React.ReactNode; colors: ThemeColors; s: Styles;
}) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionCardHeader}>
        <Feather name={icon as any} size={15} color={colors.primary} />
        <Text style={s.sectionCardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── National ID Upload Field ─────────────────────────────────────────────────
function NationalIdUpload({
  file,
  onFileSelected,
  colors,
  s,
}: {
  file: NationalIdFile;
  onFileSelected: (f: NationalIdFile) => void;
  colors: ThemeColors;
  s: Styles;
}) {
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload your ID.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      onFileSelected({
        uri: asset.uri,
        name: asset.fileName ?? `national_id_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const handlePickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo of your ID.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      onFileSelected({
        uri: asset.uri,
        name: asset.fileName ?? `national_id_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      });
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      onFileSelected({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/pdf',
        size: asset.size,
      });
    }
  };

  const showPicker = () => {
    Alert.alert(
      'Upload National ID',
      'Choose how you would like to upload your identity document.',
      [
        { text: 'Take Photo',          onPress: handlePickCamera },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Upload PDF',          onPress: handlePickDocument },
        { text: 'Cancel',              style: 'cancel' },
      ],
    );
  };

  const isPdf = file?.mimeType === 'application/pdf';
  const sizeKb = file?.size ? `${(file.size / 1024).toFixed(0)} KB` : null;

  return (
    <View style={s.fieldGroup}>
      <View style={s.fieldLabelRow}>
        <RegLabel s={s}>NATIONAL ID</RegLabel>
        <View style={s.requiredBadge}>
          <Text style={s.requiredBadgeTxt}>REQUIRED</Text>
        </View>
      </View>

      <View style={s.idInfoCard}>
        <Feather name="shield" size={13} color={colors.primary} style={{ marginTop: 1 }} />
        <Text style={s.idInfoText}>
          Your national ID is used solely for identity verification and is stored securely.
        </Text>
      </View>

      {file ? (
        <View style={s.idSelectedWrap}>
          <View style={s.idSelectedIcon}>
            <Feather name={isPdf ? 'file-text' : 'image'} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.idSelectedName} numberOfLines={1}>{file.name}</Text>
            {sizeKb && <Text style={s.idSelectedSize}>{sizeKb}</Text>}
          </View>
          <TouchableOpacity onPress={showPicker} style={s.idChangeBtn}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={s.idChangeBtnTxt}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.idUploadBtn} onPress={showPicker} activeOpacity={0.7}>
          <View style={s.idUploadIconWrap}>
            <Feather name="upload" size={20} color={colors.primary} />
          </View>
          <Text style={s.idUploadTitle}>Upload National ID</Text>
          <Text style={s.idUploadSub}>JPG, PNG or PDF accepted</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Login Tab ────────────────────────────────────────────────────────────────
function LoginTab({ email, setEmail, password, setPassword, colors, s }: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  colors: ThemeColors;
  s: Styles;
}) {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password,
        expectedRole: 'BUYER',
      });
      const { token, role, profile } = res.data;
      await persistAuthSession({ token, role, profile });
      router.replace(routeForRole(role) as any);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.tabScroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <View style={s.authHero}>
        <View style={s.shieldWrap}>
          <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
        </View>
        <Text style={s.authHeroTitle}>Welcome Back</Text>
        <Text style={s.authHeroDesc}>
          Sign in to browse verified properties and connect with trusted owners.
        </Text>
      </View>

      <Field
        label="Email Address"
        placeholder="e.g. john@example.com"
        value={email}
        onChangeText={setEmail}
        icon="mail"
        keyboardType="email-address"
        scrollRef={scrollRef}
        colors={colors}
        s={s}
      />

      <Field
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        icon="lock"
        secure={!showPass}
        scrollRef={scrollRef}
        scrollOffset={140}
        colors={colors}
        s={s}
        topRight={
          <TouchableOpacity onPress={() => router.push('/ForgotPassword')}>
            <Text style={s.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        }
        rightEl={
          <TouchableOpacity onPress={() => setShowPass(p => !p)}>
            <Feather name={showPass ? 'eye' : 'eye-off'} size={15} color={colors.textLight} />
          </TouchableOpacity>
        }
      />

      <TouchableOpacity
        style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
        disabled={loading}
        onPress={handleLogin}
      >
        {loading ? <ActivityIndicator color={WHITE} /> : (
          <>
            <Text style={s.primaryBtnTxt}>Secure Login</Text>
            <Feather name="arrow-right" size={17} color={WHITE} />
          </>
        )}
      </TouchableOpacity>

      <View style={s.orDivider}>
        <View style={s.dividerLine} />
        <Text style={s.orTxt}>OR CONTINUE WITH</Text>
        <View style={s.dividerLine} />
      </View>

      <View style={s.socialRow}>
        <TouchableOpacity style={s.socialBtn}>
          <Feather name="globe" size={17} color={colors.textSecondary} />
          <Text style={s.socialBtnTxt}>Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.socialBtn}>
          <Feather name="smartphone" size={17} color={colors.textSecondary} />
          <Text style={s.socialBtnTxt}>Apple</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tipCard}>
        <Feather name="info" size={13} color={colors.textLight} style={{ marginTop: 2 }} />
        <Text style={s.tipText}>
          <Text style={{ fontWeight: '700' }}>Tip: </Text>
          Use the same email you registered with to access your saved properties and messages.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Sign Up Tab ──────────────────────────────────────────────────────────────
function SignupTab({
  termsAccepted,
  form,
  setForm,
  colors,
  s,
}: {
  termsAccepted: boolean;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  colors: ThemeColors;
  s: Styles;
}) {
  const [loading, setLoading] = useState(false);
  const [nationalIdFile, setNationalIdFile] = useState<NationalIdFile>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordFieldRef = useRef<View>(null);
  const confirmPasswordFieldRef = useRef<View>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  // NOTE: validation failures below intentionally do NOT clear the form or the
  // uploaded ID — the user is still on the signup flow (e.g. going to read the
  // Terms screen and coming back), so their entered data should stay put. The
  // form is only wiped after a successful registration, or when the user
  // explicitly presses the back arrow to leave the signup screen entirely.
  const clearSensitiveRegistrationState = useCallback(() => {
    setForm(EMPTY_FORM);
    setNationalIdFile(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    AsyncStorage.removeItem('signup_draft');
  }, [setForm]);

  const handleSignup = async () => {
    if (!termsAccepted) {
      Alert.alert(
        'Agreement Required',
        'You must read and accept the Terms & Privacy Policy before creating an account.',
        [
          { text: 'Read Terms', onPress: () => router.push('/TermsSeeker') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in your full name, email, and password.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match. Please try again.');
      return;
    }
    if (!nationalIdFile) {
      Alert.alert('Missing Fields', 'Please upload your national ID to verify your identity.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('email',    form.email.trim());
      formData.append('password', form.password);
      formData.append('role',     'BUYER');
      formData.append('fullName', form.fullName.trim());
      formData.append('phone',    form.phone);
      formData.append('country',  form.country.trim());
      formData.append('region',   form.region.trim());
      formData.append('city',     form.city.trim());
      formData.append('street',   form.street.trim());
      formData.append('nationalId', {
        uri:  nationalIdFile.uri,
        name: nationalIdFile.name,
        type: nationalIdFile.mimeType,
      } as any);

      const res = await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { token, role, profile } = res.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);
      if (profile) await AsyncStorage.setItem('profile', JSON.stringify(profile));
      await AsyncStorage.removeItem('signup_draft');
      await AsyncStorage.removeItem('seeker_welcome_seen');

      // Registration succeeded — safe to clear the local form state now.
      clearSensitiveRegistrationState();

      router.replace('/seeker-dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.tabScroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <Text style={s.stepTitle}>Find Your Dream Home</Text>

      <SectionCard icon="user" title="Personal Details" colors={colors} s={s}>
        <View style={s.fieldGroup}>
          <RegLabel s={s}>FULL NAME</RegLabel>
          <View style={s.inputWrap}>
            <Feather name="user" size={14} color={colors.textLight} />
            <TextInput style={s.fieldInput} placeholder="John Doe"
              placeholderTextColor={colors.textLight} value={form.fullName} onChangeText={set('fullName')} />
          </View>
        </View>

        <View style={s.fieldGroup}>
          <RegLabel s={s}>EMAIL ADDRESS</RegLabel>
          <View style={s.inputWrap}>
            <Feather name="mail" size={14} color={colors.textLight} />
            <TextInput style={s.fieldInput} placeholder="john@example.com"
              placeholderTextColor={colors.textLight} value={form.email} onChangeText={set('email')}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
          <TouchableOpacity style={s.emailHelpLink} onPress={openEmailSignupOptions} activeOpacity={0.8}>
            <Text style={s.emailHelpText}>
              Don&apos;t have an email? <Text style={s.emailHelpTextBold}>Create one here.</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={s.fieldGroup} ref={passwordFieldRef}>
          <RegLabel s={s}>PASSWORD</RegLabel>
          <View style={s.inputWrap}>
            <Feather name="lock" size={14} color={colors.textLight} />
            <TextInput style={s.fieldInput} placeholder="Min. 8 characters"
              placeholderTextColor={colors.textLight} value={form.password} onChangeText={set('password')}
              secureTextEntry={!showPassword}
              onFocus={() => scrollFieldIntoView(scrollRef, passwordFieldRef, 140)} />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={15} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.fieldGroup} ref={confirmPasswordFieldRef}>
          <RegLabel s={s}>CONFIRM PASSWORD</RegLabel>
          <View style={s.inputWrap}>
            <Feather name="lock" size={14} color={colors.textLight} />
            <TextInput style={s.fieldInput} placeholder="Repeat your password"
              placeholderTextColor={colors.textLight} value={form.confirmPassword}
              onChangeText={set('confirmPassword')} secureTextEntry={!showConfirmPassword}
              onFocus={() => scrollFieldIntoView(scrollRef, confirmPasswordFieldRef, 140)} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} accessibilityRole="button" accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={15} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.fieldGroup}>
          <RegLabel s={s}>PHONE NUMBER</RegLabel>
          <View style={s.phoneWrap}>
            <View style={s.phonePrefix}>
              <Feather name="globe" size={13} color={colors.textSecondary} />
              <Text style={s.phonePrefixTxt}>+237</Text>
            </View>
            <View style={[s.inputWrap, { flex: 1 }]}>
              <Feather name="phone" size={14} color={colors.textLight} />
              <TextInput style={s.fieldInput} placeholder="6XXXXXXXX"
                placeholderTextColor={colors.textLight} value={form.phone} onChangeText={set('phone')}
                keyboardType="phone-pad" />
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard icon="map-pin" title="Location Details" colors={colors} s={s}>
        <View style={s.twoCol}>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <RegLabel s={s}>COUNTRY</RegLabel>
            <View style={s.inputWrap}>
              <Feather name="globe" size={13} color={colors.textLight} />
              <TextInput style={s.fieldInput} placeholder="Cameroon"
                placeholderTextColor={colors.textLight} value={form.country} onChangeText={set('country')} />
            </View>
          </View>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <RegLabel s={s}>REGION</RegLabel>
            <View style={s.inputWrap}>
              <Feather name="map" size={13} color={colors.textLight} />
              <TextInput style={s.fieldInput} placeholder="Littoral"
                placeholderTextColor={colors.textLight} value={form.region} onChangeText={set('region')} />
            </View>
          </View>
        </View>

        <View style={s.twoCol}>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <RegLabel s={s}>CITY</RegLabel>
            <View style={s.inputWrap}>
              <Feather name="grid" size={13} color={colors.textLight} />
              <TextInput style={s.fieldInput} placeholder="Douala"
                placeholderTextColor={colors.textLight} value={form.city} onChangeText={set('city')} />
            </View>
          </View>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <RegLabel s={s}>STREET NAME</RegLabel>
            <View style={s.inputWrap}>
              <Feather name="navigation" size={13} color={colors.textLight} />
              <TextInput style={s.fieldInput} placeholder="Street 1024"
                placeholderTextColor={colors.textLight} value={form.street} onChangeText={set('street')} />
            </View>
          </View>
        </View>
      </SectionCard>

      {/* ── National ID Upload ── */}
      <SectionCard icon="credit-card" title="Identity Verification" colors={colors} s={s}>
        <NationalIdUpload file={nationalIdFile} onFileSelected={setNationalIdFile} colors={colors} s={s} />
      </SectionCard>

      {/* ── Terms Card ── */}
      <View style={s.termsCard}>
        <Feather name="file-text" size={16} color={colors.primary} style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={s.termsCardLabel}>TERMS REQUIRED</Text>
          <Text style={s.termsCardBody}>
            By registering, you agree to our{' '}
            <Text style={s.termsLink} onPress={() => router.push('/TermsSeeker')}>
              Terms of Service & Privacy Policy
            </Text>{' '}
            which govern your use of the platform.
          </Text>
        </View>
      </View>

      {/* ── Terms Checkbox ── */}
      <TouchableOpacity
        style={s.termsRow}
        activeOpacity={0.7}
        onPress={() => { if (!termsAccepted) router.push('/TermsSeeker'); }}
      >
        <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
          {termsAccepted && <Feather name="check" size={12} color={WHITE} />}
        </View>
        <Text style={s.termsText}>
          {termsAccepted
            ? 'You have accepted the Terms & Privacy Policy.'
            : 'I have read and agree to the Terms & Privacy Policy.'}
        </Text>
      </TouchableOpacity>

      {!termsAccepted && (
        <View style={s.termsWarning}>
          <Feather name="alert-circle" size={13} color={colors.warning} />
          <Text style={s.termsWarningTxt}>
            You must accept the terms before creating your account.
          </Text>
        </View>
      )}
      {termsAccepted && (
        <View style={s.termsSuccess}>
          <Feather name="check-circle" size={13} color={colors.success} />
          <Text style={s.termsSuccessTxt}>Terms & Privacy Policy accepted.</Text>
        </View>
      )}

      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.nextBtn, (loading || !termsAccepted) && s.primaryBtnDisabled]}
          disabled={loading}
          onPress={handleSignup}
        >
          {loading ? <ActivityIndicator color={WHITE} /> : (
            <>
              <Text style={s.nextBtnTxt}>Create Account</Text>
              <Feather name="arrow-right" size={15} color={WHITE} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HouseSeekersLoginSignup() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const params = useLocalSearchParams<{ tab?: string; termsAccepted?: string }>();

  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab === 'signup' ? 'signup' : 'login'
  );

  useEffect(() => {
    if (params.tab === 'signup' || params.tab === 'login') {
      setActiveTab(params.tab);
    }
  }, [params.tab]);

  const termsAccepted = params.termsAccepted === 'true';

  const [form, setForm]                   = useState(EMPTY_FORM);
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const draftLoaded = useRef(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('signup_draft').then(raw => {
        if (raw) {
          try { setForm(JSON.parse(raw)); } catch {}
        }
        draftLoaded.current = true;
      });
    }, [])
  );

  useEffect(() => {
    if (!draftLoaded.current) return;
    AsyncStorage.setItem('signup_draft', JSON.stringify(form));
  }, [form]);

  const handleBack = () => {
    setForm(EMPTY_FORM);
    setLoginEmail('');
    setLoginPassword('');
    draftLoaded.current = false;
    AsyncStorage.removeItem('signup_draft');
    router.push('/portal');
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={s.tabRow}>
          {(['login', 'signup'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[s.tabBtnTxt, activeTab === tab && s.tabBtnTxtActive]}>
                {tab === 'login' ? 'Login' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.formHeader}>
          <Text style={s.formHeaderTitle}>
            {activeTab === 'login' ? 'Welcome Back, Seeker' : 'Create Seeker Account'}
          </Text>
          <Text style={s.formHeaderSub}>House Seekers Portal</Text>
        </View>

        {activeTab === 'login' && (
          <LoginTab
            email={loginEmail}
            setEmail={setLoginEmail}
            password={loginPassword}
            setPassword={setLoginPassword}
            colors={colors}
            s={s}
          />
        )}
        {activeTab === 'signup' && (
          <SignupTab
            termsAccepted={termsAccepted}
            form={form}
            setForm={setForm}
            colors={colors}
            s={s}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backBtn: {
      width: 38, height: 38, borderRadius: 19, margin: 20,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    tabRow: {
      flexDirection: 'row', backgroundColor: colors.primaryBorder, borderRadius: 14,
      marginHorizontal: H_PAD, padding: 4, gap: 4, marginBottom: 4,
    },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabBtnActive: {
      backgroundColor: colors.card, shadowColor: colors.primaryDarker, shadowOpacity: 0.15,
      shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    tabBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.primary },
    tabBtnTxtActive: { color: colors.primaryDarker, fontWeight: '700' },
    formHeader: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 4 },
    formHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    formHeaderSub: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
    tabScroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 220 },
    authHero: { alignItems: 'center', marginBottom: 22 },
    shieldWrap: {
      width: 60, height: 60, backgroundColor: colors.primaryTintAlt, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
      shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 3,
    },
    authHeroTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6, letterSpacing: -0.3 },
    authHeroDesc: { fontSize: 13.5, color: colors.textLight, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
    fieldGroup: { marginBottom: 14 },
    fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    forgotLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card,
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    },
    fieldInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
    fieldHint: { fontSize: 11.5, color: colors.textLight, marginTop: 5, fontStyle: 'italic', paddingLeft: 2 },
    emailHelpLink: { marginTop: 8, alignSelf: 'flex-start' },
    emailHelpText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
    emailHelpTextBold: { fontWeight: '700', textDecorationLine: 'underline' },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      backgroundColor: colors.primaryDark, borderRadius: 18, paddingVertical: 17, marginBottom: 18,
      shadowColor: colors.primaryDarker, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
    },
    primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
    primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: WHITE, letterSpacing: -0.2 },
    orDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orTxt: { fontSize: 11, fontWeight: '700', color: colors.textLight, letterSpacing: 0.8 },
    socialRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
    socialBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: 13,
    },
    socialBtnTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    tipCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: colors.cardMuted, borderRadius: 12, padding: 12, marginBottom: 10,
    },
    tipText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    stepTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, letterSpacing: -0.3 },
    regLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textLight, letterSpacing: 0.8, marginBottom: 7 },
    sectionCard: {
      backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    sectionCardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    phoneWrap: { flexDirection: 'row', gap: 8 },
    phonePrefix: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.divider,
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 13,
    },
    phonePrefixTxt: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    twoCol: { flexDirection: 'row', gap: 10 },
    requiredBadge: {
      backgroundColor: colors.warningBg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    },
    requiredBadgeTxt: { fontSize: 9.5, fontWeight: '700', color: colors.warning, letterSpacing: 0.5 },
    idInfoCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 7,
      backgroundColor: colors.primaryTintAlt, borderRadius: 10, padding: 10, marginBottom: 10,
      borderWidth: 1, borderColor: colors.primaryBorder,
    },
    idInfoText: { flex: 1, fontSize: 11.5, color: colors.textMuted, lineHeight: 17 },
    idUploadBtn: {
      borderWidth: 2, borderColor: colors.primarySoft, borderStyle: 'dashed', borderRadius: 14,
      paddingVertical: 24, alignItems: 'center', gap: 8, backgroundColor: colors.primaryTint,
    },
    idUploadIconWrap: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    idUploadTitle: { fontSize: 13.5, fontWeight: '700', color: colors.primaryDarker },
    idUploadSub: { fontSize: 11.5, color: colors.textLight },
    idSelectedWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.primaryTintAlt, borderRadius: 14, padding: 12,
      borderWidth: 1.5, borderColor: colors.primarySoft,
    },
    idSelectedIcon: {
      width: 42, height: 42, borderRadius: 10, backgroundColor: colors.primaryBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    idSelectedName: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
    idSelectedSize: { fontSize: 11, color: colors.textLight },
    idChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
    idChangeBtnTxt: { fontSize: 12, fontWeight: '700', color: colors.primary },
    termsCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: colors.primaryTintAlt, borderWidth: 1, borderColor: colors.primaryBorder,
      borderRadius: 14, padding: 13, marginBottom: 12,
    },
    termsCardLabel: { fontSize: 10.5, fontWeight: '700', color: colors.primary, letterSpacing: 0.6, marginBottom: 4 },
    termsCardBody: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 19 },
    termsLink: { color: colors.primaryDark, fontWeight: '700', textDecorationLine: 'underline' },
    termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 2 },
    checkbox: {
      width: 22, height: 22, borderWidth: 2, borderColor: colors.border,
      borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card,
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    termsText: { flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 19 },
    termsWarning: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 7,
      backgroundColor: colors.warningBg, borderWidth: 1, borderColor: colors.warning + '55',
      borderRadius: 12, padding: 11, marginBottom: 16,
    },
    termsWarningTxt: { flex: 1, fontSize: 12, color: colors.warning, lineHeight: 18 },
    termsSuccess: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success + '55',
      borderRadius: 12, padding: 11, marginBottom: 16,
    },
    termsSuccessTxt: { flex: 1, fontSize: 12, color: colors.success, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    saveBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card,
      borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
    },
    saveBtnTxt: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    nextBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 14,
      shadowColor: colors.primaryDarker, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5,
    },
    nextBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE },
  });
}