import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../constants/api';
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

const { width, height } = Dimensions.get('window');
const H_PAD = 20;
const PROTECTION_CARD_W = width * 0.62;

// ─── Types (mirror sweetcasa-api's wallet.controller.js serializers) ─────────

type TxType = 'Deposit' | 'Hold' | 'Release' | 'Refund' | 'Withdrawal';
type TxStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';

interface Transaction {
  id: number;
  type: TxType;
  status: TxStatus;
  amount: string;
  feeAmount: string | null;
  listingId: number | null;
  listing?: { id: number; title: string };
  phone: string | null;
  medium: string | null;
  fapshiTransId: string | null;
  reason: string | null;
  resolvedAs?: 'Release' | 'Refund' | null;
  createdAt: string | null;
}

interface WalletData {
  id: number;
  heldBalance: string;
  availableBalance: string;
}

interface ListingOption {
  id: number;
  title: string;
  price: string;
  city: string;
}

function formatXAF(value: string | number): string {
  const n = Math.round(Number(value) || 0);
  return `${n.toLocaleString('en-US')} XAF`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function authedFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Request failed.');
  return data;
}

// ─── Protection Card (an active Hold) ─────────────────────────────────────────

function ProtectionCard({ item }: { item: Transaction }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.protectionCard}>
      <View style={styles.protectionTopRow}>
        <View style={styles.protectionIdRow}>
          <Feather name="lock" size={12} color={colors.textLight} />
          <View>
            <Text style={styles.protectionTitle} numberOfLines={1}>{item.listing?.title || '—'}</Text>
            <Text style={styles.protectionId}>ID: E{item.id}</Text>
          </View>
        </View>
        <View style={styles.lockedChip}>
          <Text style={styles.lockedChipTxt}>{t('escrow.locked')}</Text>
        </View>
      </View>
      <Text style={styles.protectionAmount}>{formatXAF(item.amount)}</Text>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────

// Category accent colors — deliberately fixed across themes, same as the
// deposit/withdrawal icon colors elsewhere in the app.
const TYPE_META: Record<TxType, { labelKey: string; iconName: string; iconBg: string; iconColor: string; sign: '+' | '-' }> = {
  Deposit:    { labelKey: 'escrow.deposit',       iconName: 'smartphone',      iconBg: '#FFF7ED', iconColor: '#EA580C', sign: '-' },
  Hold:       { labelKey: 'escrow.locked',        iconName: 'lock',            iconBg: '#F3F0FF', iconColor: '#7C3AED', sign: '-' },
  Release:    { labelKey: 'escrow.released',      iconName: 'check-circle',    iconBg: '#ECFDF5', iconColor: '#059669', sign: '+' },
  Refund:     { labelKey: 'escrow.refunded',      iconName: 'rotate-ccw',      iconBg: '#F3F0FF', iconColor: '#7C3AED', sign: '+' },
  Withdrawal: { labelKey: 'escrow.withdrawalLabel', iconName: 'arrow-down-circle', iconBg: '#EFF6FF', iconColor: '#2563EB', sign: '-' },
};

function ActivityRow({ item }: { item: Transaction }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const meta = TYPE_META[item.type];
  const label = item.listing?.title ? `${t(meta.labelKey)} — ${item.listing.title}` : t(meta.labelKey);
  const statusLabel = item.status === 'Completed'
    ? (item.type === 'Hold' && item.resolvedAs ? t(`escrow.${item.resolvedAs === 'Release' ? 'released' : 'refunded'}`) : null)
    : t(`escrow.${item.status.toLowerCase()}`);

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: meta.iconBg }]}>
        <Feather name={meta.iconName as any} size={16} color={meta.iconColor} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.activityDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.activityAmount, { color: colors.text }]}>
          {meta.sign}{formatXAF(item.amount)}
        </Text>
        {statusLabel && (
          <Text style={[
            styles.activityStatus,
            { color: item.status === 'Pending' ? colors.warning : item.status === 'Failed' ? colors.danger : colors.success },
          ]}>
            {statusLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Deposit Modal ────────────────────────────────────────────────────────────

function DepositModal({
  visible, onClose, onDeposited,
}: { visible: boolean; onClose: () => void; onDeposited: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const modalStyles = useMemo(() => getModalStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ListingOption[]>([]);
  const [selected, setSelected] = useState<ListingOption | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery(''); setResults([]); setSelected(null); setAmount(''); setError(null);
    }
  }, [visible]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) { setResults([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/listings?search=${encodeURIComponent(text.trim())}&limit=10`);
      const data = await res.json();
      if (res.ok) setResults(data.listings || []);
    } catch {
      // search is a convenience — fail silently
    }
  };

  const handleConfirm = async () => {
    setError(null);
    if (!selected) { setError(t('escrow.selectAPropertyError')); return; }
    const amt = Number.parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(amt) || amt < 100) { setError(t('escrow.enterValidAmount')); return; }

    setBusy(true);
    try {
      const data = await authedFetch('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ listingId: selected.id, amount: amt }),
      });
      onClose();

      if (data.link) {
        await WebBrowser.openBrowserAsync(data.link);
        // Sync status right after the checkout closes rather than waiting on the webhook.
        try {
          const verified = await authedFetch(`/wallet/deposit/${data.transaction.id}/verify`);
          const status = verified.transaction?.status;
          if (status === 'Completed') {
            Alert.alert(t('escrow.depositSuccessTitle'), t('escrow.depositSuccessDesc'));
          } else if (status === 'Failed' || status === 'Cancelled') {
            Alert.alert(t('escrow.depositFailedTitle'), t('escrow.depositFailedDesc'));
          } else {
            Alert.alert(t('escrow.depositPendingTitle'), t('escrow.depositPendingDesc'));
          }
        } catch {
          Alert.alert(t('escrow.depositPendingTitle'), t('escrow.depositPendingDesc'));
        }
      }
      onDeposited();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>{t('escrow.depositModalTitle')}</Text>
          <Text style={modalStyles.desc}>{t('escrow.depositModalDesc')}</Text>

          {error && <Text style={modalStyles.error}>{error}</Text>}

          {!selected ? (
            <>
              <Text style={modalStyles.label}>{t('escrow.selectProperty')}</Text>
              <TextInput
                style={modalStyles.input}
                placeholder={t('escrow.searchProperties')}
                placeholderTextColor={colors.textLight}
                value={query}
                onChangeText={handleSearch}
              />
              <ScrollView style={{ maxHeight: 200 }}>
                {results.map((r) => (
                  <TouchableOpacity key={r.id} style={modalStyles.resultRow} onPress={() => setSelected(r)}>
                    <Text style={modalStyles.resultTitle} numberOfLines={1}>{r.title}</Text>
                    <Text style={modalStyles.resultMeta}>{r.city} · {formatXAF(r.price)}</Text>
                  </TouchableOpacity>
                ))}
                {query.length >= 2 && results.length === 0 && (
                  <Text style={modalStyles.hint}>{t('common.noResults')}</Text>
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={modalStyles.label}>{t('escrow.selectProperty')}</Text>
              <View style={modalStyles.selectedRow}>
                <Text style={modalStyles.selectedTxt} numberOfLines={1}>{selected.title}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={modalStyles.changeTxt}>{t('common.edit')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={modalStyles.label}>{t('escrow.amountXAF')}</Text>
              <TextInput
                style={modalStyles.input}
                placeholder={t('escrow.amountPlaceholder')}
                placeholderTextColor={colors.textLight}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
              />
            </>
          )}

          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={modalStyles.cancelTxt}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.confirmBtn, (!selected || busy) && { opacity: 0.5 }]}
              onPress={handleConfirm}
              disabled={!selected || busy}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={modalStyles.confirmTxt}>{t('common.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  visible, availableBalance, onClose, onWithdrawn,
}: { visible: boolean; availableBalance: string; onClose: () => void; onWithdrawn: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const modalStyles = useMemo(() => getModalStyles(colors), [colors]);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setAmount(''); setPhone(''); setError(null); }
  }, [visible]);

  const handleConfirm = async () => {
    setError(null);
    const amt = Number.parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(amt) || amt < 100) { setError(t('escrow.enterValidAmount')); return; }
    if (amt > Number(availableBalance)) { setError(t('escrow.insufficientBalance')); return; }
    if (!phone.trim()) { setError(t('escrow.enterPhoneNumber')); return; }

    setBusy(true);
    try {
      await authedFetch('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, phone: phone.trim() }),
      });
      onClose();
      Alert.alert(t('escrow.withdrawSuccessTitle'), t('escrow.withdrawSuccessDesc'));
      onWithdrawn();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>{t('escrow.withdrawModalTitle')}</Text>
          <Text style={modalStyles.desc}>{t('escrow.withdrawModalDesc')}</Text>

          {error && <Text style={modalStyles.error}>{error}</Text>}

          <Text style={modalStyles.label}>{t('escrow.amountXAF')}</Text>
          <TextInput
            style={modalStyles.input}
            placeholder={t('escrow.amountPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
          />
          <Text style={modalStyles.hint}>{formatXAF(availableBalance)} {t('escrow.withdrawable').toLowerCase()}</Text>

          <Text style={modalStyles.label}>{t('escrow.phoneNumber')}</Text>
          <TextInput
            style={modalStyles.input}
            placeholder={t('escrow.phonePlaceholder')}
            placeholderTextColor={colors.textLight}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose} disabled={busy}>
              <Text style={modalStyles.cancelTxt}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.confirmBtn, busy && { opacity: 0.5 }]} onPress={handleConfirm} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={modalStyles.confirmTxt}>{t('common.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── How It Works Modal ────────────────────────────────────────────────────────

// Step accent colors — deliberately fixed across themes (matches TYPE_META above).
const HOW_IT_WORKS_STEPS = [
  { step: '1', titleKey: 'escrow.step1Title', descKey: 'escrow.step1Desc', icon: 'arrow-up-circle', color: '#7C3AED', bg: '#F3F0FF' },
  { step: '2', titleKey: 'escrow.step2Title', descKey: 'escrow.step2Desc', icon: 'shield',          color: '#2563EB', bg: '#EFF6FF' },
  { step: '3', titleKey: 'escrow.step3Title', descKey: 'escrow.step3Desc', icon: 'clock',           color: '#059669', bg: '#ECFDF5' },
];

function HowItWorksModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.modalHandle} />

        <View style={styles.modalTitleRow}>
          <View style={styles.modalTitleIconWrap}>
            <Ionicons name="information-circle" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{t('escrow.howItWorksTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('escrow.howItWorksSub')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Feather name="x" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <View key={step.step} style={styles.stepCard}>
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
                      {t('escrow.step')} {step.step}
                    </Text>
                  </View>
                  <Text style={styles.stepTitle}>{t(step.titleKey)}</Text>
                </View>
                <Text style={styles.stepDesc}>{t(step.descKey)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.modalDivider} />

          <View style={styles.priceCeilingCard}>
            <View style={styles.priceCeilingHeader}>
              <View style={styles.priceCeilingIconWrap}>
                <Feather name="trending-up" size={16} color={colors.danger} />
              </View>
              <Text style={styles.priceCeilingTitle}>{t('escrow.priceCeilingTitle')}</Text>
            </View>

            <Text style={styles.priceCeilingBody}>
              {t('escrow.priceCeilingBody1')}{' '}
              <Text style={styles.priceCeilingBold}>{t('escrow.priceCeilingMax')}</Text>
              {'. '}
              {t('escrow.priceCeilingBody2')}{' '}
              <Text style={styles.priceCeilingBold}>{t('escrow.priceCeilingCannot')}</Text>
              {' '}{t('escrow.priceCeilingBody3')}
            </Text>

            <View style={styles.priceCeilingNote}>
              <Feather name="message-circle" size={13} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={styles.priceCeilingNoteTxt}>
                {t('escrow.priceCeilingNote1')}{' '}
                <Text style={{ fontWeight: '700', color: colors.primary }}>{t('escrow.chat')}</Text>
                {' '}{t('escrow.priceCeilingNote2')}
              </Text>
            </View>

            <View style={styles.whyItWorksBox}>
              <Text style={styles.whyItWorksTitle}>{t('escrow.whyProtectsTitle')}</Text>
              <View style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={styles.whyTxt}>
                  <Text style={{ fontWeight: '700' }}>{t('escrow.weekRule')}</Text>
                  {' '}{t('escrow.weekRuleDesc')}
                </Text>
              </View>
              <View style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={styles.whyTxt}>
                  <Text style={{ fontWeight: '700' }}>{t('escrow.priceCeilingLabel')}</Text>
                  {' '}{t('escrow.priceCeilingLabelDesc')}
                </Text>
              </View>
              <View style={styles.whyRow}>
                <View style={styles.whyDot} />
                <Text style={styles.whyTxt}>
                  <Text style={{ fontWeight: '700' }}>{t('escrow.refundRationaleTitle')}</Text>
                  {' '}{t('escrow.refundRationaleDesc')}
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

// ─── Owner Guide Modal (house owners only) ────────────────────────────────────

// Small helper: renders a "Bold label: rest of sentence" bullet line.
function GuideBullet({ bold, text, styles }: { bold?: string; text: string; styles: ReturnType<typeof getStyles> }) {
  return (
    <View style={styles.guideBulletRow}>
      <View style={styles.guideBulletDot} />
      <Text style={styles.guideBulletTxt}>
        {bold ? <Text style={styles.guideBulletBold}>{bold} </Text> : null}
        {text}
      </Text>
    </View>
  );
}

function OwnerGuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const g = (key: string) => t(`escrow.ownerGuide.${key}`);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: height, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.modalHandle} />

        <View style={styles.modalTitleRow}>
          <View style={styles.modalTitleIconWrap}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{g('title')}</Text>
            <Text style={styles.modalSubtitle}>{g('subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <Feather name="x" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.guideSectionTitle}>{g('overviewTitle')}</Text>
          <Text style={styles.guideBody}>{g('overviewBody')}</Text>

          <View style={styles.guideDivider} />
          <Text style={styles.guideSectionTitle}>{g('section1Title')}</Text>
          <GuideBullet styles={styles} bold={g('section1Bullet1Bold')} text={g('section1Bullet1')} />
          <GuideBullet styles={styles} bold={g('section1Bullet2Bold')} text={g('section1Bullet2')} />
          <GuideBullet styles={styles} bold={g('section1Bullet3Bold')} text={g('section1Bullet3')} />

          <View style={styles.guideDivider} />
          <Text style={styles.guideSectionTitle}>{g('section2Title')}</Text>
          <Text style={styles.guideBody}>{g('section2Intro')}</Text>
          <GuideBullet styles={styles} bold={g('section2Bullet1Bold')} text={g('section2Bullet1')} />
          <GuideBullet styles={styles} bold={g('section2Bullet2Bold')} text={g('section2Bullet2')} />
          <View style={styles.guideNoteBox}>
            <Feather name="info" size={13} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={styles.guideNoteTxt}>{g('section2Note')}</Text>
          </View>

          <View style={styles.guideDivider} />
          <Text style={styles.guideSectionTitle}>{g('section3Title')}</Text>
          <Text style={styles.guideBody}>{g('section3Intro')}</Text>

          <View style={styles.guideScenarioCard}>
            <Text style={styles.guideScenarioTitle}>{g('scenarioATitle')}</Text>
            <GuideBullet styles={styles} text={g('scenarioABullet1')} />
            <GuideBullet styles={styles} text={g('scenarioABullet2')} />
            <GuideBullet styles={styles} text={g('scenarioABullet3')} />
          </View>

          <View style={[styles.guideScenarioCard, styles.guideScenarioCardAlt]}>
            <Text style={styles.guideScenarioTitle}>{g('scenarioBTitle')}</Text>
            <Text style={styles.guideBody}>{g('scenarioBIntro')}</Text>
            <GuideBullet styles={styles} bold={g('scenarioBBullet1Bold')} text={g('scenarioBBullet1')} />
            <GuideBullet styles={styles} bold={g('scenarioBBullet2Bold')} text={g('scenarioBBullet2')} />
            <GuideBullet styles={styles} bold={g('scenarioBBullet3Bold')} text={g('scenarioBBullet3')} />
          </View>

          <View style={styles.guideDivider} />
          <Text style={styles.guideSectionTitle}>{g('section4Title')}</Text>
          <GuideBullet styles={styles} bold={g('section4Bullet1Bold')} text={g('section4Bullet1')} />
          <GuideBullet styles={styles} bold={g('section4Bullet2Bold')} text={g('section4Bullet2')} />
          <GuideBullet styles={styles} bold={g('section4Bullet3Bold')} text={g('section4Bullet3')} />

          <View style={{ height: 32 }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EscrowWalletScreen({ role: roleProp }: { role?: string }) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // `role` isn't always forwarded as a prop by every screen that mounts this
  // component — it's already persisted in storage under the "role" key (the
  // same one visible under Local Storage in devtools), so fall back to that
  // when no prop is given rather than silently defaulting to the tenant view.
  const [storedRole, setStoredRole] = useState<string | null>(null);
  useEffect(() => {
    if (!roleProp) {
      AsyncStorage.getItem('role').then(setStoredRole).catch(() => {});
    }
  }, [roleProp]);
  const role = roleProp ?? storedRole;

  const isOwner = role === 'SELLER'; // mirrors `const isBuyer = role === 'BUYER'` used elsewhere in the app

  const [infoVisible, setInfoVisible] = useState(false);
  const [depositVisible, setDepositVisible] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await authedFetch('/wallet/me');
      setWallet(data.wallet);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message || t('escrow.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const activeProtections = transactions.filter((tx) => tx.type === 'Hold' && tx.status === 'Completed' && !tx.resolvedAs);
  const totalBalance = wallet ? Number(wallet.heldBalance) + Number(wallet.availableBalance) : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textLight, fontSize: 13 }}>{t('escrow.loadingWallet')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>{t('escrow.title')}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoVisible(true)} activeOpacity={0.75}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>

        {error && (
          <TouchableOpacity style={{ margin: H_PAD, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12 }} onPress={load}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>{error} — {t('common.retry')}</Text>
          </TouchableOpacity>
        )}

        {/* Fixed brand card — stays purple in both themes, like a solid-color button */}
        <View style={styles.balanceCard}>
          <View style={styles.shieldWatermark}>
            <Ionicons name="shield-checkmark" size={90} color="rgba(255,255,255,0.1)" />
          </View>

          <TouchableOpacity style={styles.balanceInfoHint} onPress={() => setInfoVisible(true)} activeOpacity={0.8}>
            <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.balanceInfoHintTxt}>{t('escrow.howItWorksHint')}</Text>
            <Feather name="chevron-right" size={11} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Text style={styles.balanceLabel}>{t('escrow.totalBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatXAF(totalBalance)}</Text>

          <View style={styles.balanceSubRow}>
            <View style={styles.balanceSubCard}>
              <View style={styles.balanceSubLabelRow}>
                <Feather name="lock" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>{t('escrow.lockedEscrow')}</Text>
              </View>
              <Text style={styles.balanceSubAmount}>{formatXAF(wallet?.heldBalance || 0)}</Text>
            </View>
            <View style={styles.balanceSubCard}>
              <View style={styles.balanceSubLabelRow}>
                <Feather name="unlock" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.balanceSubLabel}>{t('escrow.withdrawable')}</Text>
              </View>
              <Text style={styles.balanceSubAmount}>{formatXAF(wallet?.availableBalance || 0)}</Text>
            </View>
          </View>

          <View style={styles.feeBanner}>
            <Feather name="alert-circle" size={14} color="rgba(255,255,255,0.95)" />
            <Text style={styles.feeBannerTxt}>{t('escrow.processingFeeNote')}</Text>
          </View>
        </View>

        <View style={styles.primaryActions}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, styles.depositBtn]}
            activeOpacity={0.85}
            onPress={() => setDepositVisible(true)}>
            <Feather name="arrow-up-circle" size={18} color={colors.primary} />
            <Text style={[styles.primaryActionTxt, styles.primaryActionTxtDeposit]}>{t('escrow.deposit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryActionBtn, styles.withdrawBtn]}
            activeOpacity={0.85}
            onPress={() => setWithdrawVisible(true)}>
            <Feather name="arrow-down-circle" size={18} color="#fff" />
            <Text style={[styles.primaryActionTxt, styles.primaryActionTxtWithdraw]}>{t('escrow.withdraw')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('escrow.activeProtections')}</Text>
        </View>

        {activeProtections.length === 0 ? (
          <Text style={{ color: colors.textLight, fontSize: 13, marginHorizontal: H_PAD, marginBottom: 8 }}>
            {t('escrow.noActiveProtections')}
          </Text>
        ) : (
          <FlatList
            data={activeProtections}
            horizontal
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => <ProtectionCard item={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.protectionList}
            snapToInterval={PROTECTION_CARD_W + 14}
            decelerationRate="fast"
          />
        )}

        <View style={styles.escrowBanner}>
          <View style={styles.escrowBannerIcon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.escrowBannerTitle}>{t('escrow.protectionActive')}</Text>
            <Text style={styles.escrowBannerSub}>{t('escrow.protectionActiveSub')}</Text>
          </View>
          <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.escrowBannerInfoBtn} activeOpacity={0.7}>
            <Text style={styles.escrowBannerInfoTxt}>{t('escrow.info')}</Text>
            <Feather name="chevron-right" size={11} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>{t('escrow.recentActivity')}</Text>
        </View>

        {transactions.length === 0 ? (
          <Text style={{ color: colors.textLight, fontSize: 13, marginHorizontal: H_PAD }}>{t('escrow.noActivity')}</Text>
        ) : (
          <View style={styles.activityList}>
            {transactions.map((item, index) => (
              <View key={item.id}>
                <ActivityRow item={item} />
                {index < transactions.length - 1 && <View style={styles.activityDivider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {isOwner ? (
        <OwnerGuideModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      ) : (
        <HowItWorksModal visible={infoVisible} onClose={() => setInfoVisible(false)} />
      )}
      <DepositModal visible={depositVisible} onClose={() => setDepositVisible(false)} onDeposited={load} />
      <WithdrawModal
        visible={withdrawVisible}
        availableBalance={wallet?.availableBalance || '0'}
        onClose={() => setWithdrawVisible(false)}
        onWithdrawn={load}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, paddingVertical: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTint, borderRadius: 19 },

    // ── Fixed brand card — unchanged across themes ──
    balanceCard: { margin: H_PAD, borderRadius: 22, backgroundColor: '#6D28D9', padding: 22, overflow: 'hidden', position: 'relative' },
    shieldWatermark: { position: 'absolute', right: 12, top: 10 },
    balanceInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    balanceInfoHintTxt: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    balanceLabel: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 6 },
    balanceAmount: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.8, marginBottom: 20 },
    balanceSubRow: { flexDirection: 'row', gap: 12 },
    balanceSubCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, gap: 6 },
    balanceSubLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    balanceSubLabel: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
    balanceSubAmount: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.3, lineHeight: 20 },
    feeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12 },
    feeBannerTxt: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 17, fontWeight: '500' },

    primaryActions: { flexDirection: 'row', gap: 12, marginHorizontal: H_PAD, marginBottom: 24 },
    primaryActionBtn: { flex: 1, minHeight: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row', borderWidth: 1.5 },
    depositBtn: { backgroundColor: colors.primaryTint, borderColor: '#DDD6FE' }, // light-purple border, no matching token
    withdrawBtn: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
    primaryActionTxt: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.1 },
    primaryActionTxtDeposit: { color: colors.primary },
    primaryActionTxtWithdraw: { color: '#fff' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: H_PAD, marginBottom: 14 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },

    protectionList: { paddingLeft: H_PAD, paddingRight: H_PAD / 2, gap: 14, paddingBottom: 4 },
    protectionCard: { width: PROTECTION_CARD_W, backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.borderLight, gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    protectionTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    protectionIdRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    protectionTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, letterSpacing: -0.1, maxWidth: 140 },
    protectionId: { fontSize: 10.5, color: colors.textLight },
    lockedChip: { backgroundColor: colors.primaryTint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    lockedChipTxt: { fontSize: 10.5, color: colors.primary, fontWeight: '700' },
    protectionAmount: { fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontSize: 11, color: colors.textLight },

    escrowBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: H_PAD, marginTop: 16, backgroundColor: colors.primaryTint, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.primaryBorder },
    escrowBannerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
    escrowBannerTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 2 },
    escrowBannerSub: { fontSize: 11, color: '#A78BFA', lineHeight: 16 }, // light-purple subtext, no matching token
    escrowBannerInfoBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.primaryBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
    escrowBannerInfoTxt: { fontSize: 11, color: colors.primary, fontWeight: '700' },

    activityList: { marginHorizontal: H_PAD, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden' },
    activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    activityInfo: { flex: 1 },
    activityLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
    activityDate: { fontSize: 11, color: colors.textLight },
    activityAmount: { fontSize: 13.5, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: 2 },
    activityStatus: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5 },
    activityDivider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 66 },

    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
    modalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 0, maxHeight: height * 0.88 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    modalTitleIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
    modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    modalSubtitle: { fontSize: 11.5, color: colors.textLight, marginTop: 1 },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },

    stepCard: { flexDirection: 'row', gap: 14, marginBottom: 18, position: 'relative' },
    stepConnector: { position: 'absolute', left: 19, top: 42, width: 2, height: 36, backgroundColor: colors.primaryBorder, zIndex: 0 },
    stepIconWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0 },
    stepContent: { flex: 1 },
    stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    stepBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    stepBadgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    stepTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    stepDesc: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
    modalDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 20 },

    priceCeilingCard: { backgroundColor: '#FFFBEB', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#FDE68A', gap: 12, marginBottom: 4 }, // amber warning card, no matching token
    priceCeilingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    priceCeilingIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }, // danger-tint, no matching token
    priceCeilingTitle: { fontSize: 14, fontWeight: '800', color: colors.danger, letterSpacing: -0.2 },
    priceCeilingBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    priceCeilingBold: { fontWeight: '800', color: colors.danger },
    priceCeilingNote: { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryTint, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
    priceCeilingNoteTxt: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    whyItWorksBox: { backgroundColor: colors.card, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: colors.border },
    whyItWorksTitle: { fontSize: 11.5, fontWeight: '700', color: colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    whyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    whyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 5, flexShrink: 0 },
    whyTxt: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

    // ── Owner escrow guide (house-owner-only info modal) ──
    guideSectionTitle: { fontSize: 14.5, fontWeight: '800', color: colors.text, marginBottom: 8, letterSpacing: -0.2 },
    guideBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 },
    guideDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 18 },
    guideBulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
    guideBulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 6, flexShrink: 0 },
    guideBulletTxt: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    guideBulletBold: { fontWeight: '700', color: colors.text },
    guideNoteBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.primaryTint, borderRadius: 12, padding: 12, alignItems: 'flex-start', marginTop: 4 },
    guideNoteTxt: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    guideScenarioCard: { backgroundColor: colors.cardMuted, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.borderLight, marginTop: 12 },
    guideScenarioCardAlt: { backgroundColor: colors.warningBg, borderColor: colors.warning }, // early-departure scenario, deliberately flagged
    guideScenarioTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, lineHeight: 18 },
  });
}

function getModalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
    title: { fontSize: 17, fontWeight: '800', color: colors.text },
    desc: { fontSize: 12.5, color: colors.textLight, marginTop: 4, marginBottom: 16, lineHeight: 17 },
    error: { fontSize: 12.5, color: colors.danger, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12 }, // danger-tint, no matching token
    label: { fontSize: 12.5, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.card,
    },
    hint: { fontSize: 11.5, color: colors.textLight, marginTop: 4 },
    resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    resultTitle: { fontSize: 13.5, fontWeight: '600', color: colors.text },
    resultMeta: { fontSize: 11.5, color: colors.textLight, marginTop: 1 },
    selectedRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.primaryTint, borderRadius: 12, padding: 12,
    },
    selectedTxt: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.text, marginRight: 8 },
    changeTxt: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
    actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 14, alignItems: 'center' },
    cancelTxt: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    confirmBtn: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
    confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
}