import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import type { Patient } from '@/core/api/schemas/patient';
import { patientGoalSchema } from '@/core/api/schemas/patient';
import { GOAL_LABELS } from '@/core/patients/labels';
import { useTheme } from '@/core/theme/useTheme';

const BIRTH_DATE_FORMAT_ERROR = 'Use o formato AAAA-MM-DD (ano-mês-dia)';
const NAME_REQUIRED_ERROR = 'Informe o nome do paciente';
const GOAL_REQUIRED_ERROR = 'Selecione um objetivo';

const patientFormSchema = z
  .object({
    name: z.string().trim().min(1, NAME_REQUIRED_ERROR),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, BIRTH_DATE_FORMAT_ERROR),
    goal: patientGoalSchema.optional(),
  })
  .refine((data): data is { name: string; birthDate: string; goal: Patient['goal'] } => data.goal !== undefined, {
    message: GOAL_REQUIRED_ERROR,
    path: ['goal'],
  });

type PatientFormFieldValues = z.input<typeof patientFormSchema>;
export type PatientFormValues = z.output<typeof patientFormSchema>;

const GOAL_OPTIONS = Object.keys(GOAL_LABELS) as Patient['goal'][];

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
    defaultValues: initialValues ?? { name: '', birthDate: '', goal: undefined },
  });

  const nameError = errors.name?.message ?? fieldErrors?.name;
  const birthDateError = errors.birthDate?.message ?? fieldErrors?.birthDate;
  const goalError = errors.goal?.message ?? fieldErrors?.goal;

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
          Data de nascimento (AAAA-MM-DD)
        </Text>
        <Controller
          control={control}
          name="birthDate"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              testID="patient-form-birthdate-input"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="1990-01-01"
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
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
                      paddingVertical: spacing(1),
                      paddingHorizontal: spacing(3),
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? colors.accentContrast : colors.textSecondary,
                        fontFamily: typography.fontFamily.medium,
                        fontSize: typography.scale.xs,
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
        disabled={submitting}
        onPress={handleSubmit(onSubmit)}
        style={{
          backgroundColor: submitting ? colors.surfaceMuted : colors.accent,
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
