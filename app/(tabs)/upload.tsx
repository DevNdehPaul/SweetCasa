import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const GREEN = '#22C55E';
const GREEN_LIGHT = '#DCFCE7';
const GRAY_BORDER = '#E5E7EB';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const TEXT_LIGHT = '#9CA3AF';

const propTypes = [
  { label: 'Apartment', icon: '⊞' },   { label: 'Studio', icon: '🏠' },
  { label: 'Villa', icon: '🏡' },       { label: 'Office', icon: '🏢' },
  { label: 'Room', icon: '🚪' },        { label: 'Duplex', icon: '🏘' },
  { label: 'Guest House', icon: '🏩' }, { label: 'Hotel', icon: '🏨' },
];

const facilityList = [
  { label: 'Wifi', icon: '📶' },          { label: 'Electricity', icon: '⚡' },
  { label: 'Water Supply', icon: '💧' },         { label: 'Gated', icon: '🔒' },
  { label: 'Parking', icon: '🅿️' },      { label: 'Green Area', icon: '🌿' },
  { label: 'Generator', icon: '⚙️' },    { label: 'Nearby School', icon: '🏫' },
  { label: 'Bank', icon: '🏦' },       { label: 'Restaurant', icon: '🍽️' },
  { label: 'Market', icon: '🛒' },    { label: 'Clinic', icon: '🏥' },
];

const SectionHeader = ({ num, title }: { num: number | string; title: string }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionNum}><Text style={s.sectionNumTxt}>{num}</Text></View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

const Chip = ({ label, selected, onPress, color = PURPLE, icon }: {
  label: string; selected: boolean; onPress: () => void; color?: string; icon?: string;
}) => (
  <TouchableOpacity onPress={onPress} style={[
    s.chip,
    { borderColor: selected ? color : GRAY_BORDER },
    selected && { backgroundColor: color === GREEN ? GREEN_LIGHT : PURPLE_LIGHT },
  ]}>
    {icon && <Text style={{ fontSize: 13 }}>{icon}</Text>}
    <Text style={[s.chipTxt, { color: selected ? color : TEXT_MID }]}>{label}</Text>
  </TouchableOpacity>
);

const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <TouchableOpacity onPress={() => onChange(Math.max(0, value - 1))} style={s.stepBtn}>
      <Text style={{ fontSize: 18, color: TEXT_MID }}>−</Text>
    </TouchableOpacity>
    <Text style={{ fontSize: 15, fontWeight: '700', width: 24, textAlign: 'center' }}>{value}</Text>
    <TouchableOpacity onPress={() => onChange(value + 1)} style={[s.stepBtn, { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT }]}>
      <Text style={{ fontSize: 18, color: PURPLE }}>+</Text>
    </TouchableOpacity>
  </View>
);

const MediaUploadBox = ({ label, max }: { label: string; max?: number }) => {
  const [files, setFiles] = useState<string[]>([]);

  const handleAdd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      const remaining = max !== undefined ? max - files.length : Infinity;
      setFiles(prev => [...prev, ...newUris.slice(0, remaining)]);
    }
  };

  const canAddMore = max === undefined || files.length < max;

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {files.map((uri, i) => (
          <Image key={i} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10 }} />
        ))}
        {canAddMore && (
          <TouchableOpacity onPress={handleAdd} style={s.uploadBtn}>
            <Text style={{ fontSize: 24, color: PURPLE }}>+</Text>
            <Text style={{ fontSize: 10, color: PURPLE, fontWeight: '600' }}>Add</Text>
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
  const [price, setPrice] = useState('');
  const [payFreq, setPayFreq] = useState('Monthly');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [toilets, setToilets] = useState(2);
  const [parlors, setParlors] = useState(1);
  const [verandas, setVerandas] = useState(1);
  const [area, setArea] = useState('75');
  const [floor, setFloor] = useState('3');
  const [amenities, setAmenities] = useState(['Wifi', 'Electricity', 'Water', 'Gated']);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState(['Call', 'WhatsApp']);
  const [visitHours, setVisitHours] = useState('Weekends 10AM - 2PM');

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const formatPrice = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>New Listing</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 1. Basic Info */}
        <View style={s.section}>
          <SectionHeader num="1" title="Basic Info" />
          <Text style={s.label}>Property Title</Text>
          <TextInput style={s.input} placeholder="e.g. Modern Studio in Bastos"
            placeholderTextColor={TEXT_LIGHT} value={title} onChangeText={setTitle} />

          <Text style={s.label}>Property Type</Text>
          <View style={s.chipRow}>
            {propTypes.map(t => (
              <Chip key={t.label} label={t.label} icon={t.icon}
                selected={propType === t.label} onPress={() => setPropType(t.label)} />
            ))}
          </View>
        </View>

        {/* 2. Location */}
        <View style={s.section}>
          <SectionHeader num="2" title="Location" />
          <Text style={s.label}>Country</Text>
          <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Text>📍</Text><Text style={{ color: TEXT_DARK }}>Cameroon</Text>
          </View>
          <Text style={s.label}>Region</Text>
          <TextInput style={s.input} placeholder="e.g. Littoral" placeholderTextColor={TEXT_LIGHT} />
          <Text style={s.label}>City</Text>
          <TextInput style={s.input} placeholder="e.g. Douala" placeholderTextColor={TEXT_LIGHT} />
          <Text style={s.label}>Neighborhood</Text>
          <TextInput style={s.input} placeholder="e.g. Bastos" placeholderTextColor={TEXT_LIGHT} />
        </View>

        {/* 3. Pricing */}
        <View style={s.section}>
          <SectionHeader num="3" title="Pricing" />
          <Text style={s.label}>Price (XAF)</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[s.input, { paddingRight: 52 }]}
              placeholder="0"
              placeholderTextColor={TEXT_LIGHT}
              value={price}
              onChangeText={(v) => setPrice(formatPrice(v))}
              keyboardType="numeric"
            />
            <Text style={{
              position: 'absolute', right: 14, top: 13,
              fontSize: 13, fontWeight: '700', color: PURPLE,
            }}>XAF</Text>
          </View>
          <Text style={s.hint}>Max: 2,000,000,000 XAF</Text>

          <Text style={s.label}>Payment Frequency</Text>
          <View style={s.chipRow}>
            {['Monthly', 'Yearly', 'For Sale'].map(f => (
              <Chip key={f} label={f} selected={payFreq === f} onPress={() => setPayFreq(f)} />
            ))}
          </View>
        </View>

        {/* 4. Property Details */}
        <View style={s.section}>
          <SectionHeader num="4" title="Property Details" />
          {[
            { label: 'Bedrooms',  val: bedrooms,  set: setBedrooms },
            { label: 'Bathrooms', val: bathrooms, set: setBathrooms },
            { label: 'Toilets',   val: toilets,   set: setToilets },
            { label: 'Parlors',   val: parlors,   set: setParlors },
            { label: 'Verandas',  val: verandas,  set: setVerandas },
          ].map(({ label, val, set }) => (
            <View key={label} style={s.detailRow}>
              <Text style={{ fontSize: 14, color: TEXT_DARK }}>{label}</Text>
              <Stepper value={val} onChange={set} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Total Area (m²)</Text>
              <TextInput style={s.input} value={area} onChangeText={setArea} keyboardType="numeric" />
            </View>
            
          </View>
        </View>

        {/* 5. Facilities */}
        <View style={s.section}>
          <SectionHeader num="5" title="Facilities & Amenities" />
          <View style={s.chipRow}>
            {facilityList.map(({ label, icon }) => (
              <Chip key={label} label={label} icon={icon}
                selected={amenities.includes(label)} color={GREEN}
                onPress={() => toggle(amenities, setAmenities, label)} />
            ))}
          </View>
        </View>

        {/* 6. Media */}
        <View style={s.section}>
          <SectionHeader num="6" title="Photos & Video" />
          <MediaUploadBox label="Photos" />
          <MediaUploadBox label="Video Walkthrough" max={1} />
        </View>

        {/* 7. House Documents */}
        <View style={s.section}>
          <SectionHeader num="7" title="House Documents" />

          {/* Floor Plan */}
          <View style={s.docInfoBox}>
            <Text style={s.docInfoTitle}>📐 Floor Plan</Text>
            <Text style={s.docInfoDesc}>
              A floor plan is a drawing that shows the layout of your property from above — including rooms,
              walls, doors, and dimensions. Uploading one helps tenants better understand the space before visiting.
            </Text>
          </View>
          <MediaUploadBox label="Upload Floor Plan" max={1} />

          {/* Legal Documents */}
          <View style={s.docInfoBox}>
            <Text style={s.docInfoTitle}>📄 Legal Documents</Text>
            <Text style={s.docInfoDesc}>
              Upload ownership documents, title deeds, or any legal papers that verify this property belongs to you.
              These are reviewed privately by SweetCasa for verification purposes only.
            </Text>
          </View>
          <MediaUploadBox label="Upload Legal Documents" />
        </View>

        {/* 8. Description */}
        <View style={s.section}>
          <SectionHeader num="8" title="Description" />
          <TextInput style={[s.input, { minHeight: 110, textAlignVertical: 'top' }]}
            placeholder="A beautiful and well-lit studio..."
            placeholderTextColor={TEXT_LIGHT}
            multiline value={description} onChangeText={setDescription} />
        </View>

        {/* 9. Contact */}
        <View style={s.section}>
          <SectionHeader num="9" title="Contact & Availability" />
          <Text style={s.label}>Preferred Contact Method</Text>
          <View style={s.chipRow}>
            {[{ label: 'Call', icon: '📞' }, { label: 'WhatsApp', icon: '💬' }, { label: 'In-app Chat', icon: '💭' }]
              .map(({ label, icon }) => (
                <Chip key={label} label={label} icon={icon}
                  selected={contact.includes(label)} color={GREEN}
                  onPress={() => toggle(contact, setContact, label)} />
              ))}
          </View>
          <Text style={[s.label, { marginTop: 14 }]}>Available Visiting Hours</Text>
          <TextInput style={s.input} placeholder="e.g. Weekends 10AM - 2PM"
            placeholderTextColor={TEXT_LIGHT} value={visitHours} onChangeText={setVisitHours} />
        </View>

        {/* Action Buttons */}
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.draftBtn}>
            <Text style={{ color: PURPLE, fontWeight: '700', fontSize: 14 }}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postBtn}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Post Listing</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: '#fff', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  section: { backgroundColor: '#fff', margin: 10, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  sectionNumTxt: { fontSize: 13, fontWeight: '700', color: PURPLE },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_MID, marginBottom: 6, marginTop: 10 },
  hint: { fontSize: 11, color: TEXT_LIGHT, marginTop: 4, fontStyle: 'italic' },
  input: { borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 10, padding: 12, fontSize: 14, color: TEXT_DARK, backgroundColor: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, backgroundColor: '#fff' },
  chipTxt: { fontSize: 13, fontWeight: '500' },
  stepBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: GRAY_BORDER, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  uploadBtn: { width: 72, height: 72, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: PURPLE, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', gap: 12, margin: 16 },
  draftBtn: { flex: 1, padding: 14, borderWidth: 1.5, borderColor: PURPLE, borderRadius: 14, alignItems: 'center' },
  postBtn: { flex: 2, padding: 14, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center' },
  docInfoBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: GRAY_BORDER },
  docInfoTitle: { fontSize: 13, fontWeight: '700', color: TEXT_DARK, marginBottom: 6 },
  docInfoDesc: { fontSize: 12, color: TEXT_MID, lineHeight: 18 },
});