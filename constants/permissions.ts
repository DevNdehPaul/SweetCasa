import i18next from 'i18next';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Shown when the user has refused access to photos, the camera or the microphone.
 * iOS only asks once, so after a refusal the only way back is the phone's Settings page for
 * the app: this alert explains why the access is needed and opens that page in one tap.
 */
export function alertOpenSettings(title: string, message: string) {
  if (Platform.OS === 'web') {
    // Browsers manage permissions themselves and Alert.alert does nothing on web.
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  const fr = String(i18next?.language || '').toLowerCase().startsWith('fr');
  Alert.alert(title, message, [
    { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
    {
      text: fr ? 'Ouvrir les réglages' : 'Open Settings',
      onPress: () => {
        Linking.openSettings().catch(() => {});
      },
    },
  ]);
}
