import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const PURPLE_LIGHT = '#F0EBFF';

interface Slide {
  id: string;
  image: any;
  headline: string;
  body: string;
  accentColor: string;
}

const slides: Slide[] = [
  {
    id: '1',
    image: require('../assets/seeker_verified.png'),
    headline: 'Verified Listings Only',
    body: 'Say goodbye to fake agents and "ghost" houses. Every listing on SweetCasa is pre-screened and document-verified by our team.',
    accentColor: '#7C3AED',
  },
  {
    id: '2',
    image: require('../assets/seeker_security.png'),
    headline: 'Your Rent is Secured',
    body: 'We hold your payment in a secure escrow. The landlord only gets paid 7 days after you move in, giving you time to verify everything.',
    accentColor: '#6D28D9',
  },
  {
    id: '3',
    image: require('../assets/seeker_lifestyle.png'),
    headline: 'Everything You Need, Nearby',
    body: 'Find the home that fits your life with our Casa-match AI. Discover properties near schools, hospitals, and markets.',
    accentColor: '#5B21B6',
  },
];

const DotIndicator = ({ count, activeIndex, color }: { count: number; activeIndex: number; color: string }) => (
  <View style={styles.dotRow}>
    {Array.from({ length: count }).map((_, i) => (
      <Animated.View
        key={i}
        style={[styles.dot, { backgroundColor: i === activeIndex ? color : '#D8B4FE', width: i === activeIndex ? 28 : 8 }]}
      />
    ))}
  </View>
);

const SlideItem = ({ item }: { item: Slide }) => (
  <View style={[styles.slide, { width }]}>
    <View style={[styles.blob, { backgroundColor: item.accentColor + '18' }]} />
    <View style={styles.imageWrapper}>
      <Image source={item.image} style={styles.illustration} resizeMode="contain" />
    </View>
    <View style={styles.textBlock}>
      <View style={[styles.pill, { backgroundColor: item.accentColor + '15' }]}>
        <Text style={[styles.pillText, { color: item.accentColor }]}>🏠 For House Seekers</Text>
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  </View>
);

export default function SeekerOnboarding() {
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx >= 0 && idx < slides.length && idx !== activeIndex) setActiveIndex(idx);
  };

  const goNext = () => {
    if (activeIndex < slides.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      router.replace('/house_seekers_login_signup');
    }
  };

  const currentAccent = slides[activeIndex].accentColor;
  const isLast = activeIndex === slides.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/portal')} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        {!isLast && (
          <TouchableOpacity style={[styles.skipBtn, { backgroundColor: currentAccent + '20' }]} onPress={() => router.replace('/house_seekers_login_signup')}>
            <Text style={[styles.skipText, { color: currentAccent }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList<Slide>
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      />

      <View style={styles.bottomBar}>
        <DotIndicator count={slides.length} activeIndex={activeIndex} color={currentAccent} />
        <TouchableOpacity style={[styles.nextBtn, { backgroundColor: currentAccent }]} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
          {/* Use Feather icon instead of unicode arrow — renders correctly on all Android devices */}
          <Feather name={isLast ? 'check' : 'arrow-right'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20,
  },
  skipText: { fontSize: 14, fontWeight: '600' },

  slide: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  blob: {
    position: 'absolute',
    top: 0,
    left: width * 0.1,
    width: width * 0.8,
    height: width * 0.6,
    borderRadius: width * 0.4,
  },
  imageWrapper: {
    width: width * 0.72,
    height: height * 0.30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  illustration: { width: '100%', height: '100%' },

  textBlock: { alignItems: 'center', paddingHorizontal: 8 },
  pill: {
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14, marginBottom: 14,
  },
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  headline: {
    fontSize: 24, fontWeight: '800', color: '#1A1A2E',
    textAlign: 'center', lineHeight: 32, marginBottom: 12, letterSpacing: -0.4,
  },
  body: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, fontWeight: '400',
  },

  bottomBar: {
    paddingHorizontal: 28, paddingBottom: 16, paddingTop: 12, // ✅ moved up
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 50,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});