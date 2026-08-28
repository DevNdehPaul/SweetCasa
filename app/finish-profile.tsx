import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
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
import { routeForRole } from '../constants/auth';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

const H_PAD = 20;
const WHITE = '#FFFFFF';

type Styles = ReturnType<typeof getStyles>;

type NationalIdFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
} | null;

type StoredProfile = {
  id?: string | number;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  nationalIdUrl?: string;
};

// ─── Cross-platform Alert ─────────────────────────────────────────────────────
// Same pattern used on the login/signup screens — Alert.alert is a no-op on
// React Native Web, so this falls back to a real Modal there.
type CrossAlertButton = { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' };
type WebAlertState = { visible: boolean; title: string; message: string; buttons: CrossAlertButton[] };
let _setWebAlertState: ((s: WebAlertState) => void) | null = null;

function crossAlert(title: string, message?: string, buttons: CrossAlertButton[] = [{ text: 'OK' }]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }
  if (_setWebAlertState) {
    _setWebAlertState({ visible: true, title, message: message ?? '', buttons });
  } else {
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

function WebAlertHost() {
  const { colors } = useAppTheme();
  const ws = useMemo(() => getWebAlertStyles(colors), [colors]);
  const [state, setState] = useState<WebAlertState>({ visible: false, title: '', message: '', buttons: [] });

  useEffect(() => {
    _setWebAlertState = setState;
    return () => { _setWebAlertState = null; };
  }, []);

  if (Platform.OS !== 'web') return null;

  const handlePress = (btn?: CrossAlertButton) => {
    setState(s => ({ ...s, visible: false }));
    btn?.onPress?.();
  };

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => handlePress()}>
      <View style={ws.backdrop}>
        <View style={ws.card}>
          <Text style={ws.title}>{state.title}</Text>
          {!!state.message && <Text style={ws.message}>{state.message}</Text>}
          <View style={ws.btnRow}>
            {state.buttons.map((b, i) => (
              <TouchableOpacity
                key={`${b.text}-${i}`}
                onPress={() => handlePress(b)}
                style={[ws.btn, b.style === 'cancel' && ws.btnCancel, b.style === 'destructive' && ws.btnDestructive]}
                activeOpacity={0.7}
              >
                <Text style={[ws.btnTxt, b.style === 'cancel' && ws.btnTxtCancel, b.style === 'destructive' && ws.btnTxtDestructive]}>
                  {b.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Shared field components (mirrors the login/signup screens) ───────────────
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

// ─── National ID Upload (same picker flow as the signup screens) ──────────────
function NationalIdUpload({
  file, onFileSelected, existingUrl, colors, s,
}: {
  file: NationalIdFile;
  onFileSelected: (f: NationalIdFile) => void;
  existingUrl?: string;
  colors: ThemeColors;
  s: Styles;
}) {
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Permission Required', 'Please allow access to your photo library to upload your ID.');
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
      crossAlert('Permission Required', 'Please allow camera access to take a photo of your ID.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85 });
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
    crossAlert(
      'Upload National ID',
      'Choose how you would like to upload your identity document.',
      [
        { text: 'Take Photo', onPress: handlePickCamera },
        { text: 'Choose from Gallery', onPress: handlePickImage },
        { text: 'Upload PDF', onPress: handlePickDocument },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const isPdf = file?.mimeType === 'application/pdf';
  const sizeKb = file?.size ? `${(file.size / 1024).toFixed(0)} KB` : null;

  // Already has one on file (shouldn't normally happen for a fresh social
  // signup, but covers the case where this screen is revisited) — still
  // let them replace it, just with different framing text.
  if (!file && existingUrl) {
    return (
      <View style={s.fieldGroup}>
        <View style={s.fieldLabelRow}>
          <RegLabel s={s}>NATIONAL ID</RegLabel>
          <View style={s.requiredBadge}>
            <Text style={s.requiredBadgeTxt}>ON FILE</Text>
          </View>
        </View>
        <View style={s.idSelectedWrap}>
          <View style={s.idSelectedIcon}>
            <Feather name="check-circle" size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.idSelectedName}>ID already on file</Text>
          </View>
          <TouchableOpacity onPress={showPicker} style={s.idChangeBtn}>
            <Feather name="refresh-cw" size={14} color={colors.primary} />
            <Text style={s.idChangeBtnTxt}>Replace</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FinishProfile() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [role, setRole] = useState<'BUYER' | 'SELLER' | null>(null);
  const [email, setEmail] = useState('');
  const [existingNationalIdUrl, setExistingNationalIdUrl] = useState<string | undefined>(undefined);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [nationalIdFile, setNationalIdFile] = useState<NationalIdFile>(null);

  const [submitting, setSubmitting] = useState(false);

  // Load whatever the social sign-in already gave us (name, email, role) so
  // the person isn't retyping things Google already told the backend.
  useEffect(() => {
    (async () => {
      try {
        const [storedRole, storedProfileRaw] = await Promise.all([
          AsyncStorage.getItem('role'),
          AsyncStorage.getItem('profile'),
        ]);

        if (storedRole === 'BUYER' || storedRole === 'SELLER') {
          setRole(storedRole);
        }

        if (storedProfileRaw) {
          const profile: StoredProfile = JSON.parse(storedProfileRaw);
          setFullName(profile.name || '');
          setCompanyName(profile.companyName || '');
          setEmail(profile.email || '');
          setPhone(profile.phone && profile.phone !== '0' ? profile.phone : '');
          setCountry(profile.country || '');
          setRegion(profile.region || '');
          setCity(profile.city || '');
          setStreet(profile.street || '');
          setExistingNationalIdUrl(profile.nationalIdUrl || undefined);
        }
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, []);

  const isSeller = role === 'SELLER';

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      crossAlert('Missing Fields', 'Please enter your full name.');
      return;
    }
    if (isSeller && !companyName.trim()) {
      crossAlert('Missing Fields', 'Please enter your company name.');
      return;
    }
    if (!nationalIdFile && !existingNationalIdUrl) {
      crossAlert('Missing Fields', 'Please upload your national ID to verify your identity.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('token');

      const formData = new FormData();
      formData.append('name', fullName.trim());
      if (isSeller) {
        formData.append('companyName', companyName.trim());
      }
      formData.append('phone', phone);
      formData.append('country', country.trim());
      formData.append('region', region.trim());
      formData.append('city', city.trim());
      formData.append('street', street.trim());
      if (nationalIdFile) {
        formData.append('nationalId', {
          uri: nationalIdFile.uri,
          name: nationalIdFile.name,
          type: nationalIdFile.mimeType,
        } as any);
      }

      const res = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const { profile } = res.data;
      if (profile) {
        await AsyncStorage.setItem('profile', JSON.stringify(profile));
      }

      router.replace(routeForRole((role || 'BUYER') as any) as any);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Could not save your profile. Please try again.';
      crossAlert('Save Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <WebAlertHost />

      <View style={s.formHeader}>
        <Text style={s.formHeaderTitle}>Finish Setting Up</Text>
        <Text style={s.formHeaderSub}>
          {isSeller ? 'House Owners Portal' : 'House Seekers Portal'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.tabScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.introCard}>
          <Feather name="info" size={14} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={s.introText}>
            You signed in with Google — just a few more details before you can{' '}
            {isSeller ? 'list a property' : 'message an owner'}.
          </Text>
        </View>

        {!!email && (
          <View style={s.emailPill}>
            <Feather name="mail" size={13} color={colors.textLight} />
            <Text style={s.emailPillText}>{email}</Text>
          </View>
        )}

        <SectionCard icon="user" title={isSeller ? 'Business Identity' : 'Personal Details'} colors={colors} s={s}>
          <View style={s.fieldGroup}>
            <RegLabel s={s}>FULL NAME</RegLabel>
            <View style={s.inputWrap}>
              <Feather name="user" size={14} color={colors.textLight} />
              <TextInput
                style={s.fieldInput}
                placeholder="John Doe"
                placeholderTextColor={colors.textLight}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {isSeller && (
            <View style={s.fieldGroup}>
              <RegLabel s={s}>COMPANY NAME</RegLabel>
              <View style={s.inputWrap}>
                <Feather name="briefcase" size={14} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="e.g. BlueSky Estates Ltd"
                  placeholderTextColor={colors.textLight}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>
              <Text style={s.fieldHint}>Use your registered business name or your own name if self-employed.</Text>
            </View>
          )}

          <View style={s.fieldGroup}>
            <RegLabel s={s}>{isSeller ? 'PROFESSIONAL PHONE' : 'PHONE NUMBER'}</RegLabel>
            <View style={s.phoneWrap}>
              <View style={s.phonePrefix}>
                <Feather name="globe" size={13} color={colors.textSecondary} />
                <Text style={s.phonePrefixTxt}>+237</Text>
              </View>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <Feather name="phone" size={14} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="6XXXXXXXX"
                  placeholderTextColor={colors.textLight}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        </SectionCard>

        <SectionCard icon="map-pin" title={isSeller ? 'Office Location' : 'Location Details'} colors={colors} s={s}>
          <View style={s.twoCol}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <RegLabel s={s}>COUNTRY</RegLabel>
              <View style={s.inputWrap}>
                <Feather name="globe" size={13} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="Cameroon"
                  placeholderTextColor={colors.textLight}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <RegLabel s={s}>REGION</RegLabel>
              <View style={s.inputWrap}>
                <Feather name="map" size={13} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder={isSeller ? 'Centre' : 'Littoral'}
                  placeholderTextColor={colors.textLight}
                  value={region}
                  onChangeText={setRegion}
                />
              </View>
            </View>
          </View>

          <View style={s.twoCol}>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <RegLabel s={s}>CITY</RegLabel>
              <View style={s.inputWrap}>
                <Feather name="grid" size={13} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder={isSeller ? 'Yaoundé' : 'Douala'}
                  placeholderTextColor={colors.textLight}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
            <View style={[s.fieldGroup, { flex: 1 }]}>
              <RegLabel s={s}>STREET</RegLabel>
              <View style={s.inputWrap}>
                <Feather name="navigation" size={13} color={colors.textLight} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="Street name"
                  placeholderTextColor={colors.textLight}
                  value={street}
                  onChangeText={setStreet}
                />
              </View>
            </View>
          </View>
        </SectionCard>

        <SectionCard icon="credit-card" title="Identity Verification" colors={colors} s={s}>
          <NationalIdUpload
            file={nationalIdFile}
            onFileSelected={setNationalIdFile}
            existingUrl={existingNationalIdUrl}
            colors={colors}
            s={s}
          />
        </SectionCard>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.nextBtn, submitting && s.primaryBtnDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? <ActivityIndicator color={WHITE} /> : (
              <>
                <Text style={s.nextBtnTxt}>Complete Profile</Text>
                <Feather name="arrow-right" size={15} color={WHITE} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Web Alert Modal Styles ───────────────────────────────────────────────────
function getWebAlertStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
      width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: 16, padding: 20,
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
    message: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },
    btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
    btn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: colors.primaryDark },
    btnCancel: { backgroundColor: colors.divider },
    btnDestructive: { backgroundColor: colors.danger },
    btnTxt: { fontSize: 13.5, fontWeight: '700', color: WHITE },
    btnTxtCancel: { color: colors.textSecondary },
    btnTxtDestructive: { color: WHITE },
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    formHeader: { paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 4 },
    formHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    formHeaderSub: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
    tabScroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 40 },
    introCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: colors.primaryTintAlt, borderRadius: 12, padding: 12, marginBottom: 12,
      borderWidth: 1, borderColor: colors.primaryBorder,
    },
    introText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 19 },
    emailPill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
      backgroundColor: colors.cardMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16,
    },
    emailPillText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    fieldGroup: { marginBottom: 14 },
    fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    inputWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card,
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    },
    fieldInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
    fieldHint: { fontSize: 11.5, color: colors.textLight, marginTop: 5, fontStyle: 'italic', paddingLeft: 2 },
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
    requiredBadge: { backgroundColor: colors.warningBg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
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
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 20 },
    nextBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: colors.primaryDark, borderRadius: 14, paddingVertical: 14,
      shadowColor: colors.primaryDarker, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5,
    },
    nextBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE },
    primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  });
}