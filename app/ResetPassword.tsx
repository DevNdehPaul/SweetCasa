import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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

const H_PAD = 20;
const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#F0EBFF";

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
function WebAlertHost() {
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
      <View style={webAlertStyles.backdrop}>
        <View style={webAlertStyles.card}>
          <Text style={webAlertStyles.title}>{state.title}</Text>
          {!!state.message && (
            <Text style={webAlertStyles.message}>{state.message}</Text>
          )}
          <View style={webAlertStyles.btnRow}>
            {state.buttons.map((b, i) => (
              <TouchableOpacity
                key={`${b.text}-${i}`}
                onPress={() => handlePress(b)}
                style={[
                  webAlertStyles.btn,
                  b.style === "cancel" && webAlertStyles.btnCancel,
                  b.style === "destructive" && webAlertStyles.btnDestructive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    webAlertStyles.btnTxt,
                    b.style === "cancel" && webAlertStyles.btnTxtCancel,
                    b.style === "destructive" &&
                      webAlertStyles.btnTxtDestructive,
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

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = String(params.token || "");
  const email = String(params.email || "");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  useEffect(() => {
    if (!token) setInvalidToken(true);
  }, [token]);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      crossAlert(
        "Missing Fields",
        "Please enter and confirm your new password.",
      );
      return;
    }
    if (password.length < 8) {
      crossAlert(
        "Weak Password",
        "Password must be at least 8 characters long.",
      );
      return;
    }
    if (password !== confirmPassword) {
      crossAlert(
        "Password Mismatch",
        "The passwords you entered do not match.",
      );
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        "Failed to reset your password. Please try again.";
      crossAlert("Reset Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7FB" />
      <WebAlertHost />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={22} color="#111827" />
          </TouchableOpacity>

          {invalidToken ? (
            // ── Missing/invalid token ────────────────────────────────────────
            <View style={styles.centerWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={38}
                  color="#D97706"
                />
              </View>
              <Text style={styles.centerTitle}>Invalid Reset Link</Text>
              <Text style={styles.centerDesc}>
                This password reset link is invalid or incomplete. Please
                request a new one from the login screen.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace("/ForgotPassword")}
              >
                <Text style={styles.primaryBtnTxt}>Request New Link</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : done ? (
            // ── Success state ────────────────────────────────────────────────
            <View style={styles.centerWrap}>
              <View style={[styles.iconWrap, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={38}
                  color="#16A34A"
                />
              </View>
              <Text style={styles.centerTitle}>Password Updated</Text>
              <Text style={styles.centerDesc}>
                Your password has been reset successfully. You can now log in
                with your new password.
              </Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace(`/portal`)}
              >
                <Text style={styles.primaryBtnTxt}>Back to Login</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            // ── Reset form ───────────────────────────────────────────────────
            <>
              <View style={styles.hero}>
                <View style={styles.shieldWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={30}
                    color="#7C3AED"
                  />
                </View>
                <Text style={styles.heroTitle}>Set a New Password</Text>
                <Text style={styles.heroDesc}>
                  {email ? (
                    <>
                      Creating a new password for{" "}
                      <Text style={{ fontWeight: "700", color: "#7C3AED" }}>
                        {email}
                      </Text>
                      .
                    </>
                  ) : (
                    "Choose a strong, new password for your account."
                  )}
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={15} color="#9CA3AF" />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={15}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={15} color="#9CA3AF" />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Repeat your new password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                    <Feather
                      name={showConfirm ? "eye-off" : "eye"}
                      size={15}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.strengthHint}>
                <Feather
                  name="info"
                  size={13}
                  color="#9CA3AF"
                  style={{ marginTop: 2 }}
                />
                <Text style={styles.strengthTxt}>
                  Use at least 8 characters with a mix of letters, numbers, and
                  symbols.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  loading && styles.primaryBtnDisabled,
                ]}
                disabled={loading}
                onPress={handleSubmit}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnTxt}>Reset Password</Text>
                    <Feather name="arrow-right" size={17} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7FB" },
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
    backgroundColor: PURPLE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  hero: { alignItems: "center", marginBottom: 28 },
  shieldWrap: {
    width: 64,
    height: 64,
    backgroundColor: "#F5F3FF",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: PURPLE,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  heroDesc: {
    fontSize: 13.5,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
  },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  fieldInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },
  strengthHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  strengthTxt: { flex: 1, fontSize: 12, color: "#6B7280", lineHeight: 18 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6D28D9",
    borderRadius: 18,
    paddingVertical: 17,
    marginBottom: 20,
    shadowColor: "#5B21B6",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  primaryBtnTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  centerWrap: { alignItems: "center", paddingTop: 40 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  centerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  centerDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
});

// ─── Web Alert Modal Styles ───────────────────────────────────────────────────
const webAlertStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  message: { fontSize: 13.5, color: "#4B5563", lineHeight: 20, marginBottom: 18 },
  btnRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  btn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: "#6D28D9" },
  btnCancel: { backgroundColor: "#F3F4F6" },
  btnDestructive: { backgroundColor: "#DC2626" },
  btnTxt: { fontSize: 13.5, fontWeight: "700", color: "#fff" },
  btnTxtCancel: { color: "#374151" },
  btnTxtDestructive: { color: "#fff" },
});
