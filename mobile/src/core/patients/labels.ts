import type { Patient } from '@/core/api/schemas/patient';

export const GOAL_LABELS: Record<Patient['goal'], string> = {
  lose_weight: 'Emagrecimento',
  gain_muscle: 'Ganho de massa',
  maintain: 'Manutenção',
  manage_condition: 'Controle de condição clínica',
};

export function lifecycleActionLabel(
  status: Patient['status'],
): { label: string; target: Patient['status'] } | null {
  if (status === 'inactive') {
    return { label: 'Reativar', target: 'active' };
  }
  if (status === 'completed') {
    return { label: 'Reabrir acompanhamento', target: 'active' };
  }
  return null;
}
