import { useEffect, useState } from 'react';
import { CALENDARS_CHANGED_EVENT, loadCalendars, type CalendarDef } from './calendars';

/** 日历列表；任何地方改了日历（新建、同步、显示/隐藏）都会刷新。 */
export function useCalendars(): CalendarDef[] {
  const [calendars, setCalendars] = useState<CalendarDef[]>(() => loadCalendars());
  useEffect(() => {
    const reload = () => setCalendars(loadCalendars());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'calendars' || e.key.startsWith('calendarEvents:')) reload();
    };
    window.addEventListener(CALENDARS_CHANGED_EVENT, reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CALENDARS_CHANGED_EVENT, reload);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return calendars;
}
