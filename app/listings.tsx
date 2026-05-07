import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView, ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const BG = '#F5F6FA';

type Status = 'Approved' | 'Pending' | 'Rejected';
type Filter = 'All' | Status;

interface Listing {
  id: string;
  title: string;
  type: string;
  price: string;
  location: string;
  status: Status;
  image: string;
}

const LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Modern Villa, Bastos',
    type: 'Villa',
    price: '450,000 XAF/mo',
    location: 'Bastos, Yaoundé',
    status: 'Approved',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=300&q=80',
  },
  {
    id: '2',
    title: 'Studio, Bonamoussadi',
    type: 'Studio',
    price: '120,000 XAF/mo',
    location: 'Bonamoussadi, Douala',
    status: 'Pending',
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=300&q=80',
  },
  {
    id: '3',
    title: 'Duplex, Santa Barbara',
    type: 'Duplex',
    price: '850,000 XAF/mo',
    location: 'Santa Barbara, Yaoundé',
    status: 'Approved',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=300&q=80',
  },
  {
    id: '4',
    title: 'Office Space, Akwa',
    type: 'Office',
    price: '300,000 XAF/mo',
    location: 'Akwa, Douala',
    status: 'Rejected',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80',
  },
  {
    id: '5',
    title: '2BR Apartment, Mvan',
    type: 'Apartment',
    price: '150,000 XAF/mo',
    location: 'Mvan, Yaoundé',
    status: 'Approved',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&q=80',
  },
];

const STATUS_CONFIG: Record<Status, { bg: string; color: string; icon: string }> = {
  Approved: { bg: '#DCFCE7', color: '#16A34A', icon: '✓' },
  Pending:  { bg: '#FEF3C7', color: '#D97706', icon: '⏱' },
  Rejected: { bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
};

const StatusBadge = ({ status }: { status: Status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeIcon, { color: cfg.color }]}>{cfg.icon}</Text>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

const ListingCard = ({ item }: { item: Listing }) => (
  <View style={s.card}>
    <Image source={{ uri: item.image }} style={s.cardImg} />
    <View style={s.cardBody}>
      <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={s.cardSub}>{item.type} • {item.price}</Text>
      <Text style={s.cardLocation}>📍 {item.location}</Text>
      <StatusBadge status={item.status} />
    </View>
  </View>
);

const FILTERS: Filter[] = ['All', 'Approved', 'Pending', 'Rejected'];

export default function MyListings() {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const counts = {
    total: LISTINGS.length,
    approved: LISTINGS.filter(l => l.status === 'Approved').length,
    pending:  LISTINGS.filter(l => l.status === 'Pending').length,
    rejected: LISTINGS.filter(l => l.status === 'Rejected').length,
  };

  const filtered = activeFilter === 'All'
    ? LISTINGS
    : LISTINGS.filter(l => l.status === activeFilter);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/agent-dashboard')} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Listings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Summary row */}
        <View style={s.summaryRow}>
          <Text style={s.summaryTotal}>{counts.total} Total</Text>
          <Text style={s.dot}>•</Text>
          <Text style={[s.summaryCount, { color: '#16A34A' }]}>{counts.approved} Approved</Text>
          <Text style={s.dot}>•</Text>
          <Text style={[s.summaryCount, { color: '#D97706' }]}>{counts.pending} Pending</Text>
          <Text style={s.dot}>•</Text>
          <Text style={[s.summaryCount, { color: '#DC2626' }]}>{counts.rejected} Rejected</Text>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[s.filterTab, activeFilter === f && s.filterTabActive]}
            >
              <Text style={[s.filterTxt, activeFilter === f && s.filterTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Cards */}
        <View style={s.listContainer}>
          {filtered.map(item => (
            <ListingCard key={item.id} item={item} />
          ))}
          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No {activeFilter} listings yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style= {s.fab} onPress={() => router.push('/upload')} >
        <Text style={s.fabIcon}>+</Text>
        <Text style={s.fabTxt}>Add New Listing</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: BG, position: 'relative',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '800', color: TEXT_DARK,
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
  },
  bellWrap: { position: 'relative' },
  bell: { fontSize: 22 },
  bellDot: {
    position: 'absolute', top: 0, right: 0,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: BG,
  },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8, gap: 6,
  },
  summaryTotal: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  dot: { fontSize: 13, color: TEXT_MID },
  summaryCount: { fontSize: 13, fontWeight: '600' },

  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterTab: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 24, backgroundColor: PURPLE_LIGHT,
  },
  filterTabActive: { backgroundColor: PURPLE },
  filterTxt: { fontSize: 14, fontWeight: '600', color: PURPLE },
  filterTxtActive: { color: '#fff' },

  listContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, elevation: 2,
    marginBottom: 4,
  },
  cardImg: { width: 110, height: 120 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  cardSub: { fontSize: 12, color: TEXT_MID },
  cardLocation: { fontSize: 12, color: TEXT_MID },

  badge: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginTop: 6,
  },
  badgeIcon: { fontSize: 11, fontWeight: '700' },
  badgeTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: TEXT_MID, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PURPLE, paddingVertical: 16,
    paddingHorizontal: 24, borderRadius: 32,
    shadowColor: PURPLE, shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 8,
  },
  fabIcon: { fontSize: 20, color: '#fff', fontWeight: '700' },
  fabTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});