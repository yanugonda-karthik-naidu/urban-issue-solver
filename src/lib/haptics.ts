type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 30, 50, 30, 50],
};

export const triggerHaptic = (type: HapticType = 'medium'): void => {
  // Check if vibration API is available
  if (!('vibrate' in navigator)) {
    return;
  }

  try {
    const pattern = hapticPatterns[type];
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not supported
    console.debug('Haptic feedback not available:', error);
  }
};

export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};
