import { useRouter } from 'expo-router';

import { NotificationsScreen } from '@/features/notifications/notifications-screen';

export default function KitchenNotifications() {
  const router = useRouter();
  return (
    <NotificationsScreen
      onClose={() => (router.canGoBack() ? router.back() : router.replace('/(kitchen)/kitchen'))}
    />
  );
}
