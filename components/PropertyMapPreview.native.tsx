import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

export interface PropertyMapFacility {
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  latitude: number;
  longitude: number;
  facilities: PropertyMapFacility[];
  primaryColor?: string;
}

export default function PropertyMapPreview({
  latitude,
  longitude,
  facilities,
  primaryColor = "#7C3AED",
}: Props) {
  return (
    <View style={styles.wrapper}>
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} pinColor={primaryColor} />

        {facilities
          .filter((f) => f.latitude != null && f.longitude != null)
          .map((f, i) => (
            <Marker
              key={`${f.name}-${i}`}
              coordinate={{
                latitude: f.latitude as number,
                longitude: f.longitude as number,
              }}
              opacity={0.75}
            />
          ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
});
