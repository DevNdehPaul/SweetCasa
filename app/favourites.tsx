import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL } from '../constants/api';
import useFavourite from '../hooks/useFavourite';

const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#F3F0FF';
const H_PAD = 20;

interface ListingImage { imageUrl: string; isPrimary: boolean; sortOrder: number }
interface SavedListing {
  savedAt?: string;
  listing: {
    id: number;
    title: string;
    type: string;
    price: string;
    city: string;
    region: string;
    neighborhood: string | null;
    paymentFrequency: string | null;
    status: string;
    images: ListingImage[];
  };
}

function getPrimaryImage(images: ListingImage[]): string | null {
  if (!images?.length) return null;
  return (
    images.find(i => i.isPrimary)?.imageUrl ??
    [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.imageUrl ??
    null
  );
}

function formatPrice(price: string, freq: string | null): string {
  const n = Number(price);
  const f =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
      : n.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `${f} XAF`;
  if (freq === 'Yearly')   return `${f} XAF/yr`;
  return `${f} XAF/mo`;
}

// ─── Card ────────────────────────────────────────────────────────────────────
function FavouriteCard({
  item,
  onRemove,
  removing,
}: {
  item: SavedListing;
  onRemove: () => void;
  removing: boolean;
}) {
  const img = getPrimaryImage(item.listing.images);
  const location = [item.listing.neighborhood, item.listing.city, item.listing.region].filter(Boolean).join(', ');

  const handlePress = () => {
    router.push({
      pathname: '/propertydetail',
      params: {
        id: String(item.listing.id),
        listingData: JSON.stringify(item.listing),
      },
    });
  };

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={handlePress}>
      {img ? (
        <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
          <Text style={{ fontSize: 30 }}>🏠</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.listing.title}</Text>
        <Text style={styles.cardSub}>{item.listing.type}</Text>
        <Text style={styles.cardPrice}>{formatPrice(item.listing.price, item.listing.paymentFrequency)}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color="#B0B0B0" />
          <Text style={styles.locationTxt} numberOfLines={1}>{location}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        disabled={removing}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {removing ? (
          <ActivityIndicator size="small" color="#DC2626" />
        ) : (
          <Ionicons name="heart" size={20} color="#EF4444" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function FavouritesScreen() {
  const { t } = useTranslation();
  const { refreshFavourites } = useFavourite();

  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [removingId, setRemovingId]       = useState<number | null>(null);

  const loadFavourites = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setSavedListings([]);
        router.replace('/house_seekers_login_signup' as any);
        return;
      }
      const res = await fetch(`${BASE_URL}/favourites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      setSavedListings(data?.savedListings ?? []);
      await refreshFavourites();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshFavourites, t]);

  // Reload every time the screen gains focus so favourites added elsewhere appear.
  useFocusEffect(
    useCallback(() => {
      loadFavourites();
    }, [loadFavourites])
  );

  const handleRemove = async (item: SavedListing) => {
    setRemovingId(item.listing.id);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${BASE_URL}/favourites/${item.listing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('common.error'));
      setSavedListings(prev => prev.filter(s => s.listing.id !== item.listing.id));
      await refreshFavourites();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t('favourites.title')}</Text>
          {savedListings.length > 0 && (
            <Text style={styles.headerSub}>
              {savedListings.length} {savedListings.length === 1 ? t('favourites.listing') : t('favourites.listings')}
            </Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.loadingTxt}>{t('favourites.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFavourites()}>
            <Text style={styles.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : savedListings.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="heart-outline" size={44} color={PURPLE} />
          </View>
          <Text style={styles.emptyTitle}>{t('favourites.emptyTitle')}</Text>
          <Text style={styles.emptyDesc}>{t('favourites.emptyDesc')}</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/search' as any)}>
            <Feather name="search" size={15} color="#fff" />
            <Text style={styles.exploreBtnTxt}>{t('favourites.explore')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadFavourites(true)} tintColor={PURPLE} />
          }
        >
          {savedListings.map(item => (
            <FavouriteCard
              key={item.listing.id}
              item={item}
              removing={removingId === item.listing.id}
              onRemove={() => handleRemove(item)}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: '#888', marginTop: 1 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  loadingTxt: { fontSize: 14, color: '#888' },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PURPLE, borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  emptyDesc: { fontSize: 13.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PURPLE, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
  exploreBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  scroll: { paddingHorizontal: H_PAD, paddingTop: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardImg: { width: 110, height: 110, backgroundColor: '#F5F3FF' },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  cardSub: { fontSize: 11.5, color: '#9CA3AF' },
  cardPrice: { fontSize: 13.5, fontWeight: '800', color: PURPLE, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationTxt: { fontSize: 11, color: '#B0B0B0', flex: 1 },
  removeBtn: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

