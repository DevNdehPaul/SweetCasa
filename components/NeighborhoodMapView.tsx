import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const PURPLE = '#7C3AED';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const GRAY_BORDER = '#E5E7EB';

export type Facility = {
  id?: number;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  source: 'google' | 'manual';
};

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
const CATEGORY_STYLE: Record<string, { color: string }> = {
  hospital: { color: '#EF4444' }, Clinic: { color: '#EF4444' },
  pharmacy: { color: '#22C55E' },
  school: { color: '#3B82F6' }, 'Nearby School': { color: '#3B82F6' },
  supermarket: { color: '#F59E0B' }, Market: { color: '#F59E0B' },
  restaurant: { color: '#7C3AED' }, Restaurant: { color: '#7C3AED' },
  police: { color: '#1F2937' },
  Bank: { color: '#0EA5E9' },
};
const DEFAULT_CATEGORY_STYLE = { color: TEXT_MID };

function styleForCategory(category: string) {
  return CATEGORY_STYLE[category] || DEFAULT_CATEGORY_STYLE;
}

export default function NeighborhoodMapView({
  houseTitle, houseCoord, facilities,
}: {
  houseTitle: string;
  houseCoord: { latitude: number; longitude: number };
  facilities: Facility[];
}) {
  const { t } = useTranslation();
  const [gettingDirections, setGettingDirections] = useState(false);

  const handleDirections = async () => {
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
    <>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={s.map}
        initialRegion={{
          latitude: houseCoord.latitude,
          longitude: houseCoord.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}>
        <Marker coordinate={houseCoord} pinColor={PURPLE}>
          <Callout>
            <View style={s.calloutBox}>
              <Text style={s.calloutTitle} numberOfLines={2}>{houseTitle || t('neighborhoodMap.house')}</Text>
              <Text style={s.calloutSub}>{t('neighborhoodMap.house')}</Text>
            </View>
          </Callout>
        </Marker>

        {facilities.map((facility, index) => {
          const { color } = styleForCategory(facility.category);
          const km = distanceKm(
            houseCoord.latitude, houseCoord.longitude,
            facility.latitude as number, facility.longitude as number
          );
          return (
            <Marker
              key={facility.id ?? `${facility.source}-${facility.name}-${index}`}
              coordinate={{ latitude: facility.latitude as number, longitude: facility.longitude as number }}
              pinColor={color}>
              <Callout>
                <View style={s.calloutBox}>
                  <Text style={s.calloutTitle} numberOfLines={2}>{facility.name}</Text>
                  <Text style={s.calloutSub}>{facility.category} · {formatDistance(km)}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

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
  );
}

const s = StyleSheet.create({
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
