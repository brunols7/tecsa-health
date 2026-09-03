import type { BiomarkerStatus } from '@/core/api/schemas/biomarker';

export function computeBiomarkerStatus(value: number, refMin: number, refMax: number): BiomarkerStatus {
  if (value < refMin) {
    return 'low';
  }
  if (value > refMax) {
    return 'high';
  }
  return 'normal';
}
