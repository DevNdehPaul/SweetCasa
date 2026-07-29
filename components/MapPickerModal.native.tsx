import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert, Modal, SafeAreaView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { BASE_URL } from '../constants/api';

const PURPLE = '#7C5CFC';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_LIGHT = '#9CA3AF';

const DEFAULT_MAP_REGION = { latitude: 4.0511, longitude: 9.7679 }; // Douala fallback

type Props = {
  visible: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
};

export default function MapPickerModal({
  visible, initialLatitude, initialLongitude, onConfirm, onClose,
}: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  const startLat = initialLatitude ?? DEFAULT_MAP_REGION.latitude;
  const startLng = initialLongitude ?? DEFAULT_MAP_REGION.longitude;

  const [region, setRegion] = useState<Region>({
    latitude: startLat, longitude: startLng,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });
  const [markerCoord, setMarkerCoord] = useState({ latitude: startLat, longitude: startLng });
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<{ description: string; placeId: string }[]>([]);

  useEffect(() => {
    if (!visible) return;
    const lat = initialLatitude ?? DEFAULT_MAP_REGION.latitude;
    const lng = initialLongitude ?? DEFAULT_MAP_REGION.longitude;
    setMarkerCoord({ latitude: lat, longitude: lng });
    setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    setQuery('');
    setPredictions([]);
  }, [visible, initialLatitude, initialLongitude]);

  const handleSearchChange = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 3) { setPredictions([]); return; }
    try {
      const token = await AsyncStorage.getItem('token');
      const params = new URLSearchParams({
        input: text.trim(),
        lat: String(markerCoord.latitude),
        lng: String(markerCoord.longitude),
      });
      const res = await fetch(`${BASE_URL}/listings/places-autocomplete?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setPredictions(data.predictions || []);
    } catch {
      // Autocomplete is a convenience — fail silently, the map/GPS still work.
    }
  };

  const handleSelectPrediction = async (placeId: string) => {
    setPredictions([]);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/places-details?placeId=${placeId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.place?.latitude != null && data.place?.longitude != null) {
        const { latitude, longitude } = data.place;
        const nextRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setMarkerCoord({ latitude, longitude });
        setRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 400);
        setQuery(data.place.formattedAddress || data.place.name || query);
      }
    } catch {
      Alert.alert(t('common.error'), t('listing.setLocation'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('listing.setLocation')}</Text>
        </View>

        <View style={s.mapSearchWrap}>
          <TextInput
            style={s.input}
            placeholder={t('listing.searchLocation')}
            placeholderTextColor={TEXT_LIGHT}
            value={query}
            onChangeText={handleSearchChange}
          />
          {predictions.length > 0 && (
            <View style={s.mapPredictionsBox}>
              {predictions.map((p) => (
                <TouchableOpacity
                  key={p.placeId}
                  style={s.mapPredictionRow}
                  onPress={() => handleSelectPrediction(p.placeId)}>
                  <Text style={s.mapPredictionTxt} numberOfLines={2}>{p.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <MapView
          ref={mapRef}
          style={s.mapView}
          initialRegion={region}
          onRegionChangeComplete={setRegion}>
          <Marker
            coordinate={markerCoord}
            draggable
            onDragEnd={(e) => setMarkerCoord(e.nativeEvent.coordinate)}
          />
        </MapView>

        <View style={s.mapBottomBar}>
          <TouchableOpacity style={s.draftBtn} onPress={onClose}>
            <Text style={s.draftBtnTxt}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.postBtn}
            onPress={() => onConfirm(markerCoord.latitude, markerCoord.longitude)}>
            <Text style={s.postBtnTxt}>{t('listing.confirmLocation')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: '#fff', padding: 16, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  input: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 12, fontSize: 14, color: TEXT_DARK, backgroundColor: '#fff',
  },
  mapSearchWrap: { paddingHorizontal: 16, paddingTop: 12, position: 'relative', zIndex: 10 },
  mapPredictionsBox: {
    position: 'absolute', top: 68, left: 16, right: 16, backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: GRAY_BORDER, maxHeight: 220,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6, zIndex: 20,
  },
  mapPredictionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  mapPredictionTxt: { fontSize: 13, color: TEXT_DARK },
  mapView: { flex: 1, marginTop: 12 },
  mapBottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
  draftBtn: {
    flex: 1, padding: 14, borderWidth: 1.5,
    borderColor: PURPLE, borderRadius: 14, alignItems: 'center',
  },
  draftBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 14 },
  postBtn: {
    flex: 2, padding: 14, borderRadius: 14,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  postBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});