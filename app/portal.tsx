import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors } from '../constants/theme';
import { useAppTheme } from '../hooks/use-app-theme';

const { width } = Dimensions.get('window');

// White/translucent-white text and icons sitting directly on the solid
// purple primary card stay hardcoded — that swatch doesn't change between
// light/dark, so the overlay on it shouldn't either.
const WHITE = '#FFFFFF';
const WHITE_78 = 'rgba(255,255,255,0.78)';
const WHITE_85 = 'rgba(255,255,255,0.85)';
const WHITE_OVERLAY = 'rgba(255,255,255,0.18)';

export default function WelcomeScreen() {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const card1Anim = useRef(new Animated.Value(50)).current;
  const card2Anim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.stagger(100, [
        Animated.timing(card1Anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(card2Anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.primaryTint}
      />

      {/* Background blobs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={s.blobTop} />
        <View style={s.blobBottom} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={s.logoMark}>
            <Feather name="home" size={16} color={WHITE} />
          </View>
          <Text style={s.brandName}>SweetCasa</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View style={[s.titleBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={s.title}>Find Your Perfect Home</Text>
          <Text style={s.subtitle}>What brings you here today?</Text>
        </Animated.View>

        {/* House Seekers Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: card1Anim }] }}>
          <TouchableOpacity
            style={s.cardPrimary}
            activeOpacity={0.87}
            onPress={() => router.push('/onboarding_house_seekers')}
          >
            <View style={s.iconWrapPrimary}>
              <Feather name="search" size={30} color={WHITE} />
            </View>
            <Text style={s.cardTitlePrimary}>House Seekers</Text>
            <Text style={s.cardDescPrimary}>Browse listings and find your ideal property to rent or buy.</Text>
            <View style={s.arrowBtnPrimary}>
              <Feather name="arrow-right" size={16} color={WHITE_85} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* House Owners Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: card2Anim }] }}>
          <TouchableOpacity
            style={s.cardSecondary}
            activeOpacity={0.87}
            onPress={() => router.push('/onboarding_house_owners')}
          >
            <View style={s.iconWrapSecondary}>
              <Feather name="key" size={28} color={colors.primary} />
            </View>
            <Text style={s.cardTitleSecondary}>House Owners</Text>
            <Text style={s.cardDescSecondary}>List your property and connect with verified tenants or buyers.</Text>
            <View style={s.arrowBtnSecondary}>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.primaryTint },
    blobTop: {
      position: 'absolute', width: 260, height: 260, borderRadius: 130,
      backgroundColor: colors.primarySoft, opacity: 0.45, top: -90, right: -70,
    },
    blobBottom: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: colors.primaryBorder, opacity: 0.5, bottom: -50, left: -50,
    },
    scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
    logoMark: {
      width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 }, elevation: 5,
    },
    brandName: { fontSize: 18, fontWeight: '800', color: colors.primaryDarker, letterSpacing: -0.3 },
    titleBlock: { alignItems: 'center', marginBottom: 28 },
    title: { fontSize: 32, fontWeight: '800', color: colors.primaryDarker, letterSpacing: -0.6, marginBottom: 6 },
    subtitle: { fontSize: 14.5, color: colors.textMuted, fontWeight: '400' },
    cardPrimary: {
      backgroundColor: colors.primary, borderRadius: 26,
      paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', marginBottom: 16,
      shadowColor: colors.primaryDarker, shadowOpacity: 0.4, shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 }, elevation: 10,
    },
    iconWrapPrimary: {
      width: 72, height: 72, borderRadius: 22,
      backgroundColor: WHITE_OVERLAY, alignItems: 'center',
      justifyContent: 'center', marginBottom: 20,
    },
    cardTitlePrimary: {
      fontSize: 22, fontWeight: '800', color: WHITE,
      letterSpacing: -0.3, marginBottom: 10, textAlign: 'center',
    },
    cardDescPrimary: {
      fontSize: 14, color: WHITE_78,
      textAlign: 'center', lineHeight: 22, maxWidth: 230, marginBottom: 20,
    },
    arrowBtnPrimary: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: WHITE_OVERLAY, alignItems: 'center', justifyContent: 'center',
    },
    cardSecondary: {
      backgroundColor: colors.card, borderRadius: 26,
      paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', marginBottom: 28,
      shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 }, elevation: 3,
      borderWidth: 1.5, borderColor: colors.primaryBorder,
    },
    iconWrapSecondary: {
      width: 72, height: 72, borderRadius: 22, backgroundColor: colors.primaryTintAlt,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    cardTitleSecondary: {
      fontSize: 22, fontWeight: '800', color: colors.primaryDarker,
      letterSpacing: -0.3, marginBottom: 10, textAlign: 'center',
    },
    cardDescSecondary: {
      fontSize: 14, color: colors.textMuted, textAlign: 'center',
      lineHeight: 22, maxWidth: 230, marginBottom: 20,
    },
    arrowBtnSecondary: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center',
    },
  });
}