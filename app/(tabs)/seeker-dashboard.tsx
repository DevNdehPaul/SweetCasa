import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const CARD_WIDTH = width * 0.56;
const ACTION_SIZE = (width - H_PAD * 2 - 12) / 2;

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
  const { colors } = useAppTheme();
  const wm = useMemo(() => getWmStyles(colors), [colors]);
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
                  <Feather name={step.icon as any} size={14} color={colors.primary} />
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
  item, s,
}: {
  item: { id: string; icon: string; label: string; sub: string; iconColor: string; bg: string; link: string };
  s: ReturnType<typeof getStyles>;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={s.actionCard} onPress={() => router.push(item.link as any)}>
      <View style={[s.actionIcon, { backgroundColor: item.bg }]}>
        <Feather name={item.icon as any} size={18} color={item.iconColor} />
      </View>
      <Text style={s.actionLabel}>{item.label}</Text>
      <Text style={s.actionSub}>{item.sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({ item, s, colors }: { item: Listing; s: ReturnType<typeof getStyles>; colors: ThemeColors }) {
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
    <TouchableOpacity activeOpacity={0.85} style={[s.listingCard, { width: CARD_WIDTH }]} onPress={handlePress}>
      <View style={s.listingImgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.listingImg} resizeMode="cover" />
        ) : (
          <View style={[s.listingImg, s.listingImgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏠</Text>
          </View>
        )}
        <View style={s.verifiedPill}>
          <Ionicons name="shield-checkmark" size={8} color="#fff" />
          <Text style={s.verifiedPillTxt}>{t('seekerDashboard.verified')}</Text>
        </View>
        <View style={s.priceBar}>
          <Text style={s.priceBarTxt}>{formatPrice(item.price, item.paymentFrequency)}</Text>
        </View>
      </View>
      <View style={s.listingBody}>
        <Text style={s.listingName} numberOfLines={1}>{item.title}</Text>
        <View style={s.listingLocRow}>
          <Ionicons name="location-outline" size={11} color={colors.textLight} />
          <Text style={s.listingLocTxt} numberOfLines={1}>{location}</Text>
        </View>
        <View style={s.listingMetaRow}>
          <Ionicons name="bed-outline" size={11} color={colors.textMuted} />
          <Text style={s.listingMetaTxt}>{item.bedrooms ?? '—'} Beds</Text>
          <View style={s.dot} />
          <MaterialCommunityIcons name="shower" size={11} color={colors.textMuted} />
          <Text style={s.listingMetaTxt}>{item.bathrooms ?? '—'} Baths</Text>
        </View>
        <View style={s.verifyFooter}>
          <View style={s.checkBadge}>
            <Ionicons name="checkmark-circle" size={9} color={colors.primary} />
            <Text style={s.checkBadgeTxt}>{t('seekerDashboard.checkBadge')}</Text>
          </View>
          <View style={s.newBadge}>
            <Feather name="zap" size={9} color={colors.warning} />
            <Text style={s.newBadgeTxt}>NEW</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Listing Skeleton ─────────────────────────────────────────────────────────
function ListingSkeleton({ s, colors }: { s: ReturnType<typeof getStyles>; colors: ThemeColors }) {
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
    <Animated.View style={[s.listingCard, { width: CARD_WIDTH, opacity: anim }]}>
      <View style={[s.listingImgWrap, { backgroundColor: colors.border }]} />
      <View style={{ padding: 11, gap: 8 }}>
        <View style={{ height: 12, backgroundColor: colors.border, borderRadius: 6, width: '80%' }} />
        <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 6, width: '60%' }} />
        <View style={{ height: 10, backgroundColor: colors.border, borderRadius: 6, width: '50%' }} />
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

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
    { id: '1', icon: 'search',         label: t('seekerDashboard.findHouse'),    sub: t('seekerDashboard.findHouseSub'),    iconColor: colors.primary, bg: colors.primaryTint, link: '/search' },
    { id: '2', icon: 'plus-circle',    label: t('seekerDashboard.favourites'),   sub: t('seekerDashboard.favouritesSub'),   iconColor: colors.primary, bg: colors.primaryTint, link: '/favourites' },
    { id: '3', icon: 'message-circle', label: t('seekerDashboard.messages'),     sub: t('seekerDashboard.messagesSub'),     iconColor: '#0891B2', bg: isDark ? '#0C2B33' : '#ECFEFF', link: '/MessagesInbox' },
    { id: '4', icon: 'credit-card',    label: t('seekerDashboard.secureWallet'), sub: t('seekerDashboard.secureWalletSub'), iconColor: colors.warning, bg: colors.warningBg, link: '/wallet' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
      <WelcomeModal visible={showWelcome} onClose={() => setShowWelcome(false)} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoMark}>
          <Ionicons name="home" size={16} color={colors.primary} />
        </View>
        <TouchableOpacity style={s.bellWrap}>
          <Link href="/notificationcenter">
            <Feather name="bell" size={19} color={colors.text} />
          </Link>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Welcome row */}
        <View style={s.welcomeRow}>
          <View>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Feather name="user" size={20} color={colors.primary} />
              </View>
            )}
            <View style={s.onlineDot} />
          </View>
          <View>
            <Text style={s.welcomeHi}>{t('seekerDashboard.welcomeHi')}</Text>
            <Text style={s.welcomeName} numberOfLines={1}>
              {getFirstName(user.name) || 'there'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.actionsGrid}>
          {QUICK_ACTIONS.map(item => <ActionCard key={item.id} item={item} s={s} />)}
        </View>

        {/* AI Banner */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <View style={s.bannerTag}>
              <Ionicons name="flash" size={10} color="#fff" />
              <Text style={s.bannerTagTxt}>{t('seekerDashboard.newFeature')}</Text>
            </View>
            <Text style={s.bannerTitle}>{t('seekerDashboard.aiTitle')}</Text>
            <Text style={s.bannerSub}>{t('seekerDashboard.aiSub')}</Text>
            <Link href="../casamatch" asChild>
              <TouchableOpacity style={s.bannerBtn} activeOpacity={0.85}>
                <Text style={s.bannerBtnTxt}>{t('seekerDashboard.startQuiz')}</Text>
                <Feather name="arrow-right" size={13} color={colors.primaryDark} />
              </TouchableOpacity>
            </Link>
          </View>
          <Text style={s.bannerBolt}>⚡</Text>
        </View>

        {/* Recommended */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('seekerDashboard.recommended')}</Text>
          <TouchableOpacity onPress={() => router.push('/search' as any)}>
            <Text style={s.seeAll}>{t('common.seeAll')}</Text>
          </TouchableOpacity>
        </View>

        {listingsLoading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            keyExtractor={i => String(i)}
            renderItem={() => <ListingSkeleton s={s} colors={colors} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.listingRow}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            scrollEnabled={false}
          />
        ) : listings.length === 0 ? (
          <View style={s.emptyListings}>
            <Text style={s.emptyListingsIcon}>🏘️</Text>
            <Text style={s.emptyListingsTxt}>No listings yet — check back soon!</Text>
          </View>
        ) : (
          <FlatList
            data={listings}
            horizontal
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => <ListingCard item={item} s={s} colors={colors} />}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 14}
            decelerationRate="fast"
            contentContainerStyle={s.listingRow}
            ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
          />
        )}

        {/* Verified Strip */}
        <View style={s.verifiedStrip}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.verifiedTitle}>{t('seekerDashboard.verifiedTitle')}</Text>
            <Text style={s.verifiedSub}>{t('seekerDashboard.verifiedSub')}</Text>
          </View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getWmStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    card: { width: '100%', backgroundColor: colors.card, borderRadius: 28, overflow: 'hidden', paddingBottom: 28 },
    topAccent: { height: 6, backgroundColor: colors.primary, width: '100%' },
    iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24, marginBottom: 16, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: 24 },
    subtitle: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 14 },
    body: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 21, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20 },
    bold: { fontWeight: '700', color: colors.text },
    stepsWrap: { marginHorizontal: 24, backgroundColor: colors.primaryTintAlt, borderRadius: 16, padding: 16, gap: 12, marginBottom: 24 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
    stepTxt: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 24, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    btnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
    skipTxt: { textAlign: 'center', fontSize: 12, color: colors.textLight, marginTop: 14, fontWeight: '500' },
  });
}

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, paddingTop: 4, paddingBottom: 12 },
    logoMark: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
    bellWrap: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
    welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: H_PAD, marginBottom: 28 },
    avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.primaryBorder },
    avatarPlaceholder: { backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
    onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.success, borderWidth: 1.5, borderColor: colors.card },
    welcomeHi: { fontSize: 12, color: colors.textLight, fontWeight: '400', marginBottom: 1 },
    welcomeName: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.5, maxWidth: width - H_PAD * 2 - 72 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: H_PAD, marginBottom: 28 },
    actionCard: { backgroundColor: colors.cardMuted, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.borderLight, width: ACTION_SIZE },
    actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2, letterSpacing: -0.1 },
    actionSub: { fontSize: 11, color: colors.textLight, lineHeight: 15 },
    banner: { marginHorizontal: H_PAD, borderRadius: 20, backgroundColor: colors.primaryDark, padding: 20, marginBottom: 30, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden' },
    bannerLeft: { flex: 1 },
    bannerTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 9, paddingVertical: 3, marginBottom: 10 },
    bannerTagTxt: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', lineHeight: 22, marginBottom: 6, letterSpacing: -0.3 },
    bannerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.72)', lineHeight: 17, marginBottom: 16 },
    bannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 8 },
    bannerBtnTxt: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
    bannerBolt: { fontSize: 72, opacity: 0.12, color: '#fff', position: 'absolute', right: -6, top: -6 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    seeAll: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    listingRow: { paddingLeft: H_PAD, paddingRight: H_PAD / 2 },
    listingCard: { borderRadius: 16, backgroundColor: colors.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
    listingImgWrap: { width: '100%', height: 140, position: 'relative' },
    listingImg: { width: '100%', height: '100%' },
    listingImgPlaceholder: { backgroundColor: colors.primaryTintAlt, alignItems: 'center', justifyContent: 'center' },
    verifiedPill: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
    verifiedPillTxt: { color: '#fff', fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
    priceBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.38)', paddingHorizontal: 10, paddingVertical: 6 },
    priceBarTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    listingBody: { padding: 11, gap: 4 },
    listingName: { fontSize: 13, fontWeight: '700', color: colors.text, letterSpacing: -0.1 },
    listingLocRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    listingLocTxt: { fontSize: 10.5, color: colors.textLight, flex: 1 },
    listingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
    listingMetaTxt: { fontSize: 10.5, color: colors.textMuted },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border, marginHorizontal: 2 },
    verifyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.borderLight },
    checkBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryTint, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
    checkBadgeTxt: { fontSize: 9, fontWeight: '600', color: colors.primaryDark },
    newBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warningBg, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
    newBadgeTxt: { fontSize: 9, fontWeight: '700', color: colors.warning },
    emptyListings: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: H_PAD },
    emptyListingsIcon: { fontSize: 36, marginBottom: 8 },
    emptyListingsTxt: { fontSize: 13, color: colors.textLight, textAlign: 'center' },
    verifiedStrip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginHorizontal: H_PAD, marginTop: 28, backgroundColor: colors.cardMuted, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
    verifiedTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
    verifiedSub: { fontSize: 11.5, color: colors.textLight, lineHeight: 17 },
  });
}
