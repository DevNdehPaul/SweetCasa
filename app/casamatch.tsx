import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
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

const OPTIONS = [
  {
    id: 'security',
    icon: 'shield',
    label: 'Maximum Security',
    desc: 'Gated community, 24/7 guard, CCTV monitoring.',
    iconBg: '#7C3AED',
    iconColor: '#fff',
  },
  {
    id: 'commute',
    icon: 'navigation',
    label: 'Easy Commute',
    desc: 'Close to main roads, taxi ranks, and transit hubs.',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
  {
    id: 'wfh',
    icon: 'briefcase',
    label: 'Work From Home',
    desc: 'Quiet environment with stable fiber internet.',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
  {
    id: 'budget',
    icon: 'zap',
    label: 'Budget Friendly',
    desc: 'Optimized costs without sacrificing quality.',
    iconBg: '#7C3AED',
    iconColor: '#fff',
  },
  {
    id: 'family',
    icon: 'users',
    label: 'Family Oriented',
    desc: 'Schools, parks, and safe neighborhoods nearby.',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
  {
    id: 'luxury',
    icon: 'star',
    label: 'Luxury Living',
    desc: 'Premium amenities, pool, gym, and concierge.',
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
];

function OptionCard({ item, selected, onPress }: { item: typeof OPTIONS[0]; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.optionIcon, { backgroundColor: selected ? '#7C3AED' : '#F3F0FF' }]}>
        <Feather name={item.icon as any} size={20} color={selected ? '#fff' : '#7C3AED'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>{item.label}</Text>
        <Text style={styles.optionDesc} numberOfLines={2}>{item.desc}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle-outline" size={20} color="#7C3AED" />
      )}
    </TouchableOpacity>
  );
}

export default function CasaMatchAIScreen() {
  const [selected, setSelected] = useState<string[]>(['security', 'budget']);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Tell us your lifestyle</Text>
        <Text style={styles.subheading}>
          Our AI analyzes thousands of verified listings to find your perfect home match.
        </Text>

        <View style={styles.optionsList}>
          {OPTIONS.map(item => (
            <OptionCard
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              onPress={() => toggle(item.id)}
            />
          ))}
        </View>

        {/* AI Ready hint */}
        {selected.length >= 2 && (
          <View style={styles.aiReadyCard}>
            <View style={styles.aiReadyIcon}>
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiReadyTitle}>AI Assistant ready</Text>
              <Text style={styles.aiReadyDesc}>
                Based on your {selected.length} selections, we can identify high-confidence matches.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.analyzeBtn, selected.length === 0 && styles.analyzeBtnDisabled]}
          activeOpacity={0.88}
          disabled={selected.length === 0}
        >
          <Text style={styles.analyzeBtnTxt}>Analyze Compatibility</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: H_PAD, paddingTop: 20, paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: -0.2 },

  heading: { fontSize: 22, fontWeight: '800', color: '#111', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 13.5, color: '#9CA3AF', lineHeight: 20, marginBottom: 24 },

  optionsList: { gap: 12 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#EFEFEF',
  },
  optionCardActive: { borderColor: '#C4B5FD', backgroundColor: '#FAF5FF' },
  optionIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 },
  optionLabelActive: { color: '#5B21B6' },
  optionDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },

  aiReadyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#EDE9FE', marginTop: 16,
  },
  aiReadyIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  aiReadyTitle: { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginBottom: 2 },
  aiReadyDesc: { fontSize: 11.5, color: '#A78BFA', lineHeight: 16 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: H_PAD, paddingBottom: 34, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  analyzeBtn: {
    backgroundColor: '#6D28D9', borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: '#6D28D9', shadowOpacity: 0.35,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  analyzeBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  analyzeBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
});