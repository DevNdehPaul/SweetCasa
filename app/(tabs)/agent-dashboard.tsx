import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../constants/api';

const { width } = Dimensions.get('window');
const H_PAD = 20;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const FALLBACK_LISTINGS = [
  { id: '1', title: 'Modern Villa, Bastos',       price: '450k', status: 'Active',  views: 124, messages: 4  },
  { id: '2', title: 'Studio, Bonamoussadi',       price: '120k', status: 'Pending', views: 58,  messages: 1  },
  { id: '3', title: 'Duplex, Santa Barbara',      price: '850k', status: 'Active',  views: 312, messages: 18 },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AgentHubScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState(FALLBACK_LISTINGS);

  useEffect(() => {
    AsyncStorage.getItem('profile').then(p => {
      if (p) setProfile(JSON.parse(p));
    });
    loadListings();
  }, []);

  const companyName = profile?.companyName || profile?.name || profile?.fullName || 'Your Company';

  const loadListings = async () => {
    try {
      const res = await api.get('/listings/mine');
      const mapped = (res.data?.listings || []).map((listing: any) => ({
        id: String(listing.id),
        title: listing.title,
        price: `${Number(listing.price).toLocaleString()} XAF`,
        status: listing.status === 'Available' ? 'Active' : listing.status,
        views: 0,
        messages: 0,
      }));

      if (mapped.length) {
        setListings(mapped);
      }
    } catch (error) {
      console.log('Could not load seller listings, using fallback data.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F3FF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agent Hub</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <Feather name="bell" size={22} color="#111" />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── User Row ── */}
        <View style={styles.userRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/45.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name}</Text>
            <View style={styles.verifiedRow}>
              <Ionicons name="shield-checkmark" size={13} color="#7C3AED" />
              <Text style={styles.verifiedTxt}>Verified House Owner</Text>
            </View>
          </View>
        </View>

        {/* ── Escrow Wallet Card ── */}
        <View style={styles.walletCard}>
          <View style={styles.walletLabelRow}>
            <MaterialCommunityIcons name="currency-usd" size={16} color="#7C3AED" />
            <Text style={styles.walletLabel}>Secure Escrow Balance</Text>
          </View>
          <Text style={styles.walletAmount}>1,250,000 XAF</Text>
          <Text style={styles.walletPending}>450,000 XAF Pending Payout</Text>
          <Link href="/wallet">
            <TouchableOpacity style={styles.walletBtn} activeOpacity={0.85}>
              <Text style={styles.walletBtnTxt}>Manage Wallet</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Feather name="trending-up" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.statNum}>14.2%</Text>
            <Text style={styles.statLabel}>Lead Conversion</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Feather name="message-circle" size={18} color="#7C3AED" />
            </View>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>Unread Leads</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => router.push('/upload')}
        >
          <View style={styles.actionIconWrap}>
            <Feather name="plus" size={22} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Upload New Property</Text>
            <Text style={styles.actionSub}>List your apartment, studio or villa in minutes.</Text>
          </View>
          <Feather name="arrow-up-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* ── Live Listings ── */}
        <View style={styles.listingsHeader}>
          <Text style={styles.sectionLabel}>LIVE LISTINGS</Text>
          <TouchableOpacity
       onPress={() => router.push('/listings')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {/* Table Header */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderTxt, { flex: 2 }]}>PROPERTY</Text>
            <Text style={[styles.tableHeaderTxt, { width: 60, textAlign: 'center' }]}>PRICE</Text>
            <Text style={[styles.tableHeaderTxt, { width: 70, textAlign: 'right' }]}>STATUS</Text>
          </View>

          {listings.map((item, index) => (
            <View key={item.id}>
              <TouchableOpacity style={styles.tableRow} activeOpacity={0.7}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.listingMeta}>
                    <Ionicons name="eye-outline" size={11} color="#A0A0A0" />
                    <Text style={styles.listingMetaTxt}>{item.views}</Text>
                    <Feather name="message-circle" size={11} color="#A0A0A0" style={{ marginLeft: 8 }} />
                    <Text style={styles.listingMetaTxt}>{item.messages}</Text>
                  </View>
                </View>
                <Text style={styles.listingPrice}>{item.price}</Text>
                <Text style={[
                  styles.listingStatus,
                  item.status === 'Active' ? styles.statusActive : styles.statusPending,
                ]}>
                  {item.status}
                </Text>
              </TouchableOpacity>
              {index < listings.length - 1 && <View style={styles.tableDivider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F3FF' },
  scroll: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#F4F3FF',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.6,
  },
  bellBtn: {
    width: 42, height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 6, right: 6,
    width: 9, height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#F4F3FF',
  },

  // User Row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginBottom: 20,
    gap: 12,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 52, height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1, right: 1,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#F4F3FF',
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedTxt: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  editBtn: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  editBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Wallet Card
  walletCard: {
    marginHorizontal: H_PAD,
    backgroundColor: '#EDE9FE',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },
  walletLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  walletAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: -1,
    marginBottom: 6,
  },
  walletPending: {
    fontSize: 13,
    color: '#8B5CF6',
    marginBottom: 20,
  },
  walletBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    shadowColor: '#5B21B6',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  walletBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: H_PAD,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statIconWrap: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '500',
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0A0A0',
    letterSpacing: 1.2,
    paddingHorizontal: H_PAD,
    marginBottom: 10,
  },

  // Action Card
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: H_PAD,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionIconWrap: {
    width: 50, height: 50,
    borderRadius: 25,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B21B6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionText: { flex: 1 },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  actionSub: {
    fontSize: 12,
    color: '#A0A0A0',
    lineHeight: 17,
  },

  // Listings
  listingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },
  tableCard: {
    marginHorizontal: H_PAD,
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableHeaderTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0B0B0',
    letterSpacing: 0.8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tableDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  listingMetaTxt: {
    fontSize: 11,
    color: '#A0A0A0',
  },
  listingPrice: {
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  listingStatus: {
    width: 70,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
  },
  statusActive: { color: '#16A34A' },
  statusPending: { color: '#D97706' },
});
