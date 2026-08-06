import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions, Modal, SafeAreaView, ScrollView, SectionList,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

const { width, height } = Dimensions.get('window');
const H_PAD = 20;
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
  { id: 'School', icon: 'book-open'    },
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

function getPropertyStateMeta(colors: ThemeColors): Record<PropertyStateId, {
  labelKey: string; subtitleKey: string; icon: string;
  color: string; bg: string; border: string; activeBg: string; activeBorder: string;
}> {
  return {
    Available: {
      labelKey: 'search.available', subtitleKey: 'search.availableSub', icon: 'check-circle',
      color: colors.primary, bg: colors.primaryTint, border: '#C4B5FD', // light-purple border, no matching token
      activeBg: colors.primaryBorder, activeBorder: colors.primary,
    },
    Pending: {
      labelKey: 'search.pending', subtitleKey: 'search.pendingSub', icon: 'clock',
      color: '#A78BFA', bg: colors.primaryTint, border: '#DDD6FE', // light-purple accent, no matching token
      activeBg: colors.primaryBorder, activeBorder: '#8B5CF6',
    },
  };
}

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
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
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
          <Feather name="search" size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search city or region…"
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x" size={14} color={colors.textMuted} />
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
              <Ionicons name="location-outline" size={12} color={colors.primary} style={{ marginRight: 6 }} />
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
                {active && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textLight, fontSize: 14 }}>No cities found</Text>
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
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const PROPERTY_STATE_META = useMemo(() => getPropertyStateMeta(colors), [colors]);

  const [selectedCity, setSelectedCity]             = useState<CityEntry | null>(null);
  const [neighborhood, setNeighborhood]              = useState('');
  const [cityPickerVisible, setCityPickerVisible]    = useState(false);
  const [selectedType, setSelectedType]              = useState('');
  const [selectedFacilities, setSelectedFacilities]  = useState<string[]>([]);
  const [selectedState, setSelectedState]            = useState<PropertyStateId>('Available');

  // Budget — plain min/max text entry instead of a slider.
  const [minBudgetInput, setMinBudgetInput] = useState('');
  const [maxBudgetInput, setMaxBudgetInput] = useState('');

  const handleMinBudgetChange = (txt: string) => setMinBudgetInput(txt.replace(/[^0-9]/g, ''));
  const handleMaxBudgetChange = (txt: string) => setMaxBudgetInput(txt.replace(/[^0-9]/g, ''));

  const previewMin = minBudgetInput ? Number(minBudgetInput) : MIN_BUDGET;
  const previewMax = maxBudgetInput ? Number(maxBudgetInput) : MAX_BUDGET;

  const toggleFacility = (id: string) =>
    setSelectedFacilities(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  const handleReset = () => {
    setSelectedCity(null); setNeighborhood('');
    setSelectedType(''); setSelectedFacilities([]);
    setSelectedState('Available');
    setMinBudgetInput(''); setMaxBudgetInput('');
  };

  const handleSearch = () => {
    const rawMin = minBudgetInput ? Number(minBudgetInput) : MIN_BUDGET;
    const rawMax = maxBudgetInput ? Number(maxBudgetInput) : MAX_BUDGET;
    const clampedMin = Math.min(Math.max(rawMin, MIN_BUDGET), MAX_BUDGET);
    const clampedMax = Math.min(Math.max(rawMax, MIN_BUDGET), MAX_BUDGET);
    // If the user typed them backwards, just swap rather than erroring out.
    const minBudget = Math.min(clampedMin, clampedMax);
    const maxBudget = Math.max(clampedMin, clampedMax);

    const params: Record<string, string> = {
      minBudget: String(minBudget),
      maxBudget: String(maxBudget),
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.iconBtn} />
        <Text style={s.headerTitle}>{t('search.title')}</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleReset}>
          <Feather name="rotate-ccw" size={18} color={colors.text} />
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
          <Ionicons name="flag-outline" size={16} color={colors.primary} />
          <Text style={s.lockedFieldTxt}>{t('search.country')}</Text>
          <View style={s.lockedBadge}><Text style={s.lockedBadgeTxt}>{t('search.fixed')}</Text></View>
        </View>

        {/* City / town picker */}
        <TouchableOpacity
          style={s.dropdownField}
          activeOpacity={0.7}
          onPress={() => setCityPickerVisible(true)}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
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
          <Feather name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Neighborhood */}
        <View style={s.inputField}>
          <Ionicons name="map-outline" size={16} color={colors.primary} />
          <TextInput
            style={s.inputTxt}
            placeholder={t('search.neighborhoodPlaceholder')}
            placeholderTextColor={colors.textLight}
            value={neighborhood}
            onChangeText={setNeighborhood}
            returnKeyType="done"
          />
          {neighborhood.length > 0 && (
            <TouchableOpacity onPress={() => setNeighborhood('')}>
              <Feather name="x" size={14} color={colors.textMuted} />
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
                <Feather name={type.icon as any} size={22} color={active ? colors.primary : colors.textMuted} />
                <Text style={[s.typeLabel, active && s.typeLabelActive]}>{type.id}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Budget ── */}
        <View style={s.budgetHeader}>
          <Text style={s.sectionTitle}>{t('search.budget')}</Text>
          <Text style={s.budgetValue}>{formatBudget(previewMin)} – {formatBudget(previewMax)} XAF</Text>
        </View>

        <View style={s.budgetInputsRow}>
          <View style={s.budgetInputWrap}>
            <View style={s.budgetInputLabelRow}>
              <Text style={s.budgetInputLabel}>{t('search.minBudget').replace(':', '')}</Text>
              <Text style={s.budgetInputUnit}>XAF</Text>
            </View>
            <TextInput
              style={s.budgetInputField}
              keyboardType="number-pad"
              placeholder={String(MIN_BUDGET)}
              placeholderTextColor={colors.textLight}
              value={minBudgetInput}
              onChangeText={handleMinBudgetChange}
              returnKeyType="done"
            />
          </View>

          <View style={s.budgetInputDivider}>
            <Feather name="minus" size={14} color={colors.textLight} />
          </View>

          <View style={s.budgetInputWrap}>
            <View style={s.budgetInputLabelRow}>
              <Text style={s.budgetInputLabel}>{t('search.maxBudget').replace(':', '')}</Text>
              <Text style={s.budgetInputUnit}>XAF</Text>
            </View>
            <TextInput
              style={s.budgetInputField}
              keyboardType="number-pad"
              placeholder={String(MAX_BUDGET)}
              placeholderTextColor={colors.textLight}
              value={maxBudgetInput}
              onChangeText={handleMaxBudgetChange}
              returnKeyType="done"
            />
          </View>
        </View>
        <Text style={s.budgetHint}>{t('listing.priceMax')}</Text>

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
                <Feather name={f.icon as any} size={15} color={active ? colors.primary : colors.textMuted} />
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
function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: colors.card },
    scroll: { paddingHorizontal: H_PAD, paddingTop: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    iconBtn:{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },

    sectionTitle:    { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2, marginBottom: 10 },
    sectionSubtitle: { fontSize: 12, color: colors.textLight, marginBottom: 14, lineHeight: 17 },

    lockedField:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, backgroundColor: colors.cardMuted },
    lockedFieldTxt: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    lockedBadge:    { backgroundColor: colors.primaryBorder, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    lockedBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.primary },

    dropdownField:       { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#C4B5FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: colors.card },
    dropdownTxt:         { fontSize: 14, color: colors.text, fontWeight: '600' },
    dropdownRegion:      { fontSize: 11, color: colors.textLight, marginTop: 2 },
    dropdownPlaceholder: { color: colors.textLight, fontWeight: '400' },

    inputField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, backgroundColor: colors.card },
    inputTxt:   { flex: 1, fontSize: 14, color: colors.text, padding: 0 },

    statusList:     { gap: 10, marginBottom: 4 },
    statusBanner:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, overflow: 'hidden', paddingRight: 14, paddingVertical: 14 },
    statusAccent:   { width: 4, alignSelf: 'stretch', borderRadius: 4, marginRight: 12 },
    statusIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    statusTextWrap: { flex: 1 },
    statusLabel:    { fontSize: 14, fontWeight: '700', letterSpacing: -0.2, marginBottom: 2 },
    statusSubtitle: { fontSize: 11.5, color: colors.textLight },
    statusCheck:    { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

    typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    typeCard:        { width: (width - H_PAD * 2 - 20) / 3, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card, gap: 7 },
    typeCardActive:  { borderColor: '#C4B5FD', backgroundColor: colors.primaryTintAlt },
    typeLabel:       { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    typeLabelActive: { color: colors.primary, fontWeight: '700' },

    budgetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 14 },
    budgetValue:   { fontSize: 13, fontWeight: '700', color: colors.primary },

    budgetInputsRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    budgetInputWrap:      { flex: 1 },
    budgetInputLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    budgetInputLabel:     { fontSize: 10.5, fontWeight: '700', color: colors.textLight, letterSpacing: 0.4 },
    budgetInputUnit:      { fontSize: 10.5, fontWeight: '600', color: colors.textLight },
    budgetInputField:     { fontSize: 14, color: colors.text, fontWeight: '600', borderWidth: 1.5, borderColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.card },
    budgetInputDivider:   { width: 16, height: 44, marginTop: 22, alignItems: 'center', justifyContent: 'center' },
    budgetHint:           { fontSize: 11, color: colors.textLight, marginTop: 10 },

    facilitiesGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    facilityRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, width: (width - H_PAD * 2 - 10) / 2, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.card },
    facilityRowActive:   { borderColor: '#C4B5FD', backgroundColor: colors.primaryTintAlt },
    facilityLabel:       { fontSize: 13, color: colors.textSecondary, fontWeight: '500', flex: 1 },
    facilityLabelActive: { color: colors.primary, fontWeight: '600' },

    bottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: H_PAD, paddingBottom: 32, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.borderLight },
    resultsBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primaryDark, borderRadius: 16, paddingVertical: 16 },
    resultsBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: -0.1 },

    // ── City picker modal ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet:   { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: height * 0.82 },
    modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle:   { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryTintAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1.5, borderColor: colors.primaryBorder },
    searchInput:  { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
    sectionHeader:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryTintAlt, paddingHorizontal: 14, paddingVertical: 7 },
    sectionHeaderTxt: { fontSize: 11, fontWeight: '700', color: colors.primaryDark, flex: 1, letterSpacing: 0.4, textTransform: 'uppercase' },
    sectionCount:     { fontSize: 11, color: colors.textLight },
    cityRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    cityRowActive:    { backgroundColor: colors.primaryTintAlt },
    cityLabel:        { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    cityLabelActive:  { color: colors.primary, fontWeight: '700' },
  });
}