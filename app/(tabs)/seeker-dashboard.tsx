import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const CARD_WIDTH = width * 0.56;
const ACTION_SIZE = (width - H_PAD * 2 - 12) / 2;
const PURPLE = '#7C3AED';

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: '1', icon: 'search',        label: 'Find House',    sub: 'Explore verified listings',      iconColor: '#7C3AED', bg: '#F3F0FF', link: '/search' },
  { id: '2', icon: 'plus-circle',   label: 'Favourites',   sub: 'Manage your favourite listings', iconColor: '#7C3AED', bg: '#F3F0FF', link: '/favourites' },
  { id: '3', icon: 'message-circle', label: 'Messages',    sub: 'Chat with landlords & agents',   iconColor: '#0891B2', bg: '#ECFEFF', link: '/messages' },  // 👈 changed
  { id: '4', icon: 'credit-card',   label: 'Secure Wallet', sub: 'Safe escrow payments',          iconColor: '#D97706', bg: '#FFFBEB', link: '/wallet' },
];

const LISTINGS = [
  {
    id: '1',
    title: 'Modern Duplex in Bastos',
    location: 'Bastos, Yaoundé',
    price: 'FCFA 250,000/mo',
    beds: 3, baths: 2,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
    lastVerified: 'Apr 21, 2026',
  },
  {
    id: '2',
    title: 'Cozy Studio',
    location: 'Bonanjo, Douala',
    price: 'FCFA 120,000/mo',
    beds: 1, baths: 1,
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80',
    lastVerified: 'Apr 19, 2026',
  },
  {
    id: '3',
    title: 'Penthouse Omnisport',
    location: 'Omnisport, Yaoundé',
    price: 'FCFA 450,000/mo',
    beds: 4, baths: 3,
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80',
    lastVerified: 'Apr 22, 2026',
  },
];

// ─── Welcome Modal ────────────────────────────────────────────────────────────
function WelcomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={wm.overlay}>
        <Animated.View style={[wm.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          {/* Top accent */}
          <View style={wm.topAccent} />

          {/* Icon */}
          <View style={wm.iconWrap}>
            <Ionicons name="search" size={30} color="#fff" />
          </View>

          <Text style={wm.title}>Welcome to SweetCasa! 🔍</Text>
          <Text style={wm.subtitle}>You're logged in as a House Seeker</Text>
          <Text style={wm.body}>
            As a House Seeker on SweetCasa, you can{' '}
            <Text style={wm.bold}>search thousands of verified listings</Text> — apartments,
            studios, villas, and more — available for{' '}
            <Text style={wm.bold}>Purchase or Rent</Text> across Cameroon. Find your perfect
            home today!
          </Text>

          {/* Feature highlights */}
          <View style={wm.stepsWrap}>
            {[
              { icon: 'search',         text: 'Search our verified house listings by region' },
              { icon: 'shield',         text: 'Every listing is 12-point verified by our agents' },
              { icon: 'credit-card',    text: 'Pay securely through our escrow wallet system' },
            ].map((step, i) => (
              <View key={i} style={wm.stepRow}>
                <View style={wm.stepIcon}>
                  <Feather name={step.icon as any} size={14} color={PURPLE} />
                </View>
                <Text style={wm.stepTxt}>{step.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={wm.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={wm.btnTxt}>Start Searching</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={wm.skipTxt} onPress={onClose}>
            I'll explore on my own
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ item }: { item: typeof QUICK_ACTIONS[0] }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.actionCard}
      onPress={() => router.push(item.link as any)}
    >
      <View style={[styles.actionIcon, { backgroundColor: item.bg }]}>
        <Feather name={item.icon as any} size={18} color={item.iconColor} />
      </View>
      <Text style={styles.actionLabel}>{item.label}</Text>
      <Text style={styles.actionSub}>{item.sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item }: { item: typeof LISTINGS[0] }) {
  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.listingCard, { width: CARD_WIDTH }]}>
      <View style={styles.listingImgWrap}>
        <Image source={{ uri: item.image }} style={styles.listingImg} resizeMode="cover" />
        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={8} color="#fff" />
          <Text style={styles.verifiedPillTxt}>VERIFIED</Text>
        </View>
        <View style={styles.priceBar}>
          <Text style={styles.priceBarTxt}>{item.price}</Text>
        </View>
      </View>

      <View style={styles.listingBody}>
        <Text style={styles.listingName} numberOfLines={1}>{item.title}</Text>
        <View style={styles.listingLocRow}>
          <Ionicons name="location-outline" size={11} color="#A0A0A0" />
          <Text style={styles.listingLocTxt}>{item.location}</Text>
        </View>
        <View style={styles.listingMetaRow}>
          <Ionicons name="bed-outline" size={11} color="#888" />
          <Text style={styles.listingMetaTxt}>{item.beds} Beds</Text>
          <View style={styles.dot} />
          <MaterialCommunityIcons name="shower" size={11} color="#888" />
          <Text style={styles.listingMetaTxt}>{item.baths} Baths</Text>
        </View>
        <View style={styles.verifyFooter}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={9} color="#7C3AED" />
            <Text style={styles.checkBadgeTxt}>12-Point Check</Text>
          </View>
          <View style={styles.verifyDateRow}>
            <Ionicons name="time-outline" size={9} color="#A0A0A0" />
            <Text style={styles.verifyDateTxt}>{item.lastVerified}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    checkWelcome();
  }, []);

  const checkWelcome = async () => {
    const seen = await AsyncStorage.getItem('seeker_welcome_seen');
    if (!seen) {
      setShowWelcome(true);
      await AsyncStorage.setItem('seeker_welcome_seen', 'true');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Welcome Modal */}
      <WelcomeModal visible={showWelcome} onClose={() => setShowWelcome(false)} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Ionicons name="home" size={16} color="#7C3AED" />
        </View>
        <TouchableOpacity style={styles.bellWrap}>
          <Link href="/notificationcenter">
            <Feather name="bell" size={19} color="#222" />
          </Link>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Welcome */}
        <View style={styles.welcomeRow}>
          <View>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.welcomeHi}>Welcome back,</Text>
            <Text style={styles.welcomeName}>Samuel Eto'o</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map(item => <ActionCard key={item.id} item={item} />)}
        </View>

        {/* AI Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerTag}>
              <Ionicons name="flash" size={10} color="#fff" />
              <Text style={styles.bannerTagTxt}>NEW FEATURE</Text>
            </View>
            <Text style={styles.bannerTitle}>Find Your Perfect Home with Casa-Match AI</Text>
            <Text style={styles.bannerSub}>
              Our AI analyzes your lifestyle preferences to find the 100% compatible home for you.
            </Text>
            <Link href="../casamatch">
              <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.85}>
                <Text style={styles.bannerBtnTxt}>Start Quiz</Text>
                <Feather name="arrow-right" size={13} color="#6D28D9" />
              </TouchableOpacity>
            </Link>
          </View>
          <Text style={styles.bannerBolt}>⚡</Text>
        </View>

        {/* Recommended */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>

        <FlatList
          data={LISTINGS}
          horizontal
          keyExtractor={i => i.id}
          renderItem={({ item }) => <ListingCard item={item} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + 14}
          decelerationRate="fast"
          contentContainerStyle={styles.listingRow}
        />

        {/* Verified Strip */}
        <View style={styles.verifiedStrip}>
          <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedTitle}>SweetCasa Verified</Text>
            <Text style={styles.verifiedSub}>
              Every listing undergoes a rigorous 12-point verification check by our local agents.
            </Text>
          </View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Welcome Modal Styles ─────────────────────────────────────────────────────
const wm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    paddingBottom: 28,
  },
  topAccent: {
    height: 6,
    backgroundColor: PURPLE,
    width: '100%',
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: PURPLE,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 13,
    color: PURPLE,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  body: {
    fontSize: 13.5,
    color: '#555',
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#222',
  },
  stepsWrap: {
    marginHorizontal: 24,
    backgroundColor: '#F8F7FF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 24,
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  skipTxt: {
    textAlign: 'center',
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 14,
    fontWeight: '500',
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 12,
  },
  logoMark: {
    width: 38, height: 38,
    borderRadius: 10,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellWrap: {
    width: 38, height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: H_PAD,
    marginBottom: 28,
  },
  avatar: {
    width: 48, height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#EDE9FE',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1, right: 1,
    width: 11, height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  welcomeHi: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '400',
    marginBottom: 1,
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.5,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: H_PAD,
    marginBottom: 28,
  },
  actionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    width: ACTION_SIZE,
  },
  actionIcon: {
    width: 38, height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  actionSub: {
    fontSize: 11,
    color: '#B0B0B0',
    lineHeight: 15,
  },

  banner: {
    marginHorizontal: H_PAD,
    borderRadius: 20,
    backgroundColor: '#6D28D9',
    padding: 20,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  bannerLeft: { flex: 1 },
  bannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    borderRadius: 30,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 10,
  },
  bannerTagTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 22,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  bannerSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
    marginBottom: 16,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerBtnTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D28D9',
  },
  bannerBolt: {
    fontSize: 72,
    opacity: 0.12,
    color: '#fff',
    position: 'absolute',
    right: -6,
    top: -6,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },

  listingRow: {
    paddingLeft: H_PAD,
    paddingRight: H_PAD / 2,
    gap: 14,
  },
  listingCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  listingImgWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  listingImg: { width: '100%', height: '100%' },
  verifiedPill: {
    position: 'absolute',
    top: 8, left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedPillTxt: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priceBarTxt: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  listingBody: {
    padding: 11,
    gap: 4,
  },
  listingName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.1,
  },
  listingLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  listingLocTxt: {
    fontSize: 10.5,
    color: '#A0A0A0',
  },
  listingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  listingMetaTxt: {
    fontSize: 10.5,
    color: '#666',
  },
  dot: {
    width: 3, height: 3,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 2,
  },

  verifyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  checkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  checkBadgeTxt: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6D28D9',
  },
  verifyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifyDateTxt: {
    fontSize: 9,
    color: '#A0A0A0',
  },

  verifiedStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: H_PAD,
    marginTop: 28,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  verifiedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111',
    marginBottom: 3,
  },
  verifiedSub: {
    fontSize: 11.5,
    color: '#A0A0A0',
    lineHeight: 17,
  },
});