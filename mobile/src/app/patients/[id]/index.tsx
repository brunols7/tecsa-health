import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { Biomarker } from '@/core/api/schemas/biomarker';
import type { Patient } from '@/core/api/schemas/patient';
import { useIsOffline } from '@/core/offline/network';
import { usePatientBiomarkersQuery } from '@/core/patients/usePatientBiomarkersQuery';
import { usePatientDetailQuery } from '@/core/patients/usePatientDetailQuery';
import { useSetFollowUpMutation } from '@/core/patients/useSetFollowUpMutation';
import { useTheme } from '@/core/theme/useTheme';
import { AiActionsSection } from '@/core/ui/AiActionsSection';

const ERROR_MESSAGE = 'Não foi possível carregar o paciente.';
const OFFLINE_ERROR_MESSAGE =
  'Sem conexão. Abra este paciente pelo menos uma vez online para poder consultá-lo offline.';
const EMPTY_BIOMARKERS_MESSAGE = 'Nenhum biomarcador registrado ainda';

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

function PatientHeader({
  patient,
  onToggleFollowUp,
  toggleDisabled,
}: {
  patient: Patient;
  onToggleFollowUp: (value: boolean) => void;
  toggleDisabled: boolean;
}) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing(4),
        gap: spacing(2),
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.scale.lg,
        }}
      >
        {patient.name}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.sm,
        }}
      >
        {patient.goal}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(2) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.sm,
          }}
        >
          Acompanhamento
        </Text>
        <Switch
          testID="follow-up-toggle"
          value={patient.needsFollowUp}
          disabled={toggleDisabled}
          onValueChange={onToggleFollowUp}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      </View>
    </View>
  );
}

function biomarkerStatusColor(status: Biomarker['status'], colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'high') {
    return colors.danger;
  }
  if (status === 'low') {
    return colors.warning;
  }
  return colors.success;
}

function BiomarkerRow({ biomarker }: { biomarker: Biomarker }) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing(3),
        gap: spacing(1),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.md,
          }}
        >
          {biomarker.label}
        </Text>
        <View
          testID={`biomarker-status-${biomarker.id}`}
          style={{
            backgroundColor: biomarkerStatusColor(biomarker.status, colors),
            borderRadius: radii.pill,
            paddingVertical: spacing(1),
            paddingHorizontal: spacing(2),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.xs,
            }}
          >
            {biomarker.status}
          </Text>
        </View>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.sm,
        }}
      >
        {biomarker.value} {biomarker.unit} (ref. {biomarker.refMin}–{biomarker.refMax})
      </Text>
    </View>
  );
}

function BiomarkersSection({
  patientId,
  biomarkers,
}: {
  patientId: string;
  biomarkers: Biomarker[];
}) {
  const { colors, radii, typography, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ gap: spacing(3) }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.scale.lg,
          }}
        >
          Biomarcadores
        </Text>
        <Pressable
          testID="biomarkers-add-button"
          onPress={() => router.push(`/patients/${patientId}/biomarkers/new`)}
          style={{
            backgroundColor: colors.accent,
            borderRadius: radii.md,
            paddingVertical: spacing(2),
            paddingHorizontal: spacing(4),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.sm,
            }}
          >
            + Adicionar
          </Text>
        </Pressable>
      </View>
      {biomarkers.length === 0 ? (
        <BiomarkersEmptyState />
      ) : (
        <View style={{ gap: spacing(3) }}>
          {biomarkers.map((biomarker) => (
            <BiomarkerRow key={biomarker.id} biomarker={biomarker} />
          ))}
        </View>
      )}
    </View>
  );
}

function BiomarkersEmptyState() {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ padding: spacing(4), alignItems: 'center' }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.md,
          textAlign: 'center',
        }}
      >
        {EMPTY_BIOMARKERS_MESSAGE}
      </Text>
    </View>
  );
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const patientQuery = usePatientDetailQuery(id);
  const biomarkersQuery = usePatientBiomarkersQuery(id);
  const mutation = useSetFollowUpMutation();
  const isOffline = useIsOffline();

  const isOfflineWithoutCache =
    isOffline && (patientQuery.data === undefined || biomarkersQuery.data === undefined);

  const status: 'pending' | 'error' | 'success' =
    patientQuery.status === 'error' || biomarkersQuery.status === 'error' || isOfflineWithoutCache
      ? 'error'
      : patientQuery.status === 'pending' || biomarkersQuery.status === 'pending'
        ? 'pending'
        : 'success';

  const handleRetry = () => {
    patientQuery.refetch();
    biomarkersQuery.refetch();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {status === 'pending' ? <DetailSkeleton /> : null}
      {status === 'error' ? (
        <DetailErrorView
          message={isOfflineWithoutCache ? OFFLINE_ERROR_MESSAGE : ERROR_MESSAGE}
          onRetry={handleRetry}
        />
      ) : null}
      {status === 'success' && patientQuery.data && biomarkersQuery.data ? (
        <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
          <PatientHeader
            patient={patientQuery.data}
            toggleDisabled={mutation.isPending}
            onToggleFollowUp={(value) => mutation.mutate({ id, needsFollowUp: value })}
          />
          <BiomarkersSection patientId={id} biomarkers={biomarkersQuery.data} />
          <AiActionsSection patientId={id} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
