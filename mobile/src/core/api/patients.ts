import { z } from 'zod';

import { apiGet, apiPatch } from '@/core/api/http';
import { biomarkerSchema } from '@/core/api/schemas/biomarker';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import { patientPageSchema, patientSchema } from '@/core/api/schemas/patient';
import type { Patient, PatientPage } from '@/core/api/schemas/patient';

export async function fetchPatients(
  brandId: string,
  search: string | undefined,
  cursor: string | undefined,
): Promise<PatientPage> {
  const raw = await apiGet('/api/v1/patients', {
    brand: brandId,
    ...(search ? { search } : {}),
    ...(cursor ? { cursor } : {}),
  });

  return patientPageSchema.parse(raw);
}

export async function fetchPatientDetail(id: string): Promise<Patient> {
  const raw = await apiGet(`/api/v1/patients/${id}`);

  return patientSchema.parse(raw);
}

export async function fetchPatientBiomarkers(id: string): Promise<Biomarker[]> {
  const raw = await apiGet(`/api/v1/patients/${id}/biomarkers`);

  return z.array(biomarkerSchema).parse(raw);
}

export async function patchPatientFollowUp(id: string, needsFollowUp: boolean): Promise<Patient> {
  const raw = await apiPatch(`/api/v1/patients/${id}`, { needsFollowUp });

  return patientSchema.parse(raw);
}
