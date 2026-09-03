import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ApiError } from '@/core/api/http';
import { useCreatePatientMutation } from '@/core/patients/useCreatePatientMutation';
import { useTheme } from '@/core/theme/useTheme';
import { PatientForm } from '@/core/ui/PatientForm';
import type { PatientFormValues } from '@/core/ui/PatientForm';

const NETWORK_ERROR_MESSAGE =
  'Não foi possível cadastrar o paciente. Verifique sua conexão e tente novamente.';

function firstDetailMessage(details: Record<string, string[]> | undefined, field: string): string | undefined {
  return details?.[field]?.[0];
}

export default function NewPatientScreen() {
  const brand = useTheme();
  const { colors, typography, spacing } = brand;
  const router = useRouter();
  const mutation = useCreatePatientMutation();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PatientFormValues, string>>>({});
  const [networkError, setNetworkError] = useState(false);

  const handleSubmit = async (values: PatientFormValues) => {
    setFieldErrors({});
    setNetworkError(false);

    try {
      const patient = await mutation.mutateAsync({ ...values, brand: brand.id });
      router.push(`/patients/${patient.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({
          name: firstDetailMessage(error.details, 'name'),
          birthDate: firstDetailMessage(error.details, 'birthDate'),
          goal: firstDetailMessage(error.details, 'goal'),
        });
        return;
      }

      setNetworkError(true);
    }
  };

  return (
    <SafeAreaView testID="patient-new-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing(4), gap: spacing(4) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.scale.lg,
          }}
        >
          Novo paciente
        </Text>
        {networkError ? (
          <Text
            testID="patient-new-error"
            style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.sm }}
          >
            {NETWORK_ERROR_MESSAGE}
          </Text>
        ) : null}
        <PatientForm
          mode="create"
          onSubmit={handleSubmit}
          submitting={mutation.isPending}
          fieldErrors={fieldErrors}
        />
      </View>
    </SafeAreaView>
  );
}
