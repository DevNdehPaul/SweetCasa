import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  hospital: 'medkit', Clinic: 'medkit',
  pharmacy: 'medical',
  school: 'school', 'Nearby School': 'school',
  supermarket: 'cart', Market: 'cart',
  restaurant: 'restaurant', Restaurant: 'restaurant',
  police: 'shield',
  Bank: 'cash',
};

// react-native-maps is a native-only module and cannot bundle for web. This
// component is the web equivalent of NeighborhoodMapView — same data, shown
// as a distance-sorted list, with Directions opening Google Maps in a new
// tab (the browser prompts for the user's location itself).
export default function NeighborhoodMapView({
  houseTitle, houseCoord, facilities,
}: {
  houseTitle: string;
  houseCoord: { latitude: number; longitude: number };
  facilities: Facility[];
}) {
  const { t } = useTranslation();

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${houseCoord.latitude},${houseCoord.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  const sortedFacilities = [...facilities].sort((a, b) =>
    distanceKm(houseCoord.latitude, houseCoord.longitude, a.latitude as number, a.longitude as number) -
    distanceKm(houseCoord.latitude, houseCoord.longitude, b.latitude as number, b.longitude as number)
  );

  return (
    <>
      <View style={s.list}>
        <View style={s.houseRow}>
          <Ionicons name="home" size={18} color={PURPLE} />
          <Text style={s.houseTxt} numberOfLines={1}>{houseTitle || t('neighborhoodMap.house')}</Text>
        </View>

        {sortedFacilities.length === 0 && (
          <Text style={s.emptyTxt}>{t('neighborhoodMap.noFacilities')}</Text>
        )}

        {sortedFacilities.map((facility, index) => {
          const icon = CATEGORY_ICON[facility.category] || 'location';
          const km = distanceKm(
            houseCoord.latitude, houseCoord.longitude,
            facility.latitude as number, facility.longitude as number
          );
          return (
            <View key={facility.id ?? `${facility.source}-${facility.name}-${index}`} style={s.facilityRow}>
              <Ionicons name={icon} size={16} color={TEXT_MID} />
              <View style={s.facilityInfo}>
                <Text style={s.facilityName} numberOfLines={1}>{facility.name}</Text>
                <Text style={s.facilityMeta}>{facility.category} · {formatDistance(km)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.directionsBtn} onPress={handleDirections}>
          <Ionicons name="navigate" size={17} color="#fff" />
          <Text style={s.directionsBtnTxt}>{t('neighborhoodMap.directions')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  houseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F5F3FF', borderRadius: 10, padding: 12, marginBottom: 14,
  },
  houseTxt: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, flex: 1 },
  emptyTxt: { fontSize: 13, color: TEXT_MID, textAlign: 'center', marginTop: 20 },
  facilityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  facilityInfo: { flex: 1 },
  facilityName: { fontSize: 13.5, fontWeight: '600', color: TEXT_DARK },
  facilityMeta: { fontSize: 11.5, color: TEXT_MID, marginTop: 1 },
  bottomBar: { padding: 16 },
  directionsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14,
  },
  directionsBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
