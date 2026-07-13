import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { useResolvedTheme, useThemePreference } from '../contexts/theme-preference';

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

function Row({ row }: { row: SettingRow }) {
  const content = (
    <View style={styles.rowContent}>
      <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
        <Feather name={row.icon as any} size={16} color={row.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, row.danger && styles.dangerLabel]}>{row.label}</Text>
        <Text style={styles.rowSub}>{row.sub}</Text>
      </View>

      {row.type === 'toggle' ? (
        <Switch
          value={Boolean(row.toggleValue)}
          onValueChange={row.onToggle}
          trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
          thumbColor="#fff"
        />
      ) : (
        <Feather name="chevron-right" size={16} color="#CECECE" />
      )}
    </View>
  );

  if (!row.onPress && row.type !== 'toggle') {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={row.onPress}>
      {content}
    </TouchableOpacity>
  );
}

function Group({ label, rows }: { label: string; rows: SettingRow[] }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupCard}>
        {rows.map((row, index) => (
          <View key={row.id}>
            <Row row={row} />
            {index < rows.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemePreference() ?? { theme: 'light' as const, setTheme: (_: 'light' | 'dark') => {} };
  const resolvedTheme = useResolvedTheme();

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

  const headerColor = resolvedTheme === 'dark' ? '#fff' : '#111';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
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
      iconBg: '#F3F0FF',
      iconColor: '#7C3AED',
      onPress: () => router.push('/AccountInformation'),
    },
    {
      id: 'support',
      icon: 'help-circle',
      label: t('settings.support'),
      sub: t('settings.supportSub'),
      type: 'arrow',
      iconBg: '#EFF6FF',
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
      iconBg: '#F3F0FF',
      iconColor: '#7C3AED',
    },
    {
      id: 'notifications',
      icon: 'bell',
      label: t('settings.notifications'),
      sub: t('settings.notificationsSub'),
      type: 'toggle',
      toggleValue: notificationsEnabled,
      onToggle: handleNotificationsToggle,
      iconBg: '#F3F0FF',
      iconColor: '#7C3AED',
    },
    {
      id: 'language',
      icon: 'globe',
      label: t('settings.language'),
      sub: t('settings.languageSub'),
      type: 'arrow',
      iconBg: '#F3F0FF',
      iconColor: '#7C3AED',
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
      iconBg: '#ECFDF5',
      iconColor: '#16A34A',
      onPress: () => router.push(legalRoutes.privacy),
    },
    {
      id: 'terms',
      icon: 'file-text',
      label: t('settings.termsOfService'),
      sub: t('settings.termsOfServiceSub'),
      type: 'arrow',
      iconBg: '#F3F0FF',
      iconColor: '#7C3AED',
      onPress: () => router.push(legalRoutes.terms),
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={headerColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: headerColor }]}>{t('settings.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Group label={t('settings.accountSection')} rows={accountRows} />
        <Group label={t('settings.preferencesSection')} rows={prefRows} />
        <Group label={t('settings.legalSection')} rows={legalRows} />

        <View style={styles.footer}>
          <Feather name="shield" size={22} color="#D1D5DB" />
          <Text style={styles.footerVersion}>{t('common.version')}</Text>
          <Text style={styles.footerCopy}>© 2023 SweetCasa Cameroon Inc.</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: H_PAD, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    backgroundColor: '#fff',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 16 },
  group: { marginBottom: 6 },
  groupLabel: {
    fontSize: 10.5, fontWeight: '700', color: '#B0B0B0',
    letterSpacing: 1, marginBottom: 8, marginTop: 14, paddingLeft: 2,
  },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#EFEFEF', overflow: 'hidden',
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
  rowLabel: { fontSize: 13.5, fontWeight: '600', color: '#111', marginBottom: 2 },
  dangerLabel: { color: '#EF4444' },
  rowSub: { fontSize: 11.5, color: '#B0B0B0' },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 70 },
  footer: { alignItems: 'center', paddingTop: 28, gap: 6 },
  footerVersion: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 6 },
  footerCopy: { fontSize: 11, color: '#C0C0C0' },
});
