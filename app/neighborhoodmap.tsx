import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NeighborhoodMapView from '../components/NeighborhoodMapView';

import { BASE_URL } from '../constants/api';

const PURPLE = '#7C3AED';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const GRAY_BORDER = '#E5E7EB';

// ─── Types ────────────────────────────────────────────────────────────────────

type Facility = {
  id?: number;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  source: 'google' | 'manual';
};

type NearbyResponse = {
  listing: { id: number; title: string; latitude: number | null; longitude: number | null };
  facilities: Facility[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Category vocabulary spans Google Places types (hospital, school, supermarket,
// pharmacy, restaurant, police) AND the app's own FACILITY_IDS used when an
// owner adds a place manually (Bank, Market, Clinic, Nearby School, …).
const CATEGORY_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  hospital:        { icon: 'medkit',     color: '#EF4444' },
  Clinic:          { icon: 'medkit',     color: '#EF4444' },
  pharmacy:        { icon: 'medical',    color: '#22C55E' },
  school:          { icon: 'school',     color: '#3B82F6' },
  'Nearby School': { icon: 'school',     color: '#3B82F6' },
  supermarket:     { icon: 'cart',       color: '#F59E0B' },
  Market:          { icon: 'cart',       color: '#F59E0B' },
  restaurant:      { icon: 'restaurant', color: '#7C3AED' },
  Restaurant:      { icon: 'restaurant', color: '#7C3AED' },
  police:          { icon: 'shield',     color: '#1F2937' },
  Bank:            { icon: 'cash',       color: '#0EA5E9' },
};
const DEFAULT_CATEGORY_STYLE = { icon: 'location' as keyof typeof Ionicons.glyphMap, color: TEXT_MID };

function styleForCategory(category: string) {
  return CATEGORY_STYLE[category] || DEFAULT_CATEGORY_STYLE;
}

async function fetchNearby(listingId: string): Promise<NearbyResponse> {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/listings/${listingId}/nearby-facilities`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load the neighborhood map.');
  return data;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NeighborhoodMap() {
  const { t } = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [houseTitle, setHouseTitle] = useState('');
  const [houseCoord, setHouseCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [gettingDirections, setGettingDirections] = useState(false);

  useEffect(() => {
    if (!listingId) {
      setError(t('neighborhoodMap.loadFailed'));
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await fetchNearby(listingId);
        setHouseTitle(data.listing.title);
        if (data.listing.latitude != null && data.listing.longitude != null) {
          setHouseCoord({ latitude: data.listing.latitude, longitude: data.listing.longitude });
        }
        setFacilities(data.facilities.filter((f) => f.latitude != null && f.longitude != null));
      } catch (err: any) {
        setError(err?.message || t('neighborhoodMap.loadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  const handleDirections = async () => {
    if (!houseCoord) return;
    setGettingDirections(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('neighborhoodMap.locationPermissionTitle'), t('neighborhoodMap.locationPermissionDesc'));
        return;
      }

      let originLat: number | undefined;
      let originLng: number | undefined;
      try {
        const pos = await Location.getCurrentPositionAsync({});
        originLat = pos.coords.latitude;
        originLng = pos.coords.longitude;
      } catch {
        // Proceed without an explicit origin — the native app falls back to device location.
      }

      const { latitude: dLat, longitude: dLng } = houseCoord;
      const nativeUrl = Platform.OS === 'ios'
        ? `maps://app?saddr=${originLat ?? ''},${originLng ?? ''}&daddr=${dLat},${dLng}&dirflg=d`
        : `google.navigation:q=${dLat},${dLng}`;

      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      if (canOpenNative) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${originLat ?? ''},${originLng ?? ''}&destination=${dLat},${dLng}&travelmode=driving`
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('neighborhoodMap.mapsUnavailable'));
    } finally {
      setGettingDirections(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{houseTitle || t('neighborhoodMap.title')}</Text>
        <View style={s.iconBtn} />
      </View>

      {loading && (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={s.centeredTxt}>{t('neighborhoodMap.loadingFacilities')}</Text>
        </View>
      )}

      {!loading && (error || !houseCoord) && (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={TEXT_MID} />
          <Text style={s.centeredTxt}>{error || t('neighborhoodMap.loadFailed')}</Text>
        </View>
      )}

      {!loading && !error && houseCoord && (
        <>
          <View style={{ flex: 1 }}>
  <NeighborhoodMapView
    houseCoord={houseCoord}
    houseTitle={houseTitle}
    facilities={facilities}
  />
</View>

          {facilities.length === 0 && (
            <View style={s.noticeBar}>
              <Text style={s.noticeTxt}>{t('neighborhoodMap.noFacilities')}</Text>
            </View>
          )}

          <View style={s.bottomBar}>
            <TouchableOpacity
              style={[s.directionsBtn, gettingDirections && { opacity: 0.6 }]}
              onPress={handleDirections}
              disabled={gettingDirections}>
              <Ionicons name="navigate" size={17} color="#fff" />
              <Text style={s.directionsBtnTxt}>{t('neighborhoodMap.directions')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  centeredTxt: { fontSize: 13, color: TEXT_MID, textAlign: 'center' },
  map: { flex: 1 },
  calloutBox: { minWidth: 140, maxWidth: 220, padding: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  calloutSub: { fontSize: 11, color: TEXT_MID, marginTop: 2 },
  noticeBar: {
    position: 'absolute', top: 12, left: 16, right: 16,
    backgroundColor: '#fff', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: GRAY_BORDER,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  noticeTxt: { fontSize: 12, color: TEXT_MID, textAlign: 'center' },
  bottomBar: { position: 'absolute', bottom: 20, left: 16, right: 16 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
  },
  directionsBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});