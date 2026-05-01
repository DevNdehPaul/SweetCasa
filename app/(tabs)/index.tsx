import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  FlatList,
  Image,
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: '1', icon: 'search',      label: 'Find House',    sub: 'Explore verified listings', iconColor: '#7C3AED', bg: '#F3F0FF', link:'/search' },
  { id: '2', icon: 'plus-circle', label: 'List Property', sub: 'Become a verified host',    iconColor: '#7C3AED', bg: '#F3F0FF', link:'/list-property' },
  { id: '3', icon: 'map',         label: 'Neighborhood',  sub: 'Explore safe areas',        iconColor: '#059669', bg: '#ECFDF5', link:'/neighborhood' },
  { id: '4', icon: 'credit-card', label: 'Secure Wallet', sub: 'Safe escrow payments',      iconColor: '#D97706', bg: '#FFFBEB', link:'/wallet' },
];

const LISTINGS = [
  {
    id: '1',
    title: 'Modern Duplex in Bastos',
    location: 'Bastos, Yaoundé',
    price: 'FCFA 250,000/mo',
    beds: 3, baths: 2,
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
    lastVerified: 'Apr 21, 2026',   // ← NEW
  },
  {
    id: '2',
    title: 'Cozy Studio',
    location: 'Bonanjo, Douala',
    price: 'FCFA 120,000/mo',
    beds: 1, baths: 1,
    image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80',
    lastVerified: 'Apr 19, 2026',   // ← NEW
  },
  {
    id: '3',
    title: 'Penthouse Omnisport',
    location: 'Omnisport, Yaoundé',
    price: 'FCFA 450,000/mo',
    beds: 4, baths: 3,
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80',
    lastVerified: 'Apr 22, 2026',   // ← NEW
  },
];

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

        {/* Verified pill — top left */}
        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={8} color="#fff" />
          <Text style={styles.verifiedPillTxt}>VERIFIED</Text>
        </View>

        {/* Price bar — bottom */}
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

        {/* ── NEW: Verification footer ── */}
        <View style={styles.verifyFooter}>
          {/* 12-Point Check badge */}
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={9} color="#7C3AED" />
            <Text style={styles.checkBadgeTxt}>12-Point Check</Text>
          </View>

          {/* Last Verified date */}
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
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 16 },

  // ── Header
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

  // ── Welcome
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

  // ── Quick Actions
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

  // ── AI Banner
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

  // ── Section Header
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

  // ── Listing Cards
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

  // ── NEW: Verification footer on listing card
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

  // ── Verified Strip
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
  width: ACTION_SIZE,  // ← make sure width is here, not just in the component
},
});