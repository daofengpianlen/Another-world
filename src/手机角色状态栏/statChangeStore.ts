import { diff_stat_data, type StatChangeNotice } from './statChangeNotify';
import type { Schema } from './schema';

const NOTICE_TTL_MS = 4200;
const MAX_VISIBLE = 6;

export const useStatChangeStore = defineStore('stat_change', () => {
  const notices = ref<StatChangeNotice[]>([]);
  let snapshot: Schema | null = null;
  let bootstrapped = false;
  const timers = new Map<string, number>();

  function clear_timer(id: string) {
    const handle = timers.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timers.delete(id);
    }
  }

  function dismiss(id: string) {
    clear_timer(id);
    notices.value = notices.value.filter(n => n.id !== id);
  }

  function push(raw: Omit<StatChangeNotice, 'id'>) {
    const id = `${Date.now()}-${_.uniqueId()}`;
    notices.value = [...notices.value, { ...raw, id }].slice(-MAX_VISIBLE);
    clear_timer(id);
    timers.set(
      id,
      window.setTimeout(() => dismiss(id), NOTICE_TTL_MS),
    );
  }

  function ingest(next: Schema) {
    if (!bootstrapped || !snapshot) {
      snapshot = klona(next);
      bootstrapped = true;
      return;
    }

    const diffs = diff_stat_data(snapshot, next);
    snapshot = klona(next);

    for (const item of diffs) {
      push(item);
    }
  }

  function reset() {
    for (const id of timers.keys()) clear_timer(id);
    snapshot = null;
    bootstrapped = false;
    notices.value = [];
  }

  return {
    notices,
    ingest,
    reset,
    dismiss,
  };
});
