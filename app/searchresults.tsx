import { Feather, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next'; // adjust path as needed
import {
  ActivityIndicator, Dimensions, Image, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const H_PAD = 16;
const CARD_W = (width - H_PAD * 2 - 12) / 2;
const PURPLE = '#7C3AED';

interface ListingImage { imageUrl: string; isPrimary: boolean; sortOrder: number }
interface Listing {
  id: number; title: string; type: string; price: string;
  city: string; region: string; neighborhood: string | null;
  status: string; paymentFrequency: string | null;
  images: ListingImage[];
}

function getPrimaryImage(images: ListingImage[]) {
  if (!images?.length) return null;
  return images.find(i => i.isPrimary)?.imageUrl
    ?? [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl;
}

function formatPrice(price: string, freq: string | null, t: (key: string) => string) {
  const n = Number(price);
  const f = n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
    : n.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `${f} XAF`;
  if (freq === 'Yearly')   return `${f} XAF/${t('propertyDetail.yearlyPeriod').replace('/ ', '')}`;
  return `${f} XAF/${t('propertyDetail.monthlyPeriod').replace('/ ', '')}`;
}

function ListingCard({ item, t }: { item: Listing; t: (key: string) => string }) {
  const [saved, setSaved] = useState(false);
  const img = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region].filter(Boolean).join(', ');

  const handlePress = () => {
    router.push({
      pathname: '/propertydetail',
      params: {
        id: String(item.id),
        listingData: JSON.stringify(item),
      },
    });
  };

  return (
    <TouchableOpacity style={[styles.card, { width: CARD_W }]} activeOpacity={0.88} onPress={handlePress}>
      <View style={styles.cardImgWrap}>
        {img
          ? <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
          : <View style={[styles.cardImg, styles.cardImgPlaceholder]}><Text style={{ fontSize: 30 }}>🏠</Text></View>
        }
        <View style={styles.pricePill}>
          <Text style={styles.pricePillTxt}>{formatPrice(item.price, item.paymentFrequency, t)}</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={() => setSaved(p => !p)}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={14} color={saved ? '#EF4444' : '#888'} />
        </TouchableOpacity>
        {item.status === 'Approved' && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>{t('searchResults.verified')}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color="#B0B0B0" />
          <Text style={styles.locationTxt} numberOfLines={1}>{location}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.typeChip}><Text style={styles.typeChipTxt}>{item.type}</Text></View>
          <Feather name="arrow-right" size={14} color={PURPLE} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompactCard({ item, t }: { item: Listing; t: (key: string) => string }) {
  const img = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region].filter(Boolean).join(', ');

  return (
    <TouchableOpacity style={styles.compactCard} activeOpacity={0.88} onPress={() => router.push({
      pathname: '/propertydetail',
      params: {
        id: String(item.id),
        listingData: JSON.stringify(item),
      },
    })}>
      <View style={styles.compactImgWrap}>
        {img
          ? <Image source={{ uri: img }} style={styles.compactImg} resizeMode="cover" />
          : <View style={[styles.compactImg, styles.cardImgPlaceholder]}><Text style={{ fontSize: 28 }}>🏠</Text></View>
        }
        <View style={styles.compactPricePill}>
          <Text style={styles.pricePillTxt}>{formatPrice(item.price, item.paymentFrequency, t)}</Text>
        </View>
      </View>
      <View style={styles.compactBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.compactLocation} numberOfLines={1}>{location}</Text>
        <View style={styles.compactFooter}>
          <Text style={styles.compactType}>{item.type}</Text>
          <Feather name="arrow-right" size={14} color={PURPLE} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  const { t } = useTranslation();

  const raw = useLocalSearchParams<{
    region?: string; city?: string; neighborhood?: string;
    type?: string; status?: string; state?: string; maxBudget?: string; facilities?: string;
  }>();

  const paramsRef = useRef(raw);
  useEffect(() => { paramsRef.current = raw; }, [raw]);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);
  const [otherOptions, setOtherOptions] = useState<Listing[]>([]);
  const [otherOptionsLoading, setOtherOptionsLoading] = useState(false);

  const fetchOtherOptions = async (strictListings: Listing[]) => {
    setOtherOptionsLoading(true);
    try {
      const p = paramsRef.current;
      const query = new URLSearchParams();
      if (p.region) query.set('region', p.region);
      if (p.city) query.set('city', p.city);
      if (p.maxBudget) {
        const relaxedBudget = Math.max(30_000, Math.round(Number(p.maxBudget) * 1.25));
        query.set('maxBudget', String(relaxedBudget));
      }
      query.set('state', 'Available');
      query.set('page', '1');
      query.set('limit', '8');

      const res = await fetch(`${BASE_URL}/listings?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));

      const strictIds = new Set(strictListings.map(item => item.id));
      const relaxed = (data.listings as Listing[])
        .filter(item => item.status !== 'Unavailable' && !strictIds.has(item.id));
      setOtherOptions(relaxed);
    } catch {
      setOtherOptions([]);
    } finally {
      setOtherOptionsLoading(false);
    }
  };

  const fetchListings = async (pg = 1) => {
    if (pg === 1) setLoading(true);
    setError(null);

    try {
      const p = paramsRef.current;
      const query = new URLSearchParams();
      if (p.region)       query.set('region',       p.region);
      if (p.city)         query.set('city',         p.city);
      if (p.neighborhood) query.set('neighborhood', p.neighborhood);
      if (p.type)         query.set('type',         p.type);
      query.set('state', p.state && p.state !== 'Unavailable' ? p.state : 'Available');
      if (p.status)       query.set('status',       p.status);
      if (p.maxBudget)    query.set('maxBudget',    p.maxBudget);
      if (p.facilities)   query.set('facilities',   p.facilities);
      query.set('page',  String(pg));
      query.set('limit', '20');

      const res  = await fetch(`${BASE_URL}/listings?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));

      const visibleListings = (data.listings as Listing[]).filter(item => item.status !== 'Unavailable');
      setListings(pg === 1 ? visibleListings : prev => [...prev, ...visibleListings]);
      setTotal(data.total);
      setHasMore(pg < data.pages);
      setPage(pg);

      if (pg === 1) {
        void fetchOtherOptions(visibleListings);
      }
    } catch (err: any) {
      setError(err.message || t('errors.error'));
      if (pg === 1) {
        void fetchOtherOptions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const p = paramsRef.current;
  const filterSummary = [
    p.region, p.type,
    p.maxBudget ? `≤ ${Number(p.maxBudget) >= 1e9
      ? (Number(p.maxBudget) / 1e9).toFixed(1) + 'B'
      : Number(p.maxBudget) >= 1e6
        ? (Number(p.maxBudget) / 1e6).toFixed(0) + 'M'
        : (Number(p.maxBudget) / 1000).toFixed(0) + 'k'} XAF` : null,
  ].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('searchResults.title')}</Text>
          {filterSummary ? (
            <Text style={styles.headerSub} numberOfLines={1}>{filterSummary}</Text>
          ) : null}
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="sliders" size={18} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingTxt}>{t('searchResults.finding')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchListings(1)}>
            <Text style={styles.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaSmall}>{t('searchResults.foundForYou')}</Text>
              <Text style={styles.metaBig}>
                {total} {t(total !== 1 ? 'searchResults.listings' : 'searchResults.listing')}
              </Text>
            </View>
          </View>

          {listings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏘️</Text>
              <Text style={styles.emptyTitle}>{t('searchResults.noPropertiesTitle')}</Text>
              <Text style={styles.emptyDesc}>{t('searchResults.noPropertiesDesc')}</Text>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => router.back()}>
                <Text style={styles.adjustTxt}>{t('searchResults.adjustFilters')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {listings.map(item => (
                  <ListingCard key={item.id} item={item} t={t} />
                ))}
              </View>
              {hasMore && (
                <TouchableOpacity
                  style={styles.seeMoreBtn}
                  activeOpacity={0.8}
                  onPress={() => fetchListings(page + 1)}
                  disabled={loading}
                >
                  <Text style={styles.seeMoreTxt}>{t('searchResults.loadMore')}</Text>
                  <Feather name="chevron-down" size={16} color={PURPLE} />
                </TouchableOpacity>
              )}
              <Text style={styles.showingTxt}>
                {t('searchResults.showing')} {listings.length} {t('searchResults.of')} {total} {t('searchResults.results')}
              </Text>
            </>
          )}

          {otherOptions.length > 0 && (
            <View style={styles.altSection}>
              <View style={styles.altHeader}>
                <Text style={styles.altTitle}>{t('searchResults.otherOptionsTitle')}</Text>
                <Text style={styles.altSub}>{t('searchResults.otherOptionsSub')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.altRow}>
                {otherOptions.map(item => (
                  <CompactCard key={`alt-${item.id}`} item={item} t={t} />
                ))}
              </ScrollView>
            </View>
          )}

          {otherOptionsLoading && listings.length === 0 && (
            <View style={styles.altLoadingBox}>
              <ActivityIndicator size="small" color={PURPLE} />
              <Text style={styles.altLoadingTxt}>{t('searchResults.loadingAlternatives')}</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <TouchableOpacity style={styles.filterFab} onPress={() => router.back()}>
        <Feather name="sliders" size={20} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingTxt: { fontSize: 14, color: '#888' },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PURPLE, borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8 },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 11, color: '#888', marginTop: 1 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  metaSmall: { fontSize: 11.5, color: '#B0B0B0', marginBottom: 2 },
  metaBig: { fontSize: 15, fontWeight: '700', color: '#111' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: { borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  cardImgWrap: { width: '100%', height: CARD_W * 0.85, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  cardImgPlaceholder: { backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  pricePill: { position: 'absolute', top: 8, left: 8, backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  pricePillTxt: { fontSize: 9, fontWeight: '700', color: '#fff' },
  saveBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  verifiedBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedTxt: { fontSize: 8.5, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  cardBody: { padding: 10, gap: 4 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#111', letterSpacing: -0.1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 11, color: '#B0B0B0', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  typeChip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeChipTxt: { fontSize: 10.5, color: '#6B7280', fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  adjustBtn: { backgroundColor: PURPLE, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  adjustTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  seeMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: PURPLE, borderRadius: 30, paddingVertical: 14, marginTop: 20 },
  seeMoreTxt: { fontSize: 14, fontWeight: '700', color: PURPLE },
  showingTxt: { textAlign: 'center', fontSize: 12, color: '#B0B0B0', marginTop: 10 },

  altSection: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  altHeader: { marginBottom: 12 },
  altTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 4 },
  altSub: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  altRow: { gap: 12, paddingRight: 20 },
  compactCard: {
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  compactImgWrap: { height: 150, position: 'relative' },
  compactImg: { width: '100%', height: '100%' },
  compactPricePill: { position: 'absolute', top: 10, left: 10, backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  compactBody: { padding: 12, gap: 4 },
  compactLocation: { fontSize: 11.5, color: '#8B8B8B' },
  compactFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  compactType: { fontSize: 10.5, color: '#6B7280', fontWeight: '600' },
  altLoadingBox: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  altLoadingTxt: { fontSize: 12, color: '#6B7280' },

  filterFab: { position: 'absolute', bottom: 30, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});
