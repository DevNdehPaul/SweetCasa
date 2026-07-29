import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

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

// react-native-maps isn't supported on web, so this lets the owner type
// coordinates directly instead of dragging a pin.
export default function MapPickerModal({
  visible, initialLatitude, initialLongitude, onConfirm, onClose,
}: Props) {
  const { t } = useTranslation();
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');

  useEffect(() => {
    if (!visible) return;
    setLatText(String(initialLatitude ?? DEFAULT_MAP_REGION.latitude));
    setLngText(String(initialLongitude ?? DEFAULT_MAP_REGION.longitude));
  }, [visible, initialLatitude, initialLongitude]);

  const handleConfirm = () => {
    const lat = parseFloat(latText);
    const lng = parseFloat(lngText);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    onConfirm(lat, lng);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('listing.setLocation')}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.hint}>
            Map picking isn't available on web yet. Enter coordinates directly, or set the exact
            location from the mobile app.
          </Text>

          <Text style={s.label}>Latitude</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={latText}
            onChangeText={setLatText}
            placeholderTextColor={TEXT_LIGHT}
          />

          <Text style={s.label}>Longitude</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={lngText}
            onChangeText={setLngText}
            placeholderTextColor={TEXT_LIGHT}
          />
        </View>

        <View style={s.bottomBar}>
          <TouchableOpacity style={s.draftBtn} onPress={onClose}>
            <Text style={s.draftBtnTxt}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn} onPress={handleConfirm}>
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
  body: { padding: 16, flex: 1 },
  hint: { fontSize: 12, color: TEXT_LIGHT, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_DARK, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 12, fontSize: 14, color: TEXT_DARK, backgroundColor: '#fff',
  },
  bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
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