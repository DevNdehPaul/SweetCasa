import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  View,
} from 'react-native';
import api from '../constants/api';
import { persistAuthSession, routeForRole } from '../constants/auth';

const PURPLE_LIGHT = '#F0EBFF';
const { width } = Dimensions.get('window');
const H_PAD = 20;

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

// ─── National ID Upload Field ─────────────────────────────────────────────────
function NationalIdUpload({
  file,
  onFileSelected,
}: {
  file: NationalIdFile;
  onFileSelected: (f: NationalIdFile) => void;
}) {
  const { t } = useTranslation();

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('auth.permissionRequired'),
        t('auth.galleryPermissionDesc'),
      );
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
      Alert.alert(
        t('auth.permissionRequired'),
        t('auth.cameraPermissionDesc'),
      );
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
      t('auth.uploadNationalId'),
      t('auth.uploadNationalIdDesc'),
      [
        { text: t('auth.takePhoto'),    onPress: handlePickCamera },
        { text: t('auth.chooseGallery'), onPress: handlePickImage },
        { text: t('auth.choosePdf'),     onPress: handlePickDocument },
        { text: t('common.cancel'),      style: 'cancel' },
      ],
    );
  };

  const isPdf = file?.mimeType === 'application/pdf';
  const sizeKb = file?.size ? `${(file.size / 1024).toFixed(0)} KB` : null;

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <RegLabel>{t('auth.nationalId')}</RegLabel>
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredBadgeTxt}>{t('auth.required')}</Text>
        </View>
      </View>

      {/* Info card */}
      <View style={styles.idInfoCard}>
        <Feather name="shield" size={13} color="#7C3AED" style={{ marginTop: 1 }} />
        <Text style={styles.idInfoText}>{t('auth.nationalIdInfo')}</Text>
      </View>

      {file ? (
        /* ── File selected state ── */
        <View style={styles.idSelectedWrap}>
          <View style={styles.idSelectedIcon}>
            <Feather name={isPdf ? 'file-text' : 'image'} size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.idSelectedName} numberOfLines={1}>{file.name}</Text>
            {sizeKb && <Text style={styles.idSelectedSize}>{sizeKb}</Text>}
          </View>
          <TouchableOpacity onPress={showPicker} style={styles.idChangeBtn}>
            <Feather name="refresh-cw" size={14} color="#7C3AED" />
            <Text style={styles.idChangeBtnTxt}>{t('auth.change')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Empty state ── */
        <TouchableOpacity style={styles.idUploadBtn} onPress={showPicker} activeOpacity={0.7}>
          <View style={styles.idUploadIconWrap}>
            <Feather name="upload" size={20} color="#7C3AED" />
          </View>
          <Text style={styles.idUploadTitle}>{t('auth.uploadNationalId')}</Text>
          <Text style={styles.idUploadSub}>{t('auth.uploadNationalIdFormats')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Login Tab ────────────────────────────────────────────────────────────────
function LoginTab({ email, setEmail, password, setPassword }: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('auth.missingFields'), t('auth.missingFieldsDesc'));
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
      const message = err.response?.data?.error || t('auth.loginFailedGeneric');
      Alert.alert(t('auth.loginFailed'), message);
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
        <Text style={styles.authHeroTitle}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.authHeroDesc}>{t('auth.seekerDesc')}</Text>
      </View>

      <Field
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        icon="mail"
        keyboardType="email-address"
      />

      <Field
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        icon="lock"
        secure={!showPass}
        topRight={
          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
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
            <Text style={styles.primaryBtnTxt}>{t('auth.secureLogin')}</Text>
            <Feather name="arrow-right" size={17} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.orDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orTxt}>{t('auth.orContinueWith')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn}>
          <Feather name="globe" size={17} color="#374151" />
          <Text style={styles.socialBtnTxt}>{t('auth.google')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialBtn}>
          <Feather name="smartphone" size={17} color="#374151" />
          <Text style={styles.socialBtnTxt}>{t('auth.apple')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Feather name="info" size={13} color="#9CA3AF" style={{ marginTop: 2 }} />
        <Text style={styles.tipText}>
          <Text style={{ fontWeight: '700' }}>{t('auth.tipTitle')}</Text>{' '}
          {t('auth.seekerTip')}
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
}: {
  termsAccepted: boolean;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [nationalIdFile, setNationalIdFile] = useState<NationalIdFile>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSignup = async () => {
    if (!termsAccepted) {
      Alert.alert(
        t('auth.agreementRequired'),
        t('auth.agreementDesc'),
        [
          { text: t('auth.readTerms'), onPress: () => router.push('/TermsSeeker') },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
      return;
    }
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert(t('auth.missingFields'), t('auth.signupMissingFieldsDesc'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert(t('auth.passwordMismatch'), t('auth.passwordMismatchDesc'));
      return;
    }
    if (!nationalIdFile) {
      Alert.alert(t('auth.missingFields'), t('auth.nationalIdRequired'));
      return;
    }

    setLoading(true);
    try {
      // Build multipart/form-data payload
      const formData = new FormData();
      formData.append('email',           form.email.trim());
      formData.append('password',        form.password);
      formData.append('role',            'BUYER');
      formData.append('fullName',        form.fullName.trim());
      formData.append('phone',           form.phone);
      formData.append('country',         form.country.trim());
      formData.append('region',          form.region.trim());
      formData.append('city',            form.city.trim());
      formData.append('street',          form.street.trim());
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
await AsyncStorage.removeItem('seeker_welcome_seen'); // ← ADD THIS
router.replace('/seeker-dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error || t('auth.signupFailedGeneric');
      Alert.alert(t('auth.signupFailed'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
      <Text style={styles.stepTitle}>{t('auth.findDreamHome')}</Text>

      <SectionCard icon="user" title={t('account.personalDetails')}>
        <View style={styles.fieldGroup}>
          <RegLabel>{t('account.fullName')}</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="user" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="John Doe"
              placeholderTextColor="#9CA3AF" value={form.fullName} onChangeText={set('fullName')} />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>{t('account.emailAddress')}</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder="john@example.com"
              placeholderTextColor="#9CA3AF" value={form.email} onChangeText={set('email')}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>{t('auth.password')}</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder={t('auth.passwordHint')}
              placeholderTextColor="#9CA3AF" value={form.password} onChangeText={set('password')}
              secureTextEntry />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>{t('auth.confirmPassword')}</RegLabel>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={14} color="#9CA3AF" />
            <TextInput style={styles.fieldInput} placeholder={t('auth.confirmPasswordPlaceholder')}
              placeholderTextColor="#9CA3AF" value={form.confirmPassword}
              onChangeText={set('confirmPassword')} secureTextEntry />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <RegLabel>{t('account.phoneNumber')}</RegLabel>
          <View style={styles.phoneWrap}>
            <View style={styles.phonePrefix}>
              <Feather name="globe" size={13} color="#374151" />
              <Text style={styles.phonePrefixTxt}>+237</Text>
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <Feather name="phone" size={14} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder={t('auth.phonePlaceholder')}
                placeholderTextColor="#9CA3AF" value={form.phone} onChangeText={set('phone')}
                keyboardType="phone-pad" />
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard icon="map-pin" title={t('account.locationDetails')}>
        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>{t('account.country')}</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="globe" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Cameroon"
                placeholderTextColor="#9CA3AF" value={form.country} onChangeText={set('country')} />
            </View>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>{t('account.region')}</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="map" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Littoral"
                placeholderTextColor="#9CA3AF" value={form.region} onChangeText={set('region')} />
            </View>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>{t('account.city')}</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="grid" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Douala"
                placeholderTextColor="#9CA3AF" value={form.city} onChangeText={set('city')} />
            </View>
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <RegLabel>{t('account.streetName')}</RegLabel>
            <View style={styles.inputWrap}>
              <Feather name="navigation" size={13} color="#9CA3AF" />
              <TextInput style={styles.fieldInput} placeholder="Street 1024"
                placeholderTextColor="#9CA3AF" value={form.street} onChangeText={set('street')} />
            </View>
          </View>
        </View>
      </SectionCard>

      {/* ── National ID Upload ── */}
      <SectionCard icon="credit-card" title={t('auth.identityVerification')}>
        <NationalIdUpload file={nationalIdFile} onFileSelected={setNationalIdFile} />
      </SectionCard>

      {/* ── Terms Card ── */}
      <View style={styles.termsCard}>
        <Feather name="file-text" size={16} color="#7C3AED" style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.termsCardLabel}>{t('auth.termsRequired')}</Text>
          <Text style={styles.termsCardBody}>
            {t('auth.termsCardBodyPre')}{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/TermsSeeker')}>
              {t('auth.termsLinkText')}
            </Text>{' '}
            {t('auth.termsCardBodyPost')}
          </Text>
        </View>
      </View>

      {/* ── Terms Checkbox ── */}
      <TouchableOpacity
        style={styles.termsRow}
        activeOpacity={0.7}
        onPress={() => { if (!termsAccepted) router.push('/TermsSeeker'); }}
      >
        <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
          {termsAccepted && <Feather name="check" size={12} color="#fff" />}
        </View>
        <Text style={styles.termsText}>
          {termsAccepted ? t('auth.termsAccepted') : t('auth.termsNotAccepted')}
        </Text>
      </TouchableOpacity>

      {!termsAccepted && (
        <View style={styles.termsWarning}>
          <Feather name="alert-circle" size={13} color="#D97706" />
          <Text style={styles.termsWarningTxt}>{t('auth.termsWarning')}</Text>
        </View>
      )}
      {termsAccepted && (
        <View style={styles.termsSuccess}>
          <Feather name="check-circle" size={13} color="#16A34A" />
          <Text style={styles.termsSuccessTxt}>{t('auth.termsAcceptedMsg')}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.nextBtn, (loading || !termsAccepted) && styles.primaryBtnDisabled]}
          disabled={loading}
          onPress={handleSignup}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnTxt}>{t('auth.createAccount')}</Text>
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
  const { t } = useTranslation();
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" />
      <View style={{ height: 16 }} />
      <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color="#111827" />
      </TouchableOpacity>

      <View style={styles.tabRow}>
        {(['login', 'signup'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnTxt, activeTab === tab && styles.tabBtnTxtActive]}>
              {tab === 'login' ? t('auth.login') : t('auth.signUp')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.formHeader}>
        <Text style={styles.formHeaderTitle}>
          {activeTab === 'login' ? t('auth.welcomeBackSeeker') : t('auth.createSeekerTitle')}
        </Text>
        <Text style={styles.formHeaderSub}>{t('auth.houseSeekersPortal')}</Text>
      </View>

      {activeTab === 'login' && (
        <LoginTab
          email={loginEmail}
          setEmail={setLoginEmail}
          password={loginPassword}
          setPassword={setLoginPassword}
        />
      )}
      {activeTab === 'signup' && (
        <SignupTab
          termsAccepted={termsAccepted}
          form={form}
          setForm={setForm}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7FB' },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, margin: 20,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
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
  // ── National ID ──
  requiredBadge: {
    backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  requiredBadgeTxt: { fontSize: 9.5, fontWeight: '700', color: '#B45309', letterSpacing: 0.5 },
  idInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  idInfoText: { flex: 1, fontSize: 11.5, color: '#6B7280', lineHeight: 17 },
  idUploadBtn: {
    borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 24, alignItems: 'center', gap: 8, backgroundColor: '#FAFAFF',
  },
  idUploadIconWrap: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  idUploadTitle: { fontSize: 13.5, fontWeight: '700', color: '#5B21B6' },
  idUploadSub: { fontSize: 11.5, color: '#9CA3AF' },
  idSelectedWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: '#DDD6FE',
  },
  idSelectedIcon: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  idSelectedName: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 2 },
  idSelectedSize: { fontSize: 11, color: '#9CA3AF' },
  idChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  idChangeBtnTxt: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  // ── Terms ──
  termsCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#EDE9FE',
    borderRadius: 14, padding: 13, marginBottom: 12,
  },
  termsCardLabel: { fontSize: 10.5, fontWeight: '700', color: '#7C3AED', letterSpacing: 0.6, marginBottom: 4 },
  termsCardBody: { fontSize: 12.5, color: '#374151', lineHeight: 19 },
  termsLink: { color: '#6D28D9', fontWeight: '700', textDecorationLine: 'underline' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 2 },
  checkbox: {
    width: 22, height: 22, borderWidth: 2, borderColor: '#D1D5DB',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  termsText: { flex: 1, fontSize: 12.5, color: '#6B7280', lineHeight: 19 },
  termsWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 12, padding: 11, marginBottom: 16,
  },
  termsWarningTxt: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  termsSuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 12, padding: 11, marginBottom: 16,
  },
  termsSuccessTxt: { flex: 1, fontSize: 12, color: '#15803D', fontWeight: '600' },
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