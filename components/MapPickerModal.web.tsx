import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BASE_URL } from '../constants/api';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F1EEFF';
const GREEN = '#22C55E';
const GREEN_LIGHT = '#ECFDF3';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';

type Selected = { latitude: number; longitude: number; label: string };

// react-native-maps is a native-only module and cannot bundle for web (it
// imports react-native internals Metro can't resolve there). This web build
// swaps the draggable map for search + browser geolocation — no visual map,
// but the owner can still set an exact, accurate location.
export default function MapPickerModal({
  visible, initialLatitude, initialLongitude, onConfirm, onClose,
}: {
  visible: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  onConfirm: (lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<{ description: string; placeId: string }[]>([]);
  const [selected, setSelected] = useState<Selected | null>(
    initialLatitude != null && initialLongitude != null
      ? { latitude: initialLatitude, longitude: initialLongitude, label: t('listing.locationSet') }
      : null
  );
  const [locating, setLocating] = useState(false);

  const handleSearchChange = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 3) { setPredictions([]); return; }
    try {
      const token = await AsyncStorage.getItem('token');
      const params = new URLSearchParams({
        input: text.trim(),
        ...(selected ? { lat: String(selected.latitude), lng: String(selected.longitude) } : {}),
      });
      const res = await fetch(`${BASE_URL}/listings/places-autocomplete?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setPredictions(data.predictions || []);
    } catch {
      // Autocomplete is a convenience — fail silently.
    }
  };

  const handleSelectPrediction = async (placeId: string, description: string) => {
    setPredictions([]);
    setQuery(description);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/places-details?placeId=${placeId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.place?.latitude != null && data.place?.longitude != null) {
        setSelected({
          latitude: data.place.latitude,
          longitude: data.place.longitude,
          label: data.place.formattedAddress || data.place.name || description,
        });
      }
    } catch {
      // Selection failed — the owner can just try again.
    }
  };

  const handleUseBrowserLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelected({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: t('listing.locationSet'),
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('listing.setLocation')}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.notice}>{t('listing.webMapNotice')}</Text>

          <TextInput
            style={s.input}
            placeholder={t('listing.searchLocation')}
            placeholderTextColor={TEXT_LIGHT}
            value={query}
            onChangeText={handleSearchChange}
          />
          {predictions.length > 0 && (
            <View style={s.predictionsBox}>
              {predictions.map((p) => (
                <TouchableOpacity
                  key={p.placeId}
                  style={s.predictionRow}
                  onPress={() => handleSelectPrediction(p.placeId, p.description)}>
                  <Text style={s.predictionTxt} numberOfLines={2}>{p.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={s.gpsBtn} onPress={handleUseBrowserLocation} disabled={locating}>
            <Text style={s.gpsBtnTxt}>
              {locating ? t('common.loading') : `📍 ${t('listing.setExactLocation')}`}
            </Text>
          </TouchableOpacity>

          {selected && (
            <View style={s.selectedBox}>
              <Text style={s.selectedTxt}>📍 {selected.label}</Text>
            </View>
          )}
        </View>

        <View style={s.bottomBar}>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnTxt}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.confirmBtn, !selected && s.confirmBtnDisabled]}
            disabled={!selected}
            onPress={() => selected && onConfirm(selected.latitude, selected.longitude)}>
            <Text style={s.confirmBtnTxt}>{t('listing.confirmLocation')}</Text>
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
  body: { flex: 1, padding: 16 },
  notice: { fontSize: 12.5, color: TEXT_MID, marginBottom: 14, lineHeight: 18 },
  input: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 12, fontSize: 14, color: TEXT_DARK, backgroundColor: '#fff',
  },
  predictionsBox: {
    marginTop: 6, backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: GRAY_BORDER, maxHeight: 220,
  },
  predictionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  predictionTxt: { fontSize: 13, color: TEXT_DARK },
  gpsBtn: {
    marginTop: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: PURPLE_LIGHT,
  },
  gpsBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 13 },
  selectedBox: { marginTop: 16, backgroundColor: GREEN_LIGHT, borderRadius: 10, padding: 12 },
  selectedTxt: { color: GREEN, fontWeight: '700', fontSize: 13 },
  bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
  cancelBtn: {
    flex: 1, padding: 14, borderWidth: 1.5,
    borderColor: PURPLE, borderRadius: 14, alignItems: 'center',
  },
  cancelBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 14 },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
