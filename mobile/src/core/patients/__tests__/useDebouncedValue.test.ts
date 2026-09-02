import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/core/patients/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('só atualiza o valor após delayMs sem nova mudança', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    expect(result.current).toBe('a');

    await rerender({ value: 'ab' });

    expect(result.current).toBe('a');

    await act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('reinicia o timer em mudança rápida sucessiva, sem vazar valor intermediário', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    );

    await rerender({ value: 'ab' });

    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    await rerender({ value: 'abc' });

    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    await act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });
});
