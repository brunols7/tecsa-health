import { z } from 'zod';

import { apiDelete, apiGet, apiPatch, apiPost } from '@/core/api/http';
import { biomarkerSchema } from '@/core/api/schemas/biomarker';
import type { Biomarker, CreateBiomarkerInput } from '@/core/api/schemas/biomarker';
import { patientPageSchema, patientSchema } from '@/core/api/schemas/patient';
import type { Patient, PatientPage } from '@/core/api/schemas/patient';

export async function fetchPatients(
  brandId: string,
  search: string | undefined,
  cursor: string | undefined,
  status?: string[],
): Promise<PatientPage> {
  const raw = await apiGet('/api/v1/patients', {
    brand: brandId,
    ...(search ? { search } : {}),
    ...(cursor ? { cursor } : {}),
    ...(status && status.length > 0 ? { status: status.join(',') } : {}),
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

export type CreatePatientInput = {
  name: string;
  birthDate: string;
  goal: Patient['goal'];
  brand: string;
};

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const raw = await apiPost('/api/v1/patients', input);

  return patientSchema.parse(raw);
}

export async function createBiomarker(
  patientId: string,
  input: CreateBiomarkerInput,
): Promise<Biomarker> {
  const raw = await apiPost(`/api/v1/patients/${patientId}/biomarkers`, input);

  return biomarkerSchema.parse(raw);
}

export type UpdatePatientInput = Partial<{
  name: string;
  birthDate: string;
  goal: Patient['goal'];
  needsFollowUp: boolean;
}>;

export async function updatePatient(id: string, fields: UpdatePatientInput): Promise<Patient> {
  const raw = await apiPatch(`/api/v1/patients/${id}`, fields);

  return patientSchema.parse(raw);
}

export async function updatePatientStatus(
  id: string,
  status: Patient['status'],
): Promise<Patient> {
  const raw = await apiPatch(`/api/v1/patients/${id}/status`, { status });

  return patientSchema.parse(raw);
}

export async function deletePatient(id: string): Promise<void> {
  await apiDelete(`/api/v1/patients/${id}`);
}

export async function patchPatientFollowUp(id: string, needsFollowUp: boolean): Promise<Patient> {
  return updatePatient(id, { needsFollowUp });
}
