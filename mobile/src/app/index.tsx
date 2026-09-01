import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/useTheme';

/**
 * Tela de prova da fronteira de marca (CLAUDE.md §5.2): tudo aqui vem de
 * `useTheme()`. Nenhum literal de cor, raio ou fonte — a única exceção
 * permitida é "transparent". Ver CLAUDE.md §2.1 e §5.2.
 */
export default function BrandProofScreen() {
  const { colors, radii, typography, spacing, assets, displayName, copy } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
        <View style={{ alignItems: 'center', gap: spacing(3) }}>
          <Image
            source={assets.logo}
            style={{ width: spacing(16), height: spacing(16) }}
            resizeMode="contain"
          />
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.scale.display,
            }}
          >
            {displayName}
          </Text>
        </View>

        <View
          testID="brand-proof-accent-block"
          style={{
            backgroundColor: colors.accent,
            borderRadius: radii.md,
            padding: spacing(4),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.md,
            }}
          >
            {copy.aiDisclaimer}
          </Text>
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.sm,
          }}
        >
          {copy.patientsTitle}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
