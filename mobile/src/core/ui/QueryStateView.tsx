import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme/useTheme';

type QueryStateViewProps<T> = {
  status: 'pending' | 'error' | 'success';
  isEmpty: boolean;
  onRetry: () => void;
  skeleton: ReactNode;
  emptyState: ReactNode;
  errorMessage: string;
  children: (data: T) => ReactNode;
  data: T | undefined;
};

export function QueryStateView<T>({
  status,
  isEmpty,
  onRetry,
  skeleton,
  emptyState,
  errorMessage,
  children,
  data,
}: QueryStateViewProps<T>) {
  const { colors, radii, typography, spacing } = useTheme();

  if (status === 'pending') {
    return <>{skeleton}</>;
  }

  if (status === 'error') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing(6),
          gap: spacing(4),
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.md,
            textAlign: 'center',
          }}
        >
          {errorMessage}
        </Text>
        <Pressable
          onPress={onRetry}
          style={{
            backgroundColor: colors.accent,
            borderRadius: radii.md,
            paddingVertical: spacing(3),
            paddingHorizontal: spacing(6),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.md,
            }}
          >
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isEmpty) {
    return <>{emptyState}</>;
  }

  return <>{children(data as T)}</>;
}
