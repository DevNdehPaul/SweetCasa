import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
} from "react-native";
import api from "../constants/api";
import { ThemeColors } from "../constants/theme";
import { useAppTheme } from "../hooks/use-app-theme";

const H_PAD = 20;

// White text sitting directly on a solid-color button (primary CTA, alert
// buttons) stays hardcoded — the swatch itself doesn't change between
// light/dark, so the text on it shouldn't either.
const WHITE = "#FFFFFF";

type Styles = ReturnType<typeof getStyles>;
type WebAlertStyles = ReturnType<typeof getWebAlertStyles>;

// ─── Cross-platform Alert ─────────────────────────────────────────────────────
// Alert.alert is a no-op on React Native Web — it just logs to console and
// returns, showing nothing to the user. crossAlert() falls back to Alert.alert
// on native, and to a real Modal dialog (via WebAlertHost below) on web.
type CrossAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type WebAlertState = {
  visible: boolean;
  title: string;
  message: string;
  buttons: CrossAlertButton[];
};

let _setWebAlertState: ((s: WebAlertState) => void) | null = null;

function crossAlert(
  title: string,
  message?: string,
  buttons: CrossAlertButton[] = [{ text: "OK" }],
) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons as any);
    return;
  }
  if (_setWebAlertState) {
    _setWebAlertState({
      visible: true,
      title,
      message: message ?? "",
      buttons,
    });
  } else {
    // Extremely defensive fallback in case the host hasn't mounted yet.
    window.alert(message ? `${title}\n\n${message}` : title);
  }
}

// Mount once near the root of the screen. Renders nothing on native.
// Calls useAppTheme() itself (rather than taking colors/s as props) since it's
// a self-contained singleton host mounted independently of the form below.
function WebAlertHost() {
  const { colors } = useAppTheme();
  const ws = useMemo(() => getWebAlertStyles(colors), [colors]);

  const [state, setState] = useState<WebAlertState>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  useEffect(() => {
    _setWebAlertState = setState;
    return () => {
      _setWebAlertState = null;
    };
  }, []);

  if (Platform.OS !== "web") return null;

  const handlePress = (btn?: CrossAlertButton) => {
    setState((s) => ({ ...s, visible: false }));
    btn?.onPress?.();
  };

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={() => handlePress()}
    >
      <View style={ws.backdrop}>
        <View style={ws.card}>
          <Text style={ws.title}>{state.title}</Text>
          {!!state.message && (
            <Text style={ws.message}>{state.message}</Text>
          )}
          <View style={ws.btnRow}>
            {state.buttons.map((b, i) => (
              <TouchableOpacity
                key={`${b.text}-${i}`}
                onPress={() => handlePress(b)}
                style={[
                  ws.btn,
                  b.style === "cancel" && ws.btnCancel,
                  b.style === "destructive" && ws.btnDestructive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    ws.btnTxt,
                    b.style === "cancel" && ws.btnTxtCancel,
                    b.style === "destructive" &&
                      ws.btnTxtDestructive,
                  ]}
                >
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

export default function ForgotPasswordScreen() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      crossAlert("Missing Email", "Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      crossAlert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        "Failed to send reset email. Please try again.";
      crossAlert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <WebAlertHost />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.backBtn}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          {sent ? (
            // ── Success state ────────────────────────────────────────────────
            <View style={s.successWrap}>
              <View style={s.successIcon}>
                <Ionicons name="mail-open-outline" size={40} color={colors.primary} />
              </View>
              <Text style={s.successTitle}>Check your inbox</Text>
              <Text style={s.successDesc}>
                If an account exists for{" "}
                <Text style={s.successEmail}>{email.trim()}</Text>, we've
                sent you a link to reset your password. The link expires in 30
                minutes.
              </Text>
              <View style={s.successTip}>
                <Feather
                  name="info"
                  size={13}
                  color={colors.textLight}
                  style={{ marginTop: 2 }}
                />
                <Text style={s.successTipTxt}>
                  Don't see the email? Check your spam or junk folder.
                </Text>
              </View>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => router.back()}
                activeOpacity={0.88}
              >
                <Text style={s.primaryBtnTxt}>Back to Login</Text>
                <Feather name="arrow-right" size={16} color={WHITE} />
              </TouchableOpacity>
            </View>
          ) : (
            // ── Form state ───────────────────────────────────────────────────
            <>
              <View style={s.hero}>
                <View style={s.shieldWrap}>
                  <Ionicons name="key-outline" size={30} color={colors.primary} />
                </View>
                <Text style={s.heroTitle}>Forgot Password?</Text>
                <Text style={s.heroDesc}>
                  No worries. Enter the email address you registered with and
                  we'll send you a link to reset your password.
                </Text>
              </View>

              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Email Address</Text>
                <View style={s.inputWrap}>
                  <Feather name="mail" size={15} color={colors.textLight} />
                  <TextInput
                    style={s.fieldInput}
                    placeholder="e.g. john@example.com"
                    placeholderTextColor={colors.textLight}
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
                style={[
                  s.primaryBtn,
                  loading && s.primaryBtnDisabled,
                ]}
                disabled={loading}
                onPress={handleSubmit}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <>
                    <Text style={s.primaryBtnTxt}>Send Reset Link</Text>
                    <Feather name="arrow-right" size={17} color={WHITE} />
                  </>
                )}
              </TouchableOpacity>

              <View style={s.helpCard}>
                <Feather
                  name="shield"
                  size={13}
                  color={colors.primary}
                  style={{ marginTop: 2 }}
                />
                <Text style={s.helpText}>
                  <Text style={{ fontWeight: "700", color: colors.primary }}>
                    Tip:{" "}
                  </Text>
                  The reset link is single-use and expires after 30 minutes for
                  your security.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      paddingHorizontal: H_PAD,
      paddingTop: 20,
      paddingBottom: 40,
      flexGrow: 1,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    hero: { alignItems: "center", marginBottom: 28 },
    shieldWrap: {
      width: 64,
      height: 64,
      backgroundColor: colors.primaryTintAlt,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.4,
    },
    heroDesc: {
      fontSize: 13.5,
      color: colors.textLight,
      textAlign: "center",
      lineHeight: 21,
      maxWidth: 320,
    },
    fieldGroup: { marginBottom: 18 },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    fieldInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.primaryDark,
      borderRadius: 18,
      paddingVertical: 17,
      marginBottom: 20,
      shadowColor: colors.primaryDarker,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
    primaryBtnTxt: {
      fontSize: 15,
      fontWeight: "700",
      color: WHITE,
      letterSpacing: -0.2,
    },
    helpCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.cardMuted,
      borderRadius: 12,
      padding: 12,
    },
    helpText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    successWrap: { alignItems: "center", paddingTop: 40 },
    successIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.primaryTintAlt,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    successTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    successDesc: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 18,
      maxWidth: 320,
    },
    successEmail: { fontWeight: "700", color: colors.primary },
    successTip: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: colors.cardMuted,
      borderRadius: 12,
      padding: 12,
      marginBottom: 24,
    },
    successTipTxt: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  });
}

// ─── Web Alert Modal Styles ───────────────────────────────────────────────────
function getWebAlertStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    title: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
    message: {
      fontSize: 13.5,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 18,
    },
    btnRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      flexWrap: "wrap",
    },
    btn: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.primaryDark,
    },
    btnCancel: { backgroundColor: colors.divider },
    btnDestructive: { backgroundColor: colors.danger },
    btnTxt: { fontSize: 13.5, fontWeight: "700", color: WHITE },
    btnTxtCancel: { color: colors.textSecondary },
    btnTxtDestructive: { color: WHITE },
  });
}