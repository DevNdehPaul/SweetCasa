import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import NeighborhoodMapView, { Facility } from '../components/NeighborhoodMapView';
import { BASE_URL } from '../constants/api';

const PURPLE = '#7C3AED';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const GRAY_BORDER = '#E5E7EB';

type NearbyResponse = {
  listing: { id: number; title: string; latitude: number | null; longitude: number | null };
  facilities: Facility[];
};

async function fetchNearby(listingId: string): Promise<NearbyResponse> {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}/listings/${listingId}/nearby-facilities`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to load the neighborhood map.');
  return data;
}

// The actual map/list rendering lives in components/NeighborhoodMapView(.web).tsx —
// react-native-maps is a native-only module, so the platform split has to happen
// at the component level (Expo Router's static-export renderer doesn't honor
// .web.tsx overrides on files directly under app/, only on plain components).
export default function NeighborhoodMap() {
  const { t } = useTranslation();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [houseTitle, setHouseTitle] = useState('');
  const [houseCoord, setHouseCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

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
        <NeighborhoodMapView houseTitle={houseTitle} houseCoord={houseCoord} facilities={facilities} />
      )}
    </SafeAreaView>
  );
}

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
});
