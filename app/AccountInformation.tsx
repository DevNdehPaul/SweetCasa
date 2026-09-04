import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
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
} from "react-native";
import api, { uploadWithFetch } from "../constants/api";
import { ThemeColors } from "../constants/theme";
import { useAppTheme } from "../hooks/use-app-theme";

// Text sitting directly on a solid-color button/icon (e.g. white on purple)
// stays hardcoded — it's correct in both themes since the swatch itself
// doesn't change between light/dark.
const WHITE = "#FFFFFF";

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

type SelectedAvatar = {
  uri: string;
  name: string;
  mimeType: string;
};

function resolveAvatarUrl(profile: any) {
  return profile?.avatarUrl || profile?.avatar || "";
}

function inferImageMimeType(uri: string, fallback = "image/jpeg") {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return fallback;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
// These live outside the main component, so styles/colors are passed down as
// props rather than each one calling useAppTheme() itself.

type Styles = ReturnType<typeof getStyles>;

function SectionCard({
  icon,
  title,
  children,
  colors,
  s,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
  s: Styles;
}) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconBox}>
          <Feather name={icon as any} size={14} color={colors.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function RegLabel({ children, s }: { children: string; s: Styles }) {
  return <Text style={s.regLabel}>{children}</Text>;
}

function EditField({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  keyboardType,
  editable = true,
  hint,
  colors,
  s,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  icon: string;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
  hint?: string;
  colors: ThemeColors;
  s: Styles;
}) {
  return (
    <View style={s.fieldGroup}>
      <RegLabel s={s}>{label}</RegLabel>
      <View style={[s.inputWrap, !editable && s.inputWrapDisabled]}>
        <Feather
          name={icon as any}
          size={14}
          color={editable ? colors.textLight : colors.border}
        />
        <TextInput
          style={[s.fieldInput, !editable && s.fieldInputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "—"}
          placeholderTextColor={colors.textLight}
          keyboardType={keyboardType}
          autoCapitalize="none"
          editable={editable}
        />
        {!editable && <Feather name="lock" size={12} color={colors.border} />}
      </View>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
    </View>
  );
}

function TwoCol({ children, s }: { children: React.ReactNode; s: Styles }) {
  return <View style={s.twoCol}>{children}</View>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AccountInformation() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<SelectedAvatar | null>(null);

  // Seller form
  const [sellerForm, setSellerForm] = useState<SellerForm>({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    country: "",
    region: "",
    city: "",
    street: "",
  });

  // Buyer form
  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    name: "",
    email: "",
    phone: "",
    country: "",
    region: "",
    city: "",
    street: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rawProfile, rawRole] = await Promise.all([
        AsyncStorage.getItem("profile"),
        AsyncStorage.getItem("role"),
      ]);
      const profile = rawProfile ? JSON.parse(rawProfile) : {};
      setRole(rawRole);
      setAvatarUrl(resolveAvatarUrl(profile));

      if (rawRole === "SELLER") {
        setSellerForm({
          name: profile.name || "",
          companyName: profile.companyName || "",
          email: profile.email || "",
          phone: profile.phone ? String(profile.phone) : "",
          country: profile.country || "",
          region: profile.region || "",
          city: profile.city || "",
          street: profile.street || "",
        });
      } else {
        setBuyerForm({
          name: profile.fullName || profile.name || "",
          email: profile.email || "",
          phone: profile.phone ? String(profile.phone) : "",
          country: profile.country || "",
          region: profile.region || "",
          city: profile.city || "",
          street: profile.street || "",
        });
      }
    } catch (e) {
      console.error("Failed to load profile data:", e);
    } finally {
      setLoading(false);
    }
  };

  const setSeller = (k: keyof SellerForm) => (v: string) =>
    setSellerForm((p) => ({ ...p, [k]: v }));

  const setBuyer = (k: keyof BuyerForm) => (v: string) =>
    setBuyerForm((p) => ({ ...p, [k]: v }));

  const initials = useMemo(() => {
    const name =
      role === "SELLER"
        ? sellerForm.companyName || sellerForm.name
        : buyerForm.name;
    return (
      String(name || "SC")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "SC"
    );
  }, [buyerForm.name, role, sellerForm.companyName, sellerForm.name]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to choose a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || inferImageMimeType(asset.uri);
    setAvatarFile({
      uri: asset.uri,
      name:
        asset.fileName || `profile-photo.${mimeType.split("/")[1] || "jpg"}`,
      mimeType,
    });
    setAvatarUrl(asset.uri);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload =
        role === "SELLER"
          ? {
              name: sellerForm.name.trim(),
              companyName: sellerForm.companyName.trim(),
              phone: sellerForm.phone.trim(),
              country: sellerForm.country.trim(),
              region: sellerForm.region.trim(),
              city: sellerForm.city.trim(),
              street: sellerForm.street.trim(),
            }
          : {
              name: buyerForm.name.trim(),
              phone: buyerForm.phone.trim(),
              country: buyerForm.country.trim(),
              region: buyerForm.region.trim(),
              city: buyerForm.city.trim(),
              street: buyerForm.street.trim(),
            };

      let res;
      if (avatarFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, String(value ?? ""));
        });
        formData.append("avatar", {
          uri: avatarFile.uri,
          name: avatarFile.name,
          type: avatarFile.mimeType,
        } as any);

        res = await uploadWithFetch("/auth/profile", formData, "PUT");
      } else {
        res = await api.put("/auth/profile", payload);
      }

      // Update local storage with new profile
      const updatedProfile = res.data?.profile || res.data;
      const raw = await AsyncStorage.getItem("profile");
      const current = raw ? JSON.parse(raw) : {};
      const nextProfile = { ...current, ...updatedProfile };
      await AsyncStorage.setItem("profile", JSON.stringify(nextProfile));
      setAvatarUrl(resolveAvatarUrl(nextProfile) || avatarUrl);
      setAvatarFile(null);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.error || t("errors.serverError");
      Alert.alert(t("account.saveFailed"), msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isSeller = role === "SELLER";

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.card}
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("account.title")}</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Role Banner ── */}
          <View style={s.avatarCard}>
            <View style={s.avatarPreviewWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarPreview} />
              ) : (
                <View style={[s.avatarPreview, s.avatarPlaceholder]}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.avatarBadge}>
                <Feather name="camera" size={13} color={colors.primary} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.avatarTitle}>{t("profile.editProfile")}</Text>
              <Text style={s.avatarSub}>
                {avatarFile
                  ? "New photo selected. Save to upload it."
                  : "Choose the photo shown on your profile."}
              </Text>
            </View>
            <TouchableOpacity
              style={s.avatarBtn}
              onPress={pickAvatar}
              activeOpacity={0.8}
            >
              <Feather name="image" size={14} color={colors.primary} />
              <Text style={s.avatarBtnTxt}>Change</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              s.roleBanner,
              isSeller ? s.roleBannerSeller : s.roleBannerBuyer,
            ]}
          >
            <View
              style={[
                s.roleIconWrap,
                isSeller ? s.roleIconSeller : s.roleIconBuyer,
              ]}
            >
              <Ionicons
                name={isSeller ? "business-outline" : "search-outline"}
                size={18}
                color={WHITE}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.roleTitle}>
                {isSeller
                  ? t("account.ownerAccount")
                  : t("account.seekerAccount")}
              </Text>
              <Text style={s.roleSub}>
                {isSeller
                  ? t("account.ownerAccountSub")
                  : t("account.seekerAccountSub")}
              </Text>
            </View>
          </View>

          {/* ══════════════ SELLER FORM ══════════════ */}
          {isSeller && (
            <>
              <SectionCard
                icon="briefcase"
                title={t("account.businessIdentity")}
                colors={colors}
                s={s}
              >
                <EditField
                  label={t("account.fullName")}
                  value={sellerForm.name}
                  onChangeText={setSeller("name")}
                  icon="user"
                  placeholder="e.g. John Doe"
                  colors={colors}
                  s={s}
                />
                <EditField
                  label={t("account.companyName")}
                  value={sellerForm.companyName}
                  onChangeText={setSeller("companyName")}
                  icon="briefcase"
                  placeholder="e.g. BlueSky Estates Ltd"
                  hint={t("account.companyNameHint")}
                  colors={colors}
                  s={s}
                />
                <EditField
                  label={t("account.emailAddress")}
                  value={sellerForm.email}
                  icon="mail"
                  editable={false}
                  hint={t("account.emailHint")}
                  colors={colors}
                  s={s}
                />
                <View style={s.phoneRow}>
                  <View style={s.phonePrefix}>
                    <Feather
                      name="globe"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={s.phonePrefixTxt}>+237</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.professionalPhone")}
                      value={sellerForm.phone}
                      onChangeText={setSeller("phone")}
                      icon="phone"
                      placeholder="6XX XXX XXX"
                      keyboardType="phone-pad"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard
                icon="map-pin"
                title={t("account.officeLocation")}
                colors={colors}
                s={s}
              >
                <TwoCol s={s}>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.country")}
                      value={sellerForm.country}
                      onChangeText={setSeller("country")}
                      icon="globe"
                      placeholder="Cameroon"
                      colors={colors}
                      s={s}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.region")}
                      value={sellerForm.region}
                      onChangeText={setSeller("region")}
                      icon="map"
                      placeholder="Centre"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </TwoCol>
                <TwoCol s={s}>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.city")}
                      value={sellerForm.city}
                      onChangeText={setSeller("city")}
                      icon="grid"
                      placeholder="Yaoundé"
                      colors={colors}
                      s={s}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.street")}
                      value={sellerForm.street}
                      onChangeText={setSeller("street")}
                      icon="navigation"
                      placeholder="Bastos 102"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </TwoCol>
              </SectionCard>
            </>
          )}

          {/* ══════════════ BUYER FORM ══════════════ */}
          {!isSeller && (
            <>
              <SectionCard
                icon="user"
                title={t("account.personalDetails")}
                colors={colors}
                s={s}
              >
                <EditField
                  label={t("account.fullName")}
                  value={buyerForm.name}
                  onChangeText={setBuyer("name")}
                  icon="user"
                  placeholder="e.g. Jane Doe"
                  colors={colors}
                  s={s}
                />
                <EditField
                  label={t("account.emailAddress")}
                  value={buyerForm.email}
                  icon="mail"
                  editable={false}
                  hint={t("account.emailHint")}
                  colors={colors}
                  s={s}
                />
                <View style={s.phoneRow}>
                  <View style={s.phonePrefix}>
                    <Feather
                      name="globe"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text style={s.phonePrefixTxt}>+237</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.phoneNumber")}
                      value={buyerForm.phone}
                      onChangeText={setBuyer("phone")}
                      icon="phone"
                      placeholder="6XX XXX XXX"
                      keyboardType="phone-pad"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </View>
              </SectionCard>

              <SectionCard
                icon="map-pin"
                title={t("account.locationDetails")}
                colors={colors}
                s={s}
              >
                <TwoCol s={s}>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.country")}
                      value={buyerForm.country}
                      onChangeText={setBuyer("country")}
                      icon="globe"
                      placeholder="Cameroon"
                      colors={colors}
                      s={s}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.region")}
                      value={buyerForm.region}
                      onChangeText={setBuyer("region")}
                      icon="map"
                      placeholder="Littoral"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </TwoCol>
                <TwoCol s={s}>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.city")}
                      value={buyerForm.city}
                      onChangeText={setBuyer("city")}
                      icon="grid"
                      placeholder="Douala"
                      colors={colors}
                      s={s}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <EditField
                      label={t("account.streetName")}
                      value={buyerForm.street}
                      onChangeText={setBuyer("street")}
                      icon="navigation"
                      placeholder="Street 1024"
                      colors={colors}
                      s={s}
                    />
                  </View>
                </TwoCol>
              </SectionCard>
            </>
          )}

          {/* ── Password Change Note ── */}
          <View style={s.passwordNote}>
            <Feather name="lock" size={14} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.passwordNoteTitle}>
                {t("account.passwordTitle")}
              </Text>
              <Text style={s.passwordNoteSub}>
                {t("account.passwordDesc")}{" "}
                <Text style={s.passwordNoteLink}>support@sweetcasa.cm</Text>
              </Text>
            </View>
          </View>

          {/* ── Success Banner ── */}
          {saved && (
            <View style={s.successBanner}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={s.successTxt}>{t("account.saveSuccess")}</Text>
            </View>
          )}

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Feather name="save" size={17} color={WHITE} />
                <Text style={s.saveBtnTxt}>{t("common.save")}</Text>
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
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    scroll: { paddingHorizontal: H_PAD, paddingTop: 16, paddingBottom: 20 },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: H_PAD,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },

    // Role Banner
    avatarCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    avatarPreviewWrap: { position: "relative" },
    avatarPreview: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 2,
      borderColor: colors.primaryBorder,
    },
    avatarPlaceholder: {
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: { fontSize: 20, fontWeight: "800", color: colors.primary },
    avatarBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    avatarTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 3,
    },
    avatarSub: { fontSize: 11.5, color: colors.textLight, lineHeight: 16 },
    avatarBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    avatarBtnTxt: { fontSize: 12.5, fontWeight: "700", color: colors.primary },

    roleBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    roleBannerSeller: {
      backgroundColor: colors.warningBg,
      borderColor: colors.warning + "55",
    },
    roleBannerBuyer: {
      backgroundColor: colors.primaryBorder,
      borderColor: colors.primarySoft,
    },
    roleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    roleIconSeller: { backgroundColor: colors.warning },
    roleIconBuyer: { backgroundColor: colors.primary },
    roleTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    roleSub: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

    // Section Card
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    sectionIconBox: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text },

    // Fields
    fieldGroup: { marginBottom: 12 },
    regLabel: {
      fontSize: 10.5,
      fontWeight: "700",
      color: colors.textLight,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputWrapDisabled: {
      backgroundColor: colors.cardMuted,
      borderColor: colors.border,
    },
    fieldInput: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      padding: 0,
    },
    fieldInputDisabled: { color: colors.textLight },
    fieldHint: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 4,
      fontStyle: "italic",
      paddingLeft: 2,
    },
    twoCol: { flexDirection: "row", gap: 10 },

    // Phone
    phoneRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    phonePrefix: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.divider,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 12,
    },
    phonePrefixTxt: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },

    // Password note
    passwordNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: colors.primaryTint,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      marginBottom: 14,
    },
    passwordNoteTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 3,
    },
    passwordNoteSub: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    passwordNoteLink: { color: colors.primary, fontWeight: "600" },

    // Success
    successBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.success + "55",
      borderRadius: 12,
      padding: 13,
      marginBottom: 14,
    },
    successTxt: { fontSize: 13, fontWeight: "600", color: colors.success },

    // Save button
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primaryDark,
      borderRadius: 16,
      paddingVertical: 16,
      shadowColor: colors.primaryDarker,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    saveBtnDisabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
    saveBtnTxt: {
      fontSize: 15,
      fontWeight: "700",
      color: WHITE,
      letterSpacing: -0.2,
    },
  });
}
