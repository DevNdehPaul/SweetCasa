import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const H_PAD = 20;
const PROTECTION_CARD_W = width * 0.62;

// ─── Data ─────────────────────────────────────────────────────────────────────
const PROTECTIONS = [
  {
    id: 'E104',
    title: 'Studio Bastos',
    status: 'Locked',
    amount: '450,000 XAF',
    progress: 2,
    total: 3,
  },
  {
    id: 'E105',
    title: 'Mini Villa',
    status: 'Locked',
    amount: '1,200,000 XAF',
    progress: 1,
    total: 3,
  },
];

type Activity = {
  id: string;
  label: string;
  date: string;
  amount: string;
  sign: '+' | '-';
  status: 'PENDING' | 'COMPLETED';
  iconName: string;
  iconBg: string;
  iconColor: string;
};

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    label: 'Locked: Modern Studio in',
    date: 'Oct 24, 14:20',
    amount: '450,000 XAF',
    sign: '-',
    status: 'PENDING',
    iconName: 'rotate-ccw',
    iconBg: '#F3F0FF',
    iconColor: '#7C3AED',
  },
  {
    id: '2',
    label: 'Deposit via Mobile Money',
    date: 'Oct 24, 10:15',
    amount: '+500,000 XAF',
    sign: '+',
    status: 'COMPLETED',
    iconName: 'smartphone',
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
  },
  {
    id: '3',
    label: 'Released: 2-Bedroom',
    date: 'Oct 20, 09:45',
    amount: '350,000 XAF',
    sign: '+',
    status: 'COMPLETED',
    iconName: 'rotate-ccw',
    iconBg: '#F3F0FF',
    iconColor: '#7C3AED',
  },
  {
    id: '4',
    label: 'Deposit via Visa Card',
    date: 'Oct 15, 16:30',
    amount: '+120,000 XAF',
    sign: '+',
    status: 'COMPLETED',
    iconName: 'credit-card',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
  },
];

// ─── How It Works Steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  {
    step: '1',
    title: 'Deposit',
    desc: 'You move funds to your secure SweetCasa escrow wallet. Your money is protected at all times.',
    icon: 'arrow-up-circle',
    color: '#7C3AED',
    bg: '#F3F0FF',
  },
  {
    step: '2',
    title: 'Reserve',
    desc: 'You pay SweetCasa directly — not the owner — to hold the house. We act as a trusted middleman.',
    icon: 'shield',
    color: '#2563EB',
    bg: '#EFF6FF',
  },
  {
    step: '3',
    title: 'The 1-Week Rule',
    desc: 'We hold funds for 1 week after move-in. If you leave within that week, a small processing fee is deducted and the rest is refunded to you automatically.',
    icon: 'clock',
    color: '#059669',
    bg: '#ECFDF5',
  },
];

// ─── Protection Card ──────────────────────────────────────────────────────────
function ProtectionCard({ item }: { item: typeof PROTECTIONS[0] }) {
  const pct = item.progress / item.total;
  return (
    <View style={[styles.protectionCard, { width: PROTECTION_CARD_W }]}>
      <View style={styles.protectionTopRow}>
        <View style={styles.protectionIdRow}>
          <Feather name="lock" size={12} color="#A0A0A0" />
          <View>
            <Text style={styles.protectionTitle}>{item.title}</Text>
            <Text style={styles.protectionId}>ID: {item.id}</Text>
          </View>
        </View>
        <View style={styles.lockedChip}>
          <Text style={styles.lockedChipTxt}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.protectionAmount}>{item.amount}</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Verification</Text>
        <Text style={styles.progressFrac}>{item.progress}/{item.total}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({ item }: { item: Activity }) {
  const isNeg = item.sign === '-';
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: item.iconBg }]}>
        <Feather name={item.iconName as any} size={16} color={item.iconColor} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityLabel}>{item.label}</Text>
        <Text style={styles.activityDate}>{item.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.activityAmount, { color: '#111' }]}>
          {isNeg ? '-' : '+'}{item.amount.replace('+', '')}
        </Text>
        <Text style={[
          styles.activityStatus,
          { color: item.status === 'PENDING' ? '#F59E0B' : '#22C55E' },
        ]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

// ─── How It Works Modal ───────────────────────────────────────────────────────
function HowItWorksModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.modalHandle} />

        {/* Title Row */}
        <View style={styles.modalTitleRow}>
          <View style={styles.modalTitleIconWrap}>
            <Ionicons name="information-circle" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>How Escrow Works</Text>
            <Text style={styles.modalSubtitle}>SweetCasa protects both tenants & landlords</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Feather name="x" size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Steps */}
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <View key={step.step} style={styles.stepCard}>
              {/* Connector line */}
              {index < HOW_IT_WORKS_STEPS.length - 1 && (
                <View style={styles.stepConnector} />
              )}
              <View style={[styles.stepIconWrap, { backgroundColor: step.bg }]}>
                <Feather name={step.icon as any} size={18} color={step.color} />
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepTitleRow}>
                  <View style={[styles.stepBadge, { backgroundColor: step.bg }]}>
                    <Text style={[styles.stepBadgeTxt, { color: step.color }]}>
                      Step {step.step}
                    </Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          {/* Divider */}
          <View style={styles.modalDivider} />

          {/* Price Ceiling Section */}
          <View style={styles.priceCeilingCard}>
            <View style={styles.priceCeilingHeader}>
              <View style={styles.priceCeilingIconWrap}>
                <Feather name="trending-up" size={16} color="#DC2626" />
              </View>
              <Text style={styles.priceCeilingTitle}>Price Ceiling Rule</Text>
            </View>

            <Text style={styles.priceCeilingBody}>
              The price listed on this page is the{' '}
              <Text style={styles.priceCeilingBold}>Maximum Allowed</Text>
              {'. '}
              Payment through the Escrow wallet{' '}
              <Text style={styles.priceCeilingBold}>cannot exceed</Text>
              {' '}the listed price.
            </Text>

            <View style={styles.priceCeilingNote}>
              <Feather name="message-circle" size={13} color="#7C3AED" style={{ marginTop: 1 }} />
              <Text style={styles.priceCeilingNoteTxt}>
                Any lower price negotiations must be handled and agreed upon in the{' '}
                <Text style={{ fontWeight: '700', color: '#7C3AED' }}>chat</Text>
                {' '}before payment.
              </Text>
            </View>

            {/* Why it works */}
            <View style={styles.whyItWorksBox}>
              <Text style={styles.whyItWorksTitle}>Why this protects you</Text>
              <View style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={styles.whyTxt}>
                  <Text style={{ fontWeight: '700' }}>1-Week Rule</Text>
                  {' '}protects tenants from hidden issues (bad plumbing, noisy neighbours) only discovered after moving in.
                </Text>
              </View>
              <View style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={styles.whyTxt}>
                  <Text style={{ fontWeight: '700' }}>Price Ceiling</Text>
                  {' '}prevents landlords from "bait & switch" — asking for more money once you arrive.
                </Text>
              </View>
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function EscrowWalletScreen() {
  const [infoVisible, setInfoVisible] = React.useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>Escrow Wallet</Text>
        <View style={styles.headerRight}>
          {/* Info Button */}
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="information-circle-outline" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="bell" size={20} color="#111" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          <View style={styles.shieldWatermark}>
            <Ionicons name="shield-checkmark" size={90} color="rgba(255,255,255,0.1)" />
          </View>

          {/* Info hint inside balance card */}
          <TouchableOpacity
            style={styles.balanceInfoHint}
            onPress={() => setInfoVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.balanceInfoHintTxt}>How it works & Price Ceiling</Text>
            <Feather name="chevron-right" size={11} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.balanceLabel}>Total Available Balance</Text>
          <Text style={styles.balanceAmount}>850,500 XAF</Text>

          <View style={styles.balanceSubRow}>
            <View style={styles.balanceSubCard}>
              <View style={styles.balanceSubLabelRow}>
                <Feather name="lock" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>Locked Escrow</Text>
              </View>
              <Text style={styles.balanceSubAmount}>1,650,000{'\n'}XAF</Text>
            </View>
            <View style={styles.balanceSubCard}>
              <View style={styles.balanceSubLabelRow}>
                <Feather name="unlock" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>Withdrawable</Text>
              </View>
              <Text style={styles.balanceSubAmount}>850,500 XAF</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          {[
            { icon: 'arrow-up-circle', label: 'Deposit' },
            { icon: 'arrow-down-circle', label: 'Withdraw' },
            { icon: 'refresh-cw', label: 'Refund' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionBtn} activeOpacity={0.75}>
              <View style={styles.actionIconWrap}>
                <Feather
                  name={a.icon as any}
                  size={22}
                  color={a.label === 'Withdraw' ? '#111' : '#7C3AED'}
                />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Active Protections ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Protections</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={PROTECTIONS}
          horizontal
          keyExtractor={i => i.id}
          renderItem={({ item }) => <ProtectionCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.protectionList}
          snapToInterval={PROTECTION_CARD_W + 14}
          decelerationRate="fast"
        />

        {/* ── Escrow Active Banner ── */}
        <View style={styles.escrowBanner}>
          <View style={styles.escrowBannerIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.escrowBannerTitle}>Escrow Protection Active</Text>
            <Text style={styles.escrowBannerSub}>
              Your funds are securely held until you verify the property.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            style={styles.escrowBannerInfoBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.escrowBannerInfoTxt}>Info</Text>
            <Feather name="chevron-right" size={11} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* ── Recent Activity ── */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Filters</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {ACTIVITIES.map((item, index) => (
            <View key={item.id}>
              <ActivityRow item={item} />
              {index < ACTIVITIES.length - 1 && (
                <View style={styles.activityDivider} />
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.historyBtn} activeOpacity={0.8}>
          <Text style={styles.historyBtnTxt}>View Transaction History</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── How It Works Modal ── */}
      <HowItWorksModal
        visible={infoVisible}
        onClose={() => setInfoVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF8F6' },
  scroll: { paddingBottom: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F0FF',
    borderRadius: 19,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Balance Card
  balanceCard: {
    margin: H_PAD,
    borderRadius: 22,
    backgroundColor: '#6D28D9',
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  shieldWatermark: {
    position: 'absolute',
    right: 12,
    top: 10,
  },
  balanceInfoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  balanceInfoHintTxt: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  balanceLabel: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.8,
    marginBottom: 20,
  },
  balanceSubRow: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceSubCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  balanceSubLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  balanceSubLabel: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  balanceSubAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 20,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: H_PAD,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  // Section Header
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
    fontSize: 12.5,
    color: '#7C3AED',
    fontWeight: '600',
  },

  // Protection Cards
  protectionList: {
    paddingLeft: H_PAD,
    paddingRight: H_PAD / 2,
    gap: 14,
    paddingBottom: 4,
  },
  protectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  protectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  protectionIdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  protectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.1,
  },
  protectionId: {
    fontSize: 10.5,
    color: '#B0B0B0',
  },
  lockedChip: {
    backgroundColor: '#F3F0FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  lockedChipTxt: {
    fontSize: 10.5,
    color: '#7C3AED',
    fontWeight: '700',
  },
  protectionAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.3,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: { fontSize: 11, color: '#B0B0B0' },
  progressFrac: { fontSize: 11, color: '#B0B0B0', fontWeight: '600' },
  progressTrack: {
    height: 5,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
  },

  // Escrow Banner
  escrowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: H_PAD,
    marginTop: 16,
    backgroundColor: '#F3F0FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  escrowBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 2,
  },
  escrowBannerSub: {
    fontSize: 11,
    color: '#A78BFA',
    lineHeight: 16,
  },
  escrowBannerInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EDE9FE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  escrowBannerInfoTxt: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
  },

  // Activity
  activityList: {
    marginHorizontal: H_PAD,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: { flex: 1 },
  activityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  activityDate: { fontSize: 11, color: '#B0B0B0' },
  activityAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111',
    textAlign: 'right',
    marginBottom: 2,
  },
  activityStatus: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activityDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginLeft: 66,
  },

  // History Button
  historyBtn: {
    marginHorizontal: H_PAD,
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  historyBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
    maxHeight: height * 0.88,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  modalTitleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#888',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Steps
  stepCard: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
    position: 'relative',
  },
  stepConnector: {
    position: 'absolute',
    left: 19,
    top: 42,
    width: 2,
    height: 36,
    backgroundColor: '#EDE9FE',
    zIndex: 0,
  },
  stepIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexShrink: 0,
  },
  stepContent: { flex: 1 },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  stepBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepBadgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  stepDesc: {
    fontSize: 12.5,
    color: '#666',
    lineHeight: 18,
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 20,
  },

  // Price Ceiling
  priceCeilingCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
    marginBottom: 4,
  },
  priceCeilingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceCeilingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCeilingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: -0.2,
  },
  priceCeilingBody: {
    fontSize: 13,
    color: '#444',
    lineHeight: 19,
  },
  priceCeilingBold: {
    fontWeight: '800',
    color: '#DC2626',
  },
  priceCeilingNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  priceCeilingNoteTxt: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },

  // Why it works box
  whyItWorksBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  whyItWorksTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  whyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  whyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C3AED',
    marginTop: 5,
    flexShrink: 0,
  },
  whyTxt: {
    flex: 1,
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
});