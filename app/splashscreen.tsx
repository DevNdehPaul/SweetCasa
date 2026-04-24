import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 6, useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1, duration: 400, delay: 100, useNativeDriver: true,
      }),
      Animated.timing(barWidth, {
        toValue: width * 0.55, duration: 1200, useNativeDriver: false,
      }),
    ]).start(() => {
      router.replace('/login_signup');
    });
  }, []);

  return (
    <>
      {/* Hides the header for this screen */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF6F2" />
        <View style={styles.container}>

          {/* Center content */}
          <View style={styles.center}>
            <Animated.View
              style={[
                styles.logoWrap,
                { opacity: logoOpacity, transform: [{ scale: logoScale }] },
              ]}
            >
              <Ionicons name="home-outline" size={44} color="#fff" />
            </Animated.View>

            <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 28 }}>
              <Text style={styles.tagline}>Home Sweet Home, Securely</Text>
              <View style={styles.taglineUnderline} />
            </Animated.View>
          </View>

          {/* Bottom badge + progress */}
          <View style={styles.bottomArea}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#7C3AED" />
              <Text style={styles.verifiedTxt}>VERIFIED HOUSING</Text>
            </View>

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: barWidth }]} />
            </View>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF6F2' },
  container: { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  logoWrap: {
    width: 88, height: 88,
    borderRadius: 44,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  taglineUnderline: {
    width: 40, height: 2.5,
    backgroundColor: '#C4B5FD',
    borderRadius: 2,
    marginTop: 8,
  },

  bottomArea: { alignItems: 'center', gap: 20 },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  verifiedTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 1,
  },

  progressTrack: {
    width: width * 0.55,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
});