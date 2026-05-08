import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../constants/api';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GREEN = '#22C55E';
const GREEN_LIGHT = '#DCFCE7';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';

const propTypes = [
  'Apartment',
  'Studio',
  'Villa',
  'Office',
  'Room',
  'Duplex',
  'Guest House',
  'Hotel',
];

const facilityList = [
  'Wifi',
  'Electricity',
  'Water Supply',
  'Gated',
  'Parking',
  'Green Area',
  'Generator',
  'Nearby School',
  'Bank',
  'Restaurant',
  'Market',
  'Clinic',
];

const listingStatuses = ['Available', 'Pending', 'Unavailable'];
const paymentFrequencies = ['Monthly', 'Yearly', 'For Sale'];
const contactMethods = ['Call', 'WhatsApp', 'In-app Chat'];

type SelectedMedia = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const SectionHeader = ({ num, title }: { num: number | string; title: string }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionNum}>
      <Text style={s.sectionNumTxt}>{num}</Text>
    </View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const Chip = ({
  label,
  selected,
  onPress,
  color = PURPLE,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
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

function inferMimeType(uri: string, fallback: string) {
  const extension = uri.split('.').pop()?.toLowerCase();
  if (!extension) return fallback;
  if (['jpg', 'jpeg'].includes(extension)) return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'mov') return 'video/quicktime';
  return fallback;
}

const MediaUploadBox = ({
  label,
  files,
  setFiles,
  pickerMode,
  max,
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
      mediaTypes:
        pickerMode === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: pickerMode === 'image' && max !== 1,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAssets = result.assets.map((asset) => ({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      }));

      const remaining = max !== undefined ? Math.max(0, max - files.length) : newAssets.length;
      setFiles((prev) => [...prev, ...newAssets.slice(0, remaining)]);
    }
  };

  const removeFile = (uri: string) => {
    setFiles((prev) => prev.filter((file) => file.uri !== uri));
  };

  const canAddMore = max === undefined || files.length < max;

  return (
    <View style={s.mediaSection}>
      <Text style={s.label}>{label}</Text>
      <View style={s.mediaRow}>
        {files.map((file) => (
          <View key={file.uri} style={s.previewWrap}>
            <Image source={{ uri: file.uri }} style={s.previewImage} />
            <TouchableOpacity onPress={() => removeFile(file.uri)} style={s.removePreviewBtn}>
              <Text style={s.removePreviewTxt}>x</Text>
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

export default function NewListing() {
  const [title, setTitle] = useState('');
  const [propType, setPropType] = useState('Apartment');
  const [listingStatus, setListingStatus] = useState('Available');
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
  const [area, setArea] = useState('75');
  const [floor, setFloor] = useState('3');
  const [amenities, setAmenities] = useState<string[]>(['Wifi', 'Electricity']);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState<string[]>(['Call', 'WhatsApp']);
  const [visitHours, setVisitHours] = useState('Weekends 10AM - 2PM');
  const [photos, setPhotos] = useState<SelectedMedia[]>([]);
  const [videoFiles, setVideoFiles] = useState<SelectedMedia[]>([]);
  const [floorPlans, setFloorPlans] = useState<SelectedMedia[]>([]);
  const [legalDocs, setLegalDocs] = useState<SelectedMedia[]>([]);
  const [posting, setPosting] = useState(false);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const resetForm = () => {
    setTitle('');
    setPropType('Apartment');
    setListingStatus('Available');
    setCountry('Cameroon');
    setRegion('');
    setCity('');
    setNeighborhood('');
    setPrice('');
    setPayFreq('Monthly');
    setBedrooms(2);
    setBathrooms(1);
    setToilets(2);
    setParlors(1);
    setVerandas(1);
    setArea('75');
    setFloor('3');
    setAmenities(['Wifi', 'Electricity']);
    setDescription('');
    setContact(['Call', 'WhatsApp']);
    setVisitHours('Weekends 10AM - 2PM');
    setPhotos([]);
    setVideoFiles([]);
    setFloorPlans([]);
    setLegalDocs([]);
  };

  const handlePostListing = async () => {
    if (!title.trim() || !region.trim() || !city.trim() || !price.trim() || !description.trim()) {
      Alert.alert('Missing fields', 'Please complete the required listing details.');
      return;
    }

    if (!photos.length) {
      Alert.alert('Photos required', 'Please add at least one property photo.');
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();

      formData.append('title', title.trim());
      formData.append('price', String(Number(price.replace(/,/g, ''))));
      formData.append('type', propType);
      formData.append('status', listingStatus);
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
      formData.append('areaSqm', area.trim());
      formData.append('floorNumber', floor.trim());
      formData.append('paymentFrequency', payFreq);
      formData.append('visitHours', visitHours.trim());
      formData.append('contactMethods', JSON.stringify(contact));
      formData.append('facilities', JSON.stringify(amenities));

      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          name: photo.fileName || `photo-${index + 1}.jpg`,
          type: photo.mimeType || inferMimeType(photo.uri, 'image/jpeg'),
        } as any);
      });

      if (videoFiles[0]) {
        formData.append('video', {
          uri: videoFiles[0].uri,
          name: videoFiles[0].fileName || 'listing-video.mp4',
          type: videoFiles[0].mimeType || inferMimeType(videoFiles[0].uri, 'video/mp4'),
        } as any);
      }

      if (floorPlans[0]) {
        formData.append('floorPlan', {
          uri: floorPlans[0].uri,
          name: floorPlans[0].fileName || 'floor-plan.jpg',
          type: floorPlans[0].mimeType || inferMimeType(floorPlans[0].uri, 'image/jpeg'),
        } as any);
      }

      legalDocs.forEach((doc, index) => {
        formData.append('legalDocuments', {
          uri: doc.uri,
          name: doc.fileName || `legal-document-${index + 1}.jpg`,
          type: doc.mimeType || inferMimeType(doc.uri, 'image/jpeg'),
        } as any);
      });

      await api.post('/listings', formData);
      
      Alert.alert('Success', 'Your listing has been uploaded successfully.');
      resetForm();
      router.replace('/agent-dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Failed to upload listing.';
      Alert.alert('Upload failed', message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>New Listing</Text>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.section}>
          <SectionHeader num="1" title="Basic Info" />
          <Text style={s.label}>Property Title</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Modern Studio in Bastos"
            placeholderTextColor={TEXT_LIGHT}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={s.label}>Property Type</Text>
          <View style={s.chipRow}>
            {propTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                selected={propType === type}
                onPress={() => setPropType(type)}
              />
            ))}
          </View>

          <Text style={s.label}>Listing Status</Text>
          <View style={s.chipRow}>
            {listingStatuses.map((status) => (
              <Chip
                key={status}
                label={status}
                selected={listingStatus === status}
                onPress={() => setListingStatus(status)}
                color={GREEN}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader num="2" title="Location" />
          <Text style={s.label}>Country</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Cameroon"
            placeholderTextColor={TEXT_LIGHT}
            value={country}
            onChangeText={setCountry}
          />
          <Text style={s.label}>Region</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Littoral"
            placeholderTextColor={TEXT_LIGHT}
            value={region}
            onChangeText={setRegion}
          />
          <Text style={s.label}>City</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Douala"
            placeholderTextColor={TEXT_LIGHT}
            value={city}
            onChangeText={setCity}
          />
          <Text style={s.label}>Neighborhood</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Bastos"
            placeholderTextColor={TEXT_LIGHT}
            value={neighborhood}
            onChangeText={setNeighborhood}
          />
        </View>

        <View style={s.section}>
          <SectionHeader num="3" title="Pricing" />
          <Text style={s.label}>Price (XAF)</Text>
          <View style={s.priceWrap}>
            <TextInput
              style={[s.input, s.priceInput]}
              placeholder="0"
              placeholderTextColor={TEXT_LIGHT}
              value={price}
              onChangeText={(value) => setPrice(formatPrice(value))}
              keyboardType="numeric"
            />
            <Text style={s.priceSuffix}>XAF</Text>
          </View>
          <Text style={s.hint}>Max: 2,000,000,000 XAF</Text>

          <Text style={s.label}>Payment Frequency</Text>
          <View style={s.chipRow}>
            {paymentFrequencies.map((frequency) => (
              <Chip
                key={frequency}
                label={frequency}
                selected={payFreq === frequency}
                onPress={() => setPayFreq(frequency)}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader num="4" title="Property Details" />
          {[
            { label: 'Bedrooms', value: bedrooms, setValue: setBedrooms },
            { label: 'Bathrooms', value: bathrooms, setValue: setBathrooms },
            { label: 'Toilets', value: toilets, setValue: setToilets },
            { label: 'Parlors', value: parlors, setValue: setParlors },
            { label: 'Verandas', value: verandas, setValue: setVerandas },
          ].map((item) => (
            <View key={item.label} style={s.detailRow}>
              <Text style={s.detailLabel}>{item.label}</Text>
              <Stepper value={item.value} onChange={item.setValue} />
            </View>
          ))}

          <View style={s.twoCol}>
            <View style={s.col}>
              <Text style={s.label}>Total Area (m2)</Text>
              <TextInput
                style={s.input}
                value={area}
                onChangeText={setArea}
                keyboardType="numeric"
                placeholder="e.g. 120"
                placeholderTextColor={TEXT_LIGHT}
              />
            </View>
            <View style={s.col}>
              <Text style={s.label}>Floor Number</Text>
              <TextInput
                style={s.input}
                value={floor}
                onChangeText={setFloor}
                keyboardType="numeric"
                placeholder="e.g. 3"
                placeholderTextColor={TEXT_LIGHT}
              />
            </View>
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader num="5" title="Facilities & Amenities" />
          <View style={s.chipRow}>
            {facilityList.map((facility) => (
              <Chip
                key={facility}
                label={facility}
                selected={amenities.includes(facility)}
                color={GREEN}
                onPress={() => toggle(amenities, setAmenities, facility)}
              />
            ))}
          </View>
        </View>

        <View style={s.section}>
          <SectionHeader num="6" title="Photos & Video" />
          <MediaUploadBox label="Photos" files={photos} setFiles={setPhotos} pickerMode="image" />
          <MediaUploadBox
            label="Video Walkthrough"
            files={videoFiles}
            setFiles={setVideoFiles}
            pickerMode="video"
            max={1}
          />
        </View>

        <View style={s.section}>
          <SectionHeader num="7" title="House Documents" />
          <View style={s.docInfoBox}>
            <Text style={s.docInfoTitle}>Floor Plan</Text>
            <Text style={s.docInfoDesc}>
              Upload a floor plan image so tenants can understand the layout before booking a visit.
            </Text>
          </View>
          <MediaUploadBox
            label="Upload Floor Plan"
            files={floorPlans}
            setFiles={setFloorPlans}
            pickerMode="image"
            max={1}
          />

          <View style={s.docInfoBox}>
            <Text style={s.docInfoTitle}>Legal Documents</Text>
            <Text style={s.docInfoDesc}>
              Upload proof of ownership or verification documents for internal SweetCasa review.
            </Text>
          </View>
          <MediaUploadBox
            label="Upload Legal Documents"
            files={legalDocs}
            setFiles={setLegalDocs}
            pickerMode="image"
          />
        </View>

        <View style={s.section}>
          <SectionHeader num="8" title="Description" />
          <TextInput
            style={[s.input, s.multilineInput]}
            placeholder="Describe the property, access roads, condition, security, and anything else a tenant should know."
            placeholderTextColor={TEXT_LIGHT}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={s.section}>
          <SectionHeader num="9" title="Contact & Availability" />
          <Text style={s.label}>Preferred Contact Method</Text>
          <View style={s.chipRow}>
            {contactMethods.map((method) => (
              <Chip
                key={method}
                label={method}
                selected={contact.includes(method)}
                color={GREEN}
                onPress={() => toggle(contact, setContact, method)}
              />
            ))}
          </View>
          <Text style={[s.label, s.spacedLabel]}>Available Visiting Hours</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Weekends 10AM - 2PM"
            placeholderTextColor={TEXT_LIGHT}
            value={visitHours}
            onChangeText={setVisitHours}
          />
        </View>

        <View style={s.bottomBar}>
          <TouchableOpacity style={s.draftBtn} onPress={resetForm} disabled={posting}>
            <Text style={s.draftBtnTxt}>Clear Form</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.postBtn, posting && s.postBtnDisabled]} onPress={handlePostListing} disabled={posting}>
            <Text style={s.postBtnTxt}>{posting ? 'Uploading...' : 'Post Listing'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  scrollContent: { paddingBottom: 40 },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumTxt: { fontSize: 13, fontWeight: '700', color: PURPLE },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 6, marginTop: 10 },
  spacedLabel: { marginTop: 14 },
  hint: { fontSize: 11, color: TEXT_LIGHT, marginTop: 4, fontStyle: 'italic' },
  input: {
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: '#fff',
  },
  multilineInput: { minHeight: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: GRAY_BORDER,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, color: TEXT_MID },
  stepperValue: { fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  detailLabel: { fontSize: 14, color: TEXT_DARK },
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  mediaSection: { marginBottom: 18 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewWrap: { position: 'relative' },
  previewImage: { width: 72, height: 72, borderRadius: 10 },
  removePreviewBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePreviewTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  uploadBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: PURPLE,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlus: { fontSize: 24, color: PURPLE },
  uploadLabel: { fontSize: 10, color: PURPLE, fontWeight: '600' },
  priceWrap: { position: 'relative' },
  priceInput: { paddingRight: 52 },
  priceSuffix: {
    position: 'absolute',
    right: 14,
    top: 13,
    fontSize: 13,
    fontWeight: '700',
    color: PURPLE,
  },
  docInfoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  docInfoTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 },
  docInfoDesc: { fontSize: 12, color: TEXT_MID, lineHeight: 18 },
  bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
  draftBtn: {
    flex: 1,
    padding: 14,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 14,
    alignItems: 'center',
  },
  draftBtnTxt: { color: PURPLE, fontWeight: '700', fontSize: 14 },
  postBtn: {
    flex: 2,
    padding: 14,
    borderRadius: 14,
    backgroundColor: PURPLE,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.55 },
  postBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
