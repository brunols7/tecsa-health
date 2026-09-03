import { brDateToIso, calculateAge, formatDateBR, maskBirthDateInput } from '@/core/patients/date';

describe('calculateAge', () => {
  it('calcula a idade completa quando hoje é depois do aniversário no ano corrente', () => {
    const today = new Date('2026-03-10T12:00:00Z');

    expect(calculateAge('2000-03-05', today)).toBe(26);
  });

  it('não conta o ano corrente quando hoje é antes do aniversário no ano corrente', () => {
    const today = new Date('2026-03-01T12:00:00Z');

    expect(calculateAge('2000-03-05', today)).toBe(25);
  });

  it('calcula corretamente no dia exato do aniversário', () => {
    const today = new Date('2026-03-05T12:00:00Z');

    expect(calculateAge('2000-03-05', today)).toBe(26);
  });
});

describe('formatDateBR', () => {
  it('formata uma data ISO YYYY-MM-DD para dd/MM/yyyy', () => {
    expect(formatDateBR('2026-03-05')).toBe('05/03/2026');
  });

  it('formata um timestamp ISO completo para dd/MM/yyyy usando só a parte de data', () => {
    expect(formatDateBR('2026-01-01T10:00:00Z')).toBe('01/01/2026');
  });
});

describe('maskBirthDateInput', () => {
  it('insere as barras progressivamente enquanto os dígitos são digitados', () => {
    expect(maskBirthDateInput('0')).toBe('0');
    expect(maskBirthDateInput('05')).toBe('05');
    expect(maskBirthDateInput('053')).toBe('05/3');
    expect(maskBirthDateInput('0503')).toBe('05/03');
    expect(maskBirthDateInput('05031')).toBe('05/03/1');
    expect(maskBirthDateInput('05031990')).toBe('05/03/1990');
  });

  it('ignora caracteres não numéricos já presentes no valor (barras digitadas manualmente)', () => {
    expect(maskBirthDateInput('05/03/1990')).toBe('05/03/1990');
  });

  it('trunca em 8 dígitos, ignorando entrada excedente', () => {
    expect(maskBirthDateInput('050319909999')).toBe('05/03/1990');
  });
});

describe('brDateToIso', () => {
  it('converte uma data completa DD/MM/AAAA para AAAA-MM-DD', () => {
    expect(brDateToIso('05/03/1990')).toBe('1990-03-05');
  });
});
