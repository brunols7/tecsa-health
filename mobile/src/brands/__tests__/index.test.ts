import { resolveBrand } from '@/brands';

describe('resolveBrand', () => {
  it('retorna o objeto de marca correto para ids conhecidos', () => {
    expect(resolveBrand('nutri-care').id).toBe('nutri-care');
    expect(resolveBrand('vita-plus').id).toBe('vita-plus');
  });

  it('lança erro para um id desconhecido', () => {
    expect(() => resolveBrand('inexistente')).toThrow('Marca desconhecida: inexistente');
  });
});
