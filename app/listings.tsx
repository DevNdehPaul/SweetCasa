import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL } from '../constants/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const PURPLE       = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GREEN        = '#22C55E';
const GREEN_LIGHT  = '#DCFCE7';
const GRAY_BORDER  = '#E5E7EB';
const TEXT_DARK    = '#111827';
const TEXT_MID     = '#6B7280';
const TEXT_LIGHT   = '#9CA3AF';
const BG           = '#F5F6FA';

type Status = 'Approved' | 'Pending' | 'Rejected';
type Filter = 'All' | Status;

interface ListingImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Listing {
  id: number;
  title: string;
  type: string;
  price: string;
  country: string;
  city: string;
  region: string;
  neighborhood: string | null;
  status: Status;
  paymentFrequency: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  parlors: number | null;
  kitchens: number | null;
  areaSqm: string | null;
  visitHours: string | null;
  facilities: string[];
  nearbySchoolName: string | null;
  nearbyBankName: string | null;
  nearbyRestaurantName: string | null;
  nearbyMarketName: string | null;
  nearbyClinicName: string | null;
  images: ListingImage[];
}

const STATUS_CONFIG: Record<Status, { bg: string; color: string; icon: string }> = {
  Approved: { bg: '#DCFCE7', color: '#16A34A', icon: '✓' },
  Pending:  { bg: '#FEF3C7', color: '#D97706', icon: '⏱' },
  Rejected: { bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
};

// ─── i18n helpers (called inside components so t() is always fresh) ───────────

function getPropTypes(t: (k: string) => string) {
  return [
    { value: 'Apartment',   label: t('propTypes.apartment') },
    { value: 'Studio',      label: t('propTypes.studio') },
    { value: 'Villa',       label: t('propTypes.villa') },
    { value: 'Office',      label: t('propTypes.office') },
    { value: 'Room',        label: t('propTypes.room') },
    { value: 'Duplex',      label: t('propTypes.duplex') },
    { value: 'Guest House', label: t('propTypes.guestHouse') },
    { value: 'Hotel',       label: t('propTypes.hotel') },
  ];
}

function getFacilityList(t: (k: string) => string) {
  return [
    { value: 'Wifi',          label: t('facilityChips.wifi') },
    { value: 'Electricity',   label: t('facilityChips.electricity') },
    { value: 'Water Supply',  label: t('facilityChips.waterSupply') },
    { value: 'Gated',         label: t('facilityChips.gated') },
    { value: 'Parking',       label: t('facilityChips.parking') },
    { value: 'Green Area',    label: t('facilityChips.greenArea') },
    { value: 'Generator',     label: t('facilityChips.generator') },
    { value: 'Nearby School', label: t('facilityChips.nearbySchool') },
    { value: 'Bank',          label: t('facilityChips.bank') },
    { value: 'Restaurant',    label: t('facilityChips.restaurant') },
    { value: 'Market',        label: t('facilityChips.market') },
    { value: 'Clinic',        label: t('facilityChips.clinic') },
  ];
}

function getPaymentFrequencies(t: (k: string) => string) {
  return [
    { value: 'Monthly',  label: t('listing.monthly') },
    { value: 'Yearly',   label: t('listing.yearly') },
    { value: 'For Sale', label: t('listing.forSale') },
  ];
}

// facilityValue = English key stored in amenities state (never translated)
type NearbyFields = {
  facilityValue: string;
  facilityLabelKey: string;
  key: 'nearbySchoolName' | 'nearbyBankName' | 'nearbyRestaurantName' | 'nearbyMarketName' | 'nearbyClinicName';
  placeholder: string;
};

const NEARBY_FACILITY_FIELDS: NearbyFields[] = [
  { facilityValue: 'Nearby School', facilityLabelKey: 'facilityChips.nearbySchool', key: 'nearbySchoolName',    placeholder: 'e.g. Government Bilingual High School' },
  { facilityValue: 'Bank',          facilityLabelKey: 'facilityChips.bank',          key: 'nearbyBankName',       placeholder: 'e.g. Ecobank Bonanjo' },
  { facilityValue: 'Restaurant',    facilityLabelKey: 'facilityChips.restaurant',    key: 'nearbyRestaurantName', placeholder: 'e.g. La Falaise Restaurant' },
  { facilityValue: 'Market',        facilityLabelKey: 'facilityChips.market',        key: 'nearbyMarketName',     placeholder: 'e.g. Marché Central de Douala' },
  { facilityValue: 'Clinic',        facilityLabelKey: 'facilityChips.clinic',        key: 'nearbyClinicName',     placeholder: 'e.g. Polyclinique de la Paix' },
];

function getFilterLabel(f: Filter, t: (k: string) => string): string {
  if (f === 'All')      return t('myListings.filterAll');
  if (f === 'Approved') return t('dashboard.approved');
  if (f === 'Pending')  return t('dashboard.pending');
  return t('dashboard.rejected');
}

function formatPrice(price: string, freq: string | null, t: (k: string) => string) {
  const num = Number(price);
  const formatted = num.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `${formatted} XAF`;
  if (freq === 'Yearly')   return `${formatted} XAF/${t('listing.perYear')}`;
  return `${formatted} XAF/${t('listing.perMonth')}`;
}

function getPrimaryImage(images: ListingImage[]) {
  if (!images?.length) return null;
  return (
    images.find((img) => img.isPrimary)?.imageUrl ||
    images.sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

const SectionLabel = ({ title }: { title: string }) => (
  <Text style={s.sectionLabel}>{title}</Text>
);

const Chip = ({
  label, selected, onPress, color = PURPLE,
}: {
  label: string; selected: boolean; onPress: () => void; color?: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      s.chip,
      { borderColor: selected ? color : GRAY_BORDER },
      selected && { backgroundColor: color === GREEN ? GREEN_LIGHT : PURPLE_LIGHT },
    ]}>
    <Text style={[s.chipTxt, { color: selected ? color : TEXT_MID }]}>{label}</Text>
  </TouchableOpacity>
);

const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <View style={s.stepperRow}>
    <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={s.stepBtn}>
      <Text style={s.stepBtnText}>-</Text>
    </TouchableOpacity>
    <Text style={s.stepperValue}>{value}</Text>
    <TouchableOpacity
      onPress={() => onChange(value + 1)}
      style={[s.stepBtn, { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT }]}>
      <Text style={[s.stepBtnText, { color: PURPLE }]}>+</Text>
    </TouchableOpacity>
  </View>
);

const StatusBadge = ({ status }: { status: Status }) => {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status];
  const labelKey =
    status === 'Approved' ? 'dashboard.approved' :
    status === 'Pending'  ? 'dashboard.pending'  : 'dashboard.rejected';
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeIcon, { color: cfg.color }]}>{cfg.icon}</Text>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{t(labelKey).toUpperCase()}</Text>
    </View>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  visible, listing, onCancel, onConfirm, deleting,
}: {
  visible: boolean;
  listing: Listing | null;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalIconWrap}>
            <Feather name="trash-2" size={28} color="#DC2626" />
          </View>
          <Text style={s.modalTitle}>{t('myListings.deleteTitle')}</Text>
          <Text style={s.modalDesc}>
            {t('myListings.deleteDescPre')}{' '}
            <Text style={{ fontWeight: '700', color: TEXT_DARK }}>"{listing?.title}"</Text>
            ?{'\n'}{t('myListings.deleteDescPost')}
          </Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={onCancel} disabled={deleting}>
              <Text style={s.modalCancelTxt}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalDeleteBtn} onPress={onConfirm} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.modalDeleteTxt}>{t('myListings.confirmDelete')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({
  visible, listing, onCancel, onSave, saving,
}: {
  visible: boolean;
  listing: Listing | null;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();

  const PROP_TYPES        = getPropTypes(t);
  const FACILITY_LIST     = getFacilityList(t);
  const PAYMENT_FREQS     = getPaymentFrequencies(t);

  // ── State ──
  const [title, setTitle]               = useState('');
  const [propType, setPropType]         = useState('Apartment');
  const [country, setCountry]           = useState('Cameroon');
  const [region, setRegion]             = useState('');
  const [city, setCity]                 = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice]               = useState('');
  const [payFreq, setPayFreq]           = useState('Monthly');
  const [bedrooms, setBedrooms]         = useState(0);
  const [bathrooms, setBathrooms]       = useState(0);
  const [toilets, setToilets]           = useState(0);
  const [parlors, setParlors]           = useState(0);
  const [kitchens, setKitchens]         = useState(0);
  const [area, setArea]                 = useState('');
  const [amenities, setAmenities]       = useState<string[]>([]);
  const [nearbySchoolName, setNearbySchoolName]             = useState('');
  const [nearbyBankName, setNearbyBankName]                 = useState('');
  const [nearbyRestaurantName, setNearbyRestaurantName]     = useState('');
  const [nearbyMarketName, setNearbyMarketName]             = useState('');
  const [nearbyClinicName, setNearbyClinicName]             = useState('');
  const [description, setDescription]   = useState('');
  const [visitHours, setVisitHours]     = useState('');

  useEffect(() => {
    if (!listing) return;
    setTitle(listing.title ?? '');
    setPropType(listing.type ?? 'Apartment');
    setCountry(listing.country ?? 'Cameroon');
    setRegion(listing.region ?? '');
    setCity(listing.city ?? '');
    setNeighborhood(listing.neighborhood ?? '');
    setPrice(listing.price ?? '');
    setPayFreq(listing.paymentFrequency ?? 'Monthly');
    setBedrooms(listing.bedrooms ?? 0);
    setBathrooms(listing.bathrooms ?? 0);
    setToilets(listing.toilets ?? 0);
    setParlors(listing.parlors ?? 0);
    setKitchens(listing.kitchens ?? 0);
    setArea(listing.areaSqm ?? '');
    setAmenities(listing.facilities ?? []);
    setNearbySchoolName(listing.nearbySchoolName ?? '');
    setNearbyBankName(listing.nearbyBankName ?? '');
    setNearbyRestaurantName(listing.nearbyRestaurantName ?? '');
    setNearbyMarketName(listing.nearbyMarketName ?? '');
    setNearbyClinicName(listing.nearbyClinicName ?? '');
    setDescription(listing.description ?? '');
    setVisitHours(listing.visitHours ?? '');
  }, [listing]);

  const toggleAmenity = (val: string) =>
    setAmenities((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );

  const nearbyValues: Record<NearbyFields['key'], string> = {
    nearbySchoolName, nearbyBankName, nearbyRestaurantName, nearbyMarketName, nearbyClinicName,
  };
  const nearbySetters: Record<NearbyFields['key'], (v: string) => void> = {
    nearbySchoolName:     setNearbySchoolName,
    nearbyBankName:       setNearbyBankName,
    nearbyRestaurantName: setNearbyRestaurantName,
    nearbyMarketName:     setNearbyMarketName,
    nearbyClinicName:     setNearbyClinicName,
  };

  const fmtPriceInput = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSave = () => {
    if (!title.trim() || !region.trim() || !city.trim() || !price.trim() || !description.trim()) {
      Alert.alert(t('myListings.missingFields'), t('myListings.missingFieldsDesc'));
      return;
    }
    onSave({
      title:               title.trim(),
      type:                propType,
      country:             country.trim(),
      region:              region.trim(),
      city:                city.trim(),
      neighborhood:        neighborhood.trim(),
      price:               String(Number(price.replace(/,/g, ''))),
      paymentFrequency:    payFreq,
      bedrooms, bathrooms, toilets, parlors, kitchens,
      areaSqm:             area.trim() || undefined,
      facilities:          JSON.stringify(amenities),
      nearbySchoolName:    nearbySchoolName.trim()    || undefined,
      nearbyBankName:      nearbyBankName.trim()      || undefined,
      nearbyRestaurantName: nearbyRestaurantName.trim() || undefined,
      nearbyMarketName:    nearbyMarketName.trim()    || undefined,
      nearbyClinicName:    nearbyClinicName.trim()    || undefined,
      description:         description.trim(),
      visitHours:          visitHours.trim(),
    });
  };

  const detailRows: { label: string; value: number; set: (v: number) => void }[] = [
    { label: t('listing.bedrooms'),  value: bedrooms,  set: setBedrooms },
    { label: t('listing.bathrooms'), value: bathrooms, set: setBathrooms },
    { label: t('listing.toilets'),   value: toilets,   set: setToilets },
    { label: t('listing.parlors'),   value: parlors,   set: setParlors },
    { label: t('listing.kitchens'),  value: kitchens,  set: setKitchens },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.editOverlay}>
        <View style={s.editBox}>
          {/* Header */}
          <View style={s.editHeader}>
            <Text style={s.editTitle}>{t('myListings.editTitle')}</Text>
            <TouchableOpacity onPress={onCancel} disabled={saving}>
              <Feather name="x" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <Text style={s.editNote}>
            {t('myListings.editNote').replace('Pending', t('myListings.pendingLabel'))}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            {/* 1 · Basic Info */}
            <SectionLabel title={t('myListings.section1')} />
            <Text style={s.fieldLabel}>{t('listing.propertyTitle')}</Text>
            <TextInput
              style={s.input} value={title} onChangeText={setTitle}
              placeholder="e.g. Modern Studio in Bastos"
              placeholderTextColor={TEXT_LIGHT}
            />
            <Text style={s.fieldLabel}>{t('listing.propertyType')}</Text>
            <View style={s.chipRow}>
              {PROP_TYPES.map(({ value, label }) => (
                <Chip key={value} label={label} selected={propType === value} onPress={() => setPropType(value)} />
              ))}
            </View>

            {/* 2 · Location */}
            <SectionLabel title={t('myListings.section2')} />
            <Text style={s.fieldLabel}>{t('listing.country')}</Text>
            <TextInput
              style={s.input} value={country} onChangeText={setCountry}
              placeholder="e.g. Cameroon" placeholderTextColor={TEXT_LIGHT}
            />
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t('listing.region')}</Text>
                <TextInput
                  style={s.input} value={region} onChangeText={setRegion}
                  placeholder="e.g. Littoral" placeholderTextColor={TEXT_LIGHT}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>{t('listing.city')}</Text>
                <TextInput
                  style={s.input} value={city} onChangeText={setCity}
                  placeholder="e.g. Douala" placeholderTextColor={TEXT_LIGHT}
                />
              </View>
            </View>
            <Text style={s.fieldLabel}>{t('listing.neighborhood')}</Text>
            <TextInput
              style={s.input} value={neighborhood} onChangeText={setNeighborhood}
              placeholder="e.g. Bastos" placeholderTextColor={TEXT_LIGHT}
            />

            {/* 3 · Pricing */}
            <SectionLabel title={t('myListings.section3')} />
            <Text style={s.fieldLabel}>{t('listing.price')}</Text>
            <View style={s.priceWrap}>
              <TextInput
                style={[s.input, s.priceInput]}
                value={price}
                onChangeText={(v) => setPrice(fmtPriceInput(v))}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={TEXT_LIGHT}
              />
              <Text style={s.priceSuffix}>XAF</Text>
            </View>
            <Text style={s.fieldLabel}>{t('listing.paymentFrequency')}</Text>
            <View style={s.chipRow}>
              {PAYMENT_FREQS.map(({ value, label }) => (
                <Chip key={value} label={label} selected={payFreq === value} onPress={() => setPayFreq(value)} />
              ))}
            </View>

            {/* 4 · Property Details */}
            <SectionLabel title={t('myListings.section4')} />
            {detailRows.map((item) => (
              <View key={item.label} style={s.detailRow}>
                <Text style={s.detailLabel}>{item.label}</Text>
                <Stepper value={item.value} onChange={item.set} />
              </View>
            ))}
            <Text style={s.fieldLabel}>
              {t('listing.totalArea')}{' '}
              <Text style={{ fontWeight: '400', color: TEXT_LIGHT }}>— {t('common.optional')}</Text>
            </Text>
            <TextInput
              style={s.input} value={area} onChangeText={setArea}
              placeholder="e.g. 120" keyboardType="numeric"
              placeholderTextColor={TEXT_LIGHT}
            />

            {/* 5 · Facilities */}
            <SectionLabel title={t('myListings.section5')} />
            <View style={s.chipRow}>
              {FACILITY_LIST.map(({ value, label }) => (
                <Chip
                  key={value} label={label}
                  selected={amenities.includes(value)}
                  color={GREEN}
                  onPress={() => toggleAmenity(value)}
                />
              ))}
            </View>

            {NEARBY_FACILITY_FIELDS.some((nf) => amenities.includes(nf.facilityValue)) && (
              <View style={s.nearbySection}>
                <Text style={s.nearbyHeading}>
                  {t('listing.nearbyPlaces')}{' '}
                  <Text style={{ fontWeight: '400', color: TEXT_LIGHT }}>— {t('common.optional')}</Text>
                </Text>
                <Text style={s.nearbySubtext}>{t('listing.nearbyPlacesDesc')}</Text>
                {NEARBY_FACILITY_FIELDS.map((nf) => {
                  if (!amenities.includes(nf.facilityValue)) return null;
                  return (
                    <View key={nf.key} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: GREEN }}>●</Text>
                        <Text style={s.fieldLabel}>{t(nf.facilityLabelKey)}</Text>
                      </View>
                      <TextInput
                        style={s.nearbyInput}
                        placeholderTextColor={TEXT_LIGHT}
                        placeholder={nf.placeholder}
                        value={nearbyValues[nf.key]}
                        onChangeText={nearbySetters[nf.key]}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {/* 6 · Description */}
            <SectionLabel title={t('myListings.section6')} />
            <TextInput
              style={[s.input, s.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('listing.descriptionPlaceholder')}
              placeholderTextColor={TEXT_LIGHT}
              multiline
              numberOfLines={5}
            />

            {/* 7 · Availability */}
            <SectionLabel title={t('myListings.section7')} />
            <Text style={s.fieldLabel}>{t('listing.visitingHours')}</Text>
            <TextInput
              style={s.input} value={visitHours} onChangeText={setVisitHours}
              placeholder={t('listing.visitingHoursPlaceholder')}
              placeholderTextColor={TEXT_LIGHT}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={16} color="#fff" />
                <Text style={s.saveBtnTxt}>{t('common.save')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
const ListingCard = ({
  item, onDelete, onEdit,
}: {
  item: Listing;
  onDelete: (item: Listing) => void;
  onEdit: (item: Listing) => void;
}) => {
  const { t } = useTranslation();
  const imageUrl = getPrimaryImage(item.images);
  const location = [item.neighborhood, item.city, item.region].filter(Boolean).join(', ');

  return (
    <View style={s.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={s.cardImg} />
      ) : (
        <View style={[s.cardImg, s.cardImgPlaceholder]}>
          <Text style={s.cardImgPlaceholderTxt}>🏠</Text>
        </View>
      )}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={s.cardSub}>{item.type} • {formatPrice(item.price, item.paymentFrequency, t)}</Text>
        <Text style={s.cardLocation} numberOfLines={1}>📍 {location}</Text>
        <StatusBadge status={item.status} />
        <View style={s.cardActions}>
          <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)}>
            <Feather name="edit-2" size={13} color={PURPLE} />
            <Text style={s.editBtnTxt}>{t('common.edit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item)}>
            <Feather name="trash-2" size={13} color="#DC2626" />
            <Text style={s.deleteBtnTxt}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const FILTERS: Filter[] = ['All', 'Approved', 'Pending', 'Rejected'];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyListings() {
  const { t } = useTranslation();

  const [listings, setListings]         = useState<Listing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Listing | null>(null);
  const [saving, setSaving]             = useState(false);

  const fetchListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('myListings.deleteError'));
      setListings((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('myListings.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveEdit = async (formData: Record<string, any>) => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          body.append(key, String(val));
        }
      });
      const res = await fetch(`${BASE_URL}/listings/${editTarget.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('myListings.updateError'));
      setListings((prev) =>
        prev.map((l) => (l.id === editTarget.id ? { ...l, ...data.listing } : l))
      );
      setEditTarget(null);
      Alert.alert(t('myListings.successTitle'), t('myListings.successDesc'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('myListings.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    total:    listings.length,
    approved: listings.filter((l) => l.status === 'Approved').length,
    pending:  listings.filter((l) => l.status === 'Pending').length,
    rejected: listings.filter((l) => l.status === 'Rejected').length,
  };

  const filtered =
    activeFilter === 'All' ? listings : listings.filter((l) => l.status === activeFilter);

  return (
    <SafeAreaView style={s.safe}>
      <DeleteModal
        visible={!!deleteTarget} listing={deleteTarget}
        onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} deleting={deleting}
      />
      <EditModal
        visible={!!editTarget} listing={editTarget}
        onCancel={() => setEditTarget(null)} onSave={handleSaveEdit} saving={saving}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/agent-dashboard')} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('myListings.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={s.loadingTxt}>{t('myListings.loading')}</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchListings()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchListings(true)} tintColor={PURPLE} />
          }
        >
          {/* Summary */}
          <View style={s.summaryRow}>
            <Text style={s.summaryTotal}>{t('myListings.total', { count: counts.total })}</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#16A34A' }]}>{counts.approved} {t('dashboard.approved')}</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#D97706' }]}>{counts.pending} {t('dashboard.pending')}</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#DC2626' }]}>{counts.rejected} {t('dashboard.rejected')}</Text>
          </View>

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[s.filterTab, activeFilter === f && s.filterTabActive]}
              >
                <Text style={[s.filterTxt, activeFilter === f && s.filterTxtActive]}>
                  {getFilterLabel(f, t)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cards */}
          <View style={s.listContainer}>
            {filtered.map((item) => (
              <ListingCard key={item.id} item={item} onDelete={setDeleteTarget} onEdit={setEditTarget} />
            ))}
            {filtered.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTxt}>
                  {activeFilter === 'All'
                    ? t('myListings.emptyAll')
                    : t('myListings.emptyFilter', { status: t(`dashboard.${activeFilter.toLowerCase()}`) })}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/upload')}>
        
        <Text style={s.fabTxt}>{t('myListings.addNew')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles (unchanged) ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingTxt: { fontSize: 14, color: TEXT_MID },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: PURPLE, borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    backgroundColor: BG, position: 'relative',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: {
    fontSize: 24, fontWeight: '800', color: TEXT_DARK,
    position: 'absolute', left: 0, right: 0, textAlign: 'center',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 6 },
  summaryTotal: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  dot: { fontSize: 13, color: TEXT_MID },
  summaryCount: { fontSize: 13, fontWeight: '600' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterTab: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 24, backgroundColor: PURPLE_LIGHT },
  filterTabActive: { backgroundColor: PURPLE },
  filterTxt: { fontSize: 14, fontWeight: '600', color: PURPLE },
  filterTxtActive: { color: '#fff' },
  listContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 4,
  },
  cardImg: { width: 110, height: 140 },
  cardImgPlaceholder: { backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  cardImgPlaceholderTxt: { fontSize: 32 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  cardSub: { fontSize: 12, color: TEXT_MID },
  cardLocation: { fontSize: 12, color: TEXT_MID },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginTop: 4,
  },
  badgeIcon: { fontSize: 11, fontWeight: '700' },
  badgeTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: PURPLE, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnTxt: { fontSize: 12, fontWeight: '700', color: PURPLE },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  deleteBtnTxt: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 24,
    padding: 28, width: '100%', alignItems: 'center', gap: 12,
  },
  modalIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  modalDesc: { fontSize: 13.5, color: TEXT_MID, textAlign: 'center', lineHeight: 21 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelTxt: { fontSize: 14, fontWeight: '700', color: TEXT_MID },
  modalDeleteBtn: { flex: 1, backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalDeleteTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '92%',
  },
  editHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  editNote: {
    fontSize: 12.5, color: TEXT_MID, backgroundColor: '#FEF3C7',
    borderRadius: 10, padding: 10, marginBottom: 14, lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '800', color: PURPLE,
    backgroundColor: PURPLE_LIGHT, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    marginTop: 18, marginBottom: 4, alignSelf: 'flex-start',
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MID, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: GRAY_BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT_DARK,
  },
  inputMultiline: { height: 110, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, backgroundColor: '#fff',
  },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  detailLabel: { fontSize: 14, color: TEXT_DARK },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    borderColor: GRAY_BORDER, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, color: TEXT_MID },
  stepperValue: { fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center' },
  priceWrap: { position: 'relative' },
  priceInput: { paddingRight: 52 },
  priceSuffix: { position: 'absolute', right: 14, top: 13, fontSize: 13, fontWeight: '700', color: PURPLE },
  nearbySection: {
    marginTop: 14, backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: GRAY_BORDER,
  },
  nearbyHeading: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  nearbySubtext: { fontSize: 12, color: TEXT_MID, marginBottom: 10, lineHeight: 17 },
  nearbyInput: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 10, fontSize: 13, color: TEXT_DARK, backgroundColor: '#fff',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: PURPLE, borderRadius: 16, paddingVertical: 16, marginTop: 16,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: TEXT_MID, fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PURPLE, paddingVertical: 16,
    paddingHorizontal: 24, borderRadius: 32,
    shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabIcon: { fontSize: 20, color: '#fff', fontWeight: '700' },
  fabTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});