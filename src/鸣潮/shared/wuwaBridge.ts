type ParentWindowApi = Pick<
  Window,
  'openXiaoAiPhone' | 'mountPhoneOverlayToHub' | 'restorePhoneOverlayToBody' | 'closeMobilePhone'
>;

export function exposeWuwaPhoneApi(api: Partial<ParentWindowApi>) {
  for (const [key, fn] of Object.entries(api)) {
    if (typeof fn !== 'function') continue;
    (window as Window)[key as keyof ParentWindowApi] = fn as never;
    try {
      (window.parent as Window)[key as keyof ParentWindowApi] = fn as never;
    } catch {
      /* cross-origin */
    }
  }
}

export function resolveWuwaPhoneApi<K extends keyof ParentWindowApi>(key: K): ParentWindowApi[K] | undefined {
  const local = (window as Window)[key];
  if (typeof local === 'function') return local;

  try {
    const from_parent = (window.parent as Window)[key];
    if (typeof from_parent === 'function') return from_parent;
  } catch {
    /* cross-origin */
  }

  return undefined;
}
