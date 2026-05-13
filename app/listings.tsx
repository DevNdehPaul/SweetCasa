import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

const PURPLE = '#7C5CFC';
const PURPLE_LIGHT = '#F0EBFF';
const TEXT_DARK = '#111827';
const TEXT_MID = '#6B7280';
const BG = '#F5F6FA';

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
  images: ListingImage[];
}

const STATUS_CONFIG: Record<Status, { bg: string; color: string; icon: string }> = {
  Approved: { bg: '#DCFCE7', color: '#16A34A', icon: '✓' },
  Pending:  { bg: '#FEF3C7', color: '#D97706', icon: '⏱' },
  Rejected: { bg: '#FEE2E2', color: '#DC2626', icon: '✕' },
};

function formatPrice(price: string, freq: string | null) {
  const num = Number(price);
  const formatted = num.toLocaleString('fr-CM');
  if (freq === 'For Sale') return `${formatted} XAF`;
  if (freq === 'Yearly') return `${formatted} XAF/yr`;
  return `${formatted} XAF/mo`;
}

function getPrimaryImage(images: ListingImage[]) {
  if (!images?.length) return null;
  return (
    images.find((img) => img.isPrimary)?.imageUrl ||
    images.sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl
  );
}

const StatusBadge = ({ status }: { status: Status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.badgeIcon, { color: cfg.color }]}>{cfg.icon}</Text>
      <Text style={[s.badgeTxt, { color: cfg.color }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteModal({
  visible,
  listing,
  onCancel,
  onConfirm,
  deleting,
}: {
  visible: boolean;
  listing: Listing | null;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalIconWrap}>
            <Feather name="trash-2" size={28} color="#DC2626" />
          </View>
          <Text style={s.modalTitle}>Delete Listing?</Text>
          <Text style={s.modalDesc}>
            Are you sure you want to delete{' '}
            <Text style={{ fontWeight: '700', color: TEXT_DARK }}>
              "{listing?.title}"
            </Text>
            ?{'\n'}This will permanently remove the listing, all photos and videos. This cannot be undone.
          </Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancelBtn} onPress={onCancel} disabled={deleting}>
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalDeleteBtn} onPress={onConfirm} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.modalDeleteTxt}>Yes, Delete</Text>
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
  visible,
  listing,
  onCancel,
  onSave,
  saving,
}: {
  visible: boolean;
  listing: Listing | null;
  onCancel: () => void;
  onSave: (data: Partial<Listing>) => void;
  saving: boolean;
}) {
  const [title, setTitle]             = useState('');
  const [price, setPrice]             = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity]               = useState('');
  const [region, setRegion]           = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [bedrooms, setBedrooms]       = useState('');
  const [bathrooms, setBathrooms]     = useState('');
  const [toilets, setToilets]         = useState('');
  const [parlors, setParlors]         = useState('');

  // Populate fields when listing changes
  useEffect(() => {
    if (listing) {
      setTitle(listing.title ?? '');
      setPrice(listing.price ?? '');
      setDescription(listing.description ?? '');
      setCity(listing.city ?? '');
      setRegion(listing.region ?? '');
      setNeighborhood(listing.neighborhood ?? '');
      setBedrooms(String(listing.bedrooms ?? ''));
      setBathrooms(String(listing.bathrooms ?? ''));
      setToilets(String(listing.toilets ?? ''));
      setParlors(String(listing.parlors ?? ''));
    }
  }, [listing]);

  const handleSave = () => {
    onSave({
      title,
      price,
      description,
      city,
      region,
      neighborhood,
      bedrooms:  bedrooms  ? Number(bedrooms)  : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      toilets:   toilets   ? Number(toilets)   : undefined,
      parlors:   parlors   ? Number(parlors)   : undefined,
    } as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.editOverlay}>
        <View style={s.editBox}>
          {/* Header */}
          <View style={s.editHeader}>
            <Text style={s.editTitle}>Edit Listing</Text>
            <TouchableOpacity onPress={onCancel} disabled={saving}>
              <Feather name="x" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          <Text style={s.editNote}>
            ⚠️ After saving, status will reset to{' '}
            <Text style={{ color: '#D97706', fontWeight: '700' }}>Pending</Text> for re-review.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Title */}
            <Text style={s.fieldLabel}>Title</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Property title"
              placeholderTextColor="#9CA3AF"
            />

            {/* Price */}
            <Text style={s.fieldLabel}>Price (XAF)</Text>
            <TextInput
              style={s.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 90000"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            {/* Description */}
            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              style={[s.input, s.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the property..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
            />

            {/* Location row */}
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>City</Text>
                <TextInput
                  style={s.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Region</Text>
                <TextInput
                  style={s.input}
                  value={region}
                  onChangeText={setRegion}
                  placeholder="Region"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Neighborhood */}
            <Text style={s.fieldLabel}>Neighborhood</Text>
            <TextInput
              style={s.input}
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="Neighborhood / Street"
              placeholderTextColor="#9CA3AF"
            />

            {/* Room counts */}
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Parlours</Text>
                <TextInput
                  style={s.input}
                  value={parlors}
                  onChangeText={setParlors}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Bedrooms</Text>
                <TextInput
                  style={s.input}
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
            <View style={s.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Bathrooms</Text>
                <TextInput
                  style={s.input}
                  value={bathrooms}
                  onChangeText={setBathrooms}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Toilets</Text>
                <TextInput
                  style={s.input}
                  value={toilets}
                  onChangeText={setToilets}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Save button */}
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={16} color="#fff" />
                <Text style={s.saveBtnTxt}>Save Changes</Text>
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
  item,
  onDelete,
  onEdit,
}: {
  item: Listing;
  onDelete: (item: Listing) => void;
  onEdit: (item: Listing) => void;
}) => {
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
        <Text style={s.cardSub}>{item.type} • {formatPrice(item.price, item.paymentFrequency)}</Text>
        <Text style={s.cardLocation} numberOfLines={1}>📍 {location}</Text>
        <StatusBadge status={item.status} />

        {/* Action buttons */}
        <View style={s.cardActions}>
          <TouchableOpacity style={s.editBtn} onPress={() => onEdit(item)}>
            <Feather name="edit-2" size={13} color={PURPLE} />
            <Text style={s.editBtnTxt}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item)}>
            <Feather name="trash-2" size={13} color="#DC2626" />
            <Text style={s.deleteBtnTxt}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const FILTERS: Filter[] = ['All', 'Approved', 'Pending', 'Rejected'];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyListings() {
  const [listings, setListings]         = useState<Listing[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<Listing | null>(null);
  const [saving, setSaving]         = useState(false);

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
      if (!res.ok) throw new Error(data.error || 'Failed to load listings.');
      setListings(data.listings || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // ── Delete ──
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
      if (!res.ok) throw new Error(data.error || 'Failed to delete.');
      setListings(prev => prev.filter(l => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not delete listing.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Edit ──
  const handleSaveEdit = async (formData: any) => {
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
      if (!res.ok) throw new Error(data.error || 'Failed to update.');

      // Update listing in local state
      setListings(prev =>
        prev.map(l => l.id === editTarget.id ? { ...l, ...data.listing } : l)
      );
      setEditTarget(null);
      Alert.alert('Success', 'Listing updated! It has been sent for re-review.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update listing.');
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

  const filtered = activeFilter === 'All'
    ? listings
    : listings.filter((l) => l.status === activeFilter);

  return (
    <SafeAreaView style={s.safe}>
      {/* Delete confirmation modal */}
      <DeleteModal
        visible={!!deleteTarget}
        listing={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />

      {/* Edit modal */}
      <EditModal
        visible={!!editTarget}
        listing={editTarget}
        onCancel={() => setEditTarget(null)}
        onSave={handleSaveEdit}
        saving={saving}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/agent-dashboard')} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Listings</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={s.loadingTxt}>Loading your listings…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchListings()}>
            <Text style={s.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchListings(true)}
              tintColor={PURPLE}
            />
          }
        >
          {/* Summary row */}
          <View style={s.summaryRow}>
            <Text style={s.summaryTotal}>{counts.total} Total</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#16A34A' }]}>{counts.approved} Approved</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#D97706' }]}>{counts.pending} Pending</Text>
            <Text style={s.dot}>•</Text>
            <Text style={[s.summaryCount, { color: '#DC2626' }]}>{counts.rejected} Rejected</Text>
          </View>

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[s.filterTab, activeFilter === f && s.filterTabActive]}
              >
                <Text style={[s.filterTxt, activeFilter === f && s.filterTxtActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cards */}
          <View style={s.listContainer}>
            {filtered.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                onDelete={setDeleteTarget}
                onEdit={setEditTarget}
              />
            ))}
            {filtered.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTxt}>
                  {activeFilter === 'All'
                    ? "You haven't posted any listings yet."
                    : `No ${activeFilter} listings.`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/upload')}>
        <Text style={s.fabIcon}>+</Text>
        <Text style={s.fabTxt}>Add New Listing</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  summaryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8, gap: 6,
  },
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
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, elevation: 2, marginBottom: 4,
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

  // ── Action buttons ──
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

  // ── Delete modal ──
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
  modalDeleteBtn: {
    flex: 1, backgroundColor: '#DC2626',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  modalDeleteTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Edit modal ──
  editOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '90%',
  },
  editHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  editTitle: { fontSize: 20, fontWeight: '800', color: TEXT_DARK },
  editNote: {
    fontSize: 12.5, color: TEXT_MID, backgroundColor: '#FEF3C7',
    borderRadius: 10, padding: 10, marginBottom: 14, lineHeight: 18,
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: TEXT_MID, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: TEXT_DARK,
  },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: PURPLE, borderRadius: 16,
    paddingVertical: 16, marginTop: 16,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTxt: { color: TEXT_MID, fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PURPLE, paddingVertical: 16,
    paddingHorizontal: 24, borderRadius: 32,
    shadowColor: PURPLE, shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 8,
  },
  fabIcon: { fontSize: 20, color: '#fff', fontWeight: '700' },
  fabTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});