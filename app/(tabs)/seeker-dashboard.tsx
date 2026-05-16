import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  View
} from 'react-native';
import { BASE_URL } from '../../constants/api';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const CARD_WIDTH = width * 0.56;
const ACTION_SIZE = (width - H_PAD * 2 - 12) / 2;
const PURPLE = '#7C3AED';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ListingImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Listing {
  id: number;
  title: string;
  city: string;
  region: string;
  neighborhood: string | null;
  price: string;
  paymentFrequency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
  createdAt?: string;
  images: ListingImage[];
}

interface UserProfile {
  name: string;
  avatarUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPrimaryImage(images: ListingImage[]): string | null {
  if (!images?.length) return null;
  return (
    images.find(i => i.isPrimary)?.imageUrl ??
    [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.imageUrl ??
    null
  );
}

function formatPrice(price: string, freq: string | null): string {
  const n = Number(price);
  const f =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
      : n.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `FCFA ${f}`;
  if (freq === 'Yearly')   return `FCFA ${f}/yr`;
  return `FCFA ${f}/mo`;
}

function getFirstName(fullName: string): string {
  return fullName?.split(' ')[0] ?? fullName ?? '';
}

// ─── Welcome Modal ────────────────────────────────────────────────────────────
function WelcomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={wm.overlay}>
        <Animated.View style={[wm.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
          <View style={wm.topAccent} />
          <View style={wm.iconWrap}>
            <Ionicons name="search" size={30} color="#fff" />
          </View>
          <Text style={wm.title}>{t('seekerDashboard.welcomeTitle')}</Text>
          <Text style={wm.subtitle}>{t('seekerDashboard.welcomeSubtitle')}</Text>
          <Text style={wm.body}>
            {t('seekerDashboard.welcomeBody').split(t('seekerDashboard.welcomeBold1'))[0]}
            <Text style={wm.bold}>{t('seekerDashboard.welcomeBold1')}</Text>
            {t('seekerDashboard.welcomeBody').split(t('seekerDashboard.welcomeBold1'))[1]?.split(t('seekerDashboard.welcomeBold2'))[0]}
            <Text style={wm.bold}>{t('seekerDashboard.welcomeBold2')}</Text>
            {t('seekerDashboard.welcomeBody').split(t('seekerDashboard.welcomeBold2'))[1]}
          </Text>
          <View style={wm.stepsWrap}>
            {[
              { icon: 'search',      text: t('seekerDashboard.step1') },
              { icon: 'shield',      text: t('seekerDashboard.step2') },
              { icon: 'credit-card', text: t('seekerDashboard.step3') },
            ].map((step, i) => (
              <View key={i} style={wm.stepRow}>
                <View style={wm.stepIcon}>
                  <Feather name={step.icon as any} size={14} color={PURPLE} />
                </View>
                <Text style={wm.stepTxt}>{step.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={wm.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={wm.btnTxt}>{t('seekerDashboard.startSearching')}</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={wm.skipTxt} onPress={onClose}>{t('seekerDashboard.exploreOwn')}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({
  item,
}: {
  item: { id: string; icon: string; label: string; sub: string; iconColor: string; bg: string; link: string };
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.actionCard} onPress={() => router.push(item.link as any)}>
      <View style={[styles.actionIcon, { backgroundColor: item.bg }]}>
        <Feather name={item.icon as any} size={18} color={item.iconColor} />
      </View>
      <Text style={styles.actionLabel}>{item.label}</Text>
      <Text style={styles.actionSub}>{item.sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item }: { item: Listing }) {
  const { t } = useTranslation();
  const imageUrl = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region].filter(Boolean).join(', ');

  const handlePress = () => {
    router.push({
      pathname: '/propertydetail',
      params: {
        id: String(item.id),
        listingData: JSON.stringify(item),
      },
    });
  };

  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.listingCard, { width: CARD_WIDTH }]} onPress={handlePress}>
      <View style={styles.listingImgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.listingImg} resizeMode="cover" />
        ) : (
          <View style={[styles.listingImg, styles.listingImgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏠</Text>
          </View>
        )}
        <View style={styles.verifiedPill}>
          <Ionicons name="shield-checkmark" size={8} color="#fff" />
          <Text style={styles.verifiedPillTxt}>{t('seekerDashboard.verified')}</Text>
        </View>
        <View style={styles.priceBar}>
          <Text style={styles.priceBarTxt}>{formatPrice(item.price, item.paymentFrequency)}</Text>
        </View>
      </View>
      <View style={styles.listingBody}>
        <Text style={styles.listingName} numberOfLines={1}>{item.title}</Text>
        <View style={styles.listingLocRow}>
          <Ionicons name="location-outline" size={11} color="#A0A0A0" />
          <Text style={styles.listingLocTxt} numberOfLines={1}>{location}</Text>
        </View>
        <View style={styles.listingMetaRow}>
          <Ionicons name="bed-outline" size={11} color="#888" />
          <Text style={styles.listingMetaTxt}>{item.bedrooms ?? '—'} Beds</Text>
          <View style={styles.dot} />
          <MaterialCommunityIcons name="shower" size={11} color="#888" />
          <Text style={styles.listingMetaTxt}>{item.bathrooms ?? '—'} Baths</Text>
        </View>
        <View style={styles.verifyFooter}>
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark-circle" size={9} color="#7C3AED" />
            <Text style={styles.checkBadgeTxt}>{t('seekerDashboard.checkBadge')}</Text>
          </View>
          <View style={styles.newBadge}>
            <Feather name="zap" size={9} color="#D97706" />
            <Text style={styles.newBadgeTxt}>NEW</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Listing Skeleton ─────────────────────────────────────────────────────────
function ListingSkeleton() {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.listingCard, { width: CARD_WIDTH, opacity: anim }]}>
      <View style={[styles.listingImgWrap, { backgroundColor: '#E5E7EB' }]} />
      <View style={{ padding: 11, gap: 8 }}>
        <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, width: '80%' }} />
        <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, width: '60%' }} />
        <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 6, width: '50%' }} />
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t } = useTranslation();

  const [showWelcome, setShowWelcome] = useState(false);
  const [user, setUser]               = useState<UserProfile>({ name: '', avatarUrl: null });
  const [listings, setListings]       = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    initScreen();
  }, []);

  const initScreen = async () => {
    await Promise.all([checkWelcome(), loadUser(), fetchNewestListings()]);
  };

  // ── Show modal on every fresh signup.
  // ── The signup screen must call:
  // ──   await AsyncStorage.removeItem('seeker_welcome_seen');
  // ── before navigating here. This function then detects the absent key
  // ── and shows the modal, setting the key so it won't show again on
  // ── subsequent visits (until the next signup clears it again).
  const checkWelcome = async () => {
    try {
      const seen = await AsyncStorage.getItem('seeker_welcome_seen');
      if (!seen) {
        setShowWelcome(true);
        await AsyncStorage.setItem('seeker_welcome_seen', 'true');
      }
    } catch {
      // ignore
    }
  };

  const loadUser = async () => {
    try {
      const [rawProfile, storedRole] = await Promise.all([
        AsyncStorage.getItem('profile'),
        AsyncStorage.getItem('role'),
      ]);
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile);
        const isSeller = storedRole === 'SELLER';
        const resolvedName = isSeller
          ? (parsed.companyName || parsed.name || '')
          : (parsed.fullName   || parsed.name || '');
        setUser({
          name: resolvedName,
          avatarUrl: parsed.avatarUrl ?? parsed.avatar ?? null,
        });
      }
    } catch {
      // ignore
    }
  };

  const fetchNewestListings = async () => {
    setListingsLoading(true);
    try {
      const query = new URLSearchParams({
        limit: '5',
        page: '1',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        status: 'Approved',
      });
      const res = await fetch(`${BASE_URL}/listings?${query.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const items: Listing[] = Array.isArray(data) ? data : (data.listings ?? []);
      setListings(items.slice(0, 5));
    } catch {
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  };

  const QUICK_ACTIONS = [
    { id: '1', icon: 'search',         label: t('seekerDashboard.findHouse'),    sub: t('seekerDashboard.findHouseSub'),    iconColor: '#7C3AED', bg: '#F3F0FF', link: '/search' },
    { id: '2', icon: 'plus-circle',    label: t('seekerDashboard.favourites'),   sub: t('seekerDashboard.favouritesSub'),   iconColor: '#7C3AED', bg: '#F3F0FF', link: '/favourites' },
    { id: '3', icon: 'message-circle', label: t('seekerDashboard.messages'),     sub: t('seekerDashboard.messagesSub'),     iconColor: '#0891B2', bg: '#ECFEFF', link: '/messages' },
    { id: '4', icon: 'credit-card',    label: t('seekerDashboard.secureWallet'), sub: t('seekerDashboard.secureWalletSub'), iconColor: '#D97706', bg: '#FFFBEB', link: '/wallet' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
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

        {/* Welcome row */}
        <View style={styles.welcomeRow}>
          <View>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Feather name="user" size={20} color={PURPLE} />
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <View>
            <Text style={styles.welcomeHi}>{t('seekerDashboard.welcomeHi')}</Text>
            <Text style={styles.welcomeName} numberOfLines={1}>
              {getFirstName(user.name) || 'there'}
            </Text>
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
              <Text style={styles.bannerTagTxt}>{t('seekerDashboard.newFeature')}</Text>
            </View>
            <Text style={styles.bannerTitle}>{t('seekerDashboard.aiTitle')}</Text>
            <Text style={styles.bannerSub}>{t('seekerDashboard.aiSub')}</Text>
            <Link href="../casamatch" asChild>
              <TouchableOpacity style={styles.bannerBtn} activeOpacity={0.85}>
                <Text style={styles.bannerBtnTxt}>{t('seekerDashboard.startQuiz')}</Text>
                <Feather name="arrow-right" size={13} color="#6D28D9" />
              </TouchableOpacity>
            </Link>
          </View>
          <Text style={styles.bannerBolt}>⚡</Text>
        </View>

        {/* Recommended */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('seekerDashboard.recommended')}</Text>
          <TouchableOpacity onPress={() => router.push('/search' as any)}>
            <Text style={styles.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {listingsLoading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            keyExtractor={i => String(i)}
            renderItem={() => <ListingSkeleton />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listingRow}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            scrollEnabled={false}
          />
        ) : listings.length === 0 ? (
          <View style={styles.emptyListings}>
            <Text style={styles.emptyListingsIcon}>🏘️</Text>
            <Text style={styles.emptyListingsTxt}>No listings yet — check back soon!</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            horizontal
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => <ListingCard item={item} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 14}
            decelerationRate="fast"
            contentContainerStyle={styles.listingRow}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
          />
        )}

        {/* Verified Strip */}
        <View style={styles.verifiedStrip}>
          <Ionicons name="checkmark-circle" size={24} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedTitle}>{t('seekerDashboard.verifiedTitle')}</Text>
            <Text style={styles.verifiedSub}>{t('seekerDashboard.verifiedSub')}</Text>
          </View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const wm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', paddingBottom: 28 },
  topAccent: { height: 6, backgroundColor: PURPLE, width: '100%' },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24, marginBottom: 16, shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: 24 },
  subtitle: { fontSize: 13, color: PURPLE, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  body: { fontSize: 13.5, color: '#555', lineHeight: 21, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20 },
  bold: { fontWeight: '700', color: '#222' },
  stepsWrap: { marginHorizontal: 24, backgroundColor: '#F8F7FF', borderRadius: 16, padding: 16, gap: 12, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { flex: 1, fontSize: 13, color: '#333', fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 24, backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 16, shadowColor: PURPLE, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skipTxt: { textAlign: 'center', fontSize: 12, color: '#A0A0A0', marginTop: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, paddingTop: 4, paddingBottom: 12 },
  logoMark: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center' },
  bellWrap: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center' },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: H_PAD, marginBottom: 28 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#EDE9FE' },
  avatarPlaceholder: { backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: '#fff' },
  welcomeHi: { fontSize: 12, color: '#A0A0A0', fontWeight: '400', marginBottom: 1 },
  welcomeName: { fontSize: 20, fontWeight: '700', color: '#111', letterSpacing: -0.5, maxWidth: width - H_PAD * 2 - 72 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: H_PAD, marginBottom: 28 },
  actionCard: { backgroundColor: '#FAFAFA', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#EFEFEF', width: ACTION_SIZE },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 2, letterSpacing: -0.1 },
  actionSub: { fontSize: 11, color: '#B0B0B0', lineHeight: 15 },
  banner: { marginHorizontal: H_PAD, borderRadius: 20, backgroundColor: '#6D28D9', padding: 20, marginBottom: 30, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden' },
  bannerLeft: { flex: 1 },
  bannerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 10 },
  bannerTagTxt: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, marginBottom: 6, letterSpacing: -0.3 },
  bannerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.72)', lineHeight: 17, marginBottom: 16 },
  bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8 },
  bannerBtnTxt: { fontSize: 12, fontWeight: '700', color: '#6D28D9' },
  bannerBolt: { fontSize: 72, opacity: 0.12, color: '#fff', position: 'absolute', right: -6, top: -6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  seeAll: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  listingRow: { paddingLeft: H_PAD, paddingRight: H_PAD / 2 },
  listingCard: { borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#EFEFEF', shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  listingImgWrap: { width: '100%', height: 140, position: 'relative' },
  listingImg: { width: '100%', height: '100%' },
  listingImgPlaceholder: { backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  verifiedPill: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  verifiedPillTxt: { color: '#fff', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  priceBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.38)', paddingHorizontal: 10, paddingVertical: 6 },
  priceBarTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  listingBody: { padding: 11, gap: 4 },
  listingName: { fontSize: 13, fontWeight: '700', color: '#111', letterSpacing: -0.1 },
  listingLocRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  listingLocTxt: { fontSize: 10.5, color: '#A0A0A0', flex: 1 },
  listingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  listingMetaTxt: { fontSize: 10.5, color: '#666' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D0D0D0', marginHorizontal: 2 },
  verifyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  checkBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F0FF', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  checkBadgeTxt: { fontSize: 9, fontWeight: '600', color: '#6D28D9' },
  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFBEB', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  newBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#D97706' },
  emptyListings: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: H_PAD },
  emptyListingsIcon: { fontSize: 36, marginBottom: 8 },
  emptyListingsTxt: { fontSize: 13, color: '#B0B0B0', textAlign: 'center' },
  verifiedStrip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: H_PAD, marginTop: 28, backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EFEFEF' },
  verifiedTitle: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 3 },
  verifiedSub: { fontSize: 11.5, color: '#A0A0A0', lineHeight: 17 },
});