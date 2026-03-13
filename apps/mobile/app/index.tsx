import { Redirect } from 'expo-router';
import { useAuthStore } from '@mystudyplanner/api-client';

export default function Index() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
