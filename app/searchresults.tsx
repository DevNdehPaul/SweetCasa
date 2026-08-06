import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next"; // adjust path as needed
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BASE_URL } from "../constants/api";
import { ThemeColors } from "../constants/theme";
import { useAppTheme } from "../hooks/use-app-theme"; // adjust relative path if needed
import useFavourite from "../hooks/useFavourite";

const { width } = Dimensions.get("window");
const H_PAD = 16;
const CARD_W = (width - H_PAD * 2 - 12) / 2;

interface ListingImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}
interface Listing {
  id: number;
  title: string;
  type: string;
  price: string;
  city: string;
  region: string;
  neighborhood: string | null;
  status: string;
  paymentFrequency: string | null;
  images: ListingImage[];
}

function getPrimaryImage(images: ListingImage[]) {
  if (!images?.length) return null;
  return (
    images.find((i) => i.isPrimary)?.imageUrl ??
    [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl
  );
}

function formatPrice(
  price: string,
  freq: string | null,
  t: (key: string) => string,
) {
  const n = Number(price);
  const f =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`
      : n.toLocaleString("fr-CM");
  if (freq === "For Sale") return `${f} XAF`;
  if (freq === "Yearly")
    return `${f} XAF/${t("propertyDetail.yearlyPeriod").replace("/ ", "")}`;
  return `${f} XAF/${t("propertyDetail.monthlyPeriod").replace("/ ", "")}`;
}

function ListingCard({
  item,
  t,
  colors,
  styles,
}: {
  item: Listing;
  t: (key: string) => string;
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}) {
  const { isFavourite, toggleFavourite } = useFavourite();
  const saved = isFavourite(String(item.id));
  const img = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region]
    .filter(Boolean)
    .join(", ");

  const handlePress = () => {
    router.push({
      pathname: "/propertydetail",
      params: {
        id: String(item.id),
        listingData: JSON.stringify(item),
      },
    });
  };

  const handleToggleSave = async () => {
    const ok = await toggleFavourite(String(item.id));
    if (!ok) {
      Alert.alert(t("favourites.loginTitle"), t("favourites.loginDesc"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("auth.login"),
          onPress: () => router.push("/house_seekers_login_signup" as any),
        },
      ]);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_W }]}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      <View style={styles.cardImgWrap}>
        {img ? (
          <Image
            source={{ uri: img }}
            style={styles.cardImg}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
        )}
        <View style={styles.pricePill}>
          <Text style={styles.pricePillTxt}>
            {formatPrice(item.price, item.paymentFrequency, t)}
          </Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={handleToggleSave}>
          <Ionicons
            name={saved ? "heart" : "heart-outline"}
            size={14}
            color={saved ? colors.danger : colors.textMuted}
          />
        </TouchableOpacity>
        {item.status === "Approved" && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>
              {t("searchResults.verified")}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color={colors.textLight} />
          <Text style={styles.locationTxt} numberOfLines={1}>
            {location}
          </Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipTxt}>{item.type}</Text>
          </View>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompactCard({
  item,
  t,
  colors,
  styles,
}: {
  item: Listing;
  t: (key: string) => string;
  colors: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}) {
  const img = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region]
    .filter(Boolean)
    .join(", ");

  return (
    <TouchableOpacity
      style={styles.compactCard}
      activeOpacity={0.88}
      onPress={() =>
        router.push({
          pathname: "/propertydetail",
          params: {
            id: String(item.id),
            listingData: JSON.stringify(item),
          },
        })
      }
    >
      <View style={styles.compactImgWrap}>
        {img ? (
          <Image
            source={{ uri: img }}
            style={styles.compactImg}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.compactImg, styles.cardImgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏠</Text>
          </View>
        )}
        <View style={styles.compactPricePill}>
          <Text style={styles.pricePillTxt}>
            {formatPrice(item.price, item.paymentFrequency, t)}
          </Text>
        </View>
      </View>
      <View style={styles.compactBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.compactLocation} numberOfLines={1}>
          {location}
        </Text>
        <View style={styles.compactFooter}>
          <Text style={styles.compactType}>{item.type}</Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const raw = useLocalSearchParams<{
    region?: string;
    city?: string;
    neighborhood?: string;
    type?: string;
    status?: string;
    state?: string;
    maxBudget?: string;
    facilities?: string;
  }>();

  const paramsRef = useRef(raw);
  useEffect(() => {
    paramsRef.current = raw;
  }, [raw]);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [otherOptions, setOtherOptions] = useState<Listing[]>([]);
  const [otherOptionsLoading, setOtherOptionsLoading] = useState(false);

  const fetchOtherOptions = async (strictListings: Listing[]) => {
    setOtherOptionsLoading(true);
    try {
      const p = paramsRef.current;
      const query = new URLSearchParams();
      if (p.region) query.set("region", p.region);
      if (p.city) query.set("city", p.city);
      if (p.maxBudget) {
        const relaxedBudget = Math.max(
          30_000,
          Math.round(Number(p.maxBudget) * 1.25),
        );
        query.set("maxBudget", String(relaxedBudget));
      }
      query.set("state", "Available");
      query.set("page", "1");
      query.set("limit", "8");

      const res = await fetch(`${BASE_URL}/listings?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("errors.serverError"));

      const strictIds = new Set(strictListings.map((item) => item.id));
      const relaxed = (data.listings as Listing[]).filter(
        (item) => item.status !== "Unavailable" && !strictIds.has(item.id),
      );
      setOtherOptions(relaxed);
    } catch {
      setOtherOptions([]);
    } finally {
      setOtherOptionsLoading(false);
    }
  };

  const fetchListings = async (pg = 1) => {
    if (pg === 1) setLoading(true);
    setError(null);

    try {
      const p = paramsRef.current;
      const query = new URLSearchParams();
      if (p.region) query.set("region", p.region);
      if (p.city) query.set("city", p.city);
      if (p.neighborhood) query.set("neighborhood", p.neighborhood);
      if (p.type) query.set("type", p.type);
      query.set(
        "state",
        p.state && p.state !== "Unavailable" ? p.state : "Available",
      );
      if (p.status) query.set("status", p.status);
      if (p.maxBudget) query.set("maxBudget", p.maxBudget);
      if (p.facilities) query.set("facilities", p.facilities);
      query.set("page", String(pg));
      query.set("limit", "20");

      const res = await fetch(`${BASE_URL}/listings?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("errors.serverError"));

      const visibleListings = (data.listings as Listing[]).filter(
        (item) => item.status !== "Unavailable",
      );
      setListings(
        pg === 1 ? visibleListings : (prev) => [...prev, ...visibleListings],
      );
      setTotal(data.total);
      setHasMore(pg < data.pages);
      setPage(pg);

      if (pg === 1) {
        void fetchOtherOptions(visibleListings);
      }
    } catch (err: any) {
      setError(err.message || t("errors.error"));
      if (pg === 1) {
        void fetchOtherOptions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const p = paramsRef.current;
  const filterSummary = [
    p.region,
    p.type,
    p.maxBudget
      ? `≤ ${
          Number(p.maxBudget) >= 1e9
            ? (Number(p.maxBudget) / 1e9).toFixed(1) + "B"
            : Number(p.maxBudget) >= 1e6
              ? (Number(p.maxBudget) / 1e6).toFixed(0) + "M"
              : (Number(p.maxBudget) / 1000).toFixed(0) + "k"
        } XAF`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // No exact (strict) matches — we'll fall back to the relaxed "other options" results.
  const noExactMatches = !loading && !error && listings.length === 0;
  const displayListings = noExactMatches ? otherOptions : listings;
  // Only the true empty state: nothing strict AND nothing relaxed either.
  const trulyEmpty =
    noExactMatches && !otherOptionsLoading && otherOptions.length === 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("searchResults.title")}</Text>
          {filterSummary ? (
            <Text style={styles.headerSub} numberOfLines={1}>
              {filterSummary}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTxt}>{t("searchResults.finding")}</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchListings(1)}
          >
            <Text style={styles.retryTxt}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : trulyEmpty ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🏘️</Text>
          <Text style={styles.emptyTitle}>
            {t("searchResults.noPropertiesTitle")}
          </Text>
          <Text style={styles.emptyDesc}>
            {t("searchResults.noPropertiesDesc")}
          </Text>
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.adjustTxt}>
              {t("searchResults.adjustFilters")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : noExactMatches && otherOptionsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTxt}>
            {t("searchResults.loadingAlternatives")}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.metaRow}>
            {noExactMatches ? (
              <View>
                <Text style={styles.metaSmall}>
                  {t("searchResults.otherOptionsTitle")}
                </Text>
                <Text style={styles.altSub}>
                  {t("searchResults.otherOptionsSub")}
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.metaSmall}>
                  {t("searchResults.foundForYou")}
                </Text>
                <Text style={styles.metaBig}>
                  {total}{" "}
                  {t(
                    total !== 1
                      ? "searchResults.listings"
                      : "searchResults.listing",
                  )}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {displayListings.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                t={t}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>

          {!noExactMatches && hasMore && (
            <TouchableOpacity
              style={styles.seeMoreBtn}
              activeOpacity={0.8}
              onPress={() => fetchListings(page + 1)}
              disabled={loading}
            >
              <Text style={styles.seeMoreTxt}>
                {t("searchResults.loadMore")}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}

          {!noExactMatches && (
            <Text style={styles.showingTxt}>
              {t("searchResults.showing")} {listings.length}{" "}
              {t("searchResults.of")} {total} {t("searchResults.results")}
            </Text>
          )}

          {!noExactMatches && otherOptions.length > 0 && (
            <View style={styles.altSection}>
              <View style={styles.altHeader}>
                <Text style={styles.altTitle}>
                  {t("searchResults.otherOptionsTitle")}
                </Text>
                <Text style={styles.altSub}>
                  {t("searchResults.otherOptionsSub")}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.altRow}
              >
                {otherOptions.map((item) => (
                  <CompactCard
                    key={`alt-${item.id}`}
                    item={item}
                    t={t}
                    colors={colors}
                    styles={styles}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 16 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: 24,
    },
    loadingTxt: { fontSize: 14, color: colors.textMuted },
    errorTxt: { fontSize: 14, color: colors.danger, textAlign: "center" },
    retryBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    retryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: 8,
    },
    iconBtn: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
    headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 16,
    },
    metaSmall: { fontSize: 11.5, color: colors.textLight, marginBottom: 2 },
    metaBig: { fontSize: 15, fontWeight: "700", color: colors.text },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

    card: {
      borderRadius: 16,
      backgroundColor: colors.card,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: "#000",
      shadowOpacity: 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    cardImgWrap: { width: "100%", height: CARD_W * 0.85, position: "relative" },
    cardImg: { width: "100%", height: "100%" },
    cardImgPlaceholder: {
      backgroundColor: colors.primaryTintAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    pricePill: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pricePillTxt: { fontSize: 9, fontWeight: "700", color: "#fff" },
    saveBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    verifiedBadge: {
      position: "absolute",
      bottom: 8,
      left: 8,
      backgroundColor: "rgba(0,0,0,0.5)", // sits over a photo — same in both themes
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    verifiedTxt: {
      fontSize: 8.5,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.5,
    },

    cardBody: { padding: 10, gap: 4 },
    cardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.1,
    },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    locationTxt: { fontSize: 11, color: colors.textLight, flex: 1 },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
    },
    typeChip: {
      backgroundColor: colors.divider,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeChipTxt: { fontSize: 10.5, color: colors.textMuted, fontWeight: "600" },

    emptyIcon: { fontSize: 48, marginBottom: 4 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    emptyDesc: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 8,
    },
    adjustBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
    },
    adjustTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

    seeMoreBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 30,
      paddingVertical: 14,
      marginTop: 20,
    },
    seeMoreTxt: { fontSize: 14, fontWeight: "700", color: colors.primary },
    showingTxt: {
      textAlign: "center",
      fontSize: 12,
      color: colors.textLight,
      marginTop: 10,
    },

    altSection: {
      marginTop: 28,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    altHeader: { marginBottom: 12 },
    altTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 4 },
    altSub: { fontSize: 12, color: colors.textLight, lineHeight: 17 },
    altRow: { gap: 12, paddingRight: 20 },
    compactCard: {
      width: 240,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    compactImgWrap: { height: 150, position: "relative" },
    compactImg: { width: "100%", height: "100%" },
    compactPricePill: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    compactBody: { padding: 12, gap: 4 },
    compactLocation: { fontSize: 11.5, color: colors.textMuted },
    compactFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
    },
    compactType: { fontSize: 10.5, color: colors.textMuted, fontWeight: "600" },
  });
}