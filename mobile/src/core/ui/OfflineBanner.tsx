import { Text, View } from 'react-native';

import { useIsOffline } from '@/core/offline/network';
import { useTheme } from '@/core/theme/useTheme';

export function OfflineBanner() {
  const isOffline = useIsOffline();
  const { colors, typography, spacing } = useTheme();

  if (!isOffline) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.warning,
        paddingVertical: spacing(2),
        paddingHorizontal: spacing(4),
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.scale.sm,
          textAlign: 'center',
        }}
      >
        Você está offline. Mostrando os dados salvos no dispositivo.
      </Text>
    </View>
  );
}
