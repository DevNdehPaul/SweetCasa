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
const H_PAD = 20;
const IMG_H = 280;

const NEARBY = [
  { id: '1', label: 'Government High School', dist: '0.8 km', icon: 'book' },
  { id: '2', label: 'Central Clinic',          dist: '1.2 km', icon: 'activity' },
  { id: '3', label: 'Total Petrol Station',    dist: '0.5 km', icon: 'droplet' },
];

const STATS = [
  { icon: 'sofa',      label: 'PARLOUR',   val: '1' },
  { icon: 'bed',       label: 'BEDROOMS',  val: '3' },
  { icon: 'coffee',    label: 'KITCHEN',   val: '1' },
  { icon: 'wind',      label: 'TOILETS',   val: '2' },
];

export default function PropertyDetailScreen() {
  const [saved, setSaved] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80' }}
            style={styles.heroImg}
            resizeMode="cover"
          />
          {/* Overlay header */}
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.heroBtn}>
              <Feather name="chevron-left" size={20} color="#111" />
            </TouchableOpacity>
            <View style={styles.heroRightBtns}>
              <TouchableOpacity style={styles.heroBtn} onPress={() => setSaved(p => !p)}>
                <Ionicons name={saved ? 'heart' : 'heart-outline'} size={20} color={saved ? '#EF4444' : '#111'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn}>
                <Feather name="share-2" size={18} color="#111" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Verified badge */}
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedTxt}>Verified Property</Text>
          </View>

          {/* Dots */}
          <View style={styles.dotRow}>
            {[0,1,2].map(i => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {/* Title + Price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.propTitle}>Modern 3-Bedroom{'\n'}Executive Villa</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                <Text style={styles.locationTxt}>Bastos, Yaoundé, Cameroon</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.price}>350k</Text>
              <Text style={styles.priceSub}>XAF / Month</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {STATS.map(s => (
              <View key={s.label} style={styles.statItem}>
                <Feather name={s.icon as any} size={20} color="#7C3AED" />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Min rental */}
          <View style={styles.rentalCard}>
            <View style={styles.rentalLeft}>
              <Ionicons name="time-outline" size={16} color="#7C3AED" />
              <View>
                <Text style={styles.rentalLabel}>Min. Rental Period</Text>
                <Text style={styles.rentalVal}>12 Months (Negotiable)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.applyBtn}>
              <Text style={styles.applyBtnTxt}>Apply Now</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Property Description</Text>
          <Text style={styles.description}>
            Beautifully renovated villa located in the heart of Bastos. Features high ceilings, a state-of-the-art
            kitchen, and private parking. Secure fence with 24/7 security personnel available.
          </Text>

          {/* Escrow */}
          <TouchableOpacity style={styles.escrowCard} activeOpacity={0.85}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#7C3AED" />
            <View style={{ flex: 1 }}>
              <Text style={styles.escrowTitle}>Secure Escrow Protection</Text>
              <Text style={styles.escrowDesc}>
                Your deposit is held securely by SweetCasa Escrow and only released to the landlord after you verify the property upon move-in.
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#C0C0C0" />
          </TouchableOpacity>

          {/* Neighborhood */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Neighborhood Intelligence</Text>
            <TouchableOpacity>
              <Link href="/neighborhoodmap">
              <Text style={styles.viewMap}>View Full Map</Text>
              </Link>
            </TouchableOpacity>
          </View>

          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapPill}>
              <Ionicons name="location-outline" size={14} color="#7C3AED" />
              <Text style={styles.mapPillTxt}>Interactive View</Text>
            </View>
          </View>

          {/* Nearby */}
          {NEARBY.map(n => (
            <View key={n.id} style={styles.nearbyRow}>
              <View style={styles.nearbyIcon}>
                <Feather name={n.icon as any} size={15} color="#7C3AED" />
              </View>
              <Text style={styles.nearbyLabel}>{n.label}</Text>
              <Text style={styles.nearbyDist}>{n.dist}</Text>
            </View>
          ))}

          {/* Listed By */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Listed By</Text>
          <View style={styles.agentRow}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/52.jpg' }}
              style={styles.agentAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.agentName}>Samuel Eto</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingTxt}>4.8 (120 reviews)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.profileBtn}>
             <Link href="/agent-dashboard">
              <Text style={styles.profileBtnTxt}>Profile</Text></Link>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.contactBtn}>
          <Link href="/messages">
          <Feather name="message-square" size={16} color="#7C3AED" />
          <Text style={styles.contactBtnTxt}>Contact</Text></Link>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn}>
          <Ionicons name="call-outline" size={16} color="#fff" />
          <Text style={styles.bookBtnTxt}>Apply & Book View</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { paddingHorizontal: H_PAD, paddingTop: 20 },

  heroWrap: { width, height: IMG_H, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute', top: 48, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  heroRightBtns: { flexDirection: 'row', gap: 8 },
  heroBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  verifiedBadge: {
    position: 'absolute', top: 100, left: 16,
    backgroundColor: '#7C3AED', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  verifiedTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  dotRow: {
    position: 'absolute', bottom: 12,
    width: '100%', flexDirection: 'row',
    justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  propTitle: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 12.5, color: '#9CA3AF' },
  price: { fontSize: 24, fontWeight: '800', color: '#7C3AED', letterSpacing: -0.5 },
  priceSub: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 16,
  },
  statItem: { alignItems: 'center', gap: 5, flex: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 9.5, color: '#B0B0B0', fontWeight: '600', letterSpacing: 0.5 },

  rentalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FAF5FF', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EDE9FE', marginBottom: 20,
  },
  rentalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rentalLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  rentalVal: { fontSize: 13, fontWeight: '700', color: '#111' },
  applyBtn: {
    backgroundColor: '#7C3AED', borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  applyBtnTxt: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10, letterSpacing: -0.2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewMap: { fontSize: 12.5, color: '#7C3AED', fontWeight: '600' },
  description: { fontSize: 13.5, color: '#6B7280', lineHeight: 22, marginBottom: 18 },

  escrowCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  escrowTitle: { fontSize: 13.5, fontWeight: '700', color: '#111', marginBottom: 4 },
  escrowDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  mapPlaceholder: {
    width: '100%', height: 130,
    backgroundColor: '#F3F4F6', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  mapPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 30,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  mapPillTxt: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  nearbyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  nearbyIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F3F0FF', alignItems: 'center', justifyContent: 'center',
  },
  nearbyLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#111' },
  nearbyDist: { fontSize: 12, color: '#9CA3AF' },

  agentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 4,
  },
  agentAvatar: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: '#EDE9FE',
  },
  agentName: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingTxt: { fontSize: 12, color: '#9CA3AF' },
  profileBtn: {
    borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 30, paddingHorizontal: 18, paddingVertical: 8,
  },
  profileBtnTxt: { fontSize: 12.5, fontWeight: '700', color: '#7C3AED' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: H_PAD, paddingBottom: 32, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14,
  },
  contactBtnTxt: { fontSize: 13.5, fontWeight: '700', color: '#7C3AED', paddingLeft: 4 },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#6D28D9', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#6D28D9', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  bookBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});