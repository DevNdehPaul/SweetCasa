import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BASE_URL } from '../constants/api';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const BG = '#F5F6FA';

type Status = 'Approved' | 'Pending' | 'Rejected';
type Filter = 'All' | Status;

interface ListingImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Listing {
  id: number;
  title: string;
  type: string;
  price: string;
  city: string;
  region: string;
  neighborhood: string | null;
  status: Status;
  paymentFrequency: string | null;
  images: ListingImage[];
}

const STATUS_CONFIG: Record<Status, { bg: string; color: string; icon: string }> = {
  Approved: { bg: '#DCFCE7', color: '#16A34A', icon: '✓' },
  Pending:  { bg: '#FEF3C7', color: '#D97706', icon: '⏱' },
  Rejected: { bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
};

function formatPrice(price: string, freq: string | null) {
  const num = Number(price);
  const formatted = num.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `${formatted} XAF`;
  if (freq === 'Yearly') return `${formatted} XAF/yr`;
  return `${formatted} XAF/mo`;
}

function getPrimaryImage(images: ListingImage[]) {
  if (!images?.length) return null;
  return (
    images.find((img) => img.isPrimary)?.imageUrl ||
    images.sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl
  );
}

const StatusBadge = ({ status }: { status: Status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeIcon, { color: cfg.color }]}>{cfg.icon}</Text>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

const ListingCard = ({ item }: { item: Listing }) => {
  const imageUrl = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region].filter(Boolean).join(', ');

  return (
    <View style={s.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={s.cardImg} />
      ) : (
        <View style={[s.cardImg, s.cardImgPlaceholder]}>
          <Text style={s.cardImgPlaceholderTxt}>🏠</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.cardSub}>{item.type} • {formatPrice(item.price, item.paymentFrequency)}</Text>
        <Text style={s.cardLocation} numberOfLines={1}>📍 {location}</Text>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );
};

const FILTERS: Filter[] = ['All', 'Approved', 'Pending', 'Rejected'];

export default function MyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const fetchListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load listings.');
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const counts = {
    total:    listings.length,
    approved: listings.filter((l) => l.status === 'Approved').length,
    pending:  listings.filter((l) => l.status === 'Pending').length,
    rejected: listings.filter((l) => l.status === 'Rejected').length,
  };

  const filtered = activeFilter === 'All'
    ? listings
    : listings.filter((l) => l.status === activeFilter);

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

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={s.loadingTxt}>Loading your listings…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchListings()}>
            <Text style={s.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchListings(true)}
              tintColor={PURPLE}
            />
          }
        >
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
            {FILTERS.map((f) => (
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
            {filtered.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
            {filtered.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTxt}>
                  {activeFilter === 'All'
                    ? "You haven't posted any listings yet."
                    : `No ${activeFilter} listings.`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/upload')}>
        <Text style={s.fabIcon}>+</Text>
        <Text style={s.fabTxt}>Add New Listing</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingTxt: { fontSize: 14, color: TEXT_MID },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: PURPLE, borderRadius: 12,
  },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

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
    shadowRadius: 6, elevation: 2, marginBottom: 4,
  },
  cardImg: { width: 110, height: 120 },
  cardImgPlaceholder: {
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cardImgPlaceholderTxt: { fontSize: 32 },
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