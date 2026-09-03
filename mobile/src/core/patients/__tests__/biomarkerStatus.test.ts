import { computeBiomarkerStatus } from '@/core/patients/biomarkerStatus';

// Casos espelham api/tests/Unit/BiomarkerStatusTest.php (paridade com BiomarkerStatus::from()).
describe('computeBiomarkerStatus', () => {
  it('retorna low quando o valor está abaixo do refMin', () => {
    expect(computeBiomarkerStatus(69.0, 70.0, 99.0)).toBe('low');
  });

  it('retorna normal quando o valor é igual ao refMin', () => {
    expect(computeBiomarkerStatus(70.0, 70.0, 99.0)).toBe('normal');
  });

  it('retorna normal quando o valor está dentro da faixa', () => {
    expect(computeBiomarkerStatus(85.0, 70.0, 99.0)).toBe('normal');
  });

  it('retorna normal quando o valor é igual ao refMax', () => {
    expect(computeBiomarkerStatus(99.0, 70.0, 99.0)).toBe('normal');
  });

  it('retorna high quando o valor está acima do refMax', () => {
    expect(computeBiomarkerStatus(100.0, 70.0, 99.0)).toBe('high');
  });
});
