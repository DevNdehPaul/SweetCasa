import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, {
  Callout,
  Marker,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const GRAY_BORDER = '#E5E7EB';

// Special color used only for the actual house.
// Facility markers do not use this color.
const HOUSE_COLOR = '#111827';

export type Facility = {
  id?: number;
  name: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  source: 'google' | 'manual';
};

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    R *
    (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
  );
}

function formatDistance(km: number): string {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toFixed(1)} km`;
}

// Category vocabulary spans Google Places types and
// the app's manually added facility categories.
const CATEGORY_STYLE: Record<
  string,
  { color: string }
> = {
  hospital: { color: '#EF4444' },
  Clinic: { color: '#EF4444' },

  pharmacy: { color: '#22C55E' },

  school: { color: '#3B82F6' },
  'Nearby School': { color: '#3B82F6' },

  supermarket: { color: '#F59E0B' },
  Market: { color: '#F59E0B' },

  restaurant: { color: '#7C3AED' },
  Restaurant: { color: '#7C3AED' },

  police: { color: '#1F2937' },

  Bank: { color: '#0EA5E9' },
};

const DEFAULT_CATEGORY_STYLE = {
  color: TEXT_MID,
};

function styleForCategory(category: string) {
  return (
    CATEGORY_STYLE[category] ||
    DEFAULT_CATEGORY_STYLE
  );
}

// Legend shown to the user.
// Similar categories that use the same color are grouped together.
const LEGEND_ITEMS = [
  {
    label: 'Hospital / Clinic',
    color: '#EF4444',
  },
  {
    label: 'Pharmacy',
    color: '#22C55E',
  },
  {
    label: 'School',
    color: '#3B82F6',
  },
  {
    label: 'Market / Supermarket',
    color: '#F59E0B',
  },
  {
    label: 'Restaurant',
    color: '#7C3AED',
  },
  {
    label: 'Police',
    color: '#1F2937',
  },
  {
    label: 'Bank',
    color: '#0EA5E9',
  },
];

export default function NeighborhoodMapView({
  houseTitle,
  houseCoord,
  facilities,
}: {
  houseTitle: string;
  houseCoord: {
    latitude: number;
    longitude: number;
  };
  facilities: Facility[];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [gettingDirections, setGettingDirections] =
    useState(false);

  // Allow the user to hide/show the legend so that
  // it doesn't permanently cover too much of the map.
  const [showLegend, setShowLegend] = useState(true);

  const handleDirections = async () => {
    setGettingDirections(true);

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t(
            'neighborhoodMap.locationPermissionTitle',
          ),
          t(
            'neighborhoodMap.locationPermissionDesc',
          ),
        );
        return;
      }

      let originLat: number | undefined;
      let originLng: number | undefined;

      try {
        const pos =
          await Location.getCurrentPositionAsync({});

        originLat = pos.coords.latitude;
        originLng = pos.coords.longitude;
      } catch {
        // Proceed without explicit origin.
        // Native maps can fall back to device location.
      }

      const {
        latitude: dLat,
        longitude: dLng,
      } = houseCoord;

      const nativeUrl =
        Platform.OS === 'ios'
          ? `maps://app?saddr=${originLat ?? ''},${originLng ?? ''}&daddr=${dLat},${dLng}&dirflg=d`
          : `google.navigation:q=${dLat},${dLng}`;

      const canOpenNative =
        await Linking.canOpenURL(nativeUrl);

      if (canOpenNative) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${originLat ?? ''},${originLng ?? ''}&destination=${dLat},${dLng}&travelmode=driving`,
        );
      }
    } catch {
      Alert.alert(
        t('common.error'),
        t('neighborhoodMap.mapsUnavailable'),
      );
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
        }}
      >
        {/* =====================================================
            ACTUAL HOUSE MARKER
            Completely different from nearby facility markers.
        ====================================================== */}
        <Marker
          coordinate={houseCoord}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
          zIndex={999}
        >
          <View style={s.houseMarkerWrapper}>
            {/* Permanent label */}
            <View style={s.houseMarkerLabel}>
              <Ionicons
                name="home"
                size={13}
                color="#FFFFFF"
              />

              <Text style={s.houseMarkerLabelText}>
                THIS HOUSE
              </Text>
            </View>

            {/* Main house marker */}
            <View style={s.houseMarker}>
              <Ionicons
                name="home"
                size={25}
                color="#FFFFFF"
              />
            </View>

            {/* Pointer */}
            <View style={s.houseMarkerPointer} />
          </View>

          <Callout>
            <View style={s.calloutBox}>
              <View style={s.houseCalloutHeader}>
                <Ionicons
                  name="home"
                  size={16}
                  color={HOUSE_COLOR}
                />

                <Text style={s.houseCalloutTag}>
                  THIS HOUSE
                </Text>
              </View>

              <Text
                style={s.calloutTitle}
                numberOfLines={2}
              >
                {houseTitle ||
                  t('neighborhoodMap.house')}
              </Text>

              <Text style={s.calloutSub}>
                {t('neighborhoodMap.house')}
              </Text>
            </View>
          </Callout>
        </Marker>

        {/* =====================================================
            NEARBY FACILITY MARKERS
        ====================================================== */}
        {facilities.map((facility, index) => {
          const { color } = styleForCategory(
            facility.category,
          );

          const km = distanceKm(
            houseCoord.latitude,
            houseCoord.longitude,
            facility.latitude as number,
            facility.longitude as number,
          );

          return (
            <Marker
              key={
                facility.id ??
                `${facility.source}-${facility.name}-${index}`
              }
              coordinate={{
                latitude:
                  facility.latitude as number,
                longitude:
                  facility.longitude as number,
              }}
              pinColor={color}
              zIndex={1}
            >
              <Callout>
                <View style={s.calloutBox}>
                  <Text
                    style={s.calloutTitle}
                    numberOfLines={2}
                  >
                    {facility.name}
                  </Text>

                  <Text style={s.calloutSub}>
                    {facility.category} ·{' '}
                    {formatDistance(km)}
                  </Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* =====================================================
          MAP LEGEND
      ====================================================== */}
      <View
        style={[
          s.legendContainer,
          {
            top: 12,
          },
        ]}
      >
        <TouchableOpacity
          style={s.legendHeader}
          onPress={() =>
            setShowLegend((prev) => !prev)
          }
          activeOpacity={0.8}
        >
          <View style={s.legendHeaderLeft}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={TEXT_DARK}
            />

            <Text style={s.legendTitle}>
              Map Legend
            </Text>
          </View>

          <Ionicons
            name={
              showLegend
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={17}
            color={TEXT_MID}
          />
        </TouchableOpacity>

        {showLegend && (
          <View style={s.legendContent}>
            {/* Actual house */}
            <View style={s.legendItem}>
              <View
                style={[
                  s.legendHouseIcon,
                  {
                    backgroundColor:
                      HOUSE_COLOR,
                  },
                ]}
              >
                <Ionicons
                  name="home"
                  size={11}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={[
                  s.legendText,
                  s.legendHouseText,
                ]}
              >
                This House
              </Text>
            </View>

            <View style={s.legendDivider} />

            {/* Facility colors */}
            {LEGEND_ITEMS.map((item) => (
              <View
                key={item.label}
                style={s.legendItem}
              >
                <View
                  style={[
                    s.legendDot,
                    {
                      backgroundColor:
                        item.color,
                    },
                  ]}
                />

                <Text style={s.legendText}>
                  {item.label}
                </Text>
              </View>
            ))}

            <View style={s.legendItem}>
              <View
                style={[
                  s.legendDot,
                  {
                    backgroundColor:
                      TEXT_MID,
                  },
                ]}
              />

              <Text style={s.legendText}>
                Other
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* No facilities notice */}
      {facilities.length === 0 && (
        <View style={s.noticeBar}>
          <Text style={s.noticeTxt}>
            {t(
              'neighborhoodMap.noFacilities',
            )}
          </Text>
        </View>
      )}

      {/* Directions button */}
      <View
        style={[
          s.bottomBar,
          {
            bottom: 20 + insets.bottom,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            s.directionsBtn,
            gettingDirections && {
              opacity: 0.6,
            },
          ]}
          onPress={handleDirections}
          disabled={gettingDirections}
          activeOpacity={0.85}
        >
          <Ionicons
            name="navigate"
            size={17}
            color="#fff"
          />

          <Text style={s.directionsBtnTxt}>
            {t(
              'neighborhoodMap.directions',
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  map: {
    flex: 1,
  },

  // ─────────────────────────────────────────
  // HOUSE MARKER
  // ─────────────────────────────────────────

  houseMarkerWrapper: {
    alignItems: 'center',
  },

  houseMarkerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,

    backgroundColor: HOUSE_COLOR,

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 8,

    marginBottom: 4,

    borderWidth: 2,
    borderColor: '#FFFFFF',

    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 7,
  },

  houseMarkerLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  houseMarker: {
    width: 46,
    height: 46,
    borderRadius: 23,

    backgroundColor: HOUSE_COLOR,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 3,
    borderColor: '#FFFFFF',

    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 10,
  },

  houseMarkerPointer: {
    width: 0,
    height: 0,

    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,

    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: HOUSE_COLOR,

    marginTop: -2,
  },

  // ─────────────────────────────────────────
  // CALLOUT
  // ─────────────────────────────────────────

  calloutBox: {
    minWidth: 140,
    maxWidth: 220,
    padding: 4,
  },

  houseCalloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },

  houseCalloutTag: {
    fontSize: 10,
    fontWeight: '800',
    color: HOUSE_COLOR,
    letterSpacing: 0.3,
  },

  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },

  calloutSub: {
    fontSize: 11,
    color: TEXT_MID,
    marginTop: 2,
  },

  // ─────────────────────────────────────────
  // LEGEND
  // ─────────────────────────────────────────

  legendContainer: {
    position: 'absolute',
    right: 12,

    width: 180,

    backgroundColor:
      'rgba(255,255,255,0.96)',

    borderRadius: 12,

    borderWidth: 1,
    borderColor: GRAY_BORDER,

    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 6,

    overflow: 'hidden',
  },

  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    paddingHorizontal: 11,
    paddingVertical: 9,
  },

  legendHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: TEXT_DARK,
  },

  legendContent: {
    paddingHorizontal: 11,
    paddingBottom: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 8,

    borderWidth: 1,
    borderColor:
      'rgba(0,0,0,0.08)',
  },

  legendHouseIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 7,
  },

  legendText: {
    flex: 1,

    fontSize: 10.5,
    color: TEXT_MID,

    fontWeight: '500',
  },

  legendHouseText: {
    color: TEXT_DARK,
    fontWeight: '800',
  },

  legendDivider: {
    height: 1,
    backgroundColor: GRAY_BORDER,

    marginTop: 3,
    marginBottom: 5,
  },

  // ─────────────────────────────────────────
  // NOTICE
  // ─────────────────────────────────────────

  noticeBar: {
    position: 'absolute',

    top: 12,
    left: 16,
    right: 16,

    backgroundColor: '#fff',

    borderRadius: 10,
    padding: 10,

    borderWidth: 1,
    borderColor: GRAY_BORDER,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,

    elevation: 3,
  },

  noticeTxt: {
    fontSize: 12,
    color: TEXT_MID,
    textAlign: 'center',
  },

  // ─────────────────────────────────────────
  // DIRECTIONS
  // ─────────────────────────────────────────

  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
  },

  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    backgroundColor: PURPLE,

    borderRadius: 14,
    paddingVertical: 14,

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,

    elevation: 6,
  },

  directionsBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});