import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, EllipsisVertical, Sparkles, User } from 'lucide-react-native';

import { useFlag } from '@/core/flags/useFlag';
import { useIsOffline } from '@/core/offline/network';
import { useAiActionsQuery } from '@/core/patients/useAiActionsQuery';
import { useDeletePatientMutation } from '@/core/patients/useDeletePatientMutation';
import { usePatientDetailQuery } from '@/core/patients/usePatientDetailQuery';
import { useTheme } from '@/core/theme/useTheme';
import { PatientDetailMenuSheet } from '@/core/ui/PatientDetailMenuSheet';

const ERROR_MESSAGE = 'Não foi possível carregar o paciente.';
const OFFLINE_ERROR_MESSAGE =
  'Sem conexão. Abra este paciente pelo menos uma vez online para poder consultá-lo offline.';

function DetailSkeleton() {
  const { colors, radii, spacing } = useTheme();

  return (
    <View testID="patient-detail-skeleton" style={{ padding: spacing(4), gap: spacing(3) }}>
      <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: radii.md, height: spacing(16) }} />
      {[0, 1, 2].map((key) => (
        <View
          key={key}
          style={{ backgroundColor: colors.surfaceMuted, borderRadius: radii.md, height: spacing(12) }}
        />
      ))}
    </View>
  );
}

function DetailErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(6), gap: spacing(4) }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.md,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      <Pressable
        testID="patient-detail-retry"
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

export default function PatientTabsLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const patientQuery = usePatientDetailQuery(id);
  const deleteMutation = useDeletePatientMutation();
  const isOffline = useIsOffline();
  const aiActionsEnabled = useFlag('aiActionsEnabled');
  const aiActionsQuery = useAiActionsQuery(id);
  const hasLoadedAiActions = (aiActionsQuery.data?.length ?? 0) > 0;
  const [menuVisible, setMenuVisible] = useState(false);

  const isOfflineWithoutCache = isOffline && patientQuery.data === undefined;

  const status: 'pending' | 'error' | 'success' =
    patientQuery.status === 'error' || isOfflineWithoutCache
      ? 'error'
      : patientQuery.status === 'pending'
        ? 'pending'
        : 'success';

  const patientName = patientQuery.data?.name;

  const handleDelete = () => {
    if (patientName === undefined) {
      return;
    }

    Alert.alert(`Excluir ${patientName}?`, 'Esta ação remove o paciente da carteira.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(id, {
            onSuccess: () => {
              setMenuVisible(false);
              router.back();
            },
          });
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {status === 'pending' ? (
        <SafeAreaView style={{ flex: 1 }}>
          <DetailSkeleton />
        </SafeAreaView>
      ) : null}
      {status === 'error' ? (
        <SafeAreaView style={{ flex: 1 }}>
          <DetailErrorView
            message={isOfflineWithoutCache ? OFFLINE_ERROR_MESSAGE : ERROR_MESSAGE}
            onRetry={() => patientQuery.refetch()}
          />
        </SafeAreaView>
      ) : null}
      {status === 'success' ? (
        <Tabs
          screenOptions={{
            headerShown: true,
            headerTitle: patientName,
            headerStyle: { backgroundColor: colors.surface },
            headerTitleStyle: {
              color: colors.textPrimary,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.scale.lg,
            },
            headerLeftContainerStyle: { paddingLeft: spacing(4) },
            headerRightContainerStyle: { paddingRight: spacing(4) },
            headerLeft: () => (
              <Pressable testID="patient-detail-back-button" onPress={() => router.back()} hitSlop={8}>
                <ArrowLeft color={colors.textPrimary} size={22} />
              </Pressable>
            ),
            headerRight: () => (
              <Pressable testID="patient-detail-menu-trigger" onPress={() => setMenuVisible(true)} hitSlop={8}>
                <EllipsisVertical color={colors.textPrimary} size={22} />
              </Pressable>
            ),
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
            tabBarLabelStyle: { fontFamily: typography.fontFamily.medium, fontSize: typography.scale.xs },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Informações',
              tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
            }}
          />
          <Tabs.Screen
            name="follow-up"
            options={{
              title: 'Acompanhamento',
              tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
              href: aiActionsEnabled || hasLoadedAiActions ? undefined : null,
            }}
          />
        </Tabs>
      ) : null}
      <PatientDetailMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onEdit={() => {
          setMenuVisible(false);
          router.push(`/patients/${id}/edit`);
        }}
        onDelete={handleDelete}
        deletePending={deleteMutation.isPending}
        deleteFailed={deleteMutation.isError}
      />
    </View>
  );
}
