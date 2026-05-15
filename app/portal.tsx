import { Feather } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();

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
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#F0EEFF" />

      {/* Background blobs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoMark}>
            <Feather name="home" size={16} color="#fff" />
          </View>
          <Text style={styles.brandName}>SweetCasa</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.title}>{t('portal.title')}</Text>
          <Text style={styles.subtitle}>{t('portal.subtitle')}</Text>
        </Animated.View>

        {/* House Seekers Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: card1Anim }] }}>
          <TouchableOpacity
            style={styles.cardPrimary}
            activeOpacity={0.87}
            onPress={() => router.push('/onboarding_house_seekers')}
          >
            <View style={styles.iconWrapPrimary}>
              <Feather name="search" size={30} color="#fff" />
            </View>
            <Text style={styles.cardTitlePrimary}>{t('portal.seekerTitle')}</Text>
            <Text style={styles.cardDescPrimary}>{t('portal.seekerDesc')}</Text>
            <View style={styles.arrowBtnPrimary}>
              <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.85)" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* House Owners Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: card2Anim }] }}>
          <TouchableOpacity
            style={styles.cardSecondary}
            activeOpacity={0.87}
            onPress={() => router.push('/onboarding_house_owners')}
          >
            <View style={styles.iconWrapSecondary}>
              <Feather name="key" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.cardTitleSecondary}>{t('portal.ownerTitle')}</Text>
            <Text style={styles.cardDescSecondary}>{t('portal.ownerDesc')}</Text>
            <View style={styles.arrowBtnSecondary}>
              <Feather name="arrow-right" size={16} color="#7C3AED" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged) ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0EEFF' },
  blobTop: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#DDD6FE', opacity: 0.45, top: -90, right: -70,
  },
  blobBottom: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#EDE9FE', opacity: 0.5, bottom: -50, left: -50,
  },
  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoMark: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#7C3AED',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  brandName: { fontSize: 18, fontWeight: '800', color: '#3B0764', letterSpacing: -0.3 },
  titleBlock: { alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '800', color: '#1F0A4C', letterSpacing: -0.6, marginBottom: 6 },
  subtitle: { fontSize: 14.5, color: '#7C6FA0', fontWeight: '400' },
  cardPrimary: {
    backgroundColor: '#7C3AED', borderRadius: 26,
    paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', marginBottom: 16,
    shadowColor: '#5B21B6', shadowOpacity: 0.4, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  iconWrapPrimary: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  cardTitlePrimary: {
    fontSize: 22, fontWeight: '800', color: '#fff',
    letterSpacing: -0.3, marginBottom: 10, textAlign: 'center',
  },
  cardDescPrimary: {
    fontSize: 14, color: 'rgba(255,255,255,0.78)',
    textAlign: 'center', lineHeight: 22, maxWidth: 230, marginBottom: 20,
  },
  arrowBtnPrimary: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  cardSecondary: {
    backgroundColor: '#fff', borderRadius: 26,
    paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', marginBottom: 28,
    shadowColor: '#7C3AED', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
    borderWidth: 1.5, borderColor: '#EDE9FE',
  },
  iconWrapSecondary: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  cardTitleSecondary: {
    fontSize: 22, fontWeight: '800', color: '#1F0A4C',
    letterSpacing: -0.3, marginBottom: 10, textAlign: 'center',
  },
  cardDescSecondary: {
    fontSize: 14, color: '#7C6FA0', textAlign: 'center',
    lineHeight: 22, maxWidth: 230, marginBottom: 20,
  },
  arrowBtnSecondary: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
});