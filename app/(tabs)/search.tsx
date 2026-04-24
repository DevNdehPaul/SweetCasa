import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  PanResponder,
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
const SLIDER_WIDTH = width - H_PAD * 2 - 8;
const MIN_BUDGET = 50_000;
const MAX_BUDGET = 2_000_000;

// ─── Data ─────────────────────────────────────────────────────────────────────
const HOUSE_TYPES = [
  { id: 'apartment', label: 'Apartment', icon: 'grid' },
  { id: 'studio',    label: 'Studio',    icon: 'home' },
  { id: 'villa',     label: 'Villa',     icon: 'layers' },
  { id: 'office',    label: 'Office',    icon: 'briefcase' },
  { id: 'room',      label: 'Room',      icon: 'square' },
  { id: 'duplex',    label: 'Duplex',    icon: 'copy' },
];

const FACILITIES = [
  { id: 'school',      label: 'Nearby School',    icon: 'book-open' },
  { id: 'gated',       label: 'Gated',            icon: 'shield' },
  { id: 'wifi',        label: 'Wifi',             icon: 'wifi' },
  { id: 'electricity', label: 'Electricity',      icon: 'zap' },
  { id: 'green',       label: 'Green Area',       icon: 'feather' },
  { id: 'parking',     label: 'Parking',          icon: 'truck' },
  { id: 'video',       label: 'Video Walkthrough', icon: 'video' },
];

const LISTING_STATUSES = [
  {
    id: 'available',
    label: 'Available',
    subtitle: '100% ready to book',
    icon: 'check-circle',
    color: '#059669',      // emerald
    bg: '#ECFDF5',
    border: '#6EE7B7',
    activeBg: '#D1FAE5',
    activeBorder: '#059669',
  },
  {
    id: 'pending',
    label: 'Pending',
    subtitle: 'Transaction in progress',
    icon: 'clock',
    color: '#D97706',      // amber
    bg: '#FFFBEB',
    border: '#FCD34D',
    activeBg: '#FEF3C7',
    activeBorder: '#D97706',
  },
  {
    id: 'unavailable',
    label: 'Unavailable',
    subtitle: 'Off the market',
    icon: 'x-circle',
    color: '#9CA3AF',      // gray
    bg: '#F9FAFB',
    border: '#E5E7EB',
    activeBg: '#F3F4F6',
    activeBorder: '#6B7280',
  },
];

function formatBudget(val: number) {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  return (val / 1_000).toFixed(0) + 'k';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SearchFiltersScreen() {
  const [selectedType, setSelectedType] = useState<string>('apartment');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(['gated', 'electricity']);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['available']);
  const [budgetPct, setBudgetPct] = useState(0.13);
  const sliderRef = React.useRef<View>(null);
  const sliderX = React.useRef(0);

  const budget = Math.round(MIN_BUDGET + budgetPct * (MAX_BUDGET - MIN_BUDGET));

  const toggleFacility = (id: string) => {
    setSelectedFacilities(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleStatus = (id: string) => {
    setSelectedStatuses(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.pageX - sliderX.current;
      const pct = Math.min(1, Math.max(0, x / SLIDER_WIDTH));
      setBudgetPct(pct);
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.pageX - sliderX.current;
      const pct = Math.min(1, Math.max(0, x / SLIDER_WIDTH));
      setBudgetPct(pct);
    },
  });

  const thumbLeft = budgetPct * SLIDER_WIDTH;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Filters</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Feather name="rotate-ccw" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Location ── */}
        <Text style={styles.sectionTitle}>Location</Text>

        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={16} color="#7C3AED" />
          <Text style={styles.locationTxt}>Cameroon</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.locationRow} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={16} color="#7C3AED" />
          <Text style={styles.locationTxt}>Littoral</Text>
        </TouchableOpacity>

        <View style={styles.locationPairRow}>
          <TouchableOpacity style={[styles.locationRow, styles.locationHalf]} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={16} color="#7C3AED" />
            <Text style={styles.locationTxt}>Douala</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.locationRow, styles.locationHalf]} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={16} color="#7C3AED" />
            <Text style={styles.locationTxt}>Bonapriso</Text>
          </TouchableOpacity>
        </View>

        {/* ── Listing Status ── */}
        <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Listing Status</Text>
        <Text style={styles.sectionSubtitle}>
          Filter listings by availability — skip anything not ready.
        </Text>

        <View style={styles.statusList}>
          {LISTING_STATUSES.map(s => {
            const active = selectedStatuses.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                activeOpacity={0.75}
                onPress={() => toggleStatus(s.id)}
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor: active ? s.activeBg : s.bg,
                    borderColor: active ? s.activeBorder : s.border,
                  },
                ]}
              >
                {/* Colored left accent bar */}
                <View style={[styles.statusAccent, { backgroundColor: s.color }]} />

                <View style={styles.statusIconWrap}>
                  <Feather name={s.icon as any} size={20} color={s.color} />
                </View>

                <View style={styles.statusTextWrap}>
                  <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
                  <Text style={styles.statusSubtitle}>{s.subtitle}</Text>
                </View>

                {/* Checkmark when active */}
                <View
                  style={[
                    styles.statusCheck,
                    {
                      backgroundColor: active ? s.color : 'transparent',
                      borderColor: active ? s.color : '#D1D5DB',
                    },
                  ]}
                >
                  {active && <Feather name="check" size={11} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── House Type ── */}
        <Text style={[styles.sectionTitle, { marginTop: 26 }]}>House Type</Text>

        <View style={styles.typeGrid}>
          {HOUSE_TYPES.map(t => {
            const active = selectedType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeCard, active && styles.typeCardActive]}
                activeOpacity={0.75}
                onPress={() => setSelectedType(t.id)}
              >
                <Feather
                  name={t.icon as any}
                  size={22}
                  color={active ? '#7C3AED' : '#888'}
                />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Budget Range ── */}
        <View style={styles.budgetHeader}>
          <Text style={styles.sectionTitle}>Budget Range</Text>
          <Text style={styles.budgetValue}>Up to {formatBudget(budget)} XAF</Text>
        </View>

        <View
          style={styles.sliderContainer}
          ref={sliderRef}
          onLayout={e => {
            sliderRef.current?.measure((_x, _y, _w, _h, px) => {
              sliderX.current = px;
            });
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: thumbLeft + 10 }]} />
          </View>
          <View style={[styles.sliderThumb, { left: thumbLeft - 10 }]} />
        </View>

        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>MIN: {formatBudget(MIN_BUDGET)}</Text>
          <Text style={styles.sliderLabel}>MAX: {formatBudget(MAX_BUDGET)}</Text>
        </View>

        {/* ── Nearby Facilities ── */}
        <Text style={[styles.sectionTitle, { marginTop: 26 }]}>Nearby Facilities</Text>

        <View style={styles.facilitiesGrid}>
          {FACILITIES.map(f => {
            const active = selectedFacilities.includes(f.id);
            const isVideo = f.id === 'video';
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.facilityRow,
                  active && styles.facilityRowActive,
                  isVideo && styles.facilityRowVideo,
                  isVideo && active && styles.facilityRowVideoActive,
                ]}
                activeOpacity={0.75}
                onPress={() => toggleFacility(f.id)}
              >
                <Feather
                  name={f.icon as any}
                  size={15}
                  color={active ? (isVideo ? '#0369A1' : '#7C3AED') : '#888'}
                />
                <Text
                  style={[
                    styles.facilityLabel,
                    active && styles.facilityLabelActive,
                    isVideo && active && styles.facilityLabelVideo,
                  ]}
                >
                  {f.label}
                </Text>
                {isVideo && (
                  <View style={[styles.newBadge, active && styles.newBadgeActive]}>
                    <Text style={[styles.newBadgeTxt, active && styles.newBadgeTxtActive]}>
                      NEW
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Show Results Button ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.resultsBtn} activeOpacity={0.88}>
          <Ionicons name="search" size={18} color="#fff" />
          <Text style={styles.resultsBtnTxt}>Show 142 Results</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconBtn: {
    width: 38, height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
  },

  // Section
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
    marginBottom: 14,
    lineHeight: 17,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  locationPairRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationHalf: {
    flex: 1,
    marginBottom: 0,
  },
  locationTxt: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },

  // ── Listing Status ──
  statusList: {
    gap: 10,
    marginBottom: 4,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    paddingRight: 14,
    paddingVertical: 14,
  },
  statusAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginRight: 12,
    marginLeft: 0,
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 11.5,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  statusCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // House Type
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  typeCard: {
    width: (width - H_PAD * 2 - 20) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    backgroundColor: '#fff',
    gap: 7,
  },
  typeCardActive: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  typeLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  typeLabelActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },

  // Budget
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 20,
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7C3AED',
  },

  // Slider
  sliderContainer: {
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 4,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#EFEFEF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 10.5,
    color: '#B0B0B0',
    fontWeight: '500',
  },

  // Facilities
  facilitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: (width - H_PAD * 2 - 10) / 2,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EFEFEF',
    backgroundColor: '#fff',
  },
  facilityRowActive: {
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
  },
  // Video Walkthrough — full-width pill with sky-blue accent
  facilityRowVideo: {
    width: '100%',
    borderStyle: 'dashed',
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  facilityRowVideoActive: {
    borderStyle: 'solid',
    borderColor: '#0284C7',
    backgroundColor: '#E0F2FE',
  },
  facilityLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    flex: 1,
  },
  facilityLabelActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  facilityLabelVideo: {
    color: '#0369A1',
  },
  newBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  newBadgeActive: {
    backgroundColor: '#0284C7',
  },
  newBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  newBadgeTxtActive: {
    color: '#fff',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: H_PAD,
    paddingBottom: 32,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  resultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6D28D9',
    borderRadius: 16,
    paddingVertical: 16,
  },
  resultsBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.1,
  },
});