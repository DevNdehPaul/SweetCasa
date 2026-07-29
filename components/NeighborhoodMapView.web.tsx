import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

// react-native-maps has no web support, so this shows a simple placeholder
// instead of pulling in native-only modules on the web bundle.
export default function NeighborhoodMapView({ houseTitle }: Props) {
  return (
    <View style={s.center}>
      <Text style={s.title}>{houseTitle}</Text>
      <Text style={s.text}>The interactive neighborhood map is available in the mobile app.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  text: { color: TEXT_MID, fontSize: 13, textAlign: 'center' },
});