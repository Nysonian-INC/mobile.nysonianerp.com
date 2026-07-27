import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirm. RN Alert.alert is unreliable on web (often a no-op
 * for multi-button dialogs), which made the Logout tab appear broken in Expo web.
 * Resolves `true` if the user confirms, `false` if they cancel.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'OK',
): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { confirm?: (msg: string) => boolean }).confirm === 'function'
        ? (globalThis as { confirm: (msg: string) => boolean }).confirm(`${title}\n\n${message}`)
        : true;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
