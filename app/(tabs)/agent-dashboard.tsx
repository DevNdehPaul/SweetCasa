import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
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
import api from '../../constants/api';
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

const H_PAD = 20;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://sweetcasa.bonto.run/';

// ─── Welcome Modal ────────────────────────────────────────────────────────────
function WelcomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const wm = useMemo(() => getWmStyles(colors), [colors]);
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,  { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
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
            <Ionicons name="home" size={32} color="#fff" />
          </View>
          <Text style={wm.title}>{t('agentHub.welcomeTitle')}</Text>
          <Text style={wm.subtitle}>{t('agentHub.welcomeSubtitle')}</Text>
          <Text style={wm.body}>
            {t('agentHub.welcomeBody').split(t('agentHub.welcomeBold1'))[0]}
            <Text style={wm.bold}>{t('agentHub.welcomeBold1')}</Text>
            {t('agentHub.welcomeBody').split(t('agentHub.welcomeBold1'))[1]?.split(t('agentHub.welcomeBold2'))[0]}
            <Text style={wm.bold}>{t('agentHub.welcomeBold2')}</Text>
            {t('agentHub.welcomeBody').split(t('agentHub.welcomeBold2'))[1]}
          </Text>
          <View style={wm.stepsWrap}>
            {[
              { icon: 'upload-cloud', text: t('agentHub.step1') },
              { icon: 'users',        text: t('agentHub.step2') },
              { icon: 'shield',       text: t('agentHub.step3') },
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
            <Text style={wm.btnTxt}>{t('agentHub.getStarted')}</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={wm.skipTxt} onPress={onClose}>{t('agentHub.exploreOwn')}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AgentHubScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [profile, setProfile]         = useState<any>(null);
  const [listings, setListings]       = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [wallet, setWallet]           = useState<{ heldBalance: string; availableBalance: string } | null>(null);
  const [walletReady, setWalletReady] = useState(false);

  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [leadConversion, setLeadConversion] = useState<string>('0%');
  const [statsReady,     setStatsReady]     = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('profile').then((p) => { if (p) setProfile(JSON.parse(p)); });
    checkWelcome();
    loadAll();
  }, []);

  const checkWelcome = async () => {
    try {
      const seen = await AsyncStorage.getItem('agent_welcome_seen');
      if (!seen) {
        setShowWelcome(true);
        await AsyncStorage.setItem('agent_welcome_seen', 'true');
      }
    } catch { /* ignore */ }
  };

  const loadAll = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const authHeader = { Authorization: `Bearer ${token}` };

      const [listingsRes, convsRes, walletRes] = await Promise.allSettled([
        api.get('/listings/mine'),
        fetch(`${API_BASE}/messages/conversations`, { headers: authHeader }).then((r) =>
          r.ok ? r.json() : Promise.reject(r.status),
        ),
        api.get('/wallet/me'),
      ]);

      let mappedListings: any[] = [];
      if (listingsRes.status === 'fulfilled') {
        mappedListings = (listingsRes.value.data?.listings || []).map((l: any) => ({
          id:       String(l.id),
          title:    l.title,
          price:    `${Number(l.price).toLocaleString()} XAF`,
          status:   l.status === 'Available' ? 'Available' : l.status,
          views:    l.views ?? 0,
          messages: l.messageCount ?? 0,
        }));
        setListings(mappedListings);
      }

      if (convsRes.status === 'fulfilled') {
        const conversations: any[] = (convsRes.value as any).conversations ?? [];

        const totalUnread = conversations.reduce(
          (sum: number, c: any) => sum + (c.unreadCount ?? 0),
          0,
        );
        setUnreadMessages(totalUnread);

        const total = mappedListings.length;
        if (total > 0) {
          const listingIdsWithConvs = new Set(
            conversations.map((c: any) => c.listing?.id).filter(Boolean),
          );
          const withLeads = mappedListings.filter((l) =>
            listingIdsWithConvs.has(Number(l.id)),
          ).length;
          setLeadConversion(((withLeads / total) * 100).toFixed(1) + '%');
        } else {
          setLeadConversion('0%');
        }
      }
      if (walletRes.status === 'fulfilled') {
        setWallet((walletRes.value as any).data?.wallet ?? null);
      }
    } catch {
      // Stats stay at defaults (0 / 0%)
    } finally {
      setStatsReady(true);
      setWalletReady(true);
    }
  };

  const latestListings = listings.slice(0, 3);

  const totalBalance   = wallet ? Number(wallet.heldBalance) + Number(wallet.availableBalance) : 0;
  const pendingPayout  = wallet ? Number(wallet.heldBalance) : 0;
  const formatXAF = (value: number) => `${Math.round(value).toLocaleString('en-US')} XAF`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <WelcomeModal visible={showWelcome} onClose={() => setShowWelcome(false)} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('agentHub.title')}</Text>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notificationcenter')}>
          <Feather name="bell" size={22} color={colors.text} />
          {unreadMessages > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── User Row ── */}
        <View style={styles.userRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/45.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name}</Text>
            <View style={styles.verifiedRow}>
              <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
              <Text style={styles.verifiedTxt}>{t('agentHub.verifiedOwner')}</Text>
            </View>
          </View>
        </View>

        {/* ── Escrow Wallet Card ── */}
        <View style={styles.walletCard}>
          <View style={styles.walletLabelRow}>
            <MaterialCommunityIcons name="currency-usd" size={16} color={colors.primary} />
            <Text style={styles.walletLabel}>{t('agentHub.escrowBalance')}</Text>
          </View>
          {walletReady ? (
            <Text style={styles.walletAmount}>{formatXAF(totalBalance)}</Text>
          ) : (
            <View style={[styles.skeleton, { height: 34, width: 140, marginBottom: 6 }]} />
          )}
          <Text style={styles.walletPending}>
            {walletReady ? formatXAF(pendingPayout) : '—'} {t('agentHub.pendingPayout')}
          </Text>
          <Link href="/wallet">
            <TouchableOpacity style={styles.walletBtn} activeOpacity={0.85}>
              <Text style={styles.walletBtnTxt}>{t('agentHub.manageWallet')}</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>

          <View style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Feather name="trending-up" size={18} color={colors.primary} />
            </View>
            {statsReady ? (
              <Text style={styles.statNum}>{leadConversion}</Text>
            ) : (
              <View style={styles.skeleton} />
            )}
            <Text style={styles.statLabel}>{t('agentHub.leadConversion')}</Text>
            <Text style={styles.statHint}>Listings w/ enquiries</Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => router.push('/MessagesInbox')}
          >
            <View style={styles.statIconWrap}>
              <Feather name="message-circle" size={18} color={colors.primary} />
            </View>
            {statsReady ? (
              <Text style={[styles.statNum, unreadMessages > 0 && styles.statNumAlert]}>
                {unreadMessages}
              </Text>
            ) : (
              <View style={styles.skeleton} />
            )}
            <Text style={styles.statLabel}>{t('agentHub.unreadMessages')}</Text>
            <Text style={styles.statHint}>Tap to view inbox</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>{t('agentHub.quickActions')}</Text>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => router.push('/upload')}
        >
          <View style={styles.actionIconWrap}>
            <Feather name="plus" size={22} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>{t('agentHub.uploadProperty')}</Text>
            <Text style={styles.actionSub}>{t('agentHub.uploadPropertySub')}</Text>
          </View>
          <Feather name="arrow-up-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardMessages]}
          activeOpacity={0.85}
          onPress={() => router.push('/MessagesInbox')}
        >
          <View style={[styles.actionIconWrap, styles.actionIconMessages]}>
            <Feather name="message-circle" size={22} color="#fff" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>{t('agentHub.messages')}</Text>
            <Text style={styles.actionSub}>{t('agentHub.messagesSub')}</Text>
          </View>
          {unreadMessages > 0 && (
            <View style={styles.inlineBadge}>
              <Text style={styles.inlineBadgeTxt}>{unreadMessages}</Text>
            </View>
          )}
          <Feather name="arrow-up-right" size={20} color={colors.textLight} />
        </TouchableOpacity>

        {/* ── Latest Listings ── */}
        <Text style={styles.sectionLabel}>{t('agentHub.latestListings')}</Text>

        <View style={styles.tableCard}>
          {latestListings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTxt}>{t('agentHub.noListings')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderTxt, { flex: 2 }]}>{t('agentHub.property')}</Text>
                <Text style={[styles.tableHeaderTxt, { width: 60, textAlign: 'center' }]}>{t('agentHub.price')}</Text>
                <Text style={[styles.tableHeaderTxt, { width: 70, textAlign: 'right' }]}>{t('agentHub.status')}</Text>
              </View>
              {latestListings.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity style={styles.tableRow} activeOpacity={0.7}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={styles.listingMeta}>
                        <Ionicons name="eye-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.listingMetaTxt}>{item.views}</Text>
                        <Feather name="message-circle" size={11} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={styles.listingMetaTxt}>{item.messages}</Text>
                      </View>
                    </View>
                    <Text style={styles.listingPrice}>{item.price}</Text>
                    <Text style={[
                      styles.listingStatus,
                      item.status === 'Active' || item.status === 'Approved' ? styles.statusActive
                        : item.status === 'Rejected' ? styles.statusRejected
                        : styles.statusPending,
                    ]}>
                      {item.status}
                    </Text>
                  </TouchableOpacity>
                  {index < latestListings.length - 1 && <View style={styles.tableDivider} />}
                </View>
              ))}
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewAllBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/listings')}
        >
          <Feather name="list" size={18} color="#fff" />
          <Text style={styles.viewAllTxt}>{t('agentHub.viewAllListings')}</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getWmStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    card: { width: '100%', backgroundColor: colors.card, borderRadius: 28, overflow: 'hidden', paddingBottom: 28 },
    topAccent: { height: 6, backgroundColor: colors.primary, width: '100%' },
    iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24, marginBottom: 16, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5, paddingHorizontal: 24 },
    subtitle: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: 4, marginBottom: 14 },
    body: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 21, textAlign: 'center', paddingHorizontal: 24, marginBottom: 20 },
    bold: { fontWeight: '700', color: colors.text },
    stepsWrap: { marginHorizontal: 24, backgroundColor: colors.primaryTint, borderRadius: 16, padding: 16, gap: 12, marginBottom: 24 },
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
    scroll: { paddingBottom: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 16, backgroundColor: colors.background },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
    bellBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    bellDot: { position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.background },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: 20, gap: 12 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.card },
    onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.background },
    userInfo: { flex: 1 },
    userName: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginBottom: 3 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedTxt: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    walletCard: { marginHorizontal: H_PAD, backgroundColor: colors.primaryBorder, borderRadius: 22, padding: 22, marginBottom: 16 },
    walletLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    walletLabel: { fontSize: 13, fontWeight: '600', color: colors.primary },
    walletAmount: { fontSize: 34, fontWeight: '800', color: colors.primaryDark, letterSpacing: -1, marginBottom: 6 },
    walletPending: { fontSize: 13, color: colors.primary, marginBottom: 20 },
    walletBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, alignSelf: 'flex-start', shadowColor: colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
    walletBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
    statsRow: { flexDirection: 'row', gap: 12, marginHorizontal: H_PAD, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 18, shadowColor: colors.primary, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    statIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statNum: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.8, marginBottom: 4 },
    statNumAlert: { color: colors.primary },
    skeleton: { height: 32, width: 60, borderRadius: 8, backgroundColor: colors.borderLight, marginBottom: 4 },
    statLabel: { fontSize: 12, color: colors.textLight, fontWeight: '500' },
    statHint: { fontSize: 10, color: colors.textLight, fontWeight: '400', marginTop: 2 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, letterSpacing: 1.2, paddingHorizontal: H_PAD, marginBottom: 10 },
    actionCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: H_PAD, backgroundColor: colors.card, borderRadius: 18, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    actionCardMessages: { marginBottom: 24 },
    actionIconWrap: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    actionIconMessages: { backgroundColor: '#0891B2', shadowColor: '#0891B2' },
    actionText: { flex: 1 },
    actionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2, marginBottom: 3 },
    actionSub: { fontSize: 12, color: colors.textLight, lineHeight: 17 },
    inlineBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    inlineBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
    tableCard: { marginHorizontal: H_PAD, backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2, marginBottom: 16 },
    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.cardMuted, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    tableHeaderTxt: { fontSize: 10, fontWeight: '700', color: colors.textLight, letterSpacing: 0.8 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    tableDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 16 },
    listingTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4, letterSpacing: -0.1 },
    listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    listingMetaTxt: { fontSize: 11, color: colors.textLight },
    listingPrice: { width: 60, textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.text },
    listingStatus: { width: 70, textAlign: 'right', fontSize: 13, fontWeight: '700' },
    statusActive: { color: colors.success },
    statusPending: { color: colors.warning },
    statusRejected: { color: colors.danger },
    emptyBox: { padding: 24, alignItems: 'center' },
    emptyTxt: { fontSize: 13, color: colors.textLight, textAlign: 'center' },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: H_PAD, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
    viewAllTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}