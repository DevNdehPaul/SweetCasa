import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LanguageModal from '../components/LanguageModal';
import { useThemePreference } from '../contexts/theme-preference';
import { useAppTheme } from '../hooks/use-app-theme';
import { ThemeColors } from '../constants/theme';

const H_PAD = 20;
const NOTIFICATION_KEY = 'sweetcasa_notifications_enabled';

type Role = 'SELLER' | 'BUYER' | null;

type SettingRow = {
  id: string;
  icon: string;
  label: string;
  sub: string;
  type: 'arrow' | 'toggle';
  onPress?: () => void;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
  iconBg: string;
  iconColor: string;
};

function Row({ row, s, colors }: { row: SettingRow; s: ReturnType<typeof getStyles>; colors: ThemeColors }) {
  const content = (
    <View style={s.rowContent}>
      <View style={[s.rowIcon, { backgroundColor: row.iconBg }]}>
        <Feather name={row.icon as any} size={16} color={row.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, row.danger && s.dangerLabel]}>{row.label}</Text>
        <Text style={s.rowSub}>{row.sub}</Text>
      </View>

      {row.type === 'toggle' ? (
        <Switch
          value={Boolean(row.toggleValue)}
          onValueChange={row.onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      ) : (
        <Feather name="chevron-right" size={16} color={colors.textLight} />
      )}
    </View>
  );

  if (!row.onPress && row.type !== 'toggle') {
    return <View style={s.row}>{content}</View>;
  }

  return (
    <TouchableOpacity style={s.row} activeOpacity={0.75} onPress={row.onPress}>
      {content}
    </TouchableOpacity>
  );
}

function Group({ label, rows, s, colors }: { label: string; rows: SettingRow[]; s: ReturnType<typeof getStyles>; colors: ThemeColors }) {
  return (
    <View style={s.group}>
      <Text style={s.groupLabel}>{label}</Text>
      <View style={s.groupCard}>
        {rows.map((row, index) => (
          <View key={row.id}>
            <Row row={row} s={s} colors={colors} />
            {index < rows.length - 1 && <View style={s.rowDivider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemePreference() ?? { theme: 'light' as const, setTheme: (_: 'light' | 'dark') => {} };
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [storedRole, storedNotifications] = await Promise.all([
          AsyncStorage.getItem('role'),
          AsyncStorage.getItem(NOTIFICATION_KEY),
        ]);

        if (!active) return;

        setRole(storedRole === 'SELLER' ? 'SELLER' : 'BUYER');
        if (storedNotifications === 'true' || storedNotifications === 'false') {
          setNotificationsEnabled(storedNotifications === 'true');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const isSeller = role === 'SELLER';
  const legalRoutes = {
    terms: isSeller ? '/TermsOwnerRead' : '/TermsSeekerRead',
    privacy: isSeller ? '/PrivacyOwner' : '/PrivacySeeker',
  } as const;

  const handleThemeToggle = async (enabled: boolean) => {
    setTheme(enabled ? 'dark' : 'light');
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    await AsyncStorage.setItem(NOTIFICATION_KEY, String(enabled));
  };

  const handleSupport = async () => {
    try {
      const url = 'mailto:support@sweetcasa.cm?subject=SweetCasa%20Support';
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error('Mail client unavailable');
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.support'), 'support@sweetcasa.cm');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const accountRows: SettingRow[] = [
    {
      id: 'account',
      icon: 'user',
      label: t('settings.accountManagement'),
      sub: t('settings.accountManagementSub'),
      type: 'arrow',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () => router.push('/AccountInformation'),
    },
    {
      id: 'support',
      icon: 'help-circle',
      label: t('settings.support'),
      sub: t('settings.supportSub'),
      type: 'arrow',
      iconBg: isDark ? '#1E293B' : '#EFF6FF',
      iconColor: '#2563EB',
      onPress: handleSupport,
    },
  ];

  const prefRows: SettingRow[] = [
    {
      id: 'theme',
      icon: 'moon',
      label: t('settings.darkMode'),
      sub: t('settings.darkModeSub'),
      type: 'toggle',
      toggleValue: theme === 'dark',
      onToggle: handleThemeToggle,
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
    },
    {
      id: 'notifications',
      icon: 'bell',
      label: t('settings.notifications'),
      sub: t('settings.notificationsSub'),
      type: 'toggle',
      toggleValue: notificationsEnabled,
      onToggle: handleNotificationsToggle,
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
    },
    {
      id: 'language',
      icon: 'globe',
      label: t('settings.language'),
      sub: t('settings.languageSub'),
      type: 'arrow',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () => setLanguageModalVisible(true),
    },
  ];

  const legalRows: SettingRow[] = [
    {
      id: 'privacy',
      icon: 'lock',
      label: t('settings.privacyPolicy'),
      sub: t('settings.privacyPolicySub'),
      type: 'arrow',
      iconBg: colors.successBg,
      iconColor: colors.success,
      onPress: () => router.push(legalRoutes.privacy),
    },
    {
      id: 'terms',
      icon: 'file-text',
      label: t('settings.termsOfService'),
      sub: t('settings.termsOfServiceSub'),
      type: 'arrow',
      iconBg: colors.primaryTint,
      iconColor: colors.primary,
      onPress: () => router.push(legalRoutes.terms),
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('settings.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Group label={t('settings.accountSection')} rows={accountRows} s={s} colors={colors} />
        <Group label={t('settings.preferencesSection')} rows={prefRows} s={s} colors={colors} />
        <Group label={t('settings.legalSection')} rows={legalRows} s={s} colors={colors} />

        <View style={s.footer}>
          <Feather name="shield" size={22} color={colors.border} />
          <Text style={s.footerVersion}>{t('common.version')}</Text>
          <Text style={s.footerCopy}>© 2023 SweetCasa Cameroon Inc.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LanguageModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: H_PAD, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: colors.borderLight,
      backgroundColor: colors.card,
    },
    iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: colors.text },
    scroll: { paddingHorizontal: H_PAD, paddingTop: 16 },
    group: { marginBottom: 6 },
    groupLabel: {
      fontSize: 10.5, fontWeight: '700', color: colors.textLight,
      letterSpacing: 1, marginBottom: 8, marginTop: 14, paddingLeft: 2,
    },
    groupCard: {
      backgroundColor: colors.card, borderRadius: 18,
      borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
    },
    row: { paddingHorizontal: 16, paddingVertical: 14 },
    rowContent: {
      flexDirection: 'row', alignItems: 'center',
      gap: 14,
    },
    rowIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { fontSize: 13.5, fontWeight: '600', color: colors.text, marginBottom: 2 },
    dangerLabel: { color: colors.danger },
    rowSub: { fontSize: 11.5, color: colors.textLight },
    rowDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 70 },
    footer: { alignItems: 'center', paddingTop: 28, gap: 6 },
    footerVersion: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginTop: 6 },
    footerCopy: { fontSize: 11, color: colors.textLight },
  });
}
