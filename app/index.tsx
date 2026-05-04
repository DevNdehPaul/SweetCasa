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
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 1000, useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 5, useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1, duration: 500, delay: 100, useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.timing(barWidth, {
        toValue: width * 0.45, duration: 1000, useNativeDriver: false,
      }),
    ]).start(() => {
      router.replace('/portal');
    });
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#B8B0E8" />
        <View style={styles.container}>

          {/* Center content */}
          <View style={styles.center}>
            {/* House Icon */}
            <Animated.View style={[
              styles.iconWrap,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] }
            ]}>
              <Ionicons name="home" size={90} color="#7C6FBF" />
            </Animated.View>

            {/* Sweet Casa text */}
            <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
              <Text style={styles.brandName}>Sweet Casa</Text>
            </Animated.View>

            {/* Tagline */}
            <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center', marginTop: 8 }}>
              <Text style={styles.tagline}>Home Sweet Home</Text>
            </Animated.View>
          </View>

          {/* Progress bar */}
          <View style={styles.bottomArea}>
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
  safe: {
    flex: 1,
    backgroundColor: '#C8C0F0',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 52,
    color: '#5B4FA8',
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: 1,
    textShadowColor: 'rgba(91, 79, 168, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#6B5FC0',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  bottomArea: {
    alignItems: 'center',
  },
  progressTrack: {
    width: width * 0.45,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#5B4FA8',
    borderRadius: 4,
  },
});