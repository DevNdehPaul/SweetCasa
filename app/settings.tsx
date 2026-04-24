import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const H_PAD = 20;

type SettingRow = {
  id: string;
  icon: string;
  label: string;
  sub: string;
  type: 'arrow' | 'toggle' | 'action';
  toggleKey?: string;
  danger?: boolean;
  highlight?: boolean;
  iconBg: string;
  iconColor: string;
};

export default function SettingsScreen() {
  const [twoFA, setTwoFA] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);

  const toggles: Record<string, [boolean, (v: boolean) => void]> = {
    twoFA: [twoFA, setTwoFA],
    pushNotifs: [pushNotifs, setPushNotifs],
  };

  const SECURITY: SettingRow[] = [
    { id: 'twofa', icon: 'shield', label: 'Two-Factor Authentication', sub: 'Keep your wallet secure with 2FA', type: 'toggle', toggleKey: 'twoFA', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'password', icon: 'lock', label: 'Change Password', sub: 'Last updated 3 months ago', type: 'arrow', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'devices', icon: 'smartphone', label: 'Linked Devices', sub: 'iPhone 14 Pro, Web Browser', type: 'arrow', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const BILLING: SettingRow[] = [
    { id: 'plan', icon: 'award', label: 'Agent Pro Plan', sub: 'Next billing: Oct 12, 2023', type: 'action', highlight: true, iconBg: '#7C3AED', iconColor: '#fff' },
    { id: 'payment', icon: 'credit-card', label: 'Payment Methods', sub: 'MTN Mobile Money, Visa ending in 4242', type: 'arrow', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'billing', icon: 'rotate-ccw', label: 'Billing History', sub: 'View and download your invoices', type: 'arrow', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const PREFS: SettingRow[] = [
    { id: 'language', icon: 'globe', label: 'App Language', sub: 'English (US)', type: 'action', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'regional', icon: 'map-pin', label: 'Regional Settings', sub: 'Littoral, Cameroon', type: 'arrow', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'notifs', icon: 'bell', label: 'Push Notifications', sub: 'Property alerts and escrow status', type: 'toggle', toggleKey: 'pushNotifs', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const DANGER: SettingRow[] = [
    { id: 'logout', icon: 'log-out', label: 'Log Out', sub: 'Safely exit your SWEETCASA session', type: 'arrow', danger: true, iconBg: '#FEF2F2', iconColor: '#EF4444' },
  ];

  function Group({ label, rows }: { label: string; rows: SettingRow[] }) {
    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{label}</Text>
        <View style={styles.groupCard}>
          {rows.map((row, index) => (
            <View key={row.id}>
              <TouchableOpacity
                style={[styles.row, row.highlight && styles.rowHighlight]}
                activeOpacity={0.75}
              >
                <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                  <Feather name={row.icon as any} size={16} color={row.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, row.danger && { color: '#EF4444' }, row.highlight && { color: '#7C3AED' }]}>
                    {row.label}
                  </Text>
                  <Text style={[styles.rowSub, row.highlight && { color: '#A78BFA' }]}>{row.sub}</Text>
                </View>

                {row.type === 'toggle' && row.toggleKey && (
                  <Switch
                    value={toggles[row.toggleKey][0]}
                    onValueChange={toggles[row.toggleKey][1]}
                    trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                    thumbColor="#fff"
                  />
                )}
                {row.type === 'arrow' && (
                  <Feather name="chevron-right" size={16} color="#CECECE" />
                )}
                {row.type === 'action' && row.highlight && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeTxt}>Active</Text>
                  </View>
                )}
                {row.type === 'action' && !row.highlight && (
                  <TouchableOpacity>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {index < rows.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Group label="SECURITY & PRIVACY" rows={SECURITY} />
        <Group label="SUBSCRIPTION & BILLING" rows={BILLING} />
        <Group label="PREFERENCES" rows={PREFS} />
        <Group label="" rows={DANGER} />

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#D1D5DB" />
          <Text style={styles.footerVersion}>SWEETCASA MOBILE V2.4.1</Text>
          <Text style={styles.footerCopy}>© 2023 SweetCasa Cameroon Inc.</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  group: { marginBottom: 6 },
  groupLabel: {
    fontSize: 10.5, fontWeight: '700', color: '#B0B0B0',
    letterSpacing: 1, marginBottom: 8, marginTop: 14, paddingLeft: 2,
  },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#EFEFEF', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  rowHighlight: { backgroundColor: '#F3F0FF' },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 13.5, fontWeight: '600', color: '#111', marginBottom: 2 },
  rowSub: { fontSize: 11.5, color: '#B0B0B0' },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 70 },

  activeBadge: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  activeBadgeTxt: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  changeLink: { fontSize: 13, color: '#7C3AED', fontWeight: '700' },

  footer: { alignItems: 'center', paddingTop: 28, gap: 6 },
  footerVersion: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginTop: 6 },
  footerCopy: { fontSize: 11, color: '#C0C0C0' },
});