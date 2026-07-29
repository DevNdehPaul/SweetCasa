import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // adjust path as needed
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');
const H_PAD = 20;
const IMG_H = 310;
const PURPLE = '#7C3AED';
const PURPLE_LIGHT = '#F3F0FF';
const PURPLE_BORDER = '#EDE9FE';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ListingImage {
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Agent {
  id: number;
  name: string;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
  city: string | null;
  country: string | null;
  region: string | null;
  street: string | null;
}

interface ListingDetail {
  id: number;
  title: string;
  type: string;
  price: string;
  paymentFrequency: string | null;
  city: string;
  region: string;
  neighborhood: string | null;
  status: string;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  parlour: number | null;
  parlors: number | null;
  kitchen: number | null;
  kitchens: number | null;
  minRentalPeriod: string | null;
  videoUrl: string | null;
  videoThumbnailUrl: string | null;
  floorPlanUrl: string | null;
  facilities: string[];
  images: ListingImage[];
  agent: Agent | null;
  nearby_school_name: string | null;
  nearby_bank_name: string | null;
  nearby_restaurant_name: string | null;
  nearby_market_name: string | null;
  nearby_clinic_name: string | null;
  nearbySchoolName: string | null;
  nearbyBankName: string | null;
  nearbyRestaurantName: string | null;
  nearbyMarketName: string | null;
  nearbyClinicName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(price: string, freq: string | null, t: (key: string) => string) {
  const n = Number(price);
  const f =
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
      : n.toLocaleString('fr-CM');
  if (freq === 'For Sale') return { amount: `${f} XAF`, period: t('listing.forSale') };
  if (freq === 'Yearly')   return { amount: `${f} XAF`, period: t('propertyDetail.yearlyPeriod') };
  return { amount: `${f} XAF`, period: t('propertyDetail.monthlyPeriod') };
}

function getSortedImages(images: ListingImage[]): ListingImage[] {
  if (!images?.length) return [];
  return [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  });
}

function getCloudinaryVideoThumbnail(videoUrl: string): string | null {
  try {
    const match = videoUrl.match(
      /^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.+)$/
    );
    if (!match) return null;
    const base = match[1];
    const rest = match[2];
    const withoutExt = rest.replace(/\.[^.]+$/, '');
    return `${base}so_0/${withoutExt}.jpg`;
  } catch {
    return null;
  }
}

async function fetchVideoForListing(
  id: string
): Promise<{ videoUrl: string; videoThumbnailUrl: string | null } | null> {
  try {
    const url = `${BASE_URL}/listings/${id}/video`;
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) return null;
    let data: any;
    try { data = JSON.parse(text); } catch { return null; }
    const videoUrl =
      data?.video_url        ?? data?.videoUrl        ??
      data?.data?.video_url  ?? data?.data?.videoUrl  ??
      null;
    const rawThumb =
      data?.thumbnail_url       ?? data?.thumbnailUrl       ??
      data?.data?.thumbnail_url ?? data?.data?.thumbnailUrl ??
      null;
    if (!videoUrl) return null;
    const videoThumbnailUrl = rawThumb || getCloudinaryVideoThumbnail(videoUrl);
    return { videoUrl, videoThumbnailUrl };
  } catch {
    return null;
  }
}

interface NearbyPlace {
  label: string;
  example: string | null;
  icon: string;
}

function buildNearbyPlaces(listing: ListingDetail, t: (key: string) => string): NearbyPlace[] {
  const school     = listing.nearbySchoolName     ?? listing.nearby_school_name     ?? null;
  const bank       = listing.nearbyBankName       ?? listing.nearby_bank_name       ?? null;
  const restaurant = listing.nearbyRestaurantName ?? listing.nearby_restaurant_name ?? null;
  const market     = listing.nearbyMarketName     ?? listing.nearby_market_name     ?? null;
  const clinic     = listing.nearbyClinicName     ?? listing.nearby_clinic_name     ?? null;

  const places: NearbyPlace[] = [
    { label: t('propertyDetail.nearbySchool'),     example: school,     icon: 'book'         },
    { label: t('propertyDetail.nearbyBank'),       example: bank,       icon: 'credit-card'  },
    { label: t('propertyDetail.nearbyRestaurant'), example: restaurant, icon: 'coffee'       },
    { label: t('propertyDetail.nearbyMarket'),     example: market,     icon: 'shopping-bag' },
    { label: t('propertyDetail.nearbyClinic'),     example: clinic,     icon: 'activity'     },
  ];
  return places.filter(p => p.example !== null && p.example.trim() !== '');
}

// ─── Photo Carousel ───────────────────────────────────────────────────────────
function PhotoCarousel({
  images,
  onFullscreen,
  t,
}: {
  images: ListingImage[];
  onFullscreen: (index: number) => void;
  t: (key: string) => string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sorted = getSortedImages(images);

  if (!sorted.length) {
    return (
      <View style={[styles.heroWrap, styles.heroPlaceholder]}>
        <Text style={{ fontSize: 48 }}>🏠</Text>
        <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13 }}>
          {t('propertyDetail.noPhotos')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.heroWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
      >
        {sorted.map((img, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.95}
            onPress={() => onFullscreen(i)}
          >
            <Image
              source={{ uri: img.imageUrl }}
              style={styles.heroImg}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.dotRow}>
        {sorted.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.photoBadge}>
        <Ionicons name="images-outline" size={11} color="#fff" />
        <Text style={styles.photoBadgeTxt}>
          {activeIndex + 1} / {sorted.length}
        </Text>
      </View>
    </View>
  );
}

// ─── Fullscreen Gallery Modal ─────────────────────────────────────────────────
function FullscreenGallery({
  images,
  startIndex,
  visible,
  onClose,
}: {
  images: ListingImage[];
  startIndex: number;
  visible: boolean;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const sorted = getSortedImages(images);

  useEffect(() => { setActiveIndex(startIndex); }, [startIndex]);

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <View style={styles.fsContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <TouchableOpacity style={styles.fsClose} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fsCounter}>
          {activeIndex + 1} / {sorted.length}
        </Text>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startIndex * width, y: 0 }}
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveIndex(idx);
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {sorted.map((img, i) => (
            <Image
              key={i}
              source={{ uri: img.imageUrl }}
              style={{ width, height: '100%' }}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fsThumbs}
        >
          {sorted.map((img, i) => (
            <TouchableOpacity key={i} onPress={() => setActiveIndex(i)}>
              <Image
                source={{ uri: img.imageUrl }}
                style={[styles.fsThumb, i === activeIndex && styles.fsThumbActive]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Video Walkthrough ────────────────────────────────────────────────────────
function VideoWalkthrough({
  videoUrl,
  thumbnailUrl,
  fallbackImage,
  t,
}: {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  fallbackImage: string | null;
  t: (key: string) => string;
}) {
  const thumb = thumbnailUrl || fallbackImage;
  const [playing, setPlaying] = useState(false);
  const videoRef = React.useRef<any>(null);

  if (!videoUrl) {
    return (
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>{t('propertyDetail.videoWalkthrough')}</Text>
        </View>
        <View style={styles.videoWrap}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={styles.videoThumb} resizeMode="cover" />
          ) : (
            <View style={styles.videoThumbPlaceholder} />
          )}
          <View style={styles.videoOverlay} />
          <View style={styles.playBtnDisabled}>
            <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
          </View>
          <View style={styles.videoPill}>
            <Feather name="clock" size={11} color="#fff" />
            <Text style={styles.videoPillTxt}>{t('propertyDetail.videoComingSoon')}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{t('propertyDetail.videoWalkthrough')}</Text>
      </View>

      <View style={styles.videoWrap}>
        {playing ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            shouldPlay
            onError={() => setPlaying(false)}
          />
        ) : (
          <TouchableOpacity
            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
            activeOpacity={0.9}
            onPress={() => setPlaying(true)}
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.videoThumb} resizeMode="cover" />
            ) : (
              <View style={styles.videoThumbPlaceholder} />
            )}
            <View style={styles.videoOverlay} />
            <View style={styles.playBtn}>
              <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
            </View>
            <View style={styles.videoPill}>
              <Feather name="film" size={11} color="#fff" />
              <Text style={styles.videoPillTxt}>{t('propertyDetail.tapToPlay')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {playing && (
        <TouchableOpacity
          style={styles.videoStopBtn}
          onPress={() => setPlaying(false)}
        >
          <Ionicons name="stop-circle-outline" size={15} color={PURPLE} />
          <Text style={styles.videoStopBtnTxt}>{t('propertyDetail.stopVideo')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Floor Plan ───────────────────────────────────────────────────────────────
function FloorPlan({ floorPlanUrl, t }: { floorPlanUrl: string; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>{t('propertyDetail.floorPlan')}</Text>
        </View>
        <TouchableOpacity onPress={() => setExpanded(true)}>
          <Text style={styles.linkTxt}>{t('propertyDetail.fullScreen')}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.floorPlanWrap}
        activeOpacity={0.9}
        onPress={() => setExpanded(true)}
      >
        <Image
          source={{ uri: floorPlanUrl }}
          style={styles.floorPlanImg}
          resizeMode="contain"
        />
        <View style={styles.floorPlanBadge}>
          <Feather name="maximize-2" size={12} color={PURPLE} />
          <Text style={styles.floorPlanBadgeTxt}>{t('propertyDetail.tapToExpand')}</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={expanded} transparent={false} animationType="slide" statusBarTranslucent>
        <View style={styles.fsContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <TouchableOpacity style={styles.fsClose} onPress={() => setExpanded(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.fsCounter, { top: 22, left: width / 2 - 50 }]}>
            {t('propertyDetail.floorPlan')}
          </Text>
          <Image
            source={{ uri: floorPlanUrl }}
            style={{ flex: 1, width: '100%' }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PropertyDetailScreen() {
  const { t } = useTranslation();
  const { id, listingData } = useLocalSearchParams<{ id: string; listingData?: string }>();

  const [listing, setListing]     = useState<ListingDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);
  const [fsIndex, setFsIndex]     = useState(0);
  const [fsVisible, setFsVisible] = useState(false);
  const [contacting, setContacting] = useState(false);

  const fetchListing = async () => {
    setLoading(true);
    setError(null);
    try {
      if (listingData) {
        const parsed: ListingDetail = JSON.parse(listingData as string);
        setListing(parsed);
        setLoading(false);

        try {
          const res = await fetch(`${BASE_URL}/listings/${id}`);
          if (res.ok) {
            const data = await res.json();
            const full: ListingDetail = data?.listing ?? data;
            if (full?.id) setListing(full);
          }
        } catch {
          // silently ignore
        }

        const video = await fetchVideoForListing(id);
        if (video) {
          setListing(prev => prev ? { ...prev, ...video } : prev);
        }
        return;
      }

      const res = await fetch(`${BASE_URL}/listings/${id}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Unexpected response (${res.status}): ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      const full: ListingDetail = data?.listing ?? data;
      if (!full?.id) throw new Error(t('propertyDetail.notFound'));
      setListing(full);

      const video = await fetchVideoForListing(id);
      if (video) {
        setListing(prev => prev ? { ...prev, ...video } : prev);
      }

    } catch (err: any) {
      setError(err.message || t('errors.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Contact seller ──
  const handleContact = async () => {
    if (contacting) return;

    // Guard: agent must be linked to this listing
    if (!listing?.agent?.id) {
      Alert.alert(
        'Agent not available',
        'This listing does not have a contact agent yet. Please try again later.',
      );
      return;
    }

    setContacting(true);
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user'),
      ]);

      if (!token) {
        router.push('/login' as any);
        return;
      }

      // Resolve buyer's display name — try multiple common storage keys
      let buyerName = 'A potential buyer';
      try {
        if (userRaw) {
          const u = JSON.parse(userRaw);
          buyerName = u.name || u.fullName || u.companyName || buyerName;
        }
      } catch {}

      // Start or retrieve existing conversation
      const convRes = await fetch(BASE_URL + '/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          listingId:   listing.id,
          recipientId: listing.agent.id,
        }),
      });

      if (!convRes.ok) {
        const errBody = await convRes.json().catch(() => ({}));
        throw new Error((errBody as any).error || 'Could not start conversation (HTTP ' + convRes.status + ').');
      }
      const convData = await convRes.json();
      const conversationId = convData.conversationId;

      // Send pre-drafted welcome message with buyer's name
      const loc = [listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', ');
      const welcomeText =
        'Hello! My name is ' + buyerName + ' and I came across your listing "' + listing.title + '" in ' + loc +
        ' on SweetCasa. I am very interested in this property and would love to get more details. ' +
        'Could you please let me know when a viewing would be possible? Thank you!';

      await fetch(BASE_URL + '/messages/conversations/' + conversationId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ text: welcomeText }),
      });

      // Navigate to the chat screen
      router.push({ pathname: '/MessagesScreen', params: { conversationId } } as any);
    } catch (err: any) {
      Alert.alert('Could not send message', err.message || 'Something went wrong. Please try again.');
    } finally {
      setContacting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingTxt}>{t('propertyDetail.loading')}</Text>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error || !listing) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏚️</Text>
        <Text style={styles.errorTxt}>{error ?? t('propertyDetail.notFound')}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchListing}>
          <Text style={styles.retryTxt}>{t('propertyDetail.tryAgain')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Feather name="arrow-left" size={14} color={PURPLE} />
          <Text style={styles.backLinkTxt}>{t('propertyDetail.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Data helpers ──
  const { amount, period } = formatPrice(listing.price, listing.paymentFrequency, t);
  const location = [listing.neighborhood, listing.city, listing.region].filter(Boolean).join(', ');
  const sortedImages = getSortedImages(listing.images);
  const primaryImageUrl = sortedImages[0]?.imageUrl ?? null;

  const stats = [
    { icon: 'home',    label: t('propertyDetail.parlour'), val: listing.parlors  ?? listing.parlour  ?? '—' },
    { icon: 'book',    label: t('propertyDetail.beds'),    val: listing.bedrooms ?? '—' },
    { icon: 'droplet', label: t('propertyDetail.baths'),   val: listing.bathrooms ?? '—' },
    { icon: 'wind',    label: t('propertyDetail.toilets'), val: listing.toilets  ?? '—' },
    { icon: 'coffee',  label: t('propertyDetail.kitchen'), val: listing.kitchens ?? listing.kitchen ?? '—' },
  ] as const;

  const nearbyPlaces = buildNearbyPlaces(listing, t);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {sortedImages.length > 0 && (
        <FullscreenGallery
          images={listing.images}
          startIndex={fsIndex}
          visible={fsVisible}
          onClose={() => setFsVisible(false)}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ── Photo Carousel ── */}
        <PhotoCarousel
          images={listing.images}
          onFullscreen={idx => { setFsIndex(idx); setFsVisible(true); }}
          t={t}
        />

        {/* ── Floating header overlay ── */}
        <View style={styles.heroOverlay}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#111" />
          </TouchableOpacity>
          <View style={styles.heroRightBtns}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => setSaved(p => !p)}>
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={20}
                color={saved ? '#EF4444' : '#111'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn}>
              <Feather name="share-2" size={18} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Verified badge ── */}
        {listing.status === 'Approved' && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#fff" />
            <Text style={styles.verifiedTxt}>{t('propertyDetail.verifiedProperty')}</Text>
          </View>
        )}

        <View style={styles.body}>

          {/* ── Title + Price ── */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.propTitle}>{listing.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                <Text style={styles.locationTxt} numberOfLines={1}>{location}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Text style={styles.price}>{amount}</Text>
              <Text style={styles.priceSub}>{period}</Text>
            </View>
          </View>

          {/* ── Property Type chip ── */}
          <View style={styles.typeRow}>
            <View style={styles.typeChip}>
              <Feather name="tag" size={11} color={PURPLE} />
              <Text style={styles.typeChipTxt}>{listing.type}</Text>
            </View>
            {listing.paymentFrequency === 'For Sale' ? (
              <View style={[styles.typeChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.typeChipTxt, { color: '#059669' }]}>
                  {t('propertyDetail.forSale')}
                </Text>
              </View>
            ) : (
              <View style={[styles.typeChip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <Text style={[styles.typeChipTxt, { color: '#2563EB' }]}>
                  {t('propertyDetail.forRent')}
                </Text>
              </View>
            )}
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            {stats.map(s => (
              <View key={s.label} style={styles.statItem}>
                <Feather name={s.icon as any} size={20} color={PURPLE} />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Min rental ── */}
          {listing.paymentFrequency !== 'For Sale' && (
            <View style={styles.rentalCard}>
              <View style={styles.rentalLeft}>
                <Ionicons name="time-outline" size={16} color={PURPLE} />
                <View>
                  <Text style={styles.rentalLabel}>{t('propertyDetail.minRentalPeriod')}</Text>
                  <Text style={styles.rentalVal}>
                    {listing.minRentalPeriod ?? t('propertyDetail.minRentalDefault')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.applyBtn}>
                <Text style={styles.applyBtnTxt}>{t('propertyDetail.applyNow')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Description ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{t('propertyDetail.propertyDescription')}</Text>
            </View>
            <Text style={styles.description}>
              {listing.description?.trim() || t('propertyDetail.noDescription')}
            </Text>
          </View>

          {/* ── Facilities ── */}
          {listing.facilities?.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>{t('propertyDetail.facilitiesAmenities')}</Text>
              </View>
              <View style={styles.facilitiesGrid}>
                {listing.facilities.map((f, i) => (
                  <View key={i} style={styles.facilityItem}>
                    <Ionicons name="checkmark-circle" size={15} color={PURPLE} />
                    <Text style={styles.facilityTxt}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Photo Gallery strip ── */}
          {sortedImages.length > 1 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>
                    {t('propertyDetail.allPhotos')} ({sortedImages.length})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setFsIndex(0); setFsVisible(true); }}>
                  <Text style={styles.linkTxt}>{t('propertyDetail.seeAll')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {sortedImages.map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { setFsIndex(i); setFsVisible(true); }}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: img.imageUrl }}
                      style={styles.galleryThumb}
                      resizeMode="cover"
                    />
                    {img.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeTxt}>{t('propertyDetail.main')}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Video Walkthrough ── */}
          <VideoWalkthrough
            videoUrl={listing.videoUrl}
            thumbnailUrl={listing.videoThumbnailUrl}
            fallbackImage={primaryImageUrl}
            t={t}
          />

          {/* ── Floor Plan ── */}
          {!!listing.floorPlanUrl && (
            <FloorPlan floorPlanUrl={listing.floorPlanUrl} t={t} />
          )}

          {/* ── Escrow Protection ── */}
          <TouchableOpacity style={styles.escrowCard} activeOpacity={0.85}>
            <View style={styles.escrowIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color={PURPLE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.escrowTitle}>{t('propertyDetail.escrowTitle')}</Text>
              <Text style={styles.escrowDesc}>{t('propertyDetail.escrowDesc')}</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#C0C0C0" />
          </TouchableOpacity>

          {/* ── Neighborhood ── */}
          {nearbyPlaces.length > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionDot} />
                  <Text style={styles.sectionTitle}>{t('propertyDetail.neighborhood')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/neighborhoodmap', params: { listingId: String(listing.id) } } as any)}>
                  <Text style={styles.linkTxt}>{t('propertyDetail.viewMap')}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mapPlaceholder}>
                <View style={styles.mapPill}>
                  <Ionicons name="location-outline" size={14} color={PURPLE} />
                  <Text style={styles.mapPillTxt}>{t('propertyDetail.interactiveMap')}</Text>
                </View>
              </View>

              {nearbyPlaces.map((n, i) => (
                <View key={i} style={styles.nearbyRow}>
                  <View style={styles.nearbyIcon}>
                    <Feather name={n.icon as any} size={15} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nearbyLabel}>{n.label}</Text>
                    {n.example ? (
                      <Text style={styles.nearbyExample}>{n.example}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Agent ── */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{t('propertyDetail.listedBy')}</Text>
            </View>
            <View style={styles.agentCard}>
              <View style={styles.agentAvatarWrap}>
                {listing.agent?.avatarUrl ? (
                  <Image source={{ uri: listing.agent.avatarUrl }} style={styles.agentAvatar} />
                ) : (
                  <View style={[styles.agentAvatar, styles.agentAvatarPlaceholder]}>
                    <Feather name="user" size={24} color={PURPLE} />
                  </View>
                )}
                {listing.status === 'Approved' && (
                  <View style={styles.agentVerifiedDot}>
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </View>
                )}
              </View>

              <View style={styles.agentInfo}>
                <Text style={styles.agentName} numberOfLines={1}>
                  {listing.agent?.name ?? t('propertyDetail.propertyAgent')}
                </Text>
                <View style={styles.agentLocationRow}>
                  <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.agentLocationTxt} numberOfLines={1}>
                    {[
                      listing.agent?.street,
                      listing.agent?.city,
                      listing.agent?.region,
                      listing.agent?.country,
                    ].filter(Boolean).join(', ') || listing.city}
                  </Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Bottom CTA bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.contactBtn}
          onPress={handleContact}
          disabled={contacting}
        >
          <Feather name="message-square" size={16} color={PURPLE} />
          <Text style={styles.contactBtnTxt}>{t('propertyDetail.message')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookBtn} activeOpacity={0.88}>
          <Ionicons name="call-outline" size={16} color="#fff" />
          <Text style={styles.bookBtnTxt}>{t('propertyDetail.applyAndBook')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, backgroundColor: '#fff' },
  loadingTxt: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  errorTxt: { fontSize: 14, color: '#DC2626', textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 8, backgroundColor: PURPLE, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  backLinkTxt: { fontSize: 13, color: PURPLE, fontWeight: '600' },

  heroWrap: { width, height: IMG_H, position: 'relative', backgroundColor: '#F3F4F6' },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroImg: { width, height: IMG_H },
  heroOverlay: {
    position: 'absolute', top: 52, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  heroRightBtns: { flexDirection: 'row', gap: 8 },
  heroBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  verifiedBadge: {
    position: 'absolute', top: 108, left: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PURPLE, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  verifiedTxt: { fontSize: 11, fontWeight: '700', color: '#fff' },
  dotRow: {
    position: 'absolute', bottom: 12, width: '100%',
    flexDirection: 'row', justifyContent: 'center', gap: 5, zIndex: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  photoBadge: {
    position: 'absolute', bottom: 12, right: 14, zIndex: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  photoBadgeTxt: { fontSize: 10.5, fontWeight: '600', color: '#fff' },

  fsContainer: { flex: 1, backgroundColor: '#000', paddingTop: 48 },
  fsClose: {
    position: 'absolute', top: 52, right: 16, zIndex: 20,
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  fsCounter: {
    position: 'absolute', top: 60, alignSelf: 'center', zIndex: 15,
    color: '#fff', fontSize: 13, fontWeight: '600', opacity: 0.8,
  },
  fsThumbs: { paddingHorizontal: 12, paddingVertical: 14, gap: 8 },
  fsThumb: { width: 64, height: 64, borderRadius: 10, opacity: 0.6 },
  fsThumbActive: { opacity: 1, borderWidth: 2.5, borderColor: PURPLE },

  body: { paddingHorizontal: H_PAD, paddingTop: 20 },

  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  propTitle: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.4, marginBottom: 6, lineHeight: 26 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationTxt: { fontSize: 12.5, color: '#9CA3AF', flex: 1 },
  price: { fontSize: 20, fontWeight: '800', color: PURPLE, letterSpacing: -0.5 },
  priceSub: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 2 },

  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: PURPLE_BORDER,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  typeChipTxt: { fontSize: 11.5, fontWeight: '700', color: PURPLE },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 16,
  },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statVal: { fontSize: 15, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 8, color: '#B0B0B0', fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },

  rentalCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PURPLE_LIGHT, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: PURPLE_BORDER, marginBottom: 22,
  },
  rentalLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rentalLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  rentalVal: { fontSize: 13, fontWeight: '700', color: '#111' },
  applyBtn: { backgroundColor: PURPLE, borderRadius: 30, paddingHorizontal: 16, paddingVertical: 9 },
  applyBtnTxt: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  sectionBlock: { marginBottom: 22 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionDot: { width: 4, height: 18, borderRadius: 2, backgroundColor: PURPLE },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: '#111', letterSpacing: -0.2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkTxt: { fontSize: 12.5, color: PURPLE, fontWeight: '600' },
  description: { fontSize: 13.5, color: '#6B7280', lineHeight: 22 },

  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facilityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PURPLE_LIGHT, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  facilityTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },

  galleryThumb: {
    width: 110, height: 78, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#F0F0F0',
  },
  primaryBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: PURPLE, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  primaryBadgeTxt: { fontSize: 9, fontWeight: '700', color: '#fff' },

  videoWrap: {
    width: '100%', height: 190, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  videoThumb: { position: 'absolute', width: '100%', height: '100%' },
  videoThumbPlaceholder: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#1F2937' },
  videoOverlay: {
    position: 'absolute', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  playBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  playBtnDisabled: { backgroundColor: 'rgba(124,58,237,0.45)' },
  videoPill: {
    position: 'absolute', bottom: 12, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  videoPillTxt: { fontSize: 11, color: '#fff', fontWeight: '600' },

  floorPlanWrap: {
    width: '100%', backgroundColor: '#F9FAFB', borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10,
  },
  floorPlanImg: { width: '100%', height: 220 },
  floorPlanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, marginBottom: 4,
  },
  floorPlanBadgeTxt: { fontSize: 11.5, color: PURPLE, fontWeight: '600' },

  escrowCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#EFEFEF', marginBottom: 22,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  escrowIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  escrowTitle: { fontSize: 13.5, fontWeight: '700', color: '#111', marginBottom: 4 },
  escrowDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  mapPlaceholder: {
    width: '100%', height: 130, backgroundColor: '#F3F4F6',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  mapPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  mapPillTxt: { fontSize: 13, fontWeight: '600', color: PURPLE },

  nearbyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  nearbyIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center',
  },
  nearbyLabel: { fontSize: 13.5, fontWeight: '600', color: '#111' },
  nearbyExample: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

  agentCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#FAFAFA', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: '#F0F0F0',
  },
  agentAvatarWrap: { position: 'relative' },
  agentAvatar: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2.5, borderColor: PURPLE_BORDER,
  },
  agentAvatarPlaceholder: { backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  agentVerifiedDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FAFAFA',
    alignItems: 'center', justifyContent: 'center',
  },
  agentInfo: { flex: 1, gap: 6 },
  agentName: { fontSize: 15, fontWeight: '800', color: '#111', letterSpacing: -0.2 },
  agentLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentLocationTxt: { fontSize: 12.5, color: '#9CA3AF', flex: 1 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: H_PAD, paddingBottom: 34, paddingTop: 14,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F5F5F5',
  },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: PURPLE, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  contactBtnTxt: { fontSize: 13.5, fontWeight: '700', color: PURPLE },
  bookBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#6D28D9', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#6D28D9', shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  bookBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  videoStopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 8,
  },
  videoStopBtnTxt: { fontSize: 12.5, color: PURPLE, fontWeight: '600' },
});