import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const PURPLE = '#7C3AED';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';

type Facility = {
  id?: number;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  source: 'google' | 'manual';
};

type Props = {
  houseCoord: { latitude: number; longitude: number };
  houseTitle: string;
  facilities: Facility[];
};

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

export default function NeighborhoodMapView({ houseCoord, houseTitle, facilities }: Props) {
  return (
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
            <Text style={s.calloutTitle} numberOfLines={2}>{houseTitle || 'This property'}</Text>
            <Text style={s.calloutSub}>House</Text>
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
  );
}

const s = StyleSheet.create({
  map: { flex: 1 },
  calloutBox: { minWidth: 140, maxWidth: 220, padding: 4 },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  calloutSub: { fontSize: 11, color: TEXT_MID, marginTop: 2 },
});