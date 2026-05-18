import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchCasaMatches, MatchResult } from '../services/casaMatchService';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  purple: '#6D28D9',
  purpleLight: '#F5F3FF',
  purpleMid: '#7C3AED',
  purpleBorder: '#EDE9FE',
  purpleText: '#5B21B6',
  accent: '#F59E0B',
  bg: '#fff',
  card: '#FAFAFA',
  border: '#EFEFEF',
  textDark: '#111827',
  textMid: '#374151',
  textGray: '#9CA3AF',
  red: '#EF4444',
  redLight: '#FEF2F2',
  redBorder: '#FECACA',
};
const H_PAD = 20;

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'quiz' | 'thinking' | 'results';

export interface QuizState {
  budget: string | null;
  city: string | null;
  propertyType: string | null;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  kitchens: number;
  parlors: number;
  purpose: 'renting' | 'buying' | null;
  facilities: string[];
  description: string;
  dealBreakers: string[];
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const TOTAL_STEPS = 8;

function ProgressBar({ step }: { step: number }) {
  const { t } = useTranslation();
  const pct = Math.round(((step) / TOTAL_STEPS) * 100);
  return (
    <View style={styles.progressWrap}>
      <Text style={styles.progressLabel}>
        {t('casaMatch.stepOf', { step, total: TOTAL_STEPS })}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.progressPct}>{pct}%</Text>
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({
  label,
  selected,
  onPress,
  variant = 'default',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: 'default' | 'red';
}) {
  const isRed = variant === 'red';
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && (isRed ? styles.chipActiveRed : styles.chipActive),
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.chipTxt,
          selected && (isRed ? styles.chipTxtActiveRed : styles.chipTxtActive),
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── PurposeCard ──────────────────────────────────────────────────────────────
function PurposeCard({
  icon,
  label,
  sublabel,
  selected,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.purposeCard, selected && styles.purposeCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.purposeEmoji}>{icon}</Text>
      <Text style={[styles.purposeLabel, selected && styles.purposeLabelActive]}>
        {label}
      </Text>
      <Text style={styles.purposeSub}>{sublabel}</Text>
    </TouchableOpacity>
  );
}

// ─── Quiz Screen ──────────────────────────────────────────────────────────────
function QuizScreen({ onFinish }: { onFinish: (quiz: QuizState) => void }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [quiz, setQuiz] = useState<QuizState>({
    budget: null,
    city: null,
    propertyType: null,
    bedrooms: 2,
    bathrooms: 1,
    toilets: 2,
    kitchens: 1,
    parlors: 1,
    purpose: null,
    facilities: [],
    description: '',
    dealBreakers: [],
  });

  const budgets = [
    { id: 'u50k', label: t('casaMatch.budget_u50k') },
    { id: '50_150', label: t('casaMatch.budget_50_150') },
    { id: '150_500', label: t('casaMatch.budget_150_500') },
    { id: '500_1m', label: t('casaMatch.budget_500_1m') },
    { id: 'above1m', label: t('casaMatch.budget_above1m') },
  ];

  // ── 10 major cities in Cameroon ──────────────────────────────────────────
  const cities = [
    { id: 'douala', label: 'Douala' },
    { id: 'yaounde', label: 'Yaoundé' },
    { id: 'bafoussam', label: 'Bafoussam' },
    { id: 'limbe', label: 'Limbe' },
    { id: 'bamenda', label: 'Bamenda' },
    { id: 'buea', label: 'Buea' },
    { id: 'ngaoundere', label: 'Ngaoundéré' },
    { id: 'maroua', label: 'Maroua' },
    { id: 'garoua', label: 'Garoua' },
    { id: 'bertoua', label: 'Bertoua' },
  ];

  // ── Property types matching upload.tsx ──────────────────────────────────
  const propTypes = [
    { id: 'Apartment', label: t('casaMatch.type_apartment') },
    { id: 'Studio', label: t('casaMatch.type_studio') },
    { id: 'Villa', label: t('casaMatch.type_villa') },
    { id: 'Office', label: t('casaMatch.type_office') },
    { id: 'Room', label: t('casaMatch.type_room') },
    { id: 'Duplex', label: t('casaMatch.type_duplex') },
    { id: 'Guest House', label: t('casaMatch.type_guesthouse') },
    { id: 'Hotel', label: t('casaMatch.type_hotel') },
  ];

  // ── Facilities matching upload.tsx (Nearby School → School) ─────────────
  const facilities = [
    { id: 'Wifi', label: t('casaMatch.fac_wifi') },
    { id: 'Electricity', label: t('casaMatch.fac_electricity') },
    { id: 'Water Supply', label: t('casaMatch.fac_water') },
    { id: 'Gated', label: t('casaMatch.fac_gated') },
    { id: 'Parking', label: t('casaMatch.fac_parking') },
    { id: 'Green Area', label: t('casaMatch.fac_green_area') },
    { id: 'Generator', label: t('casaMatch.fac_generator') },
    { id: 'School', label: t('casaMatch.fac_nearby_school') },
    { id: 'Bank', label: t('casaMatch.fac_bank') },
    { id: 'Restaurant', label: t('casaMatch.fac_restaurant') },
    { id: 'Market', label: t('casaMatch.fac_market') },
    { id: 'Clinic', label: t('casaMatch.fac_clinic') },
    { id: 'Security', label: t('casaMatch.fac_security') },
  ];

  const dealBreakers = [
    { id: 'no_elevator', label: t('casaMatch.db_no_elevator') },
    { id: 'no_security', label: t('casaMatch.db_no_security') },
    { id: 'far_from_road', label: t('casaMatch.db_far_road') },
    { id: 'noisy_area', label: t('casaMatch.db_noisy') },
    { id: 'ground_floor', label: t('casaMatch.db_ground_floor') },
  ];

  const toggleArr = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const canAdvance = () => {
    if (step === 1) return !!quiz.budget;
    if (step === 2) return !!quiz.city;
    if (step === 3) return !!quiz.propertyType;
    if (step === 4) return true;
    if (step === 5) return !!quiz.purpose;
    if (step === 6) return quiz.facilities.length > 0;
    if (step === 7) return quiz.description.trim().length > 10;
    if (step === 8) return true;
    return true;
  };

  const advance = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      onFinish(quiz); // ← pass the full quiz up
    }
  };

  // ── Stepper rows for step 4 ──────────────────────────────────────────────
  const stepperRows: Array<{
    label: string;
    key: 'bedrooms' | 'bathrooms' | 'toilets' | 'kitchens' | 'parlors';
    min: number;
  }> = [
      { label: t('listing.bedrooms'), key: 'bedrooms', min: 1 },
      { label: t('listing.bathrooms'), key: 'bathrooms', min: 1 },
      { label: t('listing.toilets'), key: 'toilets', min: 1 },
      { label: t('listing.kitchens'), key: 'kitchens', min: 1 },
      { label: t('listing.parlors'), key: 'parlors', min: 0 },
    ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => (step === 1 ? router.back() : setStep(s => s - 1))}
      >
        <Feather name="arrow-left" size={18} color={C.textDark} />
      </TouchableOpacity>

      {/* Progress */}
      <ProgressBar step={step} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step 1: Budget ─────────────────────────────────────────── */}
        {step === 1 && (
          <View>
            <StepHeader
              icon="💰"
              title={t('casaMatch.q_budget_title')}
              desc={t('casaMatch.q_budget_desc')}
            />
            <View style={styles.chipGrid}>
              {budgets.map(b => (
                <Chip
                  key={b.id}
                  label={b.label}
                  selected={quiz.budget === b.id}
                  onPress={() => setQuiz(q => ({ ...q, budget: b.id }))}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 2: City ───────────────────────────────────────────── */}
        {step === 2 && (
          <View>
            <StepHeader
              icon="📍"
              title={t('casaMatch.q_city_title')}
              desc={t('casaMatch.q_city_desc')}
            />
            <View style={styles.chipGrid}>
              {cities.map(c => (
                <Chip
                  key={c.id}
                  label={c.label}
                  selected={quiz.city === c.id}
                  onPress={() => setQuiz(q => ({ ...q, city: c.id }))}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 3: Property type ──────────────────────────────────── */}
        {step === 3 && (
          <View>
            <StepHeader
              icon="🏠"
              title={t('casaMatch.q_type_title')}
              desc={t('casaMatch.q_type_desc')}
            />
            <View style={styles.chipGrid}>
              {propTypes.map(p => (
                <Chip
                  key={p.id}
                  label={p.label}
                  selected={quiz.propertyType === p.id}
                  onPress={() => setQuiz(q => ({ ...q, propertyType: p.id }))}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 4: Rooms (Bedrooms / Bathrooms / Toilets / Kitchens / Parlors) ── */}
        {step === 4 && (
          <View>
            <StepHeader
              icon="🛏"
              title={t('casaMatch.q_bedrooms_title')}
              desc={t('casaMatch.q_bedrooms_desc')}
            />
            {stepperRows.map(row => (
              <View key={row.key} style={styles.stepperBlock}>
                <Text style={styles.stepperLabel}>{row.label}</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() =>
                      setQuiz(q => ({ ...q, [row.key]: Math.max(row.min, q[row.key] - 1) }))
                    }
                  >
                    <Feather name="minus" size={18} color={C.purpleMid} />
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>{quiz[row.key]}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() =>
                      setQuiz(q => ({ ...q, [row.key]: q[row.key] + 1 }))
                    }
                  >
                    <Feather name="plus" size={18} color={C.purpleMid} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Step 5: Purpose ───────────────────────────────────────── */}
        {step === 5 && (
          <View>
            <StepHeader
              icon="🎯"
              title={t('casaMatch.q_purpose_title')}
              desc={t('casaMatch.q_purpose_desc')}
            />
            <View style={styles.purposeRow}>
              <PurposeCard
                icon="🏘"
                label={t('casaMatch.purpose_renting')}
                sublabel={t('casaMatch.purpose_renting_sub')}
                selected={quiz.purpose === 'renting'}
                onPress={() => setQuiz(q => ({ ...q, purpose: 'renting' }))}
              />
              <PurposeCard
                icon="🔑"
                label={t('casaMatch.purpose_buying')}
                sublabel={t('casaMatch.purpose_buying_sub')}
                selected={quiz.purpose === 'buying'}
                onPress={() => setQuiz(q => ({ ...q, purpose: 'buying' }))}
              />
            </View>
          </View>
        )}

        {/* ── Step 6: Facilities ────────────────────────────────────── */}
        {step === 6 && (
          <View>
            <StepHeader
              icon="✅"
              title={t('casaMatch.q_facilities_title')}
              desc={t('casaMatch.q_facilities_desc')}
            />
            <View style={styles.chipGrid}>
              {facilities.map(f => (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={quiz.facilities.includes(f.id)}
                  onPress={() =>
                    setQuiz(q => ({ ...q, facilities: toggleArr(q.facilities, f.id) }))
                  }
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Step 7: Free text ─────────────────────────────────────── */}
        {step === 7 && (
          <View>
            <StepHeader
              icon="✍️"
              title={t('casaMatch.q_desc_title')}
              desc={t('casaMatch.q_desc_desc')}
            />
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              placeholder={t('casaMatch.q_desc_placeholder')}
              placeholderTextColor={C.textGray}
              value={quiz.description}
              onChangeText={v => setQuiz(q => ({ ...q, description: v }))}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {quiz.description.length} / 500
            </Text>
          </View>
        )}

        {/* ── Step 8: Deal-breakers ─────────────────────────────────── */}
        {step === 8 && (
          <View>
            <StepHeader
              icon="🚫"
              title={t('casaMatch.q_dealbreakers_title')}
              desc={t('casaMatch.q_dealbreakers_desc')}
            />
            <View style={styles.chipGrid}>
              {dealBreakers.map(d => (
                <Chip
                  key={d.id}
                  label={d.label}
                  selected={quiz.dealBreakers.includes(d.id)}
                  onPress={() =>
                    setQuiz(q => ({ ...q, dealBreakers: toggleArr(q.dealBreakers, d.id) }))
                  }
                  variant="red"
                />
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          disabled={!canAdvance()}
          onPress={advance}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnTxt}>
            {step === TOTAL_STEPS
              ? t('casaMatch.findMyMatch')
              : t('casaMatch.nextStep')}
          </Text>
          {step < TOTAL_STEPS && (
            <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Step Header ──────────────────────────────────────────────────────────────
function StepHeader({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.stepEmoji}>{icon}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  );
}

// ─── Thinking Screen ──────────────────────────────────────────────────────────
function ThinkingScreen({
  quiz,
  onDone,
  onError,
}: {
  quiz: QuizState;
  onDone: (results: MatchResult[]) => void;
  onError: (err: string) => void;
}) {
  const { t } = useTranslation();
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // ── Animations (unchanged) ─────────────────────────────────────────────
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1800, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // ── Real API call ──────────────────────────────────────────────────────
    fetchCasaMatches(quiz)
      .then(results => onDone(results))
      .catch(err => {
        console.error(err);
        onError('matching_failed');
      });
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={[styles.safe, styles.centerFlex]}>
      <View style={styles.thinkingIconWrap}>
        <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]} />
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="sparkles" size={32} color={C.purpleMid} />
        </Animated.View>
      </View>
      <View style={styles.thinkingTextBlock}>
        <Text style={styles.thinkingTitle}>{t('casaMatch.thinking_title')}</Text>
        <Text style={styles.thinkingDesc}>{t('casaMatch.thinking_desc')}</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
const MOCK_RESULTS = [
  {
    id: '1',
    score: 96,
    name: 'Modern Villa, Bastos',
    location: 'Bastos, Yaoundé',
    price: '450k XAF/mo',
    tags: ['WiFi', 'Parking', 'Gated'],
    quote: '"Perfectly matches your quiet neighbourhood preferences and avoids ground floors."',
    badge: 'Best Match',
    badgeColor: C.purple,
  },
  {
    id: '2',
    score: 91,
    name: 'Luxury Appt, Golf',
    location: 'Golf, Yaoundé',
    price: '350k XAF/mo',
    tags: ['Balcony', 'Security', 'A/C'],
    quote: '"Close to the areas you listed once; only slightly further from main roads."',
    badge: null,
    badgeColor: C.purple,
  },
];

function ResultsScreen({
  results,
  error,
}: {
  results: MatchResult[];
  error: string | null;
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'near' | 'for_rent'>('all');

  const filters: Array<{ id: 'all' | 'near' | 'for_rent'; label: string }> = [
    { id: 'all', label: t('casaMatch.filter_all') },
    { id: 'near', label: t('casaMatch.filter_near') },
    { id: 'for_rent', label: t('casaMatch.filter_for_rent') },
  ];
    if (error || results.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerFlex]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={C.textDark} />
        </TouchableOpacity>
        <Ionicons name="home-outline" size={48} color={C.textGray} />
        <Text style={[styles.thinkingTitle, { marginTop: 16 }]}>
          {t('casaMatch.no_results_title')}
        </Text>
        <Text style={styles.thinkingDesc}>{t('casaMatch.no_results_desc')}</Text>
      </SafeAreaView>
    );
  }


 return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="arrow-left" size={18} color={C.textDark} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.resultsHeading}>{t('casaMatch.results_heading')}</Text>
        <Text style={styles.resultsSubheading}>{t('casaMatch.results_sub')}</Text>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 20 }}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {filters.map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterTab, activeFilter === f.id && styles.filterTabActive]}
              onPress={() => setActiveFilter(f.id)}
            >
              <Text style={[styles.filterTabTxt, activeFilter === f.id && styles.filterTabTxtActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Cards — now driven by real results */}
        {results.map(r => (
          <View key={r.id} style={styles.resultCard}>
            <View style={styles.resultImgPlaceholder}>
              <Ionicons name="home-outline" size={32} color="#C4B5FD" />
              {r.badge && (
                <View style={[styles.resultBadge, { backgroundColor: C.purple }]}>
                  <Text style={styles.resultBadgeTxt}>{r.badge}</Text>
                </View>
              )}
              <View style={styles.scoreChip}>
                <Text style={styles.scoreChipTxt}>{r.score}% {t('casaMatch.match')}</Text>
              </View>
            </View>

            <View style={styles.resultBody}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={styles.resultLocation}>
                <Ionicons name="location-outline" size={12} color={C.textGray} /> {r.location}
              </Text>
              <Text style={styles.resultPrice}>{r.price}</Text>

              <View style={styles.tagRow}>
                {r.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagTxt}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* AI explanation — now real, from Claude */}
              <View style={styles.quoteBox}>
                <Ionicons name="sparkles" size={12} color={C.purpleMid} style={{ marginRight: 6 }} />
                <Text style={styles.quoteTxt}>"{r.matchReason}"</Text>
              </View>

              <TouchableOpacity style={styles.viewBtn} activeOpacity={0.85}>
                <Text style={styles.viewBtnTxt}>{t('casaMatch.viewProperty')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={styles.verifiedNote}>{t('casaMatch.verifiedNote')}</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Root Export — now manages shared state ───────────────────────────────────
export default function CasaMatchAIScreen() {
  const [screen, setScreen] = useState<Screen>('quiz');
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {screen === 'quiz' && (
        <QuizScreen
          onFinish={completedQuiz => {
            setQuiz(completedQuiz);
            setScreen('thinking');
          }}
        />
      )}
      {screen === 'thinking' && quiz && (
        <ThinkingScreen
          quiz={quiz}
          onDone={matched => {
            setResults(matched);
            setScreen('results');
          }}
          onError={err => {
            setError(err);
            setScreen('results'); // still navigate, show error state
          }}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen results={results} error={error} />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerFlex: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 16 },

  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginLeft: H_PAD,
  },

  // Progress
  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: H_PAD, marginTop: 12, marginBottom: 4, gap: 10,
  },
  progressLabel: { fontSize: 12, color: C.textGray, width: 50 },
  progressTrack: {
    flex: 1, height: 6, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: C.purple },
  progressPct: { fontSize: 12, fontWeight: '700', color: C.purpleText, width: 36, textAlign: 'right' },

  // Step
  stepEmoji: { fontSize: 30, marginBottom: 10 },
  stepTitle: { fontSize: 21, fontWeight: '800', color: C.textDark, letterSpacing: -0.4, marginBottom: 6 },
  stepDesc: { fontSize: 13, color: C.textGray, lineHeight: 19 },

  // Chip
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.border,
  },
  chipActive: { borderColor: C.purpleMid, backgroundColor: C.purpleLight },
  chipActiveRed: { borderColor: C.red, backgroundColor: C.redLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: C.textMid },
  chipTxtActive: { color: C.purpleText },
  chipTxtActiveRed: { color: C.red },

  // Stepper block (one per room type)
  stepperBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  stepperLabel: { fontSize: 14, fontWeight: '600', color: C.textDark },

  // Stepper controls
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.purpleLight, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.purpleBorder,
  },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.purpleBorder,
  },
  stepperVal: { fontSize: 18, fontWeight: '800', color: C.purpleText, minWidth: 24, textAlign: 'center' },

  // Purpose
  purposeRow: { flexDirection: 'row', gap: 12 },
  purposeCard: {
    flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card, padding: 20, alignItems: 'center', gap: 6,
  },
  purposeCardActive: { borderColor: C.purpleMid, backgroundColor: C.purpleLight },
  purposeEmoji: { fontSize: 26 },
  purposeLabel: { fontSize: 15, fontWeight: '800', color: C.textDark },
  purposeLabelActive: { color: C.purpleText },
  purposeSub: { fontSize: 11, color: C.textGray, textAlign: 'center' },

  // Text area
  textArea: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
    padding: 16, fontSize: 14, color: C.textDark, lineHeight: 21,
    minHeight: 130,
  },
  charCount: { fontSize: 11, color: C.textGray, textAlign: 'right', marginTop: 6 },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: H_PAD, paddingBottom: 34, paddingTop: 12,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  nextBtn: {
    backgroundColor: C.purple, borderRadius: 16, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.purple, shadowOpacity: 0.35, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  nextBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  nextBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },

  // Thinking
  spinnerRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: C.purpleLight,
    borderTopColor: C.purpleMid,
    position: 'absolute',
  },
  thinkingIconWrap: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  thinkingTextBlock: {
    width: '100%',
    paddingHorizontal: H_PAD,
    alignItems: 'center',
  },
  logoCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  thinkingTitle: {
    fontSize: 20, fontWeight: '800', color: C.textDark,
    marginBottom: 8, textAlign: 'center',
  },
  thinkingDesc: {
    fontSize: 13, color: C.textGray,
    textAlign: 'center', lineHeight: 19,
  },
  // Results
  resultsHeading: {
    fontSize: 22, fontWeight: '800', color: C.textDark, letterSpacing: -0.5, marginBottom: 6,
  },
  resultsSubheading: { fontSize: 13, color: C.textGray, lineHeight: 19, marginBottom: 18 },

  filterTab: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
  },
  filterTabActive: { backgroundColor: C.purple, borderColor: C.purple },
  filterTabTxt: { fontSize: 13, fontWeight: '600', color: C.textMid },
  filterTabTxtActive: { color: '#fff' },

  resultCard: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },
  resultImgPlaceholder: {
    height: 160, backgroundColor: C.purpleLight,
    alignItems: 'center', justifyContent: 'center',
  },
  resultBadge: {
    position: 'absolute', top: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  resultBadgeTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  scoreChip: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  scoreChipTxt: { fontSize: 12, fontWeight: '800', color: C.purpleText },

  resultBody: { padding: 16 },
  resultName: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 4 },
  resultLocation: { fontSize: 12, color: C.textGray, marginBottom: 4 },
  resultPrice: { fontSize: 15, fontWeight: '700', color: C.purpleText, marginBottom: 12 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: C.purpleLight, borderRadius: 8,
  },
  tagTxt: { fontSize: 11, fontWeight: '600', color: C.purpleText },

  quoteBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FAF5FF', borderRadius: 12, padding: 12, marginBottom: 14,
  },
  quoteTxt: { flex: 1, fontSize: 12, color: '#7C3AED', lineHeight: 17, fontStyle: 'italic' },

  viewBtn: {
    backgroundColor: C.purple, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  viewBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },

  verifiedNote: {
    fontSize: 11.5, color: C.textGray, textAlign: 'center',
    lineHeight: 17, marginTop: 8, paddingHorizontal: 20,
  },
});