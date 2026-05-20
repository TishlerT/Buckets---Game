/**
 * haptics.ts — thin wrapper over expo-haptics that respects user setting.
 *
 * Web has no haptics so all calls become no-ops. The functions are
 * fire-and-forget; we never await the underlying expo-haptics promise
 * because gameplay events should not block on it.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(v: boolean): void {
  enabled = v;
}

function active(): boolean {
  return enabled && Platform.OS !== 'web';
}

export function lightTap(): void {
  if (!active()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
export function mediumTap(): void {
  if (!active()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
export function heavyTap(): void {
  if (!active()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
export function notifySuccess(): void {
  if (!active()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
export function notifyError(): void {
  if (!active()) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
