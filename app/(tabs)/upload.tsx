import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapPickerModal from '../../components/MapPickerModal';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '../../constants/api';
import { ThemeColors } from '../../constants/theme';
import { useAppTheme } from '../../hooks/use-app-theme';

const UPLOAD_COUNT_KEY = 'sweetcasa_successful_uploads';

// ─── Static IDs (never translated — values sent to API) ───────────────────────

const PROP_TYPE_IDS = [
  'Apartment', 'Studio', 'Villa', 'Office',
  'Room', 'Duplex', 'Guest House', 'Hotel',
];

const FACILITY_IDS = [
  'Wifi', 'Electricity', 'Water Supply', 'Gated',
  'Parking', 'Green Area', 'Generator', 'School',
  'Bank', 'Restaurant', 'Market', 'Clinic',
];

const PAYMENT_FREQ_IDS = ['Monthly', 'Yearly', 'For Sale'] as const;
const PAYMENT_FREQ_KEYS: Record<string, string> = {
  Monthly:    'listing.monthly',
  Yearly:     'listing.yearly',
  'For Sale': 'listing.forSale',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectedMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

type AutoFacility = {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  selected: boolean;
};

type ManualFacility = {
  name: string;
  category: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferMimeType(uri: string, fallback: string) {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (!ext) return fallback;
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'pdf') return 'application/pdf';
  if (['doc', 'docx'].includes(ext)) return 'application/msword';
  return fallback;
}

function groupByCategory(items: AutoFacility[]): Record<string, AutoFacility[]> {
  return items.reduce<Record<string, AutoFacility[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

async function uploadListing(formData: FormData): Promise<any> {
  const token = await AsyncStorage.getItem('token');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/listings`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject({ response: { data, status: xhr.status } });
      } catch { reject(new Error('Invalid server response')); }
    };
    xhr.onerror   = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.timeout   = 300_000;
    xhr.send(formData);
  });
}

async function submitReview(review: string): Promise<void> {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/listings/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ review }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Failed to submit review.');
  }
}

// ── Increments the upload counter and returns true on upload #1 and every 5th ──
async function shouldShowReview(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(UPLOAD_COUNT_KEY);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    const newCount = count + 1;
    await AsyncStorage.setItem(UPLOAD_COUNT_KEY, String(newCount));
    return newCount === 1 || newCount % 5 === 0;
  } catch { return false; }
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const ReviewModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      Alert.alert(t('review.emptyTitle'), t('review.emptyDesc'));
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(reviewText.trim());
      setReviewText('');
      onClose();
    } catch (err: any) {
      Alert.alert(t('review.failTitle'), err?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => { setReviewText(''); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <View style={s.modalCard}>
          <View style={s.modalIconRow}>
            <Text style={s.modalIcon}>🏠</Text>
          </View>
          <Text style={s.modalTitle}>{t('review.title')}</Text>
          <Text style={s.modalSubtitle}>{t('review.subtitle')}</Text>

          <TextInput
            style={s.modalInput}
            placeholder={t('review.placeholder')}
            placeholderTextColor={colors.textLight}
            multiline
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.modalSubmitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Text style={s.modalSubmitTxt}>
              {submitting ? t('common.submitting') : t('review.submit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={s.modalSkipBtn} disabled={submitting}>
            <Text style={s.modalSkipTxt}>{t('review.skip')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ num, title }: { num: number | string; title: string }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionNum}>
        <Text style={s.sectionNumTxt}>{num}</Text>
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
};

const Chip = ({ label, selected, onPress, color }: {
  label: string; selected: boolean; onPress: () => void; color?: string;
}) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  const c = color ?? colors.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.chip,
        { borderColor: selected ? c : colors.border },
        selected && { backgroundColor: c === colors.success ? '#DCFCE7' : colors.primaryTint }, // success-tint has no token yet
      ]}>
      <Text style={[s.chipTxt, { color: selected ? c : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={s.stepperRow}>
      <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={s.stepBtn}>
        <Text style={s.stepBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={s.stepperValue}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        style={[s.stepBtn, { borderColor: colors.primary, backgroundColor: colors.primaryTint }]}>
        <Text style={[s.stepBtnText, { color: colors.primary }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const MediaUploadBox = ({
  label, files, setFiles, pickerMode, max,
}: {
  label: string;
  files: SelectedMedia[];
  setFiles: React.Dispatch<React.SetStateAction<SelectedMedia[]>>;
  pickerMode: 'image' | 'video';
  max?: number;
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const handleAdd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('report.permissionNeeded'), t('report.permissionDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: pickerMode === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: pickerMode === 'image' && max !== 1,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newAssets = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType,
        fileName: a.fileName,
      }));
      const remaining = max !== undefined ? Math.max(0, max - files.length) : newAssets.length;
      setFiles((prev) => [...prev, ...newAssets.slice(0, remaining)]);
    }
  };

  const canAddMore = max === undefined || files.length < max;

  return (
    <View style={s.mediaSection}>
      <Text style={s.label}>{label}</Text>
      <View style={s.mediaRow}>
        {files.map((file) => (
          <View key={file.uri} style={s.previewWrap}>
            <Image source={{ uri: file.uri }} style={s.previewImage} />
            <TouchableOpacity
              onPress={() => setFiles((prev) => prev.filter((f) => f.uri !== file.uri))}
              style={s.removePreviewBtn}>
              <Text style={s.removePreviewTxt}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {canAddMore && (
          <TouchableOpacity onPress={handleAdd} style={s.uploadBtn}>
            <Text style={s.uploadPlus}>+</Text>
            <Text style={s.uploadLabel}>{t('listing.add')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const DocumentUploadBox = ({
  label, files, setFiles, max,
}: {
  label: string;
  files: SelectedMedia[];
  setFiles: React.Dispatch<React.SetStateAction<SelectedMedia[]>>;
  max?: number;
}) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const handleAdd = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'image/*',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      multiple: max !== 1,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((a: DocumentPicker.DocumentPickerAsset) => ({
        uri: a.uri,
        mimeType: a.mimeType,
        fileName: a.name,
      }));
      const remaining = max !== undefined ? Math.max(0, max - files.length) : newFiles.length;
      setFiles((prev) => [...prev, ...newFiles.slice(0, remaining)]);
    }
  };

  const canAddMore = max === undefined || files.length < max;

  return (
    <View style={s.mediaSection}>
      <Text style={s.label}>{label}</Text>
      <View style={s.docFileList}>
        {files.map((file) => (
          <View key={file.uri} style={s.docFileRow}>
            <Text style={s.docFileName} numberOfLines={1}>
              📄 {file.fileName || 'document'}
            </Text>
            <TouchableOpacity
              onPress={() => setFiles((prev) => prev.filter((f) => f.uri !== file.uri))}>
              <Text style={s.docRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {canAddMore && (
          <TouchableOpacity onPress={handleAdd} style={s.docUploadBtn}>
            <Text style={s.docUploadTxt}>{t('listing.addFile')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewListing() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [title, setTitle]           = useState('');
  const [propType, setPropType]     = useState('Apartment');
  const [country, setCountry]       = useState('Cameroon');
  const [region, setRegion]         = useState('');
  const [city, setCity]             = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice]           = useState('');
  const [payFreq, setPayFreq]       = useState('Monthly');
  const [bedrooms, setBedrooms]     = useState(2);
  const [bathrooms, setBathrooms]   = useState(1);
  const [toilets, setToilets]       = useState(2);
  const [parlors, setParlors]       = useState(1);
  const [kitchens, setKitchens]     = useState(1);
  const [area, setArea]             = useState('');
  const [amenities, setAmenities]   = useState<string[]>(['Wifi', 'Electricity']);

  // ── Location (Part 1) ──
  const [latitude, setLatitude]     = useState<number | null>(null);
  const [longitude, setLongitude]   = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // ── Nearby facilities: auto-detected + manual (Part 3) ──
  const [autoFacilities, setAutoFacilities]     = useState<AutoFacility[]>([]);
  const [manualFacilities, setManualFacilities] = useState<ManualFacility[]>([]);
  const [loadingNearby, setLoadingNearby]       = useState(false);
  const [showAddFacilityForm, setShowAddFacilityForm] = useState(false);
  const [newFacilityName, setNewFacilityName]         = useState('');
  const [newFacilityCategory, setNewFacilityCategory] = useState(FACILITY_IDS[0]);

  const [description, setDescription] = useState('');
  const [visitHours, setVisitHours] = useState('');
  const [photoFiles, setPhotoFiles] = useState<SelectedMedia[]>([]);
  const [videoFiles, setVideoFiles] = useState<SelectedMedia[]>([]);
  const [floorPlans, setFloorPlans] = useState<SelectedMedia[]>([]);
  const [legalDocs, setLegalDocs]   = useState<SelectedMedia[]>([]);
  const [posting, setPosting]       = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // ── Fetch Google-detected nearby facilities once a location is set ──
  const fetchNearbyFacilities = async (lat: number, lng: number) => {
    setLoadingNearby(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/listings/preview-nearby?lat=${lat}&lng=${lng}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        setAutoFacilities(
          (data.facilities || []).map((f: any) => ({
            name: f.name,
            category: f.category,
            latitude: f.latitude,
            longitude: f.longitude,
            selected: true,
          }))
        );
      }
    } catch {
      // Auto-detection is a convenience, not required — fail silently.
    } finally {
      setLoadingNearby(false);
    }
  };

  // ── GPS pre-fill, then open the map picker for fine-tuning ──
  const handleUseCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('listing.locationPermissionTitle'), t('listing.locationPermissionDesc'));
      setShowMapPicker(true); // owner can still drop the pin manually
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({});
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    } catch {
      // GPS fix failed — owner falls through to the manual map picker below.
    }
    setShowMapPicker(true);
  };

  const handleConfirmLocation = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setShowMapPicker(false);
    fetchNearbyFacilities(lat, lng);
  };

  const toggleAutoFacility = (target: AutoFacility) => {
    setAutoFacilities((prev) =>
      prev.map((f) => (f === target ? { ...f, selected: !f.selected } : f))
    );
  };

  const addManualFacility = () => {
    if (!newFacilityName.trim()) return;
    setManualFacilities((prev) => [...prev, { name: newFacilityName.trim(), category: newFacilityCategory }]);
    setNewFacilityName('');
    setShowAddFacilityForm(false);
  };

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const resetForm = () => {
    setTitle(''); setPropType('Apartment'); setCountry('Cameroon');
    setRegion(''); setCity(''); setNeighborhood(''); setPrice('');
    setPayFreq('Monthly'); setBedrooms(2); setBathrooms(1);
    setToilets(2); setParlors(1); setKitchens(1); setArea('');
    setAmenities(['Wifi', 'Electricity']);
    setLatitude(null); setLongitude(null);
    setAutoFacilities([]); setManualFacilities([]);
    setShowAddFacilityForm(false); setNewFacilityName('');
    setDescription(''); setVisitHours('');
    setPhotoFiles([]); setVideoFiles([]); setFloorPlans([]); setLegalDocs([]);
  };

  const handlePostListing = async () => {
    if (!title.trim() || !region.trim() || !city.trim() || !price.trim() || !description.trim()) {
      Alert.alert(t('errors.fillRequired'), t('errors.fillRequired'));
      return;
    }
    if (!photoFiles.length) {
      Alert.alert(t('listing.photosRequired'), t('listing.photosRequiredDesc'));
      return;
    }
    if (!videoFiles.length) {
      Alert.alert(t('listing.videoRequired'), t('listing.videoRequiredDesc'));
      return;
    }
    if (!legalDocs.length) {
      Alert.alert(t('listing.legalRequired'), t('listing.legalRequiredDesc'));
      return;
    }
    if (latitude == null || longitude == null) {
      Alert.alert(t('listing.locationRequired'), t('listing.locationRequiredDesc'));
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('title',            title.trim());
      formData.append('price',            String(Number(price.replace(/,/g, ''))));
      formData.append('type',             propType);
      formData.append('status',           'Pending');
      formData.append('country',          country.trim() || 'Cameroon');
      formData.append('region',           region.trim());
      formData.append('city',             city.trim());
      formData.append('neighborhood',     neighborhood.trim());
      formData.append('description',      description.trim());
      formData.append('bedrooms',         String(bedrooms));
      formData.append('bathrooms',        String(bathrooms));
      formData.append('toilets',          String(toilets));
      formData.append('parlors',          String(parlors));
      formData.append('kitchens',         String(kitchens));
      if (area.trim()) formData.append('areaSqm', area.trim());
      formData.append('paymentFrequency', payFreq);
      formData.append('visitHours',       visitHours.trim());
      formData.append('facilities',       JSON.stringify(amenities));

      formData.append('latitude',  String(latitude));
      formData.append('longitude', String(longitude));
      formData.append('nearbyFacilities', JSON.stringify([
        ...autoFacilities.filter((f) => f.selected).map((f) => ({
          name: f.name, category: f.category,
          latitude: f.latitude, longitude: f.longitude, source: 'google',
        })),
        ...manualFacilities.map((f) => ({ ...f, source: 'manual' })),
      ]));

      photoFiles.forEach((photo, i) => {
        formData.append('photos', {
          uri: photo.uri, name: photo.fileName || `photo-${i + 1}.jpg`,
          type: photo.mimeType || inferMimeType(photo.uri, 'image/jpeg'),
        } as any);
      });

      formData.append('video', {
        uri: videoFiles[0].uri, name: videoFiles[0].fileName || 'walkthrough.mp4',
        type: videoFiles[0].mimeType || inferMimeType(videoFiles[0].uri, 'video/mp4'),
      } as any);

      if (floorPlans[0]) {
        formData.append('floorPlan', {
          uri: floorPlans[0].uri, name: floorPlans[0].fileName || 'floor-plan',
          type: floorPlans[0].mimeType || inferMimeType(floorPlans[0].uri, 'application/octet-stream'),
        } as any);
      }

      legalDocs.forEach((doc, i) => {
        formData.append('legalDocuments', {
          uri: doc.uri, name: doc.fileName || `legal-doc-${i + 1}`,
          type: doc.mimeType || inferMimeType(doc.uri, 'application/octet-stream'),
        } as any);
      });

      await uploadListing(formData);

      // ── FIX: call shouldShowReview() BEFORE showing the Alert,
      // ── capture the result in a local variable, then use it
      // ── inside the Alert callback. Using the state variable
      // ── (showReview) inside the callback always reads `false`
      // ── because Alert closures capture the value at render time.
      const willShowReview = await shouldShowReview();

      resetForm();

      Alert.alert(
        t('listing.submittedTitle'),
        t('listing.submittedDesc'),
        [{
          text: t('common.ok'),
          onPress: () => {
            if (willShowReview) {
              setShowReviewModal(true);
            } else {
              router.replace('/agent-dashboard');
            }
          },
        }],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('listing.uploadFailed');
      Alert.alert(t('listing.uploadFailed'), msg);
    } finally {
      setPosting(false);
    }
  };

  const handleReviewClose = () => {
    setShowReviewModal(false);
    router.replace('/agent-dashboard');
  };

  const stepperRows = [
    { label: t('listing.bedrooms'),  value: bedrooms,  setValue: setBedrooms  },
    { label: t('listing.bathrooms'), value: bathrooms, setValue: setBathrooms },
    { label: t('listing.toilets'),   value: toilets,   setValue: setToilets   },
    { label: t('listing.parlors'),   value: parlors,   setValue: setParlors   },
    { label: 'Kitchens',             value: kitchens,  setValue: setKitchens  },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />
      <ReviewModal visible={showReviewModal} onClose={handleReviewClose} />
      <MapPickerModal
        visible={showMapPicker}
        initialLatitude={latitude}
        initialLongitude={longitude}
        onConfirm={handleConfirmLocation}
        onClose={() => setShowMapPicker(false)}
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('listing.newListing')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>

        {/* 1. Basic Info */}
        <View style={s.section}>
          <SectionHeader num="1" title={t('listing.basicInfo')} />
          <Text style={s.label}>{t('listing.propertyTitle')}</Text>
          <TextInput
            style={s.input} placeholderTextColor={colors.textLight}
            placeholder={t('listing.propertyTitlePlaceholder')}
            value={title} onChangeText={setTitle}
          />
          <Text style={s.label}>{t('listing.propertyType')}</Text>
          <View style={s.chipRow}>
            {PROP_TYPE_IDS.map((type) => (
              <Chip key={type} label={type} selected={propType === type}
                onPress={() => setPropType(type)} />
            ))}
          </View>
        </View>

        {/* 2. Location */}
        <View style={s.section}>
          <SectionHeader num="2" title={t('listing.location')} />
          <Text style={s.label}>{t('listing.country')}</Text>
          <TextInput style={s.input} placeholderTextColor={colors.textLight}
            placeholder="Cameroon" value={country} onChangeText={setCountry} />
          <Text style={s.label}>{t('listing.region')}</Text>
          <TextInput style={s.input} placeholderTextColor={colors.textLight}
            placeholder="e.g. Littoral" value={region} onChangeText={setRegion} />
          <Text style={s.label}>{t('listing.city')}</Text>
          <TextInput style={s.input} placeholderTextColor={colors.textLight}
            placeholder="e.g. Douala" value={city} onChangeText={setCity} />
          <Text style={s.label}>{t('listing.neighborhood')}</Text>
          <TextInput style={s.input} placeholderTextColor={colors.textLight}
            placeholder="e.g. Bastos" value={neighborhood} onChangeText={setNeighborhood} />

          {latitude != null && longitude != null ? (
            <View style={s.locationSetRow}>
              <Text style={s.locationSetTxt}>📍 {t('listing.locationSet')}</Text>
              <TouchableOpacity onPress={() => setShowMapPicker(true)}>
                <Text style={s.locationEditTxt}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.locationBtn} onPress={handleUseCurrentLocation}>
              <Text style={s.locationBtnTxt}>{t('listing.setExactLocation')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Pricing */}
        <View style={s.section}>
          <SectionHeader num="3" title={t('listing.pricing')} />
          <Text style={s.label}>{t('listing.price')}</Text>
          <View style={s.priceWrap}>
            <TextInput
              style={[s.input, s.priceInput]} placeholderTextColor={colors.textLight}
              placeholder={t('listing.pricePlaceholder')} keyboardType="numeric"
              value={price} onChangeText={(v) => setPrice(formatPrice(v))}
            />
            <Text style={s.priceSuffix}>XAF</Text>
          </View>
          <Text style={s.hint}>{t('listing.priceMax')}</Text>
          <Text style={s.label}>{t('listing.paymentFrequency')}</Text>
          <View style={s.chipRow}>
            {PAYMENT_FREQ_IDS.map((f) => (
              <Chip key={f} label={t(PAYMENT_FREQ_KEYS[f])} selected={payFreq === f}
                onPress={() => setPayFreq(f)} />
            ))}
          </View>
        </View>

        {/* 4. Property Details */}
        <View style={s.section}>
          <SectionHeader num="4" title={t('listing.propertyDetails')} />
          {stepperRows.map((item) => (
            <View key={item.label} style={s.detailRow}>
              <Text style={s.detailLabel}>{item.label}</Text>
              <Stepper value={item.value} onChange={item.setValue} />
            </View>
          ))}
          <Text style={s.label}>
            {t('listing.totalArea')} <Text style={s.optional}>— {t('common.optional')}</Text>
          </Text>
          <TextInput
            style={s.input} placeholderTextColor={colors.textLight}
            placeholder="e.g. 120" keyboardType="numeric"
            value={area} onChangeText={setArea}
          />
        </View>

        {/* 5. Facilities */}
        <View style={s.section}>
          <SectionHeader num="5" title={t('listing.facilities')} />
          <View style={s.chipRow}>
            {FACILITY_IDS.map((f) => (
              <Chip key={f} label={f} selected={amenities.includes(f)} color={colors.success}
                onPress={() => toggle(amenities, setAmenities, f)} />
            ))}
          </View>

          {latitude != null && longitude != null && (
            <View style={s.nearbySection}>
              <Text style={s.nearbyHeading}>
                {t('listing.nearbyPlacesHeading')} <Text style={s.optional}>— {t('common.optional')}</Text>
              </Text>
              <Text style={s.nearbySubtext}>{t('listing.nearbyPlacesAutoDesc')}</Text>

              {loadingNearby && <Text style={s.hint}>{t('common.loading')}</Text>}

              {!loadingNearby && autoFacilities.length === 0 && manualFacilities.length === 0 && (
                <Text style={s.hint}>{t('listing.noNearbyFound')}</Text>
              )}

              {Object.entries(groupByCategory(autoFacilities)).map(([category, items]) => (
                <View key={category} style={s.nearbyCategoryGroup}>
                  <Text style={s.nearbyCategoryTitle}>{category}</Text>
                  {items.map((facility) => (
                    <TouchableOpacity
                      key={`${facility.name}-${facility.latitude}-${facility.longitude}`}
                      style={s.facilityCheckRow}
                      onPress={() => toggleAutoFacility(facility)}>
                      <Text style={s.facilityCheckBox}>{facility.selected ? '☑' : '☐'}</Text>
                      <Text style={s.facilityCheckLabel} numberOfLines={1}>{facility.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              {manualFacilities.length > 0 && (
                <View style={s.docFileList}>
                  {manualFacilities.map((facility, index) => (
                    <View key={`${facility.name}-${index}`} style={s.docFileRow}>
                      <Text style={s.docFileName} numberOfLines={1}>
                        📍 {facility.name} · {facility.category}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setManualFacilities((prev) => prev.filter((_, i) => i !== index))}>
                        <Text style={s.docRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {!showAddFacilityForm ? (
                <TouchableOpacity style={s.docUploadBtn} onPress={() => setShowAddFacilityForm(true)}>
                  <Text style={s.docUploadTxt}>{t('listing.addMissingPlace')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.addFacilityForm}>
                  <TextInput
                    style={s.nearbyInput}
                    placeholderTextColor={colors.textLight}
                    placeholder={t('listing.placeName')}
                    value={newFacilityName}
                    onChangeText={setNewFacilityName}
                  />
                  <View style={s.chipRow}>
                    {FACILITY_IDS.map((cat) => (
                      <Chip key={cat} label={cat} selected={newFacilityCategory === cat}
                        color={colors.success} onPress={() => setNewFacilityCategory(cat)} />
                    ))}
                  </View>
                  <View style={s.addFacilityActions}>
                    <TouchableOpacity
                      style={s.draftBtn}
                      onPress={() => { setShowAddFacilityForm(false); setNewFacilityName(''); }}>
                      <Text style={s.draftBtnTxt}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.postBtn} onPress={addManualFacility}>
                      <Text style={s.postBtnTxt}>{t('common.add')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 6. Photos & Video */}
        <View style={s.section}>
          <SectionHeader num="6" title={t('listing.photosVideo')} />
          <MediaUploadBox
            label={t('listing.photos')}
            files={photoFiles} setFiles={setPhotoFiles} pickerMode="image"
          />
          <MediaUploadBox
            label={t('listing.videoWalkthrough')}
            files={videoFiles} setFiles={setVideoFiles} pickerMode="video" max={1}
          />
        </View>

        {/* 7. Documents */}
        <View style={s.section}>
          <SectionHeader num="7" title={t('listing.documents')} />
          <View style={s.docInfoBox}>
            <Text style={s.docInfoDesc}>{t('listing.floorPlanDesc')}</Text>
            <Text style={[s.docInfoDesc, { color: colors.primary, fontWeight: '600', marginTop: 4 }]}>
              📐 {t('listing.floorPlanFormat') ?? 'Accepted formats: JPG, JPEG, PNG only'}
            </Text>
          </View>

          <MediaUploadBox
            label={t('listing.floorPlan')}
            files={floorPlans}
            setFiles={setFloorPlans}
            pickerMode="image"
            max={1}
          />

          <View style={[s.docInfoBox, { marginTop: 12 }]}>
            <Text style={s.docInfoTitle}>{t('listing.legalDocuments')}</Text>
            <Text style={s.docInfoDesc}>{t('listing.legalDocumentsDesc')}</Text>
          </View>
          <DocumentUploadBox
            label={t('listing.legalDocuments')} files={legalDocs} setFiles={setLegalDocs}
          />
        </View>

        {/* 8. Description */}
        <View style={s.section}>
          <SectionHeader num="8" title={t('listing.description')} />
          <TextInput
            style={[s.input, s.multilineInput]} placeholderTextColor={colors.textLight}
            placeholder={t('listing.descriptionPlaceholder')}
            multiline value={description} onChangeText={setDescription}
          />
        </View>

        {/* 9. Availability */}
        <View style={s.section}>
          <SectionHeader num="9" title={t('listing.availability')} />
          <Text style={s.label}>{t('listing.visitingHours')}</Text>
          <TextInput
            style={s.input} placeholderTextColor={colors.textLight}
            placeholder={t('listing.visitingHoursPlaceholder')}
            value={visitHours} onChangeText={setVisitHours}
          />
        </View>

        {/* Pending notice */}
        <View style={s.pendingNotice}>
          <Text style={s.pendingIcon}>⏳</Text>
          <Text style={s.pendingTxt}>{t('listing.pendingNotice')}</Text>
        </View>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.draftBtn} onPress={resetForm} disabled={posting}>
            <Text style={s.draftBtnTxt}>{t('listing.clearForm')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.postBtn, posting && s.postBtnDisabled]}
            onPress={handlePostListing}
            disabled={posting}>
            <Text style={s.postBtnTxt}>
              {posting ? t('common.uploading') : t('listing.submitListing')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card, padding: 16, alignItems: 'center',
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    scrollContent: { paddingBottom: 40 },
    section: {
      backgroundColor: colors.card, margin: 10, borderRadius: 16, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionNum: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    sectionNumTxt: { fontSize: 13, fontWeight: '700', color: colors.primary },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    label: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    optional: { fontWeight: '400', color: colors.textLight },
    hint: { fontSize: 11, color: colors.textLight, marginTop: 4, fontStyle: 'italic' },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
      padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.card,
    },
    multilineInput: { minHeight: 110, textAlignVertical: 'top' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 13, paddingVertical: 7,
      borderRadius: 20, borderWidth: 1.5, backgroundColor: colors.card,
    },
    chipTxt: { fontSize: 13, fontWeight: '500' },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepBtn: {
      width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
      borderColor: colors.border, backgroundColor: colors.card,
      alignItems: 'center', justifyContent: 'center',
    },
    stepBtnText: { fontSize: 18, color: colors.textMuted },
    stepperValue: { fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center', color: colors.text },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 14, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    detailLabel: { fontSize: 14, color: colors.text },
    priceWrap: { position: 'relative' },
    priceInput: { paddingRight: 52 },
    priceSuffix: {
      position: 'absolute', right: 14, top: 13,
      fontSize: 13, fontWeight: '700', color: colors.primary,
    },
    nearbySection: {
      marginTop: 16, backgroundColor: colors.cardMuted, borderRadius: 12,
      padding: 14, borderWidth: 1, borderColor: colors.border,
    },
    nearbyHeading: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
    nearbySubtext: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 17 },
    nearbyRow: { marginBottom: 12 },
    nearbyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
    nearbyDot: { fontSize: 10, color: colors.success },
    nearbyLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
    nearbyInput: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
      padding: 10, fontSize: 13, color: colors.text, backgroundColor: colors.card,
    },
    mediaSection: { marginBottom: 18 },
    mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    previewWrap: { position: 'relative' },
    previewImage: { width: 72, height: 72, borderRadius: 10 },
    removePreviewBtn: {
      position: 'absolute', top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', // dark chrome badge — fixed in both themes
    },
    removePreviewTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
    uploadBtn: {
      width: 72, height: 72, borderRadius: 10,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
    },
    uploadPlus: { fontSize: 24, color: colors.primary },
    uploadLabel: { fontSize: 10, color: colors.primary, fontWeight: '600' },
    docFileList: { gap: 8 },
    docFileRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.cardMuted, borderRadius: 10, padding: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    docFileName: { flex: 1, fontSize: 13, color: colors.text, marginRight: 8 },
    docRemove: { fontSize: 14, color: colors.danger, fontWeight: '700' },
    docUploadBtn: {
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: colors.primaryTint,
    },
    docUploadTxt: { color: colors.primary, fontSize: 13, fontWeight: '600' },
    docInfoBox: {
      backgroundColor: colors.cardMuted, borderRadius: 12, padding: 12, marginBottom: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    docInfoTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4 },
    docInfoDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    pendingNotice: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      margin: 10, padding: 14, borderRadius: 12,
      backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', // amber notice — no matching token yet
    },
    pendingIcon: { fontSize: 18 },
    pendingTxt: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 }, // amber notice text — fixed in both themes
    bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
    draftBtn: {
      flex: 1, padding: 14, borderWidth: 1.5,
      borderColor: colors.primary, borderRadius: 14, alignItems: 'center',
    },
    draftBtnTxt: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    postBtn: {
      flex: 2, padding: 14, borderRadius: 14,
      backgroundColor: colors.primary, alignItems: 'center',
    },
    postBtnDisabled: { opacity: 0.55 },
    postBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalCard: {
      backgroundColor: colors.card, borderRadius: 20, padding: 24,
      width: '100%', maxWidth: 420,
      shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    },
    modalIconRow: { alignItems: 'center', marginBottom: 12 },
    modalIcon: { fontSize: 40 },
    modalTitle: {
      fontSize: 18, fontWeight: '800', color: colors.text,
      textAlign: 'center', marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 13, color: colors.textMuted, textAlign: 'center',
      lineHeight: 20, marginBottom: 18,
    },
    modalInput: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      padding: 14, fontSize: 14, color: colors.text,
      minHeight: 110, textAlignVertical: 'top', backgroundColor: colors.cardMuted,
      marginBottom: 16,
    },
    modalSubmitBtn: {
      backgroundColor: colors.primary, borderRadius: 12,
      padding: 14, alignItems: 'center', marginBottom: 10,
    },
    modalSubmitTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    modalSkipBtn: { alignItems: 'center', padding: 8 },
    modalSkipTxt: { color: colors.textLight, fontSize: 13 },

    // ── Location capture (Part 1) ──
    locationBtn: {
      marginTop: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary,
      borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: colors.primaryTint,
    },
    locationBtnTxt: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    locationSetRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 14, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12, // success-tint — no matching token yet
    },
    locationSetTxt: { color: colors.success, fontWeight: '700', fontSize: 13 },
    locationEditTxt: { color: colors.primary, fontWeight: '700', fontSize: 13 },

    // ── Map picker modal ──
    mapSearchWrap: { paddingHorizontal: 16, paddingTop: 12, position: 'relative', zIndex: 10 },
    mapPredictionsBox: {
      position: 'absolute', top: 68, left: 16, right: 16, backgroundColor: colors.card,
      borderRadius: 10, borderWidth: 1, borderColor: colors.border, maxHeight: 220,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6, zIndex: 20,
    },
    mapPredictionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    mapPredictionTxt: { fontSize: 13, color: colors.text },
    mapView: { flex: 1, marginTop: 12 },
    mapBottomBar: { flexDirection: 'row', gap: 12, margin: 16 },

    // ── Nearby facilities checklist (Part 3) ──
    nearbyCategoryGroup: { marginBottom: 10 },
    nearbyCategoryTitle: {
      fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'capitalize',
    },
    facilityCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
    facilityCheckBox: { fontSize: 15, color: colors.success, width: 18 },
    facilityCheckLabel: { fontSize: 13, color: colors.text, flex: 1 },
    addFacilityForm: {
      marginTop: 10, backgroundColor: colors.card, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border, padding: 10,
    },
    addFacilityActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  });
}