import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';
import useFavourite from '../hooks/useFavourite';

// White text/icons sitting directly on a solid-color button (retry button,
// explore button) stay hardcoded — the swatch itself doesn't change between
// light/dark, so the text on it shouldn't either.
const WHITE = '#FFFFFF';

const H_PAD = 20;
type Styles = ReturnType<typeof getStyles>;

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
  colors,
  s,
}: {
  item: SavedListing;
  onRemove: () => void;
  removing: boolean;
  colors: ThemeColors;
  s: Styles;
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
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={handlePress}>
      {img ? (
        <Image source={{ uri: img }} style={s.cardImg} resizeMode="cover" />
      ) : (
        <View style={[s.cardImg, s.cardImgPlaceholder]}>
          <Text style={{ fontSize: 30 }}>🏠</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.listing.title}</Text>
        <Text style={s.cardSub}>{item.listing.type}</Text>
        <Text style={s.cardPrice}>{formatPrice(item.listing.price, item.listing.paymentFrequency)}</Text>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={11} color={colors.textLight} />
          <Text style={s.locationTxt} numberOfLines={1}>{location}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.removeBtn}
        onPress={onRemove}
        disabled={removing}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {removing ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Ionicons name="heart" size={20} color={colors.danger} />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function FavouritesScreen() {
  const { t } = useTranslation();
  const { refreshFavourites } = useFavourite();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

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
      setSavedListings(prev => prev.filter(sl => sl.listing.id !== item.listing.id));
      await refreshFavourites();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('common.error'));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('favourites.title')}</Text>
          {savedListings.length > 0 && (
            <Text style={s.headerSub}>
              {savedListings.length} {savedListings.length === 1 ? t('favourites.listing') : t('favourites.listings')}
            </Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingTxt}>{t('favourites.loading')}</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => loadFavourites()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : savedListings.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="heart-outline" size={44} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>{t('favourites.emptyTitle')}</Text>
          <Text style={s.emptyDesc}>{t('favourites.emptyDesc')}</Text>
          <TouchableOpacity style={s.exploreBtn} onPress={() => router.push('/search' as any)}>
            <Feather name="search" size={15} color={WHITE} />
            <Text style={s.exploreBtnTxt}>{t('favourites.explore')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadFavourites(true)} tintColor={colors.primary} />
          }
        >
          {savedListings.map(item => (
            <FavouriteCard
              key={item.listing.id}
              item={item}
              removing={removingId === item.listing.id}
              onRemove={() => handleRemove(item)}
              colors={colors}
              s={s}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.card,
      gap: 8,
    },
    iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
    loadingTxt: { fontSize: 14, color: colors.textMuted },
    errorTxt: { fontSize: 14, color: colors.danger, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 12 },
    retryTxt: { color: WHITE, fontWeight: '700', fontSize: 14 },

    emptyIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    emptyDesc: { fontSize: 13.5, color: colors.textLight, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
    exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 13, marginTop: 6 },
    exploreBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE },

    scroll: { paddingHorizontal: H_PAD, paddingTop: 16, gap: 12 },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    cardImg: { width: 110, height: 110, backgroundColor: colors.primaryTintAlt },
    cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
    cardTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    cardSub: { fontSize: 11.5, color: colors.textLight },
    cardPrice: { fontSize: 13.5, fontWeight: '800', color: colors.primary, marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    locationTxt: { fontSize: 11, color: colors.textLight, flex: 1 },
    removeBtn: {
      alignSelf: 'center',
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 10,
      backgroundColor: colors.dangerBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}