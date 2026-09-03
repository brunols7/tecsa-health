import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { createBiomarkerInputSchema } from '@/core/api/schemas/biomarker';
import type { CreateBiomarkerInput } from '@/core/api/schemas/biomarker';
import { computeBiomarkerStatus } from '@/core/patients/biomarkerStatus';
import { useCreateBiomarkerMutation } from '@/core/patients/useCreateBiomarkerMutation';
import { useTheme } from '@/core/theme/useTheme';

const SUBMIT_ERROR_MESSAGE = 'Não foi possível salvar o biomarcador. Tente novamente.';

function todayAsDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function numberFieldToText(value: number): string {
  return Number.isNaN(value) ? '' : String(value);
}

type NumericFieldName = 'value' | 'refMin' | 'refMax';

export function BiomarkerForm({
  patientId,
  onSuccess,
}: {
  patientId: string;
  onSuccess: () => void;
}) {
  const { colors, radii, typography, spacing } = useTheme();
  const mutation = useCreateBiomarkerMutation(patientId);
  const [submitError, setSubmitError] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBiomarkerInput>({
    resolver: zodResolver(createBiomarkerInputSchema),
    defaultValues: {
      label: '',
      value: Number.NaN,
      unit: '',
      refMin: Number.NaN,
      refMax: Number.NaN,
      measuredAt: todayAsDateString(),
    },
  });

  const watchedValue = useWatch({ control, name: 'value' });
  const watchedRefMin = useWatch({ control, name: 'refMin' });
  const watchedRefMax = useWatch({ control, name: 'refMax' });
  const hasValidRange =
    !Number.isNaN(watchedValue) && !Number.isNaN(watchedRefMin) && !Number.isNaN(watchedRefMax);
  const statusPreview = hasValidRange
    ? computeBiomarkerStatus(watchedValue, watchedRefMin, watchedRefMax)
    : undefined;

  const onSubmit = (data: CreateBiomarkerInput) => {
    setSubmitError(false);
    mutation.mutate(data, {
      onSuccess: () => onSuccess(),
      onError: () => setSubmitError(true),
    });
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.scale.md,
  };

  const errorTextStyle = {
    color: colors.danger,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.scale.xs,
  };

  const labelStyle = {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.scale.sm,
  };

  function renderNumericField(name: NumericFieldName, label: string, testID: string) {
    return (
      <View style={{ gap: spacing(1) }}>
        <Text style={labelStyle}>{label}</Text>
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <TextInput
              testID={testID}
              value={numberFieldToText(field.value)}
              onChangeText={(text) => field.onChange(text === '' ? Number.NaN : Number(text))}
              keyboardType="numeric"
              style={inputStyle}
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors[name] ? (
          <Text testID={`${testID}-error`} style={errorTextStyle}>
            {errors[name]?.message}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing(4) }}>
      <View style={{ gap: spacing(1) }}>
        <Text style={labelStyle}>Nome</Text>
        <Controller
          control={control}
          name="label"
          render={({ field }) => (
            <TextInput
              testID="biomarker-form-label-input"
              value={field.value}
              onChangeText={field.onChange}
              style={inputStyle}
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.label ? (
          <Text testID="biomarker-form-label-input-error" style={errorTextStyle}>
            {errors.label.message}
          </Text>
        ) : null}
      </View>

      {renderNumericField('value', 'Valor', 'biomarker-form-value-input')}

      <View style={{ gap: spacing(1) }}>
        <Text style={labelStyle}>Unidade</Text>
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <TextInput
              testID="biomarker-form-unit-input"
              value={field.value}
              onChangeText={field.onChange}
              style={inputStyle}
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.unit ? (
          <Text testID="biomarker-form-unit-input-error" style={errorTextStyle}>
            {errors.unit.message}
          </Text>
        ) : null}
      </View>

      {renderNumericField('refMin', 'Faixa mínima', 'biomarker-form-ref-min-input')}
      {renderNumericField('refMax', 'Faixa máxima', 'biomarker-form-ref-max-input')}

      <View style={{ gap: spacing(1) }}>
        <Text style={labelStyle}>Data da medição</Text>
        <Controller
          control={control}
          name="measuredAt"
          render={({ field }) => (
            <TextInput
              testID="biomarker-form-measured-at-input"
              value={field.value}
              onChangeText={field.onChange}
              style={inputStyle}
              placeholderTextColor={colors.textSecondary}
            />
          )}
        />
        {errors.measuredAt ? (
          <Text testID="biomarker-form-measured-at-input-error" style={errorTextStyle}>
            {errors.measuredAt.message}
          </Text>
        ) : null}
      </View>

      {statusPreview ? (
        <View
          testID="biomarker-form-status-preview"
          style={{
            alignSelf: 'flex-start',
            backgroundColor:
              statusPreview === 'high'
                ? colors.danger
                : statusPreview === 'low'
                  ? colors.warning
                  : colors.success,
            borderRadius: radii.pill,
            paddingVertical: spacing(1),
            paddingHorizontal: spacing(3),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.xs,
            }}
          >
            {statusPreview}
          </Text>
        </View>
      ) : null}

      <Pressable
        testID="biomarker-form-submit"
        disabled={mutation.isPending}
        onPress={handleSubmit(onSubmit)}
        style={{
          backgroundColor: mutation.isPending ? colors.surfaceMuted : colors.accent,
          borderRadius: radii.md,
          paddingVertical: spacing(3),
          alignItems: 'center',
        }}
      >
        {mutation.isPending ? (
          <ActivityIndicator testID="biomarker-form-submit-loading" color={colors.accentContrast} />
        ) : (
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.md,
            }}
          >
            Salvar biomarcador
          </Text>
        )}
      </Pressable>

      {submitError ? (
        <View style={{ gap: spacing(2) }}>
          <Text testID="biomarker-form-submit-error" style={errorTextStyle}>
            {SUBMIT_ERROR_MESSAGE}
          </Text>
          <Pressable
            testID="biomarker-form-retry"
            onPress={handleSubmit(onSubmit)}
            style={{
              alignSelf: 'flex-start',
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing(2),
              paddingHorizontal: spacing(4),
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.scale.sm,
              }}
            >
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
