import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
      onPress={() => item.onPress?.()}
    >
      <View style={[styles.menuIconBox, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon as any} size={16} color={item.iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, item.danger && { color: "#EF4444" }]}>
          {item.label}
        </Text>
        <Text style={styles.menuSub}>{item.sub}</Text>
      </View>
      <Feather name="chevron-right" size={16} color="#CECECE" />
    </Pressable>
  );
}

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <View style={styles.menuGroup}>
      {items.map((item, index) => (
        <View key={item.id}>
          <MenuRow item={item} />
          {index < items.length - 1 && <View style={styles.menuDivider} />}
        </View>
      ))}
    </View>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  const isSeller = role === "SELLER";

  const fullName = isSeller
    ? profile?.companyName || profile?.name || "SweetCasa User"
    : profile?.fullName || profile?.name || "SweetCasa User";

  const locationStr =
    [profile?.city, profile?.region, profile?.country]
      .filter(Boolean)
      .join(", ") || t("profile.locationNotSet");

  // Current language label for the subtitle
  const langSubtitle =
    i18n.language === "fr"
      ? t("profile.appLanguageSub") // "Français (Cameroun)"
      : "English (Cameroon)";

  const MENU_GROUP_1: MenuItem[] = [
    {
      id: "account",
      icon: "user",
      label: t("profile.accountInfo"),
      sub: t("profile.accountInfoSub"),
      iconBg: "#F3F0FF",
      iconColor: "#7C3AED",
      onPress: () => router.push("/AccountInformation"),
    },
    {
      id: "favourites",
      icon: "heart",
      label: t("profile.favourites"),
      sub: t("profile.favouritesSub"),
      iconBg: "#FFF1F1",
      iconColor: "#EF4444",
      onPress: () => router.push("/favourites"),
    },
    {
      id: "history",
      icon: "rotate-ccw",
      label: t("profile.transactionHistory"),
      sub: t("profile.transactionHistorySub"),
      iconBg: "#F3F0FF",
      iconColor: "#7C3AED",
    },
  ];

  const MENU_GROUP_2: MenuItem[] = [
    {
      id: "terms",
      icon: "file-text",
      label: t("profile.terms"),
      sub: t("profile.termsSub"),
      iconBg: "#F3F0FF",
      iconColor: "#7C3AED",
      onPress: () =>
        router.push(isSeller ? "/TermsOwnerRead" : "/TermsSeekerRead"),
    },
    {
      id: "language",
      icon: "globe",
      label: t("profile.appLanguage"),
      sub: langSubtitle, // ← shows current language dynamically
      iconBg: "#F3F0FF",
      iconColor: "#7C3AED",
      onPress: () => setLanguageModalVisible(true), // ← opens the modal
    },
  ];

  const MENU_GROUP_3: MenuItem[] = [
    {
      id: "logout",
      icon: "log-out",
      label: t("auth.logout"),
      sub: t("auth.logoutSub"),
      danger: true,
      iconBg: "#FFF1F1",
      iconColor: "#EF4444",
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Language Modal */}
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
          <Feather name="settings" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
            </View>
          </View>

          {isSeller && <Text style={styles.userName}>{profile?.name}</Text>}
          <Text style={styles.profileName}>{fullName}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#A0A0A0" />
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
            <Feather name="edit-2" size={13} color="#7C3AED" />
            <Text style={styles.editBtnTxt}>{t("profile.editProfile")}</Text>
          </TouchableOpacity>
        </View>

        {/* Agent Mode Banner — only for buyers */}
        {!isSeller && (
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
            <Feather name="chevron-right" size={18} color="#7C3AED" />
          </TouchableOpacity>
        )}

        <MenuGroup items={MENU_GROUP_1} />
        <MenuGroup items={MENU_GROUP_2} />
        <MenuGroup items={MENU_GROUP_3} />

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { paddingBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
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
    backgroundColor: "#FDF9F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#fff",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  userName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  locationTxt: { fontSize: 12.5, color: "#A0A0A0" },
  badgeChip: {
    backgroundColor: "#EDE9FE",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  badgeChipTxt: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  badgeChipSeller: { backgroundColor: "#FFF3E0" },
  badgeChipTxtSeller: { color: "#D97706" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  editBtnTxt: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  agentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: H_PAD,
    marginTop: 24,
    marginBottom: 8,
    backgroundColor: "#F3F0FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  agentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  agentBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 2,
  },
  agentBannerSub: { fontSize: 11.5, color: "#A78BFA" },
  menuGroup: {
    marginHorizontal: H_PAD,
    marginTop: 14,
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
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
    color: "#111",
    marginBottom: 1,
  },
  menuSub: { fontSize: 11.5, color: "#B0B0B0" },
  menuDivider: { height: 1, backgroundColor: "#F0F0F0", marginLeft: 68 },
  footer: { alignItems: "center", paddingTop: 28, gap: 8 },
  footerVersion: { fontSize: 11.5, color: "#C0C0C0" },
  footerLinks: { flexDirection: "row", gap: 20 },
  footerLink: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
});
