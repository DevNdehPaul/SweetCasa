import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions, Modal, PanResponder, SafeAreaView, ScrollView, SectionList,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');
const H_PAD = 20;
const SLIDER_WIDTH = width - H_PAD * 2 - 8;
const MIN_BUDGET = 5000;
const MAX_BUDGET = 2_000_000_000;

// ─── Full 360 municipal cities grouped by region ──────────────────────────────
// City names are official Cameroonian place names — same in EN and FR.

interface CityEntry  { city: string; region: string }
interface RegionSection { title: string; data: CityEntry[] }

const CAMEROON_CITIES: RegionSection[] = [
  {
    title: 'Adamawa',
    data: [
      'Bankim','Banyo','Belel','Digni','Djohong','Galim-Tignère','Kontcha',
      'Koundijni','Mayo-Barléo','Mayo-Darlé','Meiganga','Ngaoundal','Ngaoundéré I',
      'Ngaoundéré II','Ngaoundéré III','Nganha','Nyambaka','Tibati','Tignère',
      'Vina','Yoko-Betaré',
    ].map(city => ({ city, region: 'Adamawa' })),
  },
  {
    title: 'Centre',
    data: [
      'Afanloum','Akonolinga','Akono','Akoeman','Awaé','Ayos','Bafia','Batchenga',
      'Bibey','Bikok','Biyouha','Bokito','Bondjock','Bot-Makak','Deuk','Dibang',
      'Donenkeng','Dzeng','Ebebda','Edzendouan','Elig-Mfomo','Endom','Eséka','Essé',
      'Evodoula','Kiiki','Kobdombo','Kon-Yambetta','Lobo','Lembe-Yezoum','Linté','Makak',
      'Makénéné','Matomb','Mbalmayo','Mbandjock','Mbangassina','Mbankomo','Mengang',
      'Mengueme','Messondo','Mfou','Minta','Monatélé','Nanga-Eboko','Ndikiniméki',
      'Ngambè-Tikar','Ngog-Mapubi','Ngomedzap','Ngoro','Ngoumou','Ngui-Bassal',
      'Nitoukou','Nkolafamba','Nkolmetet','Nkoteng','Nsem','Ntui','Obala','Okola',
      'Olanguina','Ombessa','Saa','Soa','Yaoundé I','Yaoundé II','Yaoundé III',
      'Yaoundé IV','Yaoundé V','Yaoundé VI','Yaoundé VII',
    ].map(city => ({ city, region: 'Centre' })),
  },
  {
    title: 'East',
    data: [
      'Abong-Mbang','Angossas','Atok','Batouri','Bélabo','Bertoua I','Bertoua II',
      'Bétaré-Oya','Dimako','Doumé','Dumi','Gari-Gombo','Garoua-Boulaï','Kette',
      'Koundi','Lomié','Mandalay','Mbang','Mindourou','Messamena','Messok','Moloundou',
      'Ndelele','Ngoila','Ngoulemakong','Nguelemendouka','Ouli','Salapoumbé','Somalomo',
      'Toko','Yokadouma','Yoko','Zokadiba',
    ].map(city => ({ city, region: 'East' })),
  },
  {
    title: 'Far North',
    data: [
      'Blangoua','Bogo','Bourrha','Dargala','Datcheka','Dimako-FarNorth','Dziguilao',
      'Gawaza','Gobo','Goulfey','Guémé','Guéré','Guidiguis','Hina','Kaélé','Kalfou',
      'Kérou','Koza','Kousséri','Logone-Birni','Mada','Maga','Makary','Maroua I',
      'Maroua II','Maroua III','Mindif','Mogodé','Mokolo','Mora','Moulvoudaye',
      'Moutourwa','Ndous','Petté','Porhi','Soulédé-Roua','Taibong','Tchati-Bali',
      'Tokombéré','Touloum','Waza','Yagoua','Zina',
    ].map(city => ({ city, region: 'Far North' })),
  },
  {
    title: 'Littoral',
    data: [
      'Baré-Bakem','Bonaléa','Dibamba','Dizangué','Douala I','Douala II','Douala III',
      'Douala IV','Douala V','Douala VI','Edéa I','Edéa II','Ebone','Loum','Manjo',
      'Mbanga','Melong','Mouanko','Mvengue','Ndom','Ngambe','Ngod-Bakoko','Ngwei',
      'Niyanou','Nkongsamba I','Nkongsamba II','Nkongsamba III','Njombé-Penja','Penja',
      'Pouma','Souza','Yabassi','Yayanou',
    ].map(city => ({ city, region: 'Littoral' })),
  },
  {
    title: 'North',
    data: [
      'Baschéo','Bibémi','Dembo','Figuil','Garoua I','Garoua II','Garoua III',
      'Gashiga','Guider','Lagdo','Mayo-Oulo','Mbé','Ngong','Pitoa','Poli','Rey-Bouba',
      'Tchéboa','Tcholliré','Touboro I','Touboro II',
    ].map(city => ({ city, region: 'North' })),
  },
  {
    title: 'Northwest',
    data: [
      'Andek','Bafut','Bali','Bamenda I','Bamenda II','Bamenda III','Benakuma','Belo',
      'Bum','Fundong','Furu-Awa','Jakiri','Kumbo','Mbengwi','Mbiame','Misaje',
      'Nachingwa','Ndu','Ndop','Ngaoundal-NW','Njinikom','Nkambé','Nkor','Noni',
      'Oku','Santa','Tubah','Wum','Zhoa',
    ].map(city => ({ city, region: 'Northwest' })),
  },
  {
    title: 'South',
    data: [
      'Acom I','Akom II','Ambam','Biwong-Bane','Biwong-Bulu','Bipindi','Campo','Djoum',
      'Ebolowa I','Ebolowa II','Efoulan','Kribi I','Kribi II','Lokoundjé','Lolodorf',
      "Ma'an",'Manggui','Meningue','Mengong','Mintom','Mvangan','Mvengue-South',
      'Niete','Nkolmetet-South','Olamze','Oveng','Sangmélima','Zoétélé',
    ].map(city => ({ city, region: 'South' })),
  },
  {
    title: 'Southwest',
    data: [
      'Alat Makay','Akwaya','Bamusso','Bangem','Buea','Dikome-Balue','Ekondo-Titi',
      'Fontem','Idenau','Isanguele','Komba','Kumba I','Kumba II','Kumba III','Kombone',
      'Konye','Limbé I','Limbé II','Limbé III','Mabonji','Mamfe','Mbonge','Mundemba',
      'Muyuka','Nguti','Tinto','Toko-SW','Tiko','Tombel','Wabane',
    ].map(city => ({ city, region: 'Southwest' })),
  },
  {
    title: 'West',
    data: [
      'Bafang','Bafoussam I','Bafoussam II','Bafoussam III','Baham','Bana','Bandjoun',
      'Bangangté','Bangou','Batié','Bazou','Bum-West','Dschang','Foumban','Foumbot',
      'Galim','Kékem','Koung-Khi','Koutaba','Mada-West','Magba','Malentouen',
      'Massangam','Mbouda','Mingo','Nde','Ngemba','Ngouache','Njimom','Penka-Michel',
      'Pete-Bandjoun','Santchou','Tonga','Yabadji',
    ].map(city => ({ city, region: 'West' })),
  },
];

// ─── Static data ──────────────────────────────────────────────────────────────

const HOUSE_TYPES: { id: string; icon: string }[] = [
  { id: 'Apartment',   icon: 'grid'      },
  { id: 'Studio',      icon: 'home'      },
  { id: 'Villa',       icon: 'layers'    },
  { id: 'Office',      icon: 'briefcase' },
  { id: 'Room',        icon: 'square'    },
  { id: 'Duplex',      icon: 'copy'      },
  { id: 'Guest House', icon: 'coffee'    },
  { id: 'Hotel',       icon: 'star'      },
];

const FACILITIES: { id: string; icon: string }[] = [
  { id: 'Nearby School', icon: 'book-open'    },
  { id: 'Restaurant',    icon: 'coffee'       },
  { id: 'Bank',          icon: 'credit-card'  },
  { id: 'Water Supply',  icon: 'droplet'      },
  { id: 'Market',        icon: 'shopping-bag' },
  { id: 'Generator',     icon: 'zap'          },
  { id: 'Gated',         icon: 'shield'       },
  { id: 'Wifi',          icon: 'wifi'         },
  { id: 'Electricity',   icon: 'zap-off'      },
  { id: 'Green Area',    icon: 'feather'      },
  { id: 'Parking',       icon: 'truck'        },
];

type PropertyStateId = 'Available' | 'Pending';

const PROPERTY_STATE_META: Record<PropertyStateId, {
  labelKey: string; subtitleKey: string; icon: string;
  color: string; bg: string; border: string; activeBg: string; activeBorder: string;
}> = {
  Available:   { labelKey: 'search.available',   subtitleKey: 'search.availableSub',   icon: 'check-circle', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', activeBg: '#EDE9FE', activeBorder: '#7C3AED' },
  Pending:     { labelKey: 'search.pending',     subtitleKey: 'search.pendingSub',     icon: 'clock',        color: '#A78BFA', bg: '#F3F0FF', border: '#DDD6FE', activeBg: '#EDE9FE', activeBorder: '#8B5CF6' },
};

const PROPERTY_STATE_IDS: PropertyStateId[] = ['Available', 'Pending'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBudget(val: number) {
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1).replace('.0', '') + 'B';
  if (val >= 1_000_000)     return (val / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  return (val / 1_000).toFixed(0) + 'k';
}

// ─── City Picker — searchable, grouped by region ──────────────────────────────

function CityPicker({ visible, selected, onSelect, onClose, title }: {
  visible:  boolean;
  selected: CityEntry | null;
  title:    string;
  onSelect: (entry: CityEntry) => void;
  onClose:  () => void;
}) {
  const [query, setQuery] = useState('');

  const filteredSections = useMemo<RegionSection[]>(() => {
    if (!query.trim()) return CAMEROON_CITIES;
    const q = query.toLowerCase();
    return CAMEROON_CITIES
      .map(sec => ({
        ...sec,
        data: sec.data.filter(e => e.city.toLowerCase().includes(q) || e.region.toLowerCase().includes(q)),
      }))
      .filter(sec => sec.data.length > 0);
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={s.modalSheet}>
        <View style={s.modalHandle} />
        <Text style={s.modalTitle}>{title}</Text>

        {/* Search input */}
        <View style={s.searchRow}>
          <Feather name="search" size={15} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search city or region…"
            placeholderTextColor="#C0C0C0"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={14} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <SectionList
          sections={filteredSections}
          keyExtractor={(item, idx) => `${item.region}-${item.city}-${idx}`}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Ionicons name="location-outline" size={12} color="#7C3AED" style={{ marginRight: 6 }} />
              <Text style={s.sectionHeaderTxt}>{section.title}</Text>
              <Text style={s.sectionCount}>{section.data.length} cities</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const active = selected?.city === item.city && selected?.region === item.region;
            return (
              <TouchableOpacity
                style={[s.cityRow, active && s.cityRowActive]}
                onPress={() => { onSelect(item); onClose(); setQuery(''); }}
                activeOpacity={0.7}
              >
                <Text style={[s.cityLabel, active && s.cityLabelActive]}>{item.city}</Text>
                {active && <Feather name="check" size={14} color="#7C3AED" />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No cities found</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SearchFiltersScreen() {
  const { t } = useTranslation();

  const [selectedCity, setSelectedCity]             = useState<CityEntry | null>(null);
  const [neighborhood, setNeighborhood]              = useState('');
  const [cityPickerVisible, setCityPickerVisible]    = useState(false);
  const [selectedType, setSelectedType]              = useState('');
  const [selectedFacilities, setSelectedFacilities]  = useState<string[]>([]);
  const [selectedState, setSelectedState]            = useState<PropertyStateId>('Available');
  const [budgetPct, setBudgetPct]                    = useState(1);
  const sliderRef = React.useRef<View>(null);
  const sliderX   = React.useRef(0);

  // Logarithmic scale — makes the slider feel smooth & progressive over the
  // huge 50k → 2B XAF range, instead of jumping by millions per tiny nudge.
  const budget = Math.round(MIN_BUDGET * Math.pow(MAX_BUDGET / MIN_BUDGET, budgetPct));

  const toggleFacility = (id: string) =>
    setSelectedFacilities(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => setBudgetPct(Math.min(1, Math.max(0, (e.nativeEvent.pageX - sliderX.current) / SLIDER_WIDTH))),
    onPanResponderMove:  (e) => setBudgetPct(Math.min(1, Math.max(0, (e.nativeEvent.pageX - sliderX.current) / SLIDER_WIDTH))),
  });

  const thumbLeft = budgetPct * SLIDER_WIDTH;

  const handleReset = () => {
    setSelectedCity(null); setNeighborhood('');
    setSelectedType(''); setSelectedFacilities([]);
    setSelectedState('Available'); setBudgetPct(1);
  };

  const handleSearch = () => {
    const params: Record<string, string> = {
      maxBudget: String(budget),
      state:     selectedState,
    };
    if (selectedCity) {
      params.region = selectedCity.region;
      params.city   = selectedCity.city;
    }
    if (neighborhood.trim())       params.neighborhood = neighborhood.trim();
    if (selectedType)              params.type         = selectedType;
    if (selectedFacilities.length) params.facilities   = selectedFacilities.join(',');

    router.push({ pathname: '/searchresults', params });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.iconBtn} />
        <Text style={s.headerTitle}>{t('search.title')}</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleReset}>
          <Feather name="rotate-ccw" size={18} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Location ── */}
        <Text style={s.sectionTitle}>{t('search.location')}</Text>

        {/* Country — fixed */}
        <View style={s.lockedField}>
          <Ionicons name="flag-outline" size={16} color="#7C3AED" />
          <Text style={s.lockedFieldTxt}>{t('search.country')}</Text>
          <View style={s.lockedBadge}><Text style={s.lockedBadgeTxt}>{t('search.fixed')}</Text></View>
        </View>

        {/* City / town picker */}
        <TouchableOpacity
          style={s.dropdownField}
          activeOpacity={0.7}
          onPress={() => setCityPickerVisible(true)}
        >
          <Ionicons name="location-outline" size={16} color="#7C3AED" />
          <View style={{ flex: 1 }}>
            {selectedCity ? (
              <>
                <Text style={s.dropdownTxt}>{selectedCity.city}</Text>
                <Text style={s.dropdownRegion}>{selectedCity.region} region</Text>
              </>
            ) : (
              <Text style={[s.dropdownTxt, s.dropdownPlaceholder]}>{t('search.selectRegion')}</Text>
            )}
          </View>
          <Feather name="chevron-down" size={16} color="#888" />
        </TouchableOpacity>

        {/* Neighborhood */}
        <View style={s.inputField}>
          <Ionicons name="map-outline" size={16} color="#7C3AED" />
          <TextInput
            style={s.inputTxt}
            placeholder={t('search.neighborhoodPlaceholder')}
            placeholderTextColor="#C0C0C0"
            value={neighborhood}
            onChangeText={setNeighborhood}
            returnKeyType="done"
          />
          {neighborhood.length > 0 && (
            <TouchableOpacity onPress={() => setNeighborhood('')}>
              <Feather name="x" size={14} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Property State ── */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>{t('search.propertyState')}</Text>
        <Text style={s.sectionSubtitle}>{t('search.propertyStateSub')}</Text>
        <View style={s.statusList}>
          {PROPERTY_STATE_IDS.map(id => {
            const st     = PROPERTY_STATE_META[id];
            const active = selectedState === id;
            return (
              <TouchableOpacity
                key={id} activeOpacity={0.75} onPress={() => setSelectedState(id)}
                style={[s.statusBanner, { backgroundColor: active ? st.activeBg : st.bg, borderColor: active ? st.activeBorder : st.border }]}
              >
                <View style={[s.statusAccent, { backgroundColor: st.color }]} />
                <View style={s.statusIconWrap}>
                  <Feather name={st.icon as any} size={20} color={st.color} />
                </View>
                <View style={s.statusTextWrap}>
                  <Text style={[s.statusLabel, { color: st.color }]}>{t(st.labelKey)}</Text>
                  <Text style={s.statusSubtitle}>{t(st.subtitleKey)}</Text>
                </View>
                <View style={[s.statusCheck, { backgroundColor: active ? st.color : 'transparent', borderColor: active ? st.color : '#D1D5DB' }]}>
                  {active && <Feather name="check" size={11} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── House Type ── */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>{t('search.houseType')}</Text>
        <View style={s.typeGrid}>
          {HOUSE_TYPES.map(type => {
            const active = selectedType === type.id;
            return (
              <TouchableOpacity
                key={type.id} style={[s.typeCard, active && s.typeCardActive]}
                activeOpacity={0.75} onPress={() => setSelectedType(active ? '' : type.id)}
              >
                <Feather name={type.icon as any} size={22} color={active ? '#7C3AED' : '#888'} />
                <Text style={[s.typeLabel, active && s.typeLabelActive]}>{type.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Budget ── */}
        <View style={s.budgetHeader}>
          <Text style={s.sectionTitle}>{t('search.budget')}</Text>
          <Text style={s.budgetValue}>{t('search.upTo')} {formatBudget(budget)} XAF</Text>
        </View>
        <View
          style={s.sliderContainer} ref={sliderRef}
          onLayout={() => sliderRef.current?.measure((_x, _y, _w, _h, px) => { sliderX.current = px; })}
          {...panResponder.panHandlers}
        >
          <View style={s.sliderTrack}>
            <View style={[s.sliderFill, { width: thumbLeft + 10 }]} />
          </View>
          <View style={[s.sliderThumb, { left: thumbLeft - 10 }]} />
        </View>
        <View style={s.sliderLabels}>
          <Text style={s.sliderLabel}>{t('search.minBudget')} {formatBudget(MIN_BUDGET)}</Text>
          <Text style={s.sliderLabel}>{t('search.maxBudget')} {formatBudget(MAX_BUDGET)}</Text>
        </View>

        {/* ── Facilities ── */}
        <Text style={[s.sectionTitle, { marginTop: 26 }]}>{t('search.facilities')}</Text>
        <View style={s.facilitiesGrid}>
          {FACILITIES.map(f => {
            const active = selectedFacilities.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id} style={[s.facilityRow, active && s.facilityRowActive]}
                activeOpacity={0.75} onPress={() => toggleFacility(f.id)}
              >
                <Feather name={f.icon as any} size={15} color={active ? '#7C3AED' : '#888'} />
                <Text style={[s.facilityLabel, active && s.facilityLabelActive]}>{f.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Search button ── */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.resultsBtn} activeOpacity={0.88} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#fff" />
          <Text style={s.resultsBtnTxt}>{t('search.searchBtn')}</Text>
        </TouchableOpacity>
      </View>

      <CityPicker
        visible={cityPickerVisible}
        selected={selectedCity}
        title={t('search.selectRegionTitle')}
        onSelect={entry => setSelectedCity(entry)}
        onClose={() => setCityPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  iconBtn:{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: -0.2, marginBottom: 10 },
  sectionSubtitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 14, lineHeight: 17 },

  lockedField:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#EFEFEF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, backgroundColor: '#FAFAFA' },
  lockedFieldTxt: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  lockedBadge:    { backgroundColor: '#EDE9FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  lockedBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },

  dropdownField:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff' },
  dropdownTxt:         { fontSize: 14, color: '#333', fontWeight: '600' },
  dropdownRegion:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  dropdownPlaceholder: { color: '#C0C0C0', fontWeight: '400' },

  inputField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#EFEFEF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: '#fff' },
  inputTxt:   { flex: 1, fontSize: 14, color: '#333', padding: 0 },

  statusList:     { gap: 10, marginBottom: 4 },
  statusBanner:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, overflow: 'hidden', paddingRight: 14, paddingVertical: 14 },
  statusAccent:   { width: 4, alignSelf: 'stretch', borderRadius: 4, marginRight: 12 },
  statusIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statusTextWrap: { flex: 1 },
  statusLabel:    { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
  statusSubtitle: { fontSize: 11.5, color: '#9CA3AF' },
  statusCheck:    { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeCard:        { width: (width - H_PAD * 2 - 20) / 3, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#EFEFEF', backgroundColor: '#fff', gap: 7 },
  typeCardActive:  { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  typeLabel:       { fontSize: 12, color: '#888', fontWeight: '500' },
  typeLabelActive: { color: '#7C3AED', fontWeight: '700' },

  budgetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 20 },
  budgetValue:     { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  sliderContainer: { height: 30, justifyContent: 'center', position: 'relative', marginHorizontal: 4 },
  sliderTrack:     { height: 4, backgroundColor: '#EFEFEF', borderRadius: 4, overflow: 'hidden' },
  sliderFill:      { height: '100%', backgroundColor: '#7C3AED', borderRadius: 4 },
  sliderThumb:     { position: 'absolute', top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  sliderLabels:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginHorizontal: 4 },
  sliderLabel:     { fontSize: 10.5, color: '#B0B0B0', fontWeight: '500' },

  facilitiesGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facilityRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, width: (width - H_PAD * 2 - 10) / 2, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#EFEFEF', backgroundColor: '#fff' },
  facilityRowActive:   { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  facilityLabel:       { fontSize: 13, color: '#555', fontWeight: '500', flex: 1 },
  facilityLabelActive: { color: '#7C3AED', fontWeight: '600' },

  bottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: H_PAD, paddingBottom: 32, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  resultsBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#6D28D9', borderRadius: 16, paddingVertical: 16 },
  resultsBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.1 },

  // ── City picker modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: height * 0.82 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1.5, borderColor: '#EDE9FE' },
  searchInput:  { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 7 },
  sectionHeaderTxt: { fontSize: 11, fontWeight: '700', color: '#6D28D9', flex: 1, letterSpacing: 0.4, textTransform: 'uppercase' },
  sectionCount:     { fontSize: 11, color: '#9CA3AF' },
  cityRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cityRowActive:    { backgroundColor: '#F5F3FF' },
  cityLabel:        { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  cityLabelActive:  { color: '#7C3AED', fontWeight: '700' },
});
