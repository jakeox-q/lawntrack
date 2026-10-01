import { router } from 'expo-router';

/** Leave a modal or detail screen. Falls back to Today when opened directly by link. */
export function closeScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
