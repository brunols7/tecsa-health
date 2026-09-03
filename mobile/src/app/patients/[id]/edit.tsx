import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { UpdatePatientInput } from '@/core/api/patients';
import { ApiError } from '@/core/api/http';
import { usePatientDetailQuery } from '@/core/patients/usePatientDetailQuery';
import { useUpdatePatientMutation } from '@/core/patients/useUpdatePatientMutation';
import { useTheme } from '@/core/theme/useTheme';
import { PatientForm } from '@/core/ui/PatientForm';
import type { PatientFormValues } from '@/core/ui/PatientForm';

const LOADING_MESSAGE = 'Carregando dados do paciente...';
const ERROR_MESSAGE = 'Não foi possível carregar o paciente.';
const NETWORK_ERROR_MESSAGE =
  'Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.';
const NOT_FOUND_MESSAGE = 'Paciente não encontrado. Ele pode ter sido excluído.';

function diffValues(
  initialValues: PatientFormValues,
  values: PatientFormValues,
): UpdatePatientInput {
  const fields: UpdatePatientInput = {};

  if (values.name !== initialValues.name) {
    fields.name = values.name;
  }
  if (values.birthDate !== initialValues.birthDate) {
    fields.birthDate = values.birthDate;
  }
  if (values.goal !== initialValues.goal) {
    fields.goal = values.goal;
  }

  return fields;
}

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radii, typography, spacing } = useTheme();
  const router = useRouter();
  const patientQuery = usePatientDetailQuery(id);
  const mutation = useUpdatePatientMutation();
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PatientFormValues, string>>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const handleSubmit = async (initialValues: PatientFormValues, values: PatientFormValues) => {
    setFieldErrors({});
    setFormError(undefined);

    const fields = diffValues(initialValues, values);

    try {
      await mutation.mutateAsync({ id, fields });
      router.back();
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({
          name: error.details?.name?.[0],
          birthDate: error.details?.birthDate?.[0],
          goal: error.details?.goal?.[0],
        });
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setFormError(NOT_FOUND_MESSAGE);
        router.replace('/');
        return;
      }

      setFormError(NETWORK_ERROR_MESSAGE);
    }
  };

  return (
    <SafeAreaView testID="patient-edit-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing(4), gap: spacing(4) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.bold,
            fontSize: typography.scale.lg,
          }}
        >
          Editar paciente
        </Text>

        {patientQuery.status === 'pending' ? (
          <Text
            testID="patient-edit-loading"
            style={{ color: colors.textSecondary, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.md }}
          >
            {LOADING_MESSAGE}
          </Text>
        ) : null}

        {patientQuery.status === 'error' ? (
          <View style={{ gap: spacing(3) }}>
            <Text
              testID="patient-edit-load-error"
              style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.md }}
            >
              {ERROR_MESSAGE}
            </Text>
            <Pressable
              testID="patient-edit-retry"
              onPress={() => patientQuery.refetch()}
              style={{ backgroundColor: colors.accent, borderRadius: radii.md, paddingVertical: spacing(3), alignItems: 'center' }}
            >
              <Text style={{ color: colors.accentContrast, fontFamily: typography.fontFamily.medium, fontSize: typography.scale.md }}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        ) : null}

        {patientQuery.status === 'success' && patientQuery.data ? (
          <>
            {formError ? (
              <Text
                testID="patient-edit-form-error"
                style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.sm }}
              >
                {formError}
              </Text>
            ) : null}
            <PatientForm
              mode="edit"
              initialValues={{
                name: patientQuery.data.name,
                birthDate: patientQuery.data.birthDate,
                goal: patientQuery.data.goal,
              }}
              onSubmit={(values) =>
                handleSubmit(
                  {
                    name: patientQuery.data!.name,
                    birthDate: patientQuery.data!.birthDate,
                    goal: patientQuery.data!.goal,
                  },
                  values,
                )
              }
              submitting={mutation.isPending}
              fieldErrors={fieldErrors}
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
