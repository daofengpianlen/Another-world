import type { EventCheck } from './eventSystem';
import { roll_event_check } from './eventSystem';
import type { GalEventData } from './galParser';
import type { Schema } from './schema';

const RESOLVED_EVENT_KEY = 'gal_resolved_events';
const EVENT_ROLLS_KEY = 'gal_event_rolls';

function read_resolved_event_ids(): string[] {
  const raw = _.get(getVariables({ type: 'chat' }), RESOLVED_EVENT_KEY, []);
  return Array.isArray(raw) ? raw.filter(id => typeof id === 'string') : [];
}

function save_resolved_event_ids(ids: string[]) {
  replaceVariables(klona({ ...getVariables({ type: 'chat' }), [RESOLVED_EVENT_KEY]: ids }), {
    type: 'chat',
  });
}

function read_event_rolls(): Record<string, EventCheck> {
  const raw = _.get(getVariables({ type: 'chat' }), EVENT_ROLLS_KEY, {});
  return raw && typeof raw === 'object' ? (raw as Record<string, EventCheck>) : {};
}

function save_event_roll(id: string, check: EventCheck) {
  const rolls = { ...read_event_rolls(), [id]: check };
  replaceVariables(klona({ ...getVariables({ type: 'chat' }), [EVENT_ROLLS_KEY]: rolls }), {
    type: 'chat',
  });
}

export const useEventStore = defineStore('gal_event', () => {
  const resolved_event_ids = ref<string[]>(read_resolved_event_ids());
  const active_check = ref<EventCheck | null>(null);
  const active_event_id = ref<string | null>(null);
  const pending_ai_prompt = ref<string | null>(null);

  function refresh() {
    resolved_event_ids.value = read_resolved_event_ids();
  }

  function is_resolved(id: string) {
    return resolved_event_ids.value.includes(id);
  }

  function mark_resolved(id: string) {
    if (resolved_event_ids.value.includes(id)) return;
    resolved_event_ids.value = [...resolved_event_ids.value, id];
    save_resolved_event_ids(resolved_event_ids.value);
    if (active_event_id.value === id) {
      active_event_id.value = null;
      active_check.value = null;
    }
  }

  function ensure_check(id: string, hero: Schema['主角'], event: GalEventData): EventCheck {
    const cached = read_event_rolls()[id];
    if (cached) {
      active_check.value = cached;
      active_event_id.value = id;
      return cached;
    }

    const preset: Partial<EventCheck> = {};
    if (event.check_stat) preset.stat = event.check_stat;
    if (event.check_threshold !== undefined) preset.threshold = event.check_threshold;

    const check = roll_event_check(hero, preset);
    save_event_roll(id, check);
    active_check.value = check;
    active_event_id.value = id;
    return check;
  }

  function clear_active() {
    active_check.value = null;
    active_event_id.value = null;
  }

  function set_pending_prompt(prompt: string) {
    pending_ai_prompt.value = prompt;
  }

  function consume_pending_prompt(): string | null {
    const prompt = pending_ai_prompt.value;
    pending_ai_prompt.value = null;
    return prompt;
  }

  return {
    resolved_event_ids,
    active_check,
    active_event_id,
    pending_ai_prompt,
    refresh,
    is_resolved,
    mark_resolved,
    ensure_check,
    clear_active,
    set_pending_prompt,
    consume_pending_prompt,
  };
});
