import { GOAL_LABELS, lifecycleActionLabel } from '@/core/patients/labels';

describe('GOAL_LABELS', () => {
  it('traduz os 4 objetivos para português', () => {
    expect(GOAL_LABELS.lose_weight).toBe('Emagrecimento');
    expect(GOAL_LABELS.gain_muscle).toBe('Ganho de massa');
    expect(GOAL_LABELS.maintain).toBe('Manutenção');
    expect(GOAL_LABELS.manage_condition).toBe('Controle de condição clínica');
  });
});

describe('lifecycleActionLabel', () => {
  it('retorna "Reativar" com destino "active" para status "inactive"', () => {
    expect(lifecycleActionLabel('inactive')).toEqual({ label: 'Reativar', target: 'active' });
  });

  it('retorna "Reabrir acompanhamento" com destino "active" para status "completed"', () => {
    expect(lifecycleActionLabel('completed')).toEqual({
      label: 'Reabrir acompanhamento',
      target: 'active',
    });
  });

  it('retorna null para status "active" (tela decide as 2 ações separadamente)', () => {
    expect(lifecycleActionLabel('active')).toBeNull();
  });
});
