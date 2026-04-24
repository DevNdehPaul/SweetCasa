import { Feather, Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const H_PAD = 16;
const CARD_W = (width - H_PAD * 2 - 12) / 2;

const LISTINGS = [
  { id: '1', title: 'Modern Akwa St', location: 'Akwa, Doual', price: '250,000', type: 'Studio', rating: 4.8, verified: true, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80' },
  { id: '2', title: 'Bonapriso Vill', location: 'Bonapriso, Doua', price: '1.2M', type: 'Villa', rating: 4.9, verified: false, image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80' },
  { id: '3', title: 'Kotto Family Hom', location: 'Kotto, Doual', price: '450,000', type: 'Apartment', rating: 4.5, verified: false, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80' },
  { id: '4', title: 'Logpom Duple', location: 'Logpom, Doua', price: '600,000', type: 'Duplex', rating: 4.7, verified: true, image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80' },
  { id: '5', title: 'Denver Executi', location: 'Denver, Doua', price: '850,000', type: 'Penthouse', rating: 5, verified: true, image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&q=80' },
  { id: '6', title: 'Yassa Sea Vie', location: 'Yassa, Doua', price: '350,000', type: 'Apartment', rating: 4.3, verified: false, image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=400&q=80' },
];

function ListingCard({ item }: { item: typeof LISTINGS[0] }) {
  const [saved, setSaved] = useState(false);
  return (
    <TouchableOpacity style={[styles.card, { width: CARD_W }]} activeOpacity={0.88}>
      <View style={styles.cardImgWrap}>
        <Image source={{ uri: item.image }} style={styles.cardImg} resizeMode="cover" />

        {/* Price pill */}
        <View style={styles.pricePill}>
          <Text style={styles.pricePillTxt}>{item.price}</Text>
        </View>

        {/* Save btn */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => setSaved(p => !p)}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={14} color={saved ? '#EF4444' : '#888'} />
        </TouchableOpacity>

        {/* Verified */}
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>VERIFIED</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={styles.ratingTxt}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={11} color="#B0B0B0" />
          <Text style={styles.locationTxt} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.typeChip}>
            <Text style={styles.typeChipTxt}>{item.type}</Text>
          </View>
          <TouchableOpacity>
            <Link href="/propertydetail">
            <Text style={styles.detailsLink}>Details</Text>
            </Link>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchResultsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Meta row */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaSmall}>Found for you</Text>
            <Text style={styles.metaBig}>128 verified listings</Text>
          </View>
          <TouchableOpacity style={styles.sortBtn}>
            <Text style={styles.sortTxt}>Sort by: Newest</Text>
            <Feather name="chevron-down" size={13} color="#555" />
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {LISTINGS.map(item => (
            <ListingCard key={item.id} item={item} />
          ))}
        </View>

        {/* See More */}
        <TouchableOpacity style={styles.seeMoreBtn} activeOpacity={0.8}>
          <Text style={styles.seeMoreTxt}>See More Properties</Text>
          <Feather name="chevron-down" size={16} color="#7C3AED" />
        </TouchableOpacity>
        <Text style={styles.showingTxt}>Showing 6 of 128 results</Text>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Filter FAB */}
      <TouchableOpacity style={styles.filterFab}>
        <Feather name="sliders" size={20} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 14, paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 16,
  },
  metaSmall: { fontSize: 11.5, color: '#B0B0B0', marginBottom: 2 },
  metaBig: { fontSize: 15, fontWeight: '700', color: '#111' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  sortTxt: { fontSize: 12.5, color: '#555', fontWeight: '500' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: {
    borderRadius: 16, backgroundColor: '#fff',
    overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardImgWrap: { width: '100%', height: CARD_W * 0.85, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },

  pricePill: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#7C3AED', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  pricePillTxt: { fontSize: 10.5, fontWeight: '700', color: '#fff' },
  saveBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  verifiedBadge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 8.5, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },

  cardBody: { padding: 10, gap: 4 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111', letterSpacing: -0.1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingTxt: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 11, color: '#B0B0B0', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  typeChip: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  typeChipTxt: { fontSize: 10.5, color: '#6B7280', fontWeight: '600' },
  detailsLink: { fontSize: 12, color: '#7C3AED', fontWeight: '700' },

  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 30, paddingVertical: 14, marginTop: 20,
  },
  seeMoreTxt: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
  showingTxt: { textAlign: 'center', fontSize: 12, color: '#B0B0B0', marginTop: 10 },

  filterFab: {
    position: 'absolute', bottom: 30, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});