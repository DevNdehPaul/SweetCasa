import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions, Modal, PanResponder, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const H_PAD = 20;
const SLIDER_WIDTH = width - H_PAD * 2 - 8;
const MIN_BUDGET = 50_000;
const MAX_BUDGET = 2_000_000_000;

const REGIONS: { label: string; city: string }[] = [
  { label: 'Adamawa',    city: 'Ngaoundéré' },
  { label: 'Centre',     city: 'Yaoundé'    },
  { label: 'East',       city: 'Bertoua'    },
  { label: 'Far North',  city: 'Maroua'     },
  { label: 'Littoral',   city: 'Douala'     },
  { label: 'North',      city: 'Garoua'     },
  { label: 'North West', city: 'Bamenda'    },
  { label: 'South',      city: 'Ebolowa'    },
  { label: 'South West', city: 'Buea'       },
  { label: 'West',       city: 'Bafoussam'  },
];

const HOUSE_TYPES = [
  { id: 'Apartment',   label: 'Apartment',   icon: 'grid'      },
  { id: 'Studio',      label: 'Studio',      icon: 'home'      },
  { id: 'Villa',       label: 'Villa',       icon: 'layers'    },
  { id: 'Office',      label: 'Office',      icon: 'briefcase' },
  { id: 'Room',        label: 'Room',        icon: 'square'    },
  { id: 'Duplex',      label: 'Duplex',      icon: 'copy'      },
  { id: 'Guest House', label: 'Guest House', icon: 'coffee'    },
  { id: 'Hotel',       label: 'Hotel',       icon: 'star'      },
];

const FACILITIES = [
  { id: 'Nearby School', label: 'Nearby School', icon: 'book-open'    },
  { id: 'Restaurant',    label: 'Restaurant',    icon: 'coffee'       },
  { id: 'Bank',          label: 'Bank',          icon: 'credit-card'  },
  { id: 'Water Supply',  label: 'Water Supply',  icon: 'droplet'      },
  { id: 'Market',        label: 'Market',        icon: 'shopping-bag' },
  { id: 'Generator',     label: 'Generator',     icon: 'zap'          },
  { id: 'Gated',         label: 'Gated',         icon: 'shield'       },
  { id: 'Wifi',          label: 'Wifi',          icon: 'wifi'         },
  { id: 'Electricity',   label: 'Electricity',   icon: 'zap-off'      },
  { id: 'Green Area',    label: 'Green Area',    icon: 'feather'      },
  { id: 'Parking',       label: 'Parking',       icon: 'truck'        },
];

// Property state — separate from listing status (Approved/Pending by admin)
const PROPERTY_STATES = [
  { id: 'Available',   label: 'Available',   subtitle: 'Ready to rent or buy',    icon: 'check-circle', color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', activeBg: '#D1FAE5', activeBorder: '#059669' },
  { id: 'Pending',     label: 'Pending',     subtitle: 'Transaction in progress', icon: 'clock',        color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', activeBg: '#FEF3C7', activeBorder: '#D97706' },
  { id: 'Unavailable', label: 'Unavailable', subtitle: 'Off the market',          icon: 'x-circle',     color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', activeBg: '#F3F4F6', activeBorder: '#6B7280' },
];

function formatBudget(val: number) {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1).replace('.0', '') + 'B';
  if (val >= 1_000_000)     return (val / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  return (val / 1_000).toFixed(0) + 'k';
}

function RegionPicker({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: string;
  onSelect: (r: { label: string; city: string }) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={s.modalSheet}>
        <View style={s.modalHandle} />
        <Text style={s.modalTitle}>Select Region</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {REGIONS.map(r => {
            const active = selected === r.label;
            return (
              <TouchableOpacity key={r.label} style={[s.regionRow, active && s.regionRowActive]}
                onPress={() => { onSelect(r); onClose(); }} activeOpacity={0.7}>
                <View style={s.regionLeft}>
                  <Ionicons name="location-outline" size={16} color={active ? '#7C3AED' : '#888'} />
                  <Text style={[s.regionLabel, active && s.regionLabelActive]}>{r.label}</Text>
                </View>
                <Text style={[s.regionCity, active && s.regionCityActive]}>{r.city}</Text>
                {active && <Feather name="check" size={14} color="#7C3AED" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SearchFiltersScreen() {
  const [selectedRegion, setSelectedRegion] = useState<{ label: string; city: string } | null>(null);
  const [neighborhood, setNeighborhood] = useState('');
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState('Available'); // ← property state filter
  const [budgetPct, setBudgetPct] = useState(1);
  const sliderRef = React.useRef<View>(null);
  const sliderX = React.useRef(0);

  const budget = Math.round(MIN_BUDGET + budgetPct * (MAX_BUDGET - MIN_BUDGET));

  const toggleFacility = (id: string) =>
    setSelectedFacilities(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setBudgetPct(Math.min(1, Math.max(0, (e.nativeEvent.pageX - sliderX.current) / SLIDER_WIDTH))),
    onPanResponderMove: (e) => setBudgetPct(Math.min(1, Math.max(0, (e.nativeEvent.pageX - sliderX.current) / SLIDER_WIDTH))),
  });

  const thumbLeft = budgetPct * SLIDER_WIDTH;

  const handleReset = () => {
    setSelectedRegion(null); setNeighborhood('');
    setSelectedType(''); setSelectedFacilities([]);
    setSelectedState('Available'); setBudgetPct(1);
  };

  const handleSearch = () => {
    const params: Record<string, string> = {
      maxBudget: String(budget),
      state: selectedState,       // ← property state (Available/Pending/Unavailable)
    };
    if (selectedRegion) {
      params.region = selectedRegion.label;
      params.city   = selectedRegion.city;
    }
    if (neighborhood.trim())       params.neighborhood = neighborhood.trim();
    if (selectedType)              params.type         = selectedType;
    if (selectedFacilities.length) params.facilities   = selectedFacilities.join(',');

    router.push({ pathname: '/searchresults', params });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
          <Feather name="chevron-left" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Search Filters</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleReset}>
          <Feather name="rotate-ccw" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Location */}
        <Text style={s.sectionTitle}>Location</Text>
        <View style={s.lockedField}>
          <Ionicons name="flag-outline" size={16} color="#7C3AED" />
          <Text style={s.lockedFieldTxt}>Cameroon</Text>
          <View style={s.lockedBadge}><Text style={s.lockedBadgeTxt}>Fixed</Text></View>
        </View>
        <TouchableOpacity style={s.dropdownField} activeOpacity={0.7} onPress={() => setRegionPickerVisible(true)}>
          <Ionicons name="location-outline" size={16} color="#7C3AED" />
          <Text style={[s.dropdownTxt, !selectedRegion && s.dropdownPlaceholder]}>
            {selectedRegion ? selectedRegion.label : 'Select Region'}
          </Text>
          <Feather name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>
        <View style={[s.lockedField, !selectedRegion && s.lockedFieldDim]}>
          <Ionicons name="business-outline" size={16} color={selectedRegion ? '#7C3AED' : '#C0C0C0'} />
          <Text style={[s.lockedFieldTxt, !selectedRegion && { color: '#C0C0C0' }]}>
            {selectedRegion ? selectedRegion.city : 'Auto-filled from region'}
          </Text>
          {selectedRegion && <View style={s.autoBadge}><Text style={s.autoBadgeTxt}>Auto</Text></View>}
        </View>
        <View style={s.inputField}>
          <Ionicons name="map-outline" size={16} color="#7C3AED" />
          <TextInput style={s.inputTxt} placeholder="Neighborhood (optional)" placeholderTextColor="#C0C0C0"
            value={neighborhood} onChangeText={setNeighborhood} returnKeyType="done" />
          {neighborhood.length > 0 && (
            <TouchableOpacity onPress={() => setNeighborhood('')}>
              <Feather name="x" size={14} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* Property State */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>Property State</Text>
        <Text style={s.sectionSubtitle}>Filter by whether the property is currently available.</Text>
        <View style={s.statusList}>
          {PROPERTY_STATES.map(st => {
            const active = selectedState === st.id;
            return (
              <TouchableOpacity key={st.id} activeOpacity={0.75} onPress={() => setSelectedState(st.id)}
                style={[s.statusBanner, { backgroundColor: active ? st.activeBg : st.bg, borderColor: active ? st.activeBorder : st.border }]}>
                <View style={[s.statusAccent, { backgroundColor: st.color }]} />
                <View style={s.statusIconWrap}><Feather name={st.icon as any} size={20} color={st.color} /></View>
                <View style={s.statusTextWrap}>
                  <Text style={[s.statusLabel, { color: st.color }]}>{st.label}</Text>
                  <Text style={s.statusSubtitle}>{st.subtitle}</Text>
                </View>
                <View style={[s.statusCheck, { backgroundColor: active ? st.color : 'transparent', borderColor: active ? st.color : '#D1D5DB' }]}>
                  {active && <Feather name="check" size={11} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* House Type */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>House Type</Text>
        <View style={s.typeGrid}>
          {HOUSE_TYPES.map(t => {
            const active = selectedType === t.id;
            return (
              <TouchableOpacity key={t.id} style={[s.typeCard, active && s.typeCardActive]}
                activeOpacity={0.75} onPress={() => setSelectedType(active ? '' : t.id)}>
                <Feather name={t.icon as any} size={22} color={active ? '#7C3AED' : '#888'} />
                <Text style={[s.typeLabel, active && s.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Budget */}
        <View style={s.budgetHeader}>
          <Text style={s.sectionTitle}>Budget Range</Text>
          <Text style={s.budgetValue}>Up to {formatBudget(budget)} XAF</Text>
        </View>
        <View style={s.sliderContainer} ref={sliderRef}
          onLayout={() => sliderRef.current?.measure((_x, _y, _w, _h, px) => { sliderX.current = px; })}
          {...panResponder.panHandlers}>
          <View style={s.sliderTrack}>
            <View style={[s.sliderFill, { width: thumbLeft + 10 }]} />
          </View>
          <View style={[s.sliderThumb, { left: thumbLeft - 10 }]} />
        </View>
        <View style={s.sliderLabels}>
          <Text style={s.sliderLabel}>MIN: {formatBudget(MIN_BUDGET)}</Text>
          <Text style={s.sliderLabel}>MAX: {formatBudget(MAX_BUDGET)}</Text>
        </View>

        {/* Facilities */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>Nearby Facilities</Text>
        <View style={s.facilitiesGrid}>
          {FACILITIES.map(f => {
            const active = selectedFacilities.includes(f.id);
            return (
              <TouchableOpacity key={f.id} style={[s.facilityRow, active && s.facilityRowActive]}
                activeOpacity={0.75} onPress={() => toggleFacility(f.id)}>
                <Feather name={f.icon as any} size={15} color={active ? '#7C3AED' : '#888'} />
                <Text style={[s.facilityLabel, active && s.facilityLabelActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.bottomBar}>
        <TouchableOpacity style={s.resultsBtn} activeOpacity={0.88} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#fff" />
          <Text style={s.resultsBtnTxt}>Search</Text>
        </TouchableOpacity>
      </View>

      <RegionPicker visible={regionPickerVisible} selected={selectedRegion?.label || ''}
        onSelect={r => setSelectedRegion(r)} onClose={() => setRegionPickerVisible(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: -0.2, marginBottom: 10 },
  sectionSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 14, lineHeight: 17 },
  lockedField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#EFEFEF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, backgroundColor: '#FAFAFA' },
  lockedFieldDim: { backgroundColor: '#FAFAFA' },
  lockedFieldTxt: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  lockedBadge: { backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  lockedBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  autoBadge: { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  autoBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#059669' },
  dropdownField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, backgroundColor: '#fff' },
  dropdownTxt: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  dropdownPlaceholder: { color: '#C0C0C0', fontWeight: '400' },
  inputField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#EFEFEF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff' },
  inputTxt: { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  statusList: { gap: 10, marginBottom: 4 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, overflow: 'hidden', paddingRight: 14, paddingVertical: 14 },
  statusAccent: { width: 4, alignSelf: 'stretch', borderRadius: 4, marginRight: 12 },
  statusIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statusTextWrap: { flex: 1 },
  statusLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  statusSubtitle: { fontSize: 11.5, color: '#9CA3AF' },
  statusCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeCard: { width: (width - H_PAD * 2 - 20) / 3, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#EFEFEF', backgroundColor: '#fff', gap: 7 },
  typeCardActive: { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  typeLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  typeLabelActive: { color: '#7C3AED', fontWeight: '700' },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 20 },
  budgetValue: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  sliderContainer: { height: 30, justifyContent: 'center', position: 'relative', marginHorizontal: 4 },
  sliderTrack: { height: 4, backgroundColor: '#EFEFEF', borderRadius: 4, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: '#7C3AED', borderRadius: 4 },
  sliderThumb: { position: 'absolute', top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginHorizontal: 4 },
  sliderLabel: { fontSize: 10.5, color: '#B0B0B0', fontWeight: '500' },
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: (width - H_PAD * 2 - 10) / 2, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#EFEFEF', backgroundColor: '#fff' },
  facilityRowActive: { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  facilityLabel: { fontSize: 13, color: '#555', fontWeight: '500', flex: 1 },
  facilityLabelActive: { color: '#7C3AED', fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: H_PAD, paddingBottom: 32, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  resultsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#6D28D9', borderRadius: 16, paddingVertical: 16 },
  resultsBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, maxHeight: height * 0.75 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  regionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, backgroundColor: '#FAFAFA' },
  regionRowActive: { backgroundColor: '#F5F3FF' },
  regionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  regionLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  regionLabelActive: { color: '#7C3AED', fontWeight: '700' },
  regionCity: { fontSize: 12, color: '#B0B0B0', fontWeight: '400' },
  regionCityActive: { color: '#7C3AED' },
});