import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image, Pressable, SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const RECENT_CARD_W = (width - H_PAD * 2 - 12) / 3;

// ─── Data ─────────────────────────────────────────────────────────────────────
const RECENT_LISTINGS = [
  { id: '1', title: 'Villa in Bastos',  price: '450k/mo', image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=300&q=80' },
  { id: '2', title: 'Studio Akwa',      price: '120k/mo', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&q=80' },
  { id: '3', title: 'Bungalow',         price: '300k/mo', image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=300&q=80' },
];

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

// ─── Menu Item Row ─────────────────────────────────────────────────────────────
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
        <Text style={[styles.menuLabel, item.danger && { color: '#EF4444' }]}>
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const [profile, setProfile]   = useState<any>(null);
  const [role, setRole]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const [storedProfile, storedRole] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('role'),
      ]);
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      if (storedRole)    setRole(storedRole);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('role');
  await AsyncStorage.removeItem('profile');
  router.replace('/portal');
};

  // Build menu groups with logout wired up
  const MENU_GROUP_1: MenuItem[] = [
    { id: 'account', icon: 'user',        label: 'Account Information',  sub: 'Personal details & verification', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'wallet',  icon: 'credit-card', label: 'Escrow Wallet',        sub: 'Manage funds & payments',         iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'history', icon: 'rotate-ccw',  label: 'Transaction History',  sub: 'Past rentals & escrow logs',      iconBg: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const MENU_GROUP_2: MenuItem[] = [
    { id: 'security', icon: 'shield', label: 'Security & 2FA',  sub: 'Two-factor authentication active', iconBg: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'language', icon: 'globe',  label: 'App Language',    sub: 'English (Cameroon)',               iconBg: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const MENU_GROUP_3: MenuItem[] = [
    {
      id: 'logout',
      icon: 'log-out',
      label: 'Log Out',
      sub: 'Safely exit your account',
      danger: true,
      iconBg: '#FFF1F1',
      iconColor: '#EF4444',
      onPress: handleLogout,   // ← wired up
    },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // Pull real data from profile
  const fullName    = profile?.fullName    || profile?.companyName || 'SweetCasa User';
  const city        = profile?.city        || '';
  const region      = profile?.region      || '';
  const country     = profile?.country     || '';
  const isSeller    = role === 'SELLER';

  // Build location string from real data
  const locationStr = [city, region, country].filter(Boolean).join(', ') || 'Location not set';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="settings" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={22} color="#7C3AED" />
            </View>
          </View>

          {/* Real name from DB */}
          <Text style={styles.profileName}>{fullName}</Text>

          {/* Real location from DB */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color="#A0A0A0" />
            <Text style={styles.locationTxt}>{locationStr}</Text>
          </View>

          {/* Role badge — dynamic based on role */}
          <View style={[styles.badgeChip, isSeller && styles.badgeChipSeller]}>
            <Text style={[styles.badgeChipTxt, isSeller && styles.badgeChipTxtSeller]}>
              {isSeller ? '🏢 House Owner' : '🔍 House Seeker'}
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Text style={styles.editBtnTxt}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="bookmark" size={20} color="#7C3AED" />
            <Text style={styles.statNum}>08</Text>
            <Text style={styles.statLabel}>SAVED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Feather name="heart" size={20} color="#7C3AED" />
            <Text style={styles.statNum}>14</Text>
            <Text style={styles.statLabel}>FAVORITES</Text>
          </View>
        </View>

        {/* Recently Viewed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Viewed</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={RECENT_LISTINGS}
          horizontal
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentList}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recentCard} activeOpacity={0.85}>
              <View style={styles.recentImgWrap}>
                <Image source={{ uri: item.image }} style={styles.recentImg} resizeMode="cover" />
                <View style={styles.recentPricePill}>
                  <Text style={styles.recentPriceTxt}>{item.price}</Text>
                </View>
              </View>
              <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        {/* Agent Mode Banner — only show for buyers */}
        {!isSeller && (
          <TouchableOpacity style={styles.agentBanner} activeOpacity={0.85}>
            <View style={styles.agentIconWrap}>
              <Ionicons name="flash" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.agentBannerTitle}>Agent Mode</Text>
              <Text style={styles.agentBannerSub}>List properties & track leads</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#7C3AED" />
          </TouchableOpacity>
        )}

        <MenuGroup items={MENU_GROUP_1} />
        <MenuGroup items={MENU_GROUP_2} />
        <MenuGroup items={MENU_GROUP_3} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>SweetCasa Cameroon v2.4.0</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={styles.footerLink}>Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={styles.footerLink}>Support Center</Text></TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: H_PAD, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  heroSection: {
    alignItems: 'center', paddingTop: 28, paddingBottom: 24,
    backgroundColor: '#FDF9F6', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 1 },
  profileName: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.4, marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  locationTxt: { fontSize: 12.5, color: '#A0A0A0' },

  badgeChip: { backgroundColor: '#EDE9FE', borderRadius: 30, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16 },
  badgeChipTxt: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  badgeChipSeller: { backgroundColor: '#FFF3E0' },
  badgeChipTxtSeller: { color: '#D97706' },

  editBtn: { borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 30, paddingHorizontal: 36, paddingVertical: 10 },
  editBtnTxt: { fontSize: 13.5, fontWeight: '700', color: '#7C3AED' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 20,
    marginHorizontal: H_PAD, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#B0B0B0', fontWeight: '600', letterSpacing: 0.8 },
  statDivider: { width: 1, height: 40, backgroundColor: '#EFEFEF' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: H_PAD, paddingTop: 22, paddingBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  seeAll: { fontSize: 12.5, color: '#7C3AED', fontWeight: '600' },

  recentList: { paddingLeft: H_PAD, paddingRight: H_PAD / 2, gap: 10, paddingBottom: 4 },
  recentCard: { width: RECENT_CARD_W, gap: 6 },
  recentImgWrap: { width: '100%', height: RECENT_CARD_W, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  recentImg: { width: '100%', height: '100%' },
  recentPricePill: {
    position: 'absolute', top: 7, left: 7,
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  recentPriceTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  recentTitle: { fontSize: 11.5, fontWeight: '600', color: '#333', paddingHorizontal: 2 },

  agentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: H_PAD, marginTop: 24, marginBottom: 8,
    backgroundColor: '#F3F0FF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  agentIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  agentBannerTitle: { fontSize: 14, fontWeight: '700', color: '#7C3AED', marginBottom: 2 },
  agentBannerSub: { fontSize: 11.5, color: '#A78BFA' },

  menuGroup: {
    marginHorizontal: H_PAD, marginTop: 14,
    backgroundColor: '#FAFAFA', borderRadius: 16,
    borderWidth: 1, borderColor: '#EFEFEF', overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 13.5, fontWeight: '600', color: '#111', marginBottom: 1 },
  menuSub: { fontSize: 11.5, color: '#B0B0B0' },
  menuDivider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 68 },

  footer: { alignItems: 'center', paddingTop: 28, gap: 8 },
  footerVersion: { fontSize: 11.5, color: '#C0C0C0' },
  footerLinks: { flexDirection: 'row', gap: 20 },
  footerLink: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
});