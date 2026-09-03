import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { Biomarker } from '@/core/api/schemas/biomarker';
import type { Patient } from '@/core/api/schemas/patient';
import { calculateAge, formatDateBR } from '@/core/patients/date';
import { GOAL_LABELS } from '@/core/patients/labels';
import { useChangePatientStatusMutation } from '@/core/patients/useChangePatientStatusMutation';
import { usePatientBiomarkersQuery } from '@/core/patients/usePatientBiomarkersQuery';
import { usePatientDetailQuery } from '@/core/patients/usePatientDetailQuery';
import { useSetFollowUpMutation } from '@/core/patients/useSetFollowUpMutation';
import { useTheme } from '@/core/theme/useTheme';
import { Badge } from '@/core/ui/Badge';
import { PatientLifecycleActions } from '@/core/ui/PatientLifecycleActions';
import { QueryStateView } from '@/core/ui/QueryStateView';

const BIOMARKERS_ERROR_MESSAGE = 'Não foi possível carregar os biomarcadores.';
const STATUS_CHANGE_ERROR_MESSAGE =
  'Não foi possível atualizar o status. Atualize a tela e tente de novo.';

function BiomarkersSkeleton() {
  const { colors, radii, spacing } = useTheme();

  return (
    <View testID="patient-biomarkers-skeleton" style={{ gap: spacing(3) }}>
      {[0, 1, 2].map((key) => (
        <View
          key={key}
          style={{ backgroundColor: colors.surfaceMuted, borderRadius: radii.md, height: spacing(12) }}
        />
      ))}
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
        <Badge testID="patient-goal-badge" label={GOAL_LABELS[patient.goal]} />
        <Text
          testID="patient-age"
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.sm,
          }}
        >
          {calculateAge(patient.birthDate)} anos
        </Text>
      </View>
      <Text
        testID="patient-birth-date"
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.sm,
        }}
      >
        Nascimento: {formatDateBR(patient.birthDate)}
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
        <Badge testID={`biomarker-status-${biomarker.id}`} label={biomarker.status} />
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

function BiomarkersSectionHeader({ patientId }: { patientId: string }) {
  const { colors, radii, typography, spacing } = useTheme();
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
  );
}

function BiomarkersEmptyState() {
  const { colors, typography, spacing, copy } = useTheme();

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
        {copy.emptyBiomarkers}
      </Text>
    </View>
  );
}

export default function PatientInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const patientQuery = usePatientDetailQuery(id);
  const biomarkersQuery = usePatientBiomarkersQuery(id);
  const mutation = useSetFollowUpMutation();
  const statusMutation = useChangePatientStatusMutation();

  if (patientQuery.data === undefined) {
    return null;
  }

  const patient = patientQuery.data;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(4), gap: spacing(4) }}>
      <PatientHeader
        patient={patient}
        toggleDisabled={mutation.isPending}
        onToggleFollowUp={(value) => mutation.mutate({ id, needsFollowUp: value })}
      />
      <View style={{ gap: spacing(3) }}>
        <BiomarkersSectionHeader patientId={id} />
        <QueryStateView<Biomarker[]>
          status={biomarkersQuery.status}
          isEmpty={(biomarkersQuery.data?.length ?? 0) === 0}
          onRetry={() => biomarkersQuery.refetch()}
          skeleton={<BiomarkersSkeleton />}
          emptyState={<BiomarkersEmptyState />}
          errorMessage={BIOMARKERS_ERROR_MESSAGE}
          data={biomarkersQuery.data}
        >
          {(biomarkers) => (
            <View style={{ gap: spacing(3) }}>
              {biomarkers.map((biomarker) => (
                <BiomarkerRow key={biomarker.id} biomarker={biomarker} />
              ))}
            </View>
          )}
        </QueryStateView>
      </View>
      <View style={{ gap: spacing(2) }}>
        <PatientLifecycleActions
          status={patient.status}
          statusChangedAt={patient.statusChangedAt}
          pending={statusMutation.isPending}
          onChangeStatus={(target) => statusMutation.mutate({ id, status: target })}
        />
        {statusMutation.isError ? (
          <Text
            testID="patient-status-error"
            style={{
              color: colors.danger,
              fontFamily: typography.fontFamily.regular,
              fontSize: typography.scale.xs,
            }}
          >
            {STATUS_CHANGE_ERROR_MESSAGE}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
