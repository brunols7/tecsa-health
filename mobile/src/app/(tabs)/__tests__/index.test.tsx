import { act, fireEvent, render } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { usePatientsQuery } from '@/core/patients/usePatientsQuery';
import { useIsOffline } from '@/core/offline/network';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientsScreen from '../index';

jest.mock('@/core/patients/usePatientsQuery');
jest.mock('@/core/offline/network');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const mockedUsePatientsQuery = usePatientsQuery as jest.MockedFunction<typeof usePatientsQuery>;
const mockedUseIsOffline = useIsOffline as jest.MockedFunction<typeof useIsOffline>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

function makePatient(id: string, overrides: Partial<{ needsFollowUp: boolean }> = {}) {
  return {
    id,
    name: `Paciente ${id}`,
    birthDate: '1990-01-01',
    goal: 'lose_weight' as const,
    status: 'active' as const,
    needsFollowUp: overrides.needsFollowUp ?? false,
    statusChangedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

type PatientsQueryResult = ReturnType<typeof usePatientsQuery>;

function makeQueryResult(overrides: Partial<PatientsQueryResult>): PatientsQueryResult {
  return {
    status: 'success',
    data: { pages: [], pageParams: [] },
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  } as unknown as PatientsQueryResult;
}

function renderScreen() {
  return render(
    <BrandProvider brand={resolveBrand('nutri-care')}>
      <PatientsScreen />
    </BrandProvider>,
  );
}

describe('PatientsScreen', () => {
  beforeEach(() => {
    mockedUseIsOffline.mockReturnValue(false);
    mockedUseRouter.mockReturnValue({ push: jest.fn() } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    mockedUsePatientsQuery.mockReset();
    mockedUseIsOffline.mockReset();
    mockedUseRouter.mockReset();
  });

  it('exibe o skeleton enquanto a query está pending', async () => {
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({ status: 'pending', data: undefined }),
    );

    const { getByTestId } = await renderScreen();

    expect(getByTestId('patients-skeleton')).toBeTruthy();
  });

  it('exibe o estado de erro com botão de tentar de novo quando a query falha', async () => {
    const refetch = jest.fn();
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({ status: 'error', data: undefined, refetch }),
    );

    const { getByText } = await renderScreen();

    expect(getByText('Não foi possível carregar a carteira de pacientes.')).toBeTruthy();

    await fireEvent.press(getByText('Tentar novamente'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('exibe o estado vazio quando a primeira página vem sem pacientes', async () => {
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: { pages: [{ data: [], nextCursor: null }], pageParams: [undefined] },
      }),
    );

    const brand = resolveBrand('nutri-care');
    const { getByText } = await render(
      <BrandProvider brand={brand}>
        <PatientsScreen />
      </BrandProvider>,
    );

    expect(getByText(brand.copy.emptyPatients)).toBeTruthy();
  });

  it('exibe os pacientes retornados quando a query tem sucesso e navega ao tocar um card', async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: {
          pages: [
            { data: [makePatient('1'), makePatient('2', { needsFollowUp: true })], nextCursor: null },
          ],
          pageParams: [undefined],
        },
      }),
    );

    const { getByText, getByTestId } = await renderScreen();

    expect(getByText('Paciente 1')).toBeTruthy();
    expect(getByText('Paciente 2')).toBeTruthy();
    expect(getByText('Acompanhamento')).toBeTruthy();

    await fireEvent.press(getByTestId('patient-card-1'));

    expect(push).toHaveBeenCalledWith('/patients/1');
  });

  it('busca a próxima página quando onEndReached dispara e hasNextPage é true', async () => {
    const fetchNextPage = jest.fn();
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: { pages: [{ data: [makePatient('1')], nextCursor: 'cursor-2' }], pageParams: [undefined] },
        hasNextPage: true,
        fetchNextPage,
      }),
    );

    const { getByTestId } = await renderScreen();

    await fireEvent(getByTestId('patients-list'), 'onEndReached');

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('não busca a próxima página quando onEndReached dispara e hasNextPage é false', async () => {
    const fetchNextPage = jest.fn();
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: { pages: [{ data: [makePatient('1')], nextCursor: null }], pageParams: [undefined] },
        hasNextPage: false,
        fetchNextPage,
      }),
    );

    const { getByTestId } = await renderScreen();

    await fireEvent(getByTestId('patients-list'), 'onEndReached');

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('renderiza o banner de offline quando useIsOffline() é true', async () => {
    mockedUseIsOffline.mockReturnValue(true);
    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: { pages: [{ data: [makePatient('1')], nextCursor: null }], pageParams: [undefined] },
      }),
    );

    const { getByText } = await renderScreen();

    expect(getByText('Você está offline. Mostrando os dados salvos no dispositivo.')).toBeTruthy();
  });

  it('após 300ms sem digitar, refaz a busca com o termo digitado', async () => {
    jest.useFakeTimers();

    mockedUsePatientsQuery.mockReturnValue(
      makeQueryResult({
        status: 'success',
        data: { pages: [{ data: [makePatient('1')], nextCursor: null }], pageParams: [undefined] },
      }),
    );

    const { getByTestId } = await renderScreen();

    await fireEvent.changeText(getByTestId('patients-search-input'), 'maria');

    expect(mockedUsePatientsQuery).toHaveBeenLastCalledWith('', 'active');

    await act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockedUsePatientsQuery).toHaveBeenLastCalledWith('maria', 'active');

    jest.useRealTimers();
  });
});
