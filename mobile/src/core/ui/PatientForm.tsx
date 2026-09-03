import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import type { Patient } from '@/core/api/schemas/patient';
import { patientGoalSchema } from '@/core/api/schemas/patient';
import { brDateToIso, formatDateBR, maskBirthDateInput } from '@/core/patients/date';
import { GOAL_LABELS } from '@/core/patients/labels';
import { useTheme } from '@/core/theme/useTheme';

const BIRTH_DATE_FORMAT_ERROR = 'Use o formato DD/MM/AAAA (dia/mês/ano)';
const NAME_REQUIRED_ERROR = 'Informe o nome do paciente';
const GOAL_REQUIRED_ERROR = 'Selecione um objetivo';

const patientFormSchema = z
  .object({
    name: z.string().trim().min(1, NAME_REQUIRED_ERROR),
    birthDate: z
      .string()
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, BIRTH_DATE_FORMAT_ERROR)
      .transform((value) => brDateToIso(value)),
    goal: patientGoalSchema.optional(),
  })
  .refine((data): data is { name: string; birthDate: string; goal: Patient['goal'] } => data.goal !== undefined, {
    message: GOAL_REQUIRED_ERROR,
    path: ['goal'],
  });

type PatientFormFieldValues = z.input<typeof patientFormSchema>;
export type PatientFormValues = z.output<typeof patientFormSchema>;

const GOAL_OPTIONS = Object.keys(GOAL_LABELS) as Patient['goal'][];

function toFieldValues(initialValues: PatientFormValues): PatientFormFieldValues {
  return { ...initialValues, birthDate: formatDateBR(initialValues.birthDate) };
}

export function PatientForm({
  mode,
  initialValues,
  onSubmit,
  submitting,
  fieldErrors,
}: {
  mode: 'create' | 'edit';
  initialValues?: PatientFormValues;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  submitting: boolean;
  fieldErrors?: Partial<Record<keyof PatientFormValues, string>>;
}) {
  const { colors, radii, typography, spacing } = useTheme();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormFieldValues, unknown, PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: initialValues ? toFieldValues(initialValues) : { name: '', birthDate: '', goal: undefined },
  });

  const nameError = errors.name?.message ?? fieldErrors?.name;
  const birthDateError = errors.birthDate?.message ?? fieldErrors?.birthDate;
  const goalError = errors.goal?.message ?? fieldErrors?.goal;

  const nameValue = useWatch({ control, name: 'name' });
  const nameFilled = Boolean(nameValue?.trim());
  const submitDisabled = submitting || !nameFilled;

  return (
    <View testID="patient-form" style={{ gap: spacing(4) }}>
      <View style={{ gap: spacing(1) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.sm,
          }}
        >
          Nome
        </Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              testID="patient-form-name-input"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Nome do paciente"
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
          )}
        />
        {nameError ? (
          <Text
            testID="patient-form-name-error"
            style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.xs }}
          >
            {nameError}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing(1) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.sm,
          }}
        >
          Data de nascimento (DD/MM/AAAA)
        </Text>
        <Controller
          control={control}
          name="birthDate"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              testID="patient-form-birthdate-input"
              value={value}
              onChangeText={(text) => onChange(maskBirthDateInput(text))}
              onBlur={onBlur}
              placeholder="15/03/1990"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={10}
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
          )}
        />
        {birthDateError ? (
          <Text
            testID="patient-form-birthdate-error"
            style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.xs }}
          >
            {birthDateError}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing(1) }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.sm,
          }}
        >
          Objetivo
        </Text>
        <Controller
          control={control}
          name="goal"
          render={({ field: { value, onChange } }) => (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
              {GOAL_OPTIONS.map((goalOption) => {
                const selected = value === goalOption;

                return (
                  <Pressable
                    key={goalOption}
                    testID={`patient-form-goal-${goalOption}`}
                    onPress={() => onChange(goalOption)}
                    style={{
                      backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                      borderRadius: radii.pill,
                      paddingVertical: spacing(3),
                      paddingHorizontal: spacing(5),
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? colors.accentContrast : colors.textSecondary,
                        fontFamily: typography.fontFamily.medium,
                        fontSize: typography.scale.sm,
                      }}
                    >
                      {GOAL_LABELS[goalOption]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
        {goalError ? (
          <Text
            testID="patient-form-goal-error"
            style={{ color: colors.danger, fontFamily: typography.fontFamily.regular, fontSize: typography.scale.xs }}
          >
            {goalError}
          </Text>
        ) : null}
      </View>

      <Pressable
        testID="patient-form-submit"
        disabled={submitDisabled}
        onPress={handleSubmit(onSubmit)}
        style={{
          backgroundColor: submitDisabled ? colors.surfaceMuted : colors.accent,
          borderRadius: radii.md,
          paddingVertical: spacing(3),
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: colors.accentContrast,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.md,
          }}
        >
          {mode === 'create' ? 'Cadastrar paciente' : 'Salvar alterações'}
        </Text>
      </Pressable>
    </View>
  );
}
