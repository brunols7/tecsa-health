import type { Brand } from '@/core/theme/brand.types';

export const copy: Pick<Brand, 'copy'>['copy'] = {
  patientsTitle: 'Pacientes',
  emptyPatients: 'Nenhum paciente cadastrado. Adicione o primeiro paciente para começar.',
  aiDisclaimer:
    'Sugestões geradas por IA. Revise os biomarcadores antes de aceitar qualquer ação.',
  emptyBiomarkers: 'Nenhum biomarcador registrado. Lance o primeiro exame para começar o acompanhamento.',
  emptyFilteredPatients: 'Nenhum paciente inativo ou concluído no momento.',
};
