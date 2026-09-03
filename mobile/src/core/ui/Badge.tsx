import { Text, View } from 'react-native';

import { useTheme } from '@/core/theme/useTheme';

export function Badge({ label, testID }: { label: string; testID?: string }) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <View
      testID={testID}
      style={{
        alignSelf: 'flex-start',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.pill,
        paddingVertical: spacing(1),
        paddingHorizontal: spacing(3),
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.scale.xs,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
