import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// ─── Theme ────────────────────────────────────────────────────────────────────
const PURPLE       = '#7C3AED';
const PURPLE_LIGHT = '#F0EBFF';
const PURPLE_MID   = '#EDE9FE';
const PURPLE_DARK  = '#6D28D9';
const GREEN        = '#16A34A';
const GREEN_LIGHT  = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';
const GRAY_BG      = '#F7F7FB';
const GRAY_BORDER  = '#E5E7EB';
const TEXT_DARK    = '#111827';
const TEXT_MID     = '#374151';
const TEXT_LIGHT   = '#9CA3AF';
const WHITE        = '#FFFFFF';

const H_PAD = 20;

// ─── Types ────────────────────────────────────────────────────────────────────
type SellerForm = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  city: string;
  street: string;
};

type BuyerForm = {
  name: string;
  email: string;
  phone: string;
  country: string;
  region: string;
  city: string;
  street: string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon, title, children,
}: {
  icon: string; title: string; children: React.ReactNode;
}) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBox}>
          <Feather name={icon as any} size={14} color={PURPLE} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function RegLabel({ children }: { children: string }) {
  return <Text style={s.regLabel}>{children}</Text>;
}

function EditField({
  label, value, onChangeText, icon, placeholder,
  keyboardType, editable = true, hint,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  icon: string;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
  hint?: string;
}) {
  return (
    <View style={s.fieldGroup}>
      <RegLabel>{label}</RegLabel>
      <View style={[s.inputWrap, !editable && s.inputWrapDisabled]}>
        <Feather name={icon as any} size={14} color={editable ? TEXT_LIGHT : '#D1D5DB'} />
        <TextInput
          style={[s.fieldInput, !editable && s.fieldInputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || '—'}
          placeholderTextColor={TEXT_LIGHT}
          keyboardType={keyboardType}
          autoCapitalize="none"
          editable={editable}
        />
        {!editable && (
          <Feather name="lock" size={12} color="#D1D5DB" />
        )}
      </View>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <View style={s.twoCol}>{children}</View>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AccountInformation() {
  const [role, setRole]       = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // Seller form
  const [sellerForm, setSellerForm] = useState<SellerForm>({
    name: '', companyName: '', email: '', phone: '',
    country: '', region: '', city: '', street: '',
  });

  // Buyer form
  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    name: '', email: '', phone: '',
    country: '', region: '', city: '', street: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rawProfile, rawRole] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('role'),
      ]);
      const profile = rawProfile ? JSON.parse(rawProfile) : {};
      setRole(rawRole);

      if (rawRole === 'SELLER') {
        setSellerForm({
          name:        profile.name        || '',
          companyName: profile.companyName || '',
          email:       profile.email       || '',
          phone:       profile.phone       ? String(profile.phone) : '',
          country:     profile.country     || '',
          region:      profile.region      || '',
          city:        profile.city        || '',
          street:      profile.street      || '',
        });
      } else {
        setBuyerForm({
          name:    profile.fullName || profile.name || '',
          email:   profile.email   || '',
          phone:   profile.phone   ? String(profile.phone) : '',
          country: profile.country || '',
          region:  profile.region  || '',
          city:    profile.city    || '',
          street:  profile.street  || '',
        });
      }
    } catch (e) {
      console.error('Failed to load profile data:', e);
    } finally {
      setLoading(false);
    }
  };

  const setSeller = (k: keyof SellerForm) => (v: string) =>
    setSellerForm(p => ({ ...p, [k]: v }));

  const setBuyer = (k: keyof BuyerForm) => (v: string) =>
    setBuyerForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = role === 'SELLER'
        ? {
            name:        sellerForm.name.trim(),
            companyName: sellerForm.companyName.trim(),
            phone:       sellerForm.phone.trim(),
            country:     sellerForm.country.trim(),
            region:      sellerForm.region.trim(),
            city:        sellerForm.city.trim(),
            street:      sellerForm.street.trim(),
          }
        : {
            name:    buyerForm.name.trim(),
            phone:   buyerForm.phone.trim(),
            country: buyerForm.country.trim(),
            region:  buyerForm.region.trim(),
            city:    buyerForm.city.trim(),
            street:  buyerForm.street.trim(),
          };

      const res = await api.put('/auth/profile', payload);

      // Update local storage with new profile
      const updatedProfile = res.data?.profile || res.data;
      const raw = await AsyncStorage.getItem('profile');
      const current = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem('profile', JSON.stringify({ ...current, ...updatedProfile }));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to save changes. Please try again.';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  const isSeller = role === 'SELLER';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Account Information</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled">

          {/* ── Role Banner ── */}
          <View style={[s.roleBanner, isSeller ? s.roleBannerSeller : s.roleBannerBuyer]}>
            <View style={[s.roleIconWrap, isSeller ? s.roleIconSeller : s.roleIconBuyer]}>
              <Ionicons
                name={isSeller ? 'business-outline' : 'search-outline'}
                size={18}
                color={WHITE}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.roleTitle}>
                {isSeller ? 'House Owner Account' : 'House Seeker Account'}
              </Text>
              <Text style={s.roleSub}>
                {isSeller
                  ? 'Manage your business identity and contact details'
                  : 'Update your personal details and location preferences'}
              </Text>
            </View>
          </View>

          {/* ══════════════ SELLER FORM ══════════════ */}
          {isSeller && (
            <>
              <SectionCard icon="briefcase" title="Business Identity">
                <EditField
                  label="FULL NAME"
                  value={sellerForm.name}
                  onChangeText={setSeller('name')}
                  icon="user"
                  placeholder="e.g. John Doe"
                />
                <EditField
                  label="COMPANY NAME"
                  value={sellerForm.companyName}
                  onChangeText={setSeller('companyName')}
                  icon="briefcase"
                  placeholder="e.g. BlueSky Estates Ltd"
                  hint="Displayed publicly on your verified listings."
                />
                <EditField
                  label="EMAIL ADDRESS"
                  value={sellerForm.email}
                  icon="mail"
                  editable={false}
                  hint="Email cannot be changed. Contact support if needed."
                />
                <View style={s.phoneRow}>
                  <View style={s.phonePrefix}>
                    <Feather name="globe" size={13} color={TEXT_MID} />
                    <Text style={s.phonePrefixTxt}>+237</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="PROFESSIONAL PHONE"
                      value={sellerForm.phone}
                      onChangeText={setSeller('phone')}
                      icon="phone"
                      placeholder="6XX XXX XXX"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard icon="map-pin" title="Office Location">
                <TwoCol>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="COUNTRY"
                      value={sellerForm.country}
                      onChangeText={setSeller('country')}
                      icon="globe"
                      placeholder="Cameroon"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="REGION"
                      value={sellerForm.region}
                      onChangeText={setSeller('region')}
                      icon="map"
                      placeholder="Centre"
                    />
                  </View>
                </TwoCol>
                <TwoCol>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="CITY"
                      value={sellerForm.city}
                      onChangeText={setSeller('city')}
                      icon="grid"
                      placeholder="Yaoundé"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="STREET"
                      value={sellerForm.street}
                      onChangeText={setSeller('street')}
                      icon="navigation"
                      placeholder="Bastos 102"
                    />
                  </View>
                </TwoCol>
              </SectionCard>
            </>
          )}

          {/* ══════════════ BUYER FORM ══════════════ */}
          {!isSeller && (
            <>
              <SectionCard icon="user" title="Personal Details">
                <EditField
                  label="FULL NAME"
                  value={buyerForm.name}
                  onChangeText={setBuyer('name')}
                  icon="user"
                  placeholder="e.g. Jane Doe"
                />
                <EditField
                  label="EMAIL ADDRESS"
                  value={buyerForm.email}
                  icon="mail"
                  editable={false}
                  hint="Email cannot be changed. Contact support if needed."
                />
                <View style={s.phoneRow}>
                  <View style={s.phonePrefix}>
                    <Feather name="globe" size={13} color={TEXT_MID} />
                    <Text style={s.phonePrefixTxt}>+237</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="PHONE NUMBER"
                      value={buyerForm.phone}
                      onChangeText={setBuyer('phone')}
                      icon="phone"
                      placeholder="6XX XXX XXX"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard icon="map-pin" title="Location Details">
                <TwoCol>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="COUNTRY"
                      value={buyerForm.country}
                      onChangeText={setBuyer('country')}
                      icon="globe"
                      placeholder="Cameroon"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="REGION"
                      value={buyerForm.region}
                      onChangeText={setBuyer('region')}
                      icon="map"
                      placeholder="Littoral"
                    />
                  </View>
                </TwoCol>
                <TwoCol>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="CITY"
                      value={buyerForm.city}
                      onChangeText={setBuyer('city')}
                      icon="grid"
                      placeholder="Douala"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label="STREET NAME"
                      value={buyerForm.street}
                      onChangeText={setBuyer('street')}
                      icon="navigation"
                      placeholder="Street 1024"
                    />
                  </View>
                </TwoCol>
              </SectionCard>
            </>
          )}

          {/* ── Password Change Note ── */}
          <View style={s.passwordNote}>
            <Feather name="lock" size={14} color={PURPLE} />
            <View style={{ flex: 1 }}>
              <Text style={s.passwordNoteTitle}>Want to change your password?</Text>
              <Text style={s.passwordNoteSub}>
                For security reasons, password changes require email verification. Contact{' '}
                <Text style={s.passwordNoteLink}>support@sweetcasa.cm</Text>
              </Text>
            </View>
          </View>

          {/* ── Success Banner ── */}
          {saved && (
            <View style={s.successBanner}>
              <Feather name="check-circle" size={16} color={GREEN} />
              <Text style={s.successTxt}>Changes saved successfully!</Text>
            </View>
          )}

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Feather name="save" size={17} color={WHITE} />
                <Text style={s.saveBtnTxt}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: GRAY_BG },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: GRAY_BG },
  scroll:      { paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: H_PAD, paddingVertical: 12,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK, letterSpacing: -0.2 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },

  // Role Banner
  roleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  roleBannerSeller: { backgroundColor: '#FFF8F0', borderColor: '#FDE68A' },
  roleBannerBuyer:  { backgroundColor: PURPLE_MID, borderColor: '#DDD6FE' },
  roleIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  roleIconSeller: { backgroundColor: '#D97706' },
  roleIconBuyer:  { backgroundColor: PURPLE },
  roleTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 2 },
  roleSub:   { fontSize: 12, color: TEXT_MID, lineHeight: 17 },

  // Section Card
  sectionCard: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sectionIconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },

  // Fields
  fieldGroup: { marginBottom: 12 },
  regLabel: {
    fontSize: 10.5, fontWeight: '700', color: TEXT_LIGHT,
    letterSpacing: 0.8, marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: GRAY_BORDER,
    borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12,
  },
  inputWrapDisabled: {
    backgroundColor: '#F9FAFB', borderColor: '#E5E7EB',
  },
  fieldInput: {
    flex: 1, fontSize: 14, color: TEXT_DARK, padding: 0,
  },
  fieldInputDisabled: { color: '#9CA3AF' },
  fieldHint: {
    fontSize: 11, color: TEXT_LIGHT, marginTop: 4,
    fontStyle: 'italic', paddingLeft: 2,
  },
  twoCol: { flexDirection: 'row', gap: 10 },

  // Phone
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: GRAY_BORDER,
    borderRadius: 13, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 12,
  },
  phonePrefixTxt: { fontSize: 13, fontWeight: '600', color: TEXT_MID },

  // Password note
  passwordNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: PURPLE_LIGHT, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: PURPLE_MID, marginBottom: 14,
  },
  passwordNoteTitle: { fontSize: 13, fontWeight: '700', color: PURPLE, marginBottom: 3 },
  passwordNoteSub:   { fontSize: 12, color: TEXT_MID, lineHeight: 18 },
  passwordNoteLink:  { color: PURPLE, fontWeight: '600' },

  // Success
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN_BORDER,
    borderRadius: 12, padding: 13, marginBottom: 14,
  },
  successTxt: { fontSize: 13, fontWeight: '600', color: GREEN },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PURPLE_DARK, borderRadius: 16, paddingVertical: 16,
    shadowColor: '#5B21B6', shadowOpacity: 0.35, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: WHITE, letterSpacing: -0.2 },
});