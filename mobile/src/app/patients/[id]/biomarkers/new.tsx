import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/core/theme/useTheme';
import { BiomarkerForm } from '@/core/ui/BiomarkerForm';

export default function NewBiomarkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing(4) }}>
        <BiomarkerForm patientId={id} onSuccess={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
