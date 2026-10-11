import * as Notifications from 'expo-notifications';

import { MINUTES_PER_DAY } from '@/data/profile';

/** The nudge comes this long before the workday ends, so there's time to wrap up. */
export const NUDGE_LEAD_MINUTES = 15;

export interface NudgeTime {
  /** 1 = Sunday … 7 = Saturday, as iOS calendar triggers count. */
  weekday: number;
  hour: number;
  minute: number;
}

/** Minute of the day the nudge fires. */
export function nudgeMinute(endMinute: number): number {
  return (endMinute - NUDGE_LEAD_MINUTES + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** One weekly trigger per workday; an end just after midnight nudges late on the day before. */
export function nudgeTimes(endMinute: number, days: number): NudgeTime[] {
  const dayShift = endMinute < NUDGE_LEAD_MINUTES ? -1 : 0;
  const minuteOfDay = nudgeMinute(endMinute);
  const times: NudgeTime[] = [];
  for (let day = 0; day < 7; day++) {
    if (!(days & (1 << day))) continue;
    times.push({
      weekday: ((day + dayShift + 7) % 7) + 1,
      hour: Math.floor(minuteOfDay / 60),
      minute: minuteOfDay % 60,
    });
  }
  return times;
}

/** 12-hour clock without a suffix, e.g. "5:30", for copy where the hour is unambiguous. */
export function shortClock(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 12 || 12;
  return `${h}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}

export function clockLabel(minuteOfDay: number): string {
  return `${shortClock(minuteOfDay)} ${minuteOfDay < 12 * 60 ? 'AM' : 'PM'}`;
}

export function nudgeBody(petName: string, endMinute: number): string {
  return `${petName} is waiting by the drawer. Clock out at ${shortClock(endMinute)}.`;
}

/** Asks once for alerts and sounds (no badge: nothing here counts up). True when iOS will show the nudge. */
export async function requestNudgePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  const status = current.ios?.status;
  if (status === Notifications.IosAuthorizationStatus.AUTHORIZED) return true;
  if (status !== Notifications.IosAuthorizationStatus.NOT_DETERMINED) return false;
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return asked.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
}

/** Replaces every scheduled nudge; the app schedules nothing else, so cancelling all is safe. */
export async function scheduleNudges(petName: string, endMinute: number, days: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const body = nudgeBody(petName, endMinute);
  for (const time of nudgeTimes(endMinute, days)) {
    await Notifications.scheduleNotificationAsync({
      content: { body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, repeats: true, ...time },
    });
  }
}
