import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { BrandProvider } from '@/core/theme/BrandProvider';
import { BiomarkerForm } from '@/core/ui/BiomarkerForm';

import NewBiomarkerScreen from '../new';

jest.mock('@/core/ui/BiomarkerForm');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

const mockedBiomarkerForm = BiomarkerForm as jest.MockedFunction<typeof BiomarkerForm>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

function renderScreen() {
  return render(
    <BrandProvider brand={resolveBrand('nutri-care')}>
      <NewBiomarkerScreen />
    </BrandProvider>,
  );
}

describe('NewBiomarkerScreen', () => {
  afterEach(() => {
    mockedBiomarkerForm.mockReset();
    mockedUseLocalSearchParams.mockReset();
    mockedUseRouter.mockReset();
  });

  it('renderiza BiomarkerForm com o patientId correto vindo da rota', async () => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseRouter.mockReturnValue({ back: jest.fn() } as unknown as ReturnType<typeof useRouter>);
    mockedBiomarkerForm.mockImplementation(({ patientId }) => <Text>{patientId}</Text>);

    const { getByText } = await renderScreen();

    expect(getByText('patient-1')).toBeTruthy();
    expect(mockedBiomarkerForm).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1' }),
      undefined,
    );
  });

  it('chama router.back() quando BiomarkerForm dispara onSuccess', async () => {
    const back = jest.fn();
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseRouter.mockReturnValue({ back } as unknown as ReturnType<typeof useRouter>);
    mockedBiomarkerForm.mockImplementation(({ onSuccess }) => {
      onSuccess();
      return <Text>form</Text>;
    });

    await renderScreen();

    expect(back).toHaveBeenCalledTimes(1);
  });
});
