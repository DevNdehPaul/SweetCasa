import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

type AuthProfile = {
  id: number
  fullName?: string
  companyName?: string
  name?: string
  email?: string
  phone?: string
  role: 'BUYER' | 'SELLER'
  avatar?: string
  country?: string
  region?: string
  city?: string
  street?: string
  isVerified?: boolean
  isSuspended?: boolean
  createdAt?: string | null
}

type AuthResponse = {
  token: string
  role: 'BUYER' | 'SELLER'
  profile?: Partial<AuthProfile> | null
}

function normalizeProfile(role: 'BUYER' | 'SELLER', profile?: Partial<AuthProfile> | null): AuthProfile {
  const fallbackName =
    (role === 'SELLER' ? profile?.companyName : profile?.fullName) ||
    profile?.name ||
    ''

  return {
    id: Number(profile?.id || 0),
    fullName: role === 'BUYER' ? (profile?.fullName || profile?.name || '') : '',
    companyName: role === 'SELLER' ? (profile?.companyName || profile?.name || '') : '',
    name: profile?.name || fallbackName,
    email: profile?.email || '',
    phone: profile?.phone || '',
    role,
    avatar: profile?.avatar || '',
    country: profile?.country || '',
    region: profile?.region || '',
    city: profile?.city || '',
    street: profile?.street || '',
    isVerified: Boolean(profile?.isVerified),
    isSuspended: Boolean(profile?.isSuspended),
    createdAt: profile?.createdAt || null,
  }
}

export async function persistAuthSession({ token, role, profile }: AuthResponse) {
  const normalizedProfile = normalizeProfile(role, profile)

  await AsyncStorage.multiSet([
    ['token', token],
    ['role', role],
    ['profile', JSON.stringify(normalizedProfile)],
  ])
}

export async function clearAuthSession() {
  await AsyncStorage.multiRemove(['token', 'role', 'profile'])
}

export function routeForRole(role: string | null) {
  return role === 'SELLER' ? '/agent-dashboard' : '/seeker-dashboard'
}

export async function redirectToRoleHome(role: string | null) {
  router.replace(routeForRole(role) as never)
}
