import { Feather, Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React from 'react';
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

const { width } = Dimensions.get('window');
const H_PAD = 20;

type Listing = {
  id: string;
  title: string;
  price: string;
  status: 'Active' | 'Pending';
  views: number;
  messages: number;
};

const LISTINGS: Listing[] = [
  { id: '1', title: 'Modern Villa, Bastos',   price: '450k', status: 'Active',  views: 124, messages: 4 },
  { id: '2', title: 'Studio, Bonamoussadi',   price: '120k', status: 'Pending', views: 45,  messages: 4 },
  { id: '3', title: 'Duplex, Santa Barbara',  price: '850k', status: 'Active',  views: 89,  messages: 4 },
];

function ListingRow({ item, last }: { item: Listing; last: boolean }) {
  return (
    <View>
      <TouchableOpacity style={styles.listingRow} activeOpacity={0.75}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listingTitle}>{item.title}</Text>
          <View style={styles.listingMeta}>
            <Feather name="eye" size={11} color="#B0B0B0" />
            <Text style={styles.listingMetaTxt}>{item.views}</Text>
            <Feather name="message-square" size={11} color="#B0B0B0" style={{ marginLeft: 8 }} />
            <Text style={styles.listingMetaTxt}>{item.messages}</Text>
          </View>
        </View>
        <Text style={styles.listingPrice}>{item.price}</Text>
        <Text style={[
          styles.listingStatus,
          { color: item.status === 'Active' ? '#111' : '#B0B0B0' },
        ]}>
          {item.status}
        </Text>
      </TouchableOpacity>
      {!last && <View style={styles.rowDivider} />}
    </View>
  );
}

export default function AgentHubScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Agent Profile Row ── */}
        <View style={styles.agentRow}>
          <View style={styles.agentAvatarWrap}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/52.jpg' }}
              style={styles.agentAvatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.agentName}>Samuel Eto'o</Text>
            <View style={styles.agentBadgeRow}>
              <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
              <Text style={styles.agentBadge}>Verified Premier Agent</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Text style={styles.editBtnTxt}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Escrow Balance Card ── */}
        <View style={styles.balanceCard}>
          {/* Label */}
          <View style={styles.balanceLabelRow}>
            <Feather name="dollar-sign" size={13} color="#A78BFA" />
            <Text style={styles.balanceLabel}>Secure Escrow Balance</Text>
          </View>

          {/* Amount */}
          <View style={styles.balanceAmountRow}>
            <Text style={styles.balanceAmount}>1,250,000</Text>
            <Text style={styles.balanceCurrency}> XAF</Text>
          </View>

          {/* Divider */}
          <View style={styles.balanceDivider} />

          {/* Pending + Button stacked cleanly */}
          <View style={styles.balanceFooter}>
            <View style={styles.pendingRow}>
              <Feather name="clock" size={12} color="#A78BFA" />
              <Text style={styles.pendingTxt}>450,000 XAF Pending Payout</Text>
            </View>
            <TouchableOpacity style={styles.manageBtn} activeOpacity={0.85}>
              <Link href="/(tabs)/wallet" >
              <Text style={styles.manageBtnTxt}>Manage Wallet</Text>
              </Link>
            </TouchableOpacity>
            
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.8}>
          <View style={styles.quickActionIcon}>
            <Feather name="plus-circle" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickActionTitle}>Upload New Property</Text>
            <Text style={styles.quickActionSub}>
              List your apartment, studio or villa in minutes.
            </Text>
          </View>
          <Feather name="arrow-up-right" size={18} color="#7C3AED" />
        </TouchableOpacity>

        {/* ── Live Listings ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Live Listings</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listingsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderTxt, { flex: 1 }]}>PROPERTY</Text>
            <Text style={styles.tableHeaderTxt}>PRICE</Text>
            <Text style={[styles.tableHeaderTxt, { marginLeft: 24 }]}>STATUS</Text>
          </View>
          {LISTINGS.map((item, index) => (
            <ListingRow key={item.id} item={item} last={index === LISTINGS.length - 1} />
          ))}
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

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 16 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: H_PAD, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  logoBox: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  bellBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Agent row
  agentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 18,
  },
  agentAvatarWrap: { position: 'relative' },
  agentAvatar: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2.5, borderColor: '#EDE9FE',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  agentName: {
    fontSize: 17, fontWeight: '800', color: '#111',
    letterSpacing: -0.3, marginBottom: 3,
  },
  agentBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentBadge: { fontSize: 11.5, color: '#7C3AED', fontWeight: '600' },
  editBtn: {
    borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8,
  },
  editBtnTxt: { fontSize: 12.5, fontWeight: '700', color: '#7C3AED' },

  // ── Balance Card (FIXED) ──
  balanceCard: {
    marginHorizontal: H_PAD,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    padding: 20,
    marginBottom: 26,
    gap: 4,
  },
  balanceLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4,
  },
  balanceLabel: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  balanceAmountRow: {
    flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32, fontWeight: '800', color: '#5B21B6', letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 16, fontWeight: '700', color: '#5B21B6', marginBottom: 4,
  },
  balanceDivider: {
    height: 1, backgroundColor: 'rgba(124,58,237,0.15)', marginVertical: 12,
  },
  // Key fix: column layout so pending text and button don't fight for space
  balanceFooter: {
    flexDirection: 'column',
    gap: 12,
  },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pendingTxt: {
    fontSize: 12.5, color: '#8B5CF6', fontWeight: '500',
  },
  manageBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.35,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  manageBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Section
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#111',
    letterSpacing: -0.2, paddingHorizontal: H_PAD, marginBottom: 14,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: H_PAD, marginBottom: 14, marginTop: 8,
  },
  seeAll: { fontSize: 12.5, color: '#7C3AED', fontWeight: '600' },

  // Quick action
  quickActionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: H_PAD, marginBottom: 26,
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF',
  },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3, letterSpacing: -0.1,
  },
  quickActionSub: { fontSize: 11.5, color: '#B0B0B0', lineHeight: 16 },

  // Listings table
  listingsTable: {
    marginHorizontal: H_PAD, backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 1, borderColor: '#EFEFEF',
    overflow: 'hidden', marginBottom: 22,
  },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  tableHeaderTxt: {
    fontSize: 10, fontWeight: '700', color: '#B0B0B0', letterSpacing: 0.6,
  },
  listingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 8,
  },
  listingTitle: {
    fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 4, letterSpacing: -0.1,
  },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listingMetaTxt: { fontSize: 11, color: '#B0B0B0' },
  listingPrice: {
    fontSize: 13.5, fontWeight: '700', color: '#7C3AED', width: 52, textAlign: 'center',
  },
  listingStatus: { fontSize: 12.5, fontWeight: '600', width: 58, textAlign: 'right' },
  rowDivider: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 16 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 14, paddingHorizontal: H_PAD },
  statCard: {
    flex: 1, backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF', gap: 6,
  },
  statIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: '#111', letterSpacing: -0.5 },
  statLabel: { fontSize: 11.5, color: '#B0B0B0', fontWeight: '500' },
});