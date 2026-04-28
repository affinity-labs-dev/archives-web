/**
 * Profile Tab — thin wrapper around the v5 ProfileScreen component.
 *
 * All logic and UI live in @/components/profile/ProfileScreen.
 * This file exists only because Expo Router requires a file at this path
 * for the tab to work.
 */

import { ProfileScreen } from '@/components/profile/ProfileScreen';

export default function ProfileTab() {
  return <ProfileScreen />;
}
