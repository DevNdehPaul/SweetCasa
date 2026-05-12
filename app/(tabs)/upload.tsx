import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/api';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GREEN = '#22C55E';
const GREEN_LIGHT = '#DCFCE7';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';

// AsyncStorage key for tracking successful upload count
const UPLOAD_COUNT_KEY = 'sweetcasa_successful_uploads';

const propTypes = [
  'Apartment', 'Studio', 'Villa', 'Office',
  'Room', 'Duplex', 'Guest House', 'Hotel',
];

const facilityList = [
  'Wifi', 'Electricity', 'Water Supply', 'Gated',
  'Parking', 'Green Area', 'Generator', 'Nearby School',
  'Bank', 'Restaurant', 'Market', 'Clinic',
];

// Facilities that support an optional nearby name
const NEARBY_FACILITY_FIELDS: {
  facility: string;
  key: string;
  placeholder: string;
}[] = [
  { facility: 'Nearby School', key: 'nearbySchoolName',    placeholder: 'e.g. Government Bilingual High School' },
  { facility: 'Bank',          key: 'nearbyBankName',       placeholder: 'e.g. Ecobank Bonanjo' },
  { facility: 'Restaurant',    key: 'nearbyRestaurantName', placeholder: 'e.g. La Falaise Restaurant' },
  { facility: 'Market',        key: 'nearbyMarketName',     placeholder: 'e.g. Marché Central de Douala' },
  { facility: 'Clinic',        key: 'nearbyClinicName',     placeholder: 'e.g. Polyclinique de la Paix' },
];

const paymentFrequencies = ['Monthly', 'Yearly', 'For Sale'];

type SelectedMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

type NearbyNames = {
  nearbySchoolName: string;
  nearbyBankName: string;
  nearbyRestaurantName: string;
  nearbyMarketName: string;
  nearbyClinicName: string;
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

async function uploadListing(formData: FormData): Promise<any> {
  const token = await AsyncStorage.getItem('token');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/listings`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          reject({ response: { data, status: xhr.status } });
        }
      } catch {
        reject(new Error('Invalid server response'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));
    xhr.timeout = 300_000;

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

/**
 * Returns true if a review modal should be shown after a successful upload.
 * Rule: show on 1st upload, then every 5th thereafter (1, 6, 11, 16 …).
 */
async function shouldShowReview(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(UPLOAD_COUNT_KEY);
    const count = raw ? Number.parseInt(raw, 10) : 0;
    const newCount = count + 1;
    await AsyncStorage.setItem(UPLOAD_COUNT_KEY, String(newCount));
    // Show on 1st upload (newCount === 1) or every 5th thereafter
    return newCount === 1 || newCount % 5 === 0;
  } catch {
    return false;
  }
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const ReviewModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      Alert.alert('Please write something', 'Share a brief experience before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(reviewText.trim());
      setReviewText('');
      onClose();
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setReviewText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}>
        <View style={s.modalCard}>
          <View style={s.modalIconRow}>
            <Text style={s.modalIcon}>🏠</Text>
          </View>
          <Text style={s.modalTitle}>How was your experience?</Text>
          <Text style={s.modalSubtitle}>
            Tell us what went well or what we can improve in the listing upload process. Your
            feedback helps us make SweetCasa better for everyone.
          </Text>

          <TextInput
            style={s.modalInput}
            placeholder="Describe your experience, any difficulties, or suggestions for improvement…"
            placeholderTextColor={TEXT_LIGHT}
            multiline
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.modalSubmitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Text style={s.modalSubmitTxt}>{submitting ? 'Submitting…' : 'Submit Feedback'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} style={s.modalSkipBtn} disabled={submitting}>
            <Text style={s.modalSkipTxt}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ num, title }: { num: number | string; title: string }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionNum}>
      <Text style={s.sectionNumTxt}>{num}</Text>
    </View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
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

const MediaUploadBox = ({
  label, files, setFiles, pickerMode, max,
}: {
  label: string;
  files: SelectedMedia[];
  setFiles: React.Dispatch<React.SetStateAction<SelectedMedia[]>>;
  pickerMode: 'image' | 'video';
  max?: number;
}) => {
  const handleAdd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your media library.');
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
            <Text style={s.uploadLabel}>Add</Text>
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
            <Text style={s.docUploadTxt}>+ Add File (PDF, DOCX, JPG, PNG…)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewListing() {
  const [title, setTitle] = useState('');
  const [propType, setPropType] = useState('Apartment');
  const [country, setCountry] = useState('Cameroon');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [price, setPrice] = useState('');
  const [payFreq, setPayFreq] = useState('Monthly');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [toilets, setToilets] = useState(2);
  const [parlors, setParlors] = useState(1);
  const [verandas, setVerandas] = useState(1);
  const [area, setArea] = useState('');
  const [amenities, setAmenities] = useState<string[]>(['Wifi', 'Electricity']);
  const [nearbyNames, setNearbyNames] = useState<NearbyNames>({
    nearbySchoolName: '',
    nearbyBankName: '',
    nearbyRestaurantName: '',
    nearbyMarketName: '',
    nearbyClinicName: '',
  });
  const [description, setDescription] = useState('');
  const [visitHours, setVisitHours] = useState('Weekends 10AM - 2PM');
  const [photoFiles, setPhotoFiles] = useState<SelectedMedia[]>([]);
  const [videoFiles, setVideoFiles] = useState<SelectedMedia[]>([]);
  const [floorPlans, setFloorPlans] = useState<SelectedMedia[]>([]);
  const [legalDocs, setLegalDocs] = useState<SelectedMedia[]>([]);
  const [posting, setPosting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const updateNearby = (key: keyof NearbyNames, val: string) =>
    setNearbyNames((prev) => ({ ...prev, [key]: val }));

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const resetForm = () => {
    setTitle(''); setPropType('Apartment'); setCountry('Cameroon');
    setRegion(''); setCity(''); setNeighborhood(''); setPrice('');
    setPayFreq('Monthly'); setBedrooms(2); setBathrooms(1);
    setToilets(2); setParlors(1); setVerandas(1); setArea('');
    setAmenities(['Wifi', 'Electricity']);
    setNearbyNames({
      nearbySchoolName: '', nearbyBankName: '', nearbyRestaurantName: '',
      nearbyMarketName: '', nearbyClinicName: '',
    });
    setDescription(''); setVisitHours('Weekends 10AM - 2PM');
    setPhotoFiles([]); setVideoFiles([]); setFloorPlans([]); setLegalDocs([]);
  };

  const handlePostListing = async () => {
    if (!title.trim() || !region.trim() || !city.trim() || !price.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Please complete all required fields (title, region, city, price, description).');
      return;
    }
    if (!photoFiles.length) {
      Alert.alert('Photos required', 'Please add at least one property photo.');
      return;
    }
    if (!videoFiles.length) {
      Alert.alert('Video required', 'Please add a video walkthrough of the property.');
      return;
    }
    if (!legalDocs.length) {
      Alert.alert('Legal documents required', 'Please upload at least one legal document (proof of ownership).');
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();

      // Text fields
      formData.append('title', title.trim());
      formData.append('price', String(Number(price.replace(/,/g, ''))));
      formData.append('type', propType);
      formData.append('status', 'Pending');
      formData.append('country', country.trim() || 'Cameroon');
      formData.append('region', region.trim());
      formData.append('city', city.trim());
      formData.append('neighborhood', neighborhood.trim());
      formData.append('description', description.trim());
      formData.append('bedrooms', String(bedrooms));
      formData.append('bathrooms', String(bathrooms));
      formData.append('toilets', String(toilets));
      formData.append('parlors', String(parlors));
      formData.append('verandas', String(verandas));
      if (area.trim()) formData.append('areaSqm', area.trim());
      formData.append('paymentFrequency', payFreq);
      formData.append('visitHours', visitHours.trim());
      formData.append('facilities', JSON.stringify(amenities));

      // Nearby facility names (optional — only append if user filled them in)
      if (nearbyNames.nearbySchoolName.trim())
        formData.append('nearbySchoolName', nearbyNames.nearbySchoolName.trim());
      if (nearbyNames.nearbyBankName.trim())
        formData.append('nearbyBankName', nearbyNames.nearbyBankName.trim());
      if (nearbyNames.nearbyRestaurantName.trim())
        formData.append('nearbyRestaurantName', nearbyNames.nearbyRestaurantName.trim());
      if (nearbyNames.nearbyMarketName.trim())
        formData.append('nearbyMarketName', nearbyNames.nearbyMarketName.trim());
      if (nearbyNames.nearbyClinicName.trim())
        formData.append('nearbyClinicName', nearbyNames.nearbyClinicName.trim());

      // Photos
      photoFiles.forEach((photo, i) => {
        formData.append('photos', {
          uri: photo.uri,
          name: photo.fileName || `photo-${i + 1}.jpg`,
          type: photo.mimeType || inferMimeType(photo.uri, 'image/jpeg'),
        } as any);
      });

      // Video (required, first only)
      formData.append('video', {
        uri: videoFiles[0].uri,
        name: videoFiles[0].fileName || 'walkthrough.mp4',
        type: videoFiles[0].mimeType || inferMimeType(videoFiles[0].uri, 'video/mp4'),
      } as any);

      // Floor plan (optional)
      if (floorPlans[0]) {
        formData.append('floorPlan', {
          uri: floorPlans[0].uri,
          name: floorPlans[0].fileName || 'floor-plan',
          type: floorPlans[0].mimeType || inferMimeType(floorPlans[0].uri, 'application/octet-stream'),
        } as any);
      }

      // Legal documents
      legalDocs.forEach((doc, i) => {
        formData.append('legalDocuments', {
          uri: doc.uri,
          name: doc.fileName || `legal-doc-${i + 1}`,
          type: doc.mimeType || inferMimeType(doc.uri, 'application/octet-stream'),
        } as any);
      });

      await uploadListing(formData);

      // Check if we should show the review modal
      const showReview = await shouldShowReview();

      Alert.alert(
        'Submitted! 🎉',
        'Your listing has been submitted for review. It will appear on the platform once approved by the SweetCasa team.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              if (showReview) {
                setShowReviewModal(true);
              } else {
                router.replace('/agent-dashboard');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to upload listing.';
      Alert.alert('Upload failed', msg);
    } finally {
      setPosting(false);
    }
  };

  const handleReviewClose = () => {
    setShowReviewModal(false);
    router.replace('/agent-dashboard');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ReviewModal visible={showReviewModal} onClose={handleReviewClose} />

      <View style={s.header}>
        <Text style={s.headerTitle}>New Listing</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>

        {/* 1. Basic Info */}
        <View style={s.section}>
          <SectionHeader num="1" title="Basic Info" />
          <Text style={s.label}>Property Title *</Text>
          <TextInput
            style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Modern Studio in Bastos"
            value={title} onChangeText={setTitle}
          />
          <Text style={s.label}>Property Type</Text>
          <View style={s.chipRow}>
            {propTypes.map((type) => (
              <Chip key={type} label={type} selected={propType === type}
                onPress={() => setPropType(type)} />
            ))}
          </View>
        </View>

        {/* 2. Location */}
        <View style={s.section}>
          <SectionHeader num="2" title="Location" />
          <Text style={s.label}>Country</Text>
          <TextInput style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Cameroon" value={country} onChangeText={setCountry} />
          <Text style={s.label}>Region *</Text>
          <TextInput style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Littoral" value={region} onChangeText={setRegion} />
          <Text style={s.label}>City *</Text>
          <TextInput style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Douala" value={city} onChangeText={setCity} />
          <Text style={s.label}>Neighborhood</Text>
          <TextInput style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Bastos" value={neighborhood} onChangeText={setNeighborhood} />
        </View>

        {/* 3. Pricing */}
        <View style={s.section}>
          <SectionHeader num="3" title="Pricing" />
          <Text style={s.label}>Price (XAF) *</Text>
          <View style={s.priceWrap}>
            <TextInput
              style={[s.input, s.priceInput]} placeholderTextColor={TEXT_LIGHT}
              placeholder="0" keyboardType="numeric"
              value={price} onChangeText={(v) => setPrice(formatPrice(v))}
            />
            <Text style={s.priceSuffix}>XAF</Text>
          </View>
          <Text style={s.hint}>Max: 2,000,000,000 XAF</Text>
          <Text style={s.label}>Payment Frequency</Text>
          <View style={s.chipRow}>
            {paymentFrequencies.map((f) => (
              <Chip key={f} label={f} selected={payFreq === f} onPress={() => setPayFreq(f)} />
            ))}
          </View>
        </View>

        {/* 4. Property Details */}
        <View style={s.section}>
          <SectionHeader num="4" title="Property Details" />
          {[
            { label: 'Bedrooms',  value: bedrooms,  setValue: setBedrooms },
            { label: 'Bathrooms', value: bathrooms, setValue: setBathrooms },
            { label: 'Toilets',   value: toilets,   setValue: setToilets },
            { label: 'Parlors',   value: parlors,   setValue: setParlors },
            { label: 'Verandas',  value: verandas,  setValue: setVerandas },
          ].map((item) => (
            <View key={item.label} style={s.detailRow}>
              <Text style={s.detailLabel}>{item.label}</Text>
              <Stepper value={item.value} onChange={item.setValue} />
            </View>
          ))}
          <Text style={s.label}>
            Total Area (m²) <Text style={s.optional}>— optional</Text>
          </Text>
          <TextInput
            style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. 120" keyboardType="numeric"
            value={area} onChangeText={setArea}
          />
        </View>

        {/* 5. Facilities */}
        <View style={s.section}>
          <SectionHeader num="5" title="Facilities & Amenities" />
          <View style={s.chipRow}>
            {facilityList.map((f) => (
              <Chip key={f} label={f} selected={amenities.includes(f)} color={GREEN}
                onPress={() => toggle(amenities, setAmenities, f)} />
            ))}
          </View>

          {/* Nearby facility name inputs — only shown when that facility is selected */}
          {NEARBY_FACILITY_FIELDS.some((nf) => amenities.includes(nf.facility)) && (
            <View style={s.nearbySection}>
              <Text style={s.nearbyHeading}>
                Nearby Place Names <Text style={s.optional}>— optional</Text>
              </Text>
              <Text style={s.nearbySubtext}>
                Name the specific places nearby so tenants know exactly what's around.
              </Text>

              {NEARBY_FACILITY_FIELDS.map((nf) => {
                if (!amenities.includes(nf.facility)) return null;
                const key = nf.key as keyof NearbyNames;
                return (
                  <View key={nf.key} style={s.nearbyRow}>
                    <View style={s.nearbyLabelRow}>
                      <Text style={s.nearbyDot}>●</Text>
                      <Text style={s.nearbyLabel}>{nf.facility}</Text>
                    </View>
                    <TextInput
                      style={s.nearbyInput}
                      placeholderTextColor={TEXT_LIGHT}
                      placeholder={nf.placeholder}
                      value={nearbyNames[key]}
                      onChangeText={(val) => updateNearby(key, val)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 6. Photos & Video */}
        <View style={s.section}>
          <SectionHeader num="6" title="Photos & Video" />
          <MediaUploadBox
            label="Photos *"
            files={photoFiles}
            setFiles={setPhotoFiles}
            pickerMode="image"
          />
          <MediaUploadBox
            label="Video Walkthrough *"
            files={videoFiles}
            setFiles={setVideoFiles}
            pickerMode="video"
            max={1}
          />
        </View>

        {/* 7. Documents */}
        <View style={s.section}>
          <SectionHeader num="7" title="House Documents" />
          <View style={s.docInfoBox}>
            <Text style={s.docInfoTitle}>
              Floor Plan <Text style={s.optional}>(optional)</Text>
            </Text>
            <Text style={s.docInfoDesc}>
              Upload a floor plan so tenants can understand the layout. Accepted: PDF, DOCX, JPG, PNG.
            </Text>
          </View>
          <DocumentUploadBox
            label="Upload Floor Plan" files={floorPlans} setFiles={setFloorPlans} max={1}
          />
          <View style={[s.docInfoBox, { marginTop: 12 }]}>
            <Text style={s.docInfoTitle}>Legal Documents *</Text>
            <Text style={s.docInfoDesc}>
              Proof of ownership required for SweetCasa review. Accepted: PDF, DOCX, JPG, PNG.
            </Text>
          </View>
          <DocumentUploadBox
            label="Upload Legal Documents" files={legalDocs} setFiles={setLegalDocs}
          />
        </View>

        {/* 8. Description */}
        <View style={s.section}>
          <SectionHeader num="8" title="Description *" />
          <TextInput
            style={[s.input, s.multilineInput]} placeholderTextColor={TEXT_LIGHT}
            placeholder="Describe the property, access roads, condition, security, and anything else a tenant should know."
            multiline value={description} onChangeText={setDescription}
          />
        </View>

        {/* 9. Availability */}
        <View style={s.section}>
          <SectionHeader num="9" title="Availability" />
          <Text style={s.label}>Available Visiting Hours</Text>
          <TextInput
            style={s.input} placeholderTextColor={TEXT_LIGHT}
            placeholder="e.g. Weekends 10AM - 2PM"
            value={visitHours} onChangeText={setVisitHours}
          />
        </View>

        {/* Pending notice */}
        <View style={s.pendingNotice}>
          <Text style={s.pendingIcon}>⏳</Text>
          <Text style={s.pendingTxt}>
            Your listing will be reviewed by the SweetCasa team before going live on the platform.
          </Text>
        </View>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.draftBtn} onPress={resetForm} disabled={posting}>
            <Text style={s.draftBtnTxt}>Clear Form</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.postBtn, posting && s.postBtnDisabled]}
            onPress={handlePostListing}
            disabled={posting}>
            <Text style={s.postBtnTxt}>{posting ? 'Uploading…' : 'Submit Listing'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: '#fff', padding: 16, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  scrollContent: { paddingBottom: 40 },
  section: {
    backgroundColor: '#fff', margin: 10, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  sectionNumTxt: { fontSize: 13, fontWeight: '700', color: PURPLE },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 6, marginTop: 10 },
  optional: { fontWeight: '400', color: TEXT_LIGHT },
  hint: { fontSize: 11, color: TEXT_LIGHT, marginTop: 4, fontStyle: 'italic' },
  input: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 12, fontSize: 14, color: TEXT_DARK, backgroundColor: '#fff',
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, backgroundColor: '#fff',
  },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    borderColor: GRAY_BORDER, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, color: TEXT_MID },
  stepperValue: { fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: GRAY_BORDER,
  },
  detailLabel: { fontSize: 14, color: TEXT_DARK },
  priceWrap: { position: 'relative' },
  priceInput: { paddingRight: 52 },
  priceSuffix: {
    position: 'absolute', right: 14, top: 13,
    fontSize: 13, fontWeight: '700', color: PURPLE,
  },
  // Nearby facility names
  nearbySection: {
    marginTop: 16, backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: GRAY_BORDER,
  },
  nearbyHeading: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  nearbySubtext: { fontSize: 12, color: TEXT_MID, marginBottom: 10, lineHeight: 17 },
  nearbyRow: { marginBottom: 12 },
  nearbyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  nearbyDot: { fontSize: 10, color: GREEN },
  nearbyLabel: { fontSize: 12, fontWeight: '600', color: TEXT_DARK },
  nearbyInput: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10,
    padding: 10, fontSize: 13, color: TEXT_DARK, backgroundColor: '#fff',
  },
  // Media
  mediaSection: { marginBottom: 18 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewWrap: { position: 'relative' },
  previewImage: { width: 72, height: 72, borderRadius: 10 },
  removePreviewBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
  },
  removePreviewTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  uploadBtn: {
    width: 72, height: 72, borderRadius: 10,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  uploadPlus: { fontSize: 24, color: PURPLE },
  uploadLabel: { fontSize: 10, color: PURPLE, fontWeight: '600' },
  docFileList: { gap: 8 },
  docFileRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: GRAY_BORDER,
  },
  docFileName: { flex: 1, fontSize: 13, color: TEXT_DARK, marginRight: 8 },
  docRemove: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
  docUploadBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE,
    borderRadius: 10, padding: 12, alignItems: 'center',
    backgroundColor: PURPLE_LIGHT,
  },
  docUploadTxt: { color: PURPLE, fontSize: 13, fontWeight: '600' },
  docInfoBox: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: GRAY_BORDER,
  },
  docInfoTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  docInfoDesc: { fontSize: 12, color: TEXT_MID, lineHeight: 18 },
  pendingNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 10, padding: 14, borderRadius: 12,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
  },
  pendingIcon: { fontSize: 18 },
  pendingTxt: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },
  bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
  draftBtn: {
    flex: 1, padding: 14, borderWidth: 1.5,
    borderColor: PURPLE, borderRadius: 14, alignItems: 'center',
  },
  draftBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 14 },
  postBtn: {
    flex: 2, padding: 14, borderRadius: 14,
    backgroundColor: PURPLE, alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.55 },
  postBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Review Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: '100%', maxWidth: 420,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalIconRow: { alignItems: 'center', marginBottom: 12 },
  modalIcon: { fontSize: 40 },
  modalTitle: {
    fontSize: 18, fontWeight: '800', color: TEXT_DARK,
    textAlign: 'center', marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13, color: TEXT_MID, textAlign: 'center',
    lineHeight: 20, marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 12,
    padding: 14, fontSize: 14, color: TEXT_DARK,
    minHeight: 110, textAlignVertical: 'top', backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  modalSubmitBtn: {
    backgroundColor: PURPLE, borderRadius: 12,
    padding: 14, alignItems: 'center', marginBottom: 10,
  },
  modalSubmitTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalSkipBtn: { alignItems: 'center', padding: 8 },
  modalSkipTxt: { color: TEXT_LIGHT, fontSize: 13 },
});