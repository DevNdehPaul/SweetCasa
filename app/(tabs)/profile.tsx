import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LanguageModal from "../../components/LanguageModal"; // adjust path if needed
import { clearAuthSession } from "../../constants/auth";
import { ThemeColors } from "../../constants/theme";
import { useAppTheme } from "../../hooks/use-app-theme";

const H_PAD = 20;

type MenuItem = {
  id: string;
  icon: string;
  label: string;
  sub: string;
  danger?: boolean;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
};

function MenuRow({ item, colors, styles }: { item: MenuItem; colors: ThemeColors; styles: ReturnType<typeof getStyles> }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
      onPress={() => item.onPress?.()}
    >
      <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon as any} size={16} color={item.iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, item.danger && { color: colors.danger }]}>
          {item.label}
        </Text>
        <Text style={styles.menuSub}>{item.sub}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.textLight} />
    </Pressable>
  );
}

function MenuGroup({ items, colors, styles }: { items: MenuItem[]; colors: ThemeColors; styles: ReturnType<typeof getStyles> }) {
  if (!items.length) return null;
  return (
    <View style={styles.menuGroup}>
      {items.map((item, index) => (
        <View key={item.id}>
          <MenuRow item={item} colors={colors} styles={styles} />
          {index < items.length - 1 && <View style={styles.menuDivider} />}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, []),
  );

  const loadUserData = async () => {
    try {
      const [storedProfile, storedRole] = await Promise.all([
        AsyncStorage.getItem("profile"),
        AsyncStorage.getItem("role"),
      ]);
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      if (storedRole) setRole(storedRole);
    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    router.replace("/portal");
  };

  const handleSupport = async () => {
    try {
      await Linking.openURL(
        "mailto:support@sweetcasa.cm?subject=SweetCasa%20Support",
      );
    } catch {
      // Keep the footer functional even if the mail client is unavailable.
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isSeller = role === "SELLER";

  const fullName = isSeller
    ? profile?.companyName || profile?.name || "SweetCasa User"
    : profile?.fullName || profile?.name || "SweetCasa User";

  const avatarUrl = profile?.avatarUrl || profile?.avatar || "";
  const initials = String(fullName || "SC")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SC";

  const locationStr =
    [profile?.city, profile?.region, profile?.country]
      .filter(Boolean)
      .join(", ") || t("profile.locationNotSet");

  const langSubtitle =
    i18n.language === "fr"
      ? t("profile.appLanguageSub")
      : "English (Cameroon)";

  const MENU_GROUP_1: MenuItem[] = [
    {
      id: "account",
      icon: "user",
      label: t("profile.accountInfo"),
      sub: t("profile.accountInfoSub"),
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () => router.push("/AccountInformation"),
    },
    ...(!isSeller
      ? [
          {
            id: "favourites",
            icon: "heart",
            label: t("profile.favourites"),
            sub: t("profile.favouritesSub"),
            iconBg: "#FFF1F1", // danger tint — no matching token yet
            iconColor: colors.danger,
            onPress: () => router.push("/favourites"),
          } as MenuItem,
        ]
      : []),
  ];

  const MENU_GROUP_2: MenuItem[] = [
    {
      id: "terms",
      icon: "file-text",
      label: t("profile.terms"),
      sub: t("profile.termsSub"),
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () =>
        router.push(isSeller ? "/TermsOwnerRead" : "/TermsSeekerRead"),
    },
    {
      id: "language",
      icon: "globe",
      label: t("profile.appLanguage"),
      sub: langSubtitle,
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () => setLanguageModalVisible(true),
    },
  ];

  const MENU_GROUP_3: MenuItem[] = [
    {
      id: "logout",
      icon: "log-out",
      label: t("auth.logout"),
      sub: t("auth.logoutSub"),
      danger: true,
      iconBg: "#FFF1F1", // danger tint — no matching token yet
      iconColor: colors.danger,
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push("/settings")}
        >
          <Feather name="settings" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          </View>

          {isSeller && <Text style={styles.userName}>{profile?.name}</Text>}
          <Text style={styles.profileName}>{fullName}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.locationTxt}>{locationStr}</Text>
          </View>

          <View style={[styles.badgeChip, isSeller && styles.badgeChipSeller]}>
            <Text
              style={[
                styles.badgeChipTxt,
                isSeller && styles.badgeChipTxtSeller,
              ]}
            >
              {isSeller ? t("profile.houseOwner") : t("profile.houseSeeker")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/AccountInformation")}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={13} color={colors.primary} />
            <Text style={styles.editBtnTxt}>{t("profile.editProfile")}</Text>
          </TouchableOpacity>
        </View>

        {/* Agent Mode Banner — only for buyers */}
        {/* {!isSeller && (
          <TouchableOpacity style={styles.agentBanner} activeOpacity={0.85}>
            <View style={styles.agentIconWrap}>
              <Ionicons name="flash" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.agentBannerTitle}>
                {t("profile.agentMode")}
              </Text>
              <Text style={styles.agentBannerSub}>
                {t("profile.agentModeSub")}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        )} */}

        <MenuGroup items={MENU_GROUP_1} colors={colors} styles={styles} />
        <MenuGroup items={MENU_GROUP_2} colors={colors} styles={styles} />
        <MenuGroup items={MENU_GROUP_3} colors={colors} styles={styles} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>{t("common.version")}</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity
              onPress={() =>
                router.push(isSeller ? "/PrivacyOwner" : "/PrivacySeeker")
              }
            >
              <Text style={styles.footerLink}>
                {t("profile.privacyPolicy")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSupport}>
              <Text style={styles.footerLink}>
                {t("profile.supportCenter")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.card },
    scroll: { paddingBottom: 16 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: H_PAD,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.2,
    },
    iconBtn: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    heroSection: {
      alignItems: "center",
      paddingTop: 28,
      paddingBottom: 24,
      backgroundColor: colors.cardMuted, // was #FDF9F6, warm off-white — closest token
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    avatarWrap: { position: "relative", marginBottom: 12 },
    avatar: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 3,
      borderColor: colors.card,
    },
    avatarPlaceholder: {
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary,
    },
    verifiedBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: 5,
    },
    userName: {
      fontSize: 25,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: 5,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginBottom: 10,
    },
    locationTxt: { fontSize: 12.5, color: colors.textMuted },
    badgeChip: {
      backgroundColor: colors.primaryBorder,
      borderRadius: 30,
      paddingHorizontal: 14,
      paddingVertical: 5,
      marginBottom: 12,
    },
    badgeChipTxt: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    badgeChipSeller: { backgroundColor: "#FFF3E0" }, // seller-badge tint — no matching token yet
    badgeChipTxtSeller: { color: colors.warning },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 30,
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    editBtnTxt: { fontSize: 13, fontWeight: "700", color: colors.primary },
    agentBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginHorizontal: H_PAD,
      marginTop: 24,
      marginBottom: 8,
      backgroundColor: colors.primaryTint,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    agentIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    agentBannerTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
      marginBottom: 2,
    },
    agentBannerSub: { fontSize: 11.5, color: "#A78BFA" }, // light-purple subtext — no matching token yet
    menuGroup: {
      marginHorizontal: H_PAD,
      marginTop: 14,
      backgroundColor: colors.cardMuted,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: "hidden",
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuIconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    menuText: { flex: 1 },
    menuLabel: {
      fontSize: 13.5,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 1,
    },
    menuSub: { fontSize: 11.5, color: colors.textLight },
    menuDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 68 },
    footer: { alignItems: "center", paddingTop: 28, gap: 8 },
    footerVersion: { fontSize: 11.5, color: colors.textLight },
    footerLinks: { flexDirection: "row", gap: 20 },
    footerLink: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  });
}
