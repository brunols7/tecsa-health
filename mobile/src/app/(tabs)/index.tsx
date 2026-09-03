import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Filter, Plus } from 'lucide-react-native';

import type { Patient } from '@/core/api/schemas/patient';
import { calculateAge } from '@/core/patients/date';
import { GOAL_LABELS } from '@/core/patients/labels';
import { useDebouncedValue } from '@/core/patients/useDebouncedValue';
import type { PatientStatusFilter } from '@/core/patients/usePatientsQuery';
import { usePatientsQuery } from '@/core/patients/usePatientsQuery';
import { useTheme } from '@/core/theme/useTheme';
import { Badge } from '@/core/ui/Badge';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { PatientStatusFilterSheet } from '@/core/ui/PatientStatusFilterSheet';
import { QueryStateView } from '@/core/ui/QueryStateView';

const ERROR_MESSAGE = 'Não foi possível carregar a carteira de pacientes.';

const FILTER_LABELS: Record<PatientStatusFilter, string> = {
  active: 'Ativos',
  inactive_completed: 'Inativos e concluídos',
};

function PatientCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <Pressable
      testID={`patient-card-${patient.id}`}
      onPress={onPress}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing(4),
        marginHorizontal: spacing(4),
        marginBottom: spacing(3),
        gap: spacing(1),
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.scale.md,
        }}
      >
        {patient.name}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
        <Badge testID={`patient-goal-badge-${patient.id}`} label={GOAL_LABELS[patient.goal]} />
        <Text
          testID={`patient-age-${patient.id}`}
          style={{
            color: colors.textSecondary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.sm,
          }}
        >
          {calculateAge(patient.birthDate)} anos
        </Text>
      </View>
      {patient.needsFollowUp ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: spacing(1),
            paddingHorizontal: spacing(3),
            marginTop: spacing(1),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.xs,
            }}
          >
            Acompanhamento
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PatientsSkeleton() {
  const { colors, radii, spacing } = useTheme();

  return (
    <View testID="patients-skeleton" style={{ padding: spacing(4), gap: spacing(3) }}>
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <View
          key={key}
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.md,
            height: spacing(20),
          }}
        />
      ))}
    </View>
  );
}

function PatientsEmptyState() {
  const { colors, typography, spacing, copy } = useTheme();

  return (
    <View
      testID="patients-empty-default"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing(6),
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
        {copy.emptyPatients}
      </Text>
    </View>
  );
}

function PatientsFilteredEmptyState() {
  const { colors, typography, spacing, copy } = useTheme();

  return (
    <View
      testID="patients-empty-filtered"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing(6),
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.scale.md,
          textAlign: 'center',
        }}
      >
        {copy.emptyFilteredPatients}
      </Text>
    </View>
  );
}

export default function PatientsScreen() {
  const { colors, radii, typography, spacing, copy } = useTheme();
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [statusFilter, setStatusFilter] = useState<PatientStatusFilter>('active');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const query = usePatientsQuery(debouncedSearch, statusFilter);

  const patients = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  );

  const isEmpty = query.status === 'success' && patients.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(4), paddingBottom: spacing(2), gap: spacing(2) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: typography.fontFamily.bold,
                fontSize: typography.scale.lg,
              }}
            >
              {copy.patientsTitle}
            </Text>
            <Text
              testID="patients-active-filter-indicator"
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.sm,
              }}
            >
              {FILTER_LABELS[statusFilter]}
            </Text>
          </View>
          <Pressable
            testID="patients-filter-button"
            onPress={() => setFilterSheetVisible(true)}
            style={{
              padding: spacing(2),
              borderRadius: radii.pill,
              backgroundColor: colors.surface,
              marginRight: spacing(2),
            }}
          >
            <Filter color={colors.textPrimary} size={20} />
          </Pressable>
          <Pressable
            testID="patients-create-button"
            onPress={() => router.push('/patients/new')}
            style={{
              padding: spacing(2),
              borderRadius: radii.pill,
              backgroundColor: colors.accent,
            }}
          >
            <Plus color={colors.accentContrast} size={20} />
          </Pressable>
        </View>
        <TextInput
          testID="patients-search-input"
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar paciente"
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            paddingHorizontal: spacing(4),
            paddingVertical: spacing(3),
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.md,
          }}
        />
      </View>
      <QueryStateView<Patient[]>
        status={query.status}
        isEmpty={isEmpty}
        onRetry={() => query.refetch()}
        skeleton={<PatientsSkeleton />}
        emptyState={
          statusFilter === 'inactive_completed' ? <PatientsFilteredEmptyState /> : <PatientsEmptyState />
        }
        errorMessage={ERROR_MESSAGE}
        data={patients}
      >
        {(data) => (
          // SPEC_DEVIATION: design.md/tasks.md were written against FlashList v1, which required
          // `estimatedItemSize`. The installed `@shopify/flash-list@2.0.2` auto-sizes cells and
          // has removed that prop entirely (absent from FlashListProps.d.ts) - passing it would
          // fail strict TypeScript against a prop the type no longer declares.
          <FlashList
            testID="patients-list"
            data={data}
            keyExtractor={(patient) => patient.id}
            renderItem={({ item }) => (
              <PatientCard
                patient={item}
                onPress={() => router.push(`/patients/${item.id}`)}
              />
            )}
            onEndReached={() => {
              if (query.hasNextPage) {
                query.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
          />
        )}
      </QueryStateView>
      <PatientStatusFilterSheet
        visible={filterSheetVisible}
        current={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setFilterSheetVisible(false)}
      />
    </SafeAreaView>
  );
}
