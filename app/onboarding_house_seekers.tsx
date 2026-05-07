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
    body: 'Say goodbye to fake agents and "ghost" houses. Every listing on SweetCasa is pre-screened and document-verified by our team to ensure you only deal with legitimate property owners.',
    accentColor: '#7C3AED',
  },
  {
    id: '2',
    image: require('../assets/seeker_security.png'),
    headline: 'Your Rent is Secured',
    body: 'We hold your payment in a secure escrow. The landlord only gets paid 7 days after you move in, giving you time to ensure the house matches exactly what you paid for.',
    accentColor: '#6D28D9',
  },
  {
    id: '3',
    image: require('../assets/seeker_lifestyle.png'),
    headline: 'Everything You Need, Nearby',
    body: 'Find the home that fits your life, with our Casa-match AI. Our smart filters let you discover properties within walking distance of schools, hospitals, and markets, making your daily commute stress-free.',
    accentColor: '#5B21B6',
  },
];

// ─── Dot Indicator ────────────────────────────────────────────────────────────

const DotIndicator = ({
  count,
  activeIndex,
  color,
}: {
  count: number;
  activeIndex: number;
  color: string;
}) => (
  <View style={styles.dotRow}>
    {Array.from({ length: count }).map((_, i) => (
      <Animated.View
        key={i}
        style={[
          styles.dot,
          {
            backgroundColor: i === activeIndex ? color : '#D8B4FE',
            width: i === activeIndex ? 28 : 8,
          },
        ]}
      />
    ))}
  </View>
);

// ─── Slide Item ───────────────────────────────────────────────────────────────

const SlideItem = ({ item }: { item: Slide }) => (
  // width is set explicitly here — this is what makes paging work
  <View style={[styles.slide, { width }]}>
    <View style={[styles.blob, { backgroundColor: item.accentColor + '18' }]} />
    <View style={styles.imageWrapper}>
      <Image source={item.image} style={styles.illustration} resizeMode="contain" />
    </View>
    <View style={styles.textBlock}>
      <View style={[styles.pill, { backgroundColor: item.accentColor + '15' }]}>
        <Text style={[styles.pillText, { color: item.accentColor }]}>
          🏠 For House Seekers
        </Text>
      </View>
      <Text style={styles.headline}>{item.headline}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SeekerOnboarding() {
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex >= 0 && slideIndex < slides.length && slideIndex !== activeIndex) {
      setActiveIndex(slideIndex);
    }
  };

  const goNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      router.replace('/house_seekers_login_signup');
    }
  };

  const skip = () => router.replace('/house_seekers_login_signup');

  const currentAccent = slides[activeIndex].accentColor;
  // hide skip on the last slide (index 2)
  const showSkip = activeIndex < slides.length - 1;
  const isLast = activeIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <TouchableOpacity onPress={() => router.push('/portal')} style={styles.backBtn} >
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
      {/* Skip — visible on slides 1 and 2 only */}
      {showSkip && (
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: currentAccent }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* 
        getItemLayout is critical — without it, scrollToIndex can silently fail
        because FlatList doesn't know item dimensions ahead of time 
      */}
      <FlatList<Slide>
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SlideItem item={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <DotIndicator count={slides.length} activeIndex={activeIndex} color={currentAccent} />

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: currentAccent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Text style={styles.nextArrow}>{isLast ? '✓' : '→'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  flatList: {
    flex: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, margin: 20,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 52,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  slide: {
    // width is passed as inline style from the screen width
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 28,
  },
  blob: {
    position: 'absolute',
    top: 60,
    left: width * 0.1,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
  },
  imageWrapper: {
    width: width * 0.75,
    height: height * 0.36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  bottomBar: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 50,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  nextArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});