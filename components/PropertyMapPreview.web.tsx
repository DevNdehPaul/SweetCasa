import React from "react";
import { StyleSheet, View } from "react-native";

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

export default function PropertyMapPreview({ latitude, longitude }: Props) {
  const delta = 0.006;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");

  const src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}` +
    `&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;

  return (
    <View style={styles.wrapper}>
      {React.createElement("iframe", {
        src,
        title: "Property location map",
        width: "100%",
        height: "150",
        loading: "lazy",
        style: {
          border: 0,
          width: "100%",
          height: "150px",
          display: "block",
        },
      })}
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
    backgroundColor: "#E5E7EB",
  },
});
