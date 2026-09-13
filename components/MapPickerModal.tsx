import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MapView, {
  MapPressEvent,
  Marker,
  Region,
} from 'react-native-maps';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { BASE_URL } from '../constants/api';

const PURPLE = '#7C5CFC';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_LIGHT = '#9CA3AF';

const DEFAULT_MAP_REGION = {
  latitude: 4.0511,
  longitude: 9.7679,
};

type Prediction = {
  description: string;
  placeId: string;
};

type Props = {
  visible: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
};

export default function MapPickerModal({
  visible,
  initialLatitude,
  initialLongitude,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  const startLat =
    initialLatitude ?? DEFAULT_MAP_REGION.latitude;

  const startLng =
    initialLongitude ?? DEFAULT_MAP_REGION.longitude;

  const [region, setRegion] = useState<Region>({
    latitude: startLat,
    longitude: startLng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [markerCoord, setMarkerCoord] = useState({
    latitude: startLat,
    longitude: startLng,
  });

  const [query, setQuery] = useState('');

  const [predictions, setPredictions] =
    useState<Prediction[]>([]);

  useEffect(() => {
    if (!visible) return;

    const lat =
      initialLatitude ?? DEFAULT_MAP_REGION.latitude;

    const lng =
      initialLongitude ?? DEFAULT_MAP_REGION.longitude;

    const nextRegion: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setMarkerCoord({
      latitude: lat,
      longitude: lng,
    });

    setRegion(nextRegion);
    setQuery('');
    setPredictions([]);

    setTimeout(() => {
      mapRef.current?.animateToRegion(
        nextRegion,
        0,
      );
    }, 100);
  }, [
    visible,
    initialLatitude,
    initialLongitude,
  ]);

  const handleSearchChange = async (
    text: string,
  ) => {
    setQuery(text);

    if (text.trim().length < 3) {
      setPredictions([]);
      return;
    }

    try {
      const token =
        await AsyncStorage.getItem('token');

      const params = new URLSearchParams({
        input: text.trim(),
        lat: String(markerCoord.latitude),
        lng: String(markerCoord.longitude),
      });

      const res = await fetch(
        `${BASE_URL}/listings/places-autocomplete?${params.toString()}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        },
      );

      const data = await res.json();

      if (res.ok) {
        setPredictions(
          data.predictions || [],
        );
      }
    } catch {
      // Search is optional.
      // The user can still select the location
      // directly from the map.
    }
  };

  const handleSelectPrediction = async (
    placeId: string,
  ) => {
    setPredictions([]);
    Keyboard.dismiss();

    try {
      const token =
        await AsyncStorage.getItem('token');

      const res = await fetch(
        `${BASE_URL}/listings/places-details?placeId=${encodeURIComponent(
          placeId,
        )}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        },
      );

      const data = await res.json();

      if (
        res.ok &&
        data.place?.latitude != null &&
        data.place?.longitude != null
      ) {
        const latitude =
          Number(data.place.latitude);

        const longitude =
          Number(data.place.longitude);

        const nextRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setMarkerCoord({
          latitude,
          longitude,
        });

        setRegion(nextRegion);

        mapRef.current?.animateToRegion(
          nextRegion,
          400,
        );

        setQuery(
          data.place.formattedAddress ||
            data.place.name ||
            query,
        );
      }
    } catch {
      Alert.alert(
        t('common.error'),
        t('listing.setLocation'),
      );
    }
  };

  const handleMapPress = (
    e: MapPressEvent,
  ) => {
    Keyboard.dismiss();
    setPredictions([]);

    setMarkerCoord(
      e.nativeEvent.coordinate,
    );
  };

  const handleMarkerDragEnd = (
    e: any,
  ) => {
    setMarkerCoord(
      e.nativeEvent.coordinate,
    );
  };

  const handleConfirm = () => {
    Keyboard.dismiss();

    onConfirm(
      markerCoord.latitude,
      markerCoord.longitude,
    );
  };

  /*
   * SafeAreaView below handles the TOP inset only.
   *
   * We deliberately handle the bottom inset ourselves
   * on the action bar. This prevents Android devices
   * with large navigation bars from covering the
   * Cancel / Confirm Location buttons.
   */
  const bottomPadding = Math.max(
    insets.bottom,
    12,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={s.safe}
        edges={['top']}
      >
        <KeyboardAvoidingView
          style={s.keyboardContainer}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <TouchableWithoutFeedback
            onPress={Keyboard.dismiss}
            accessible={false}
          >
            <View style={s.container}>
              {/* Header */}

              <View style={s.header}>
                <Text
                  style={s.headerTitle}
                  numberOfLines={1}
                >
                  {t('listing.setLocation')}
                </Text>
              </View>

              {/* Search */}

              <View style={s.mapSearchWrap}>
                <TextInput
                  style={s.input}
                  placeholder={t(
                    'listing.searchLocation',
                  )}
                  placeholderTextColor={
                    TEXT_LIGHT
                  }
                  value={query}
                  onChangeText={
                    handleSearchChange
                  }
                  returnKeyType="search"
                />

                {predictions.length >
                  0 && (
                  <View
                    style={
                      s.mapPredictionsBox
                    }
                  >
                    {predictions.map(
                      (p) => (
                        <TouchableOpacity
                          key={p.placeId}
                          style={
                            s.mapPredictionRow
                          }
                          activeOpacity={0.7}
                          onPress={() =>
                            handleSelectPrediction(
                              p.placeId,
                            )
                          }
                        >
                          <Text
                            style={
                              s.mapPredictionTxt
                            }
                            numberOfLines={2}
                          >
                            {
                              p.description
                            }
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                )}
              </View>

              {/* Hint */}

              <Text style={s.dragHint}>
                {t(
                  'listing.dragPinHint',
                )}
              </Text>

              {/* Map */}

              <View style={s.mapContainer}>
                <MapView
                  ref={mapRef}
                  style={
                    StyleSheet.absoluteFill
                  }
                  initialRegion={region}
                  onRegionChangeComplete={
                    setRegion
                  }
                  onPress={handleMapPress}
                  mapPadding={{
                    top: 8,
                    right: 8,
                    bottom: 8,
                    left: 8,
                  }}
                >
                  <Marker
                    coordinate={
                      markerCoord
                    }
                    draggable
                    onDragEnd={
                      handleMarkerDragEnd
                    }
                  />
                </MapView>
              </View>

              {/* Bottom actions */}

              <View
                style={[
                  s.mapBottomBar,
                  {
                    paddingBottom:
                      bottomPadding,
                  },
                ]}
              >
                <TouchableOpacity
                  style={s.draftBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      s.draftBtnTxt
                    }
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.postBtn}
                  onPress={handleConfirm}
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      s.postBtnTxt
                    }
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {t(
                      'listing.confirmLocation',
                    )}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  keyboardContainer: {
    flex: 1,
  },

  container: {
    flex: 1,
    minHeight: 0,
  },

  header: {
    flexShrink: 0,
    backgroundColor: '#fff',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_DARK,
    textAlign: 'center',
  },

  mapSearchWrap: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: 'relative',
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#FAFAFA',
  },

  input: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: '#fff',
  },

  mapPredictionsBox: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    maxHeight: 220,

    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 20,
    zIndex: 200,
  },

  mapPredictionRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },

  mapPredictionTxt: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_DARK,
  },

  dragHint: {
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 16,
    color: TEXT_LIGHT,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  /*
   * This is the important responsive part.
   *
   * Instead of giving MapView flex:1 directly,
   * the container owns the remaining available
   * height. The bottom action bar remains a
   * normal sibling and therefore cannot be
   * pushed underneath Android navigation.
   */
  mapContainer: {
    flex: 1,
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },

  mapBottomBar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,

    paddingTop: 12,
    paddingHorizontal: 16,

    backgroundColor: '#FAFAFA',

    borderTopWidth:
      StyleSheet.hairlineWidth,
    borderTopColor: GRAY_BORDER,
  },

  draftBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,

    paddingHorizontal: 10,
    paddingVertical: 12,

    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#fff',
  },

  draftBtnTxt: {
    color: PURPLE,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },

  postBtn: {
    flex: 2,
    minWidth: 0,
    minHeight: 48,

    paddingHorizontal: 10,
    paddingVertical: 12,

    borderRadius: 14,
    backgroundColor: PURPLE,

    alignItems: 'center',
    justifyContent: 'center',
  },

  postBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});