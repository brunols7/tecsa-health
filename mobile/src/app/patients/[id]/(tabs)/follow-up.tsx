import { ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/core/theme/useTheme';
import { AiActionsSection } from '@/core/ui/AiActionsSection';

export default function PatientFollowUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing } = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing(4) }}>
      <AiActionsSection patientId={id} />
    </ScrollView>
  );
}
