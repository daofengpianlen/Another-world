export type HubLayoutMode = 'desktop' | 'mobile';

export type HubFontFamily = 'default' | 'song' | 'kai' | 'hei';

export type HubSettings = {
  layout: HubLayoutMode;
  font_scale: number;
  font_family: HubFontFamily;
};

const FONT_SCALE_OPTIONS = [
  { value: 0.85, label: '小' },
  { value: 1, label: '默认' },
  { value: 1.15, label: '大' },
  { value: 1.3, label: '特大' },
] as const;

const FONT_FAMILY_OPTIONS: { value: HubFontFamily; label: string; stack: string }[] = [
  { value: 'default', label: '默认', stack: "'Segoe UI', 'Microsoft YaHei', sans-serif" },
  { value: 'song', label: '宋体', stack: "'SimSun', 'Songti SC', serif" },
  { value: 'kai', label: '楷体', stack: "'KaiTi', 'Kaiti SC', serif" },
  { value: 'hei', label: '黑体', stack: "'SimHei', 'Heiti SC', sans-serif" },
];

function readSettings(): HubSettings {
  try {
    const raw = getVariables({ type: 'script', script_id: getScriptId() }) as Partial<HubSettings>;
    const family = raw.font_family;
    return {
      layout: raw.layout === 'mobile' ? 'mobile' : 'desktop',
      font_scale: typeof raw.font_scale === 'number' ? _.clamp(raw.font_scale, 0.75, 1.5) : 1,
      font_family: FONT_FAMILY_OPTIONS.some(o => o.value === family) ? family! : 'default',
    };
  } catch {
    return { layout: 'desktop', font_scale: 1, font_family: 'default' };
  }
}

export function resolveHubFontStack(family: HubFontFamily): string {
  return FONT_FAMILY_OPTIONS.find(o => o.value === family)?.stack ?? FONT_FAMILY_OPTIONS[0].stack;
}

export const useHubSettingsStore = defineStore('wuwa_hub_settings', () => {
  const settings = ref<HubSettings>(readSettings());
  const panel_open = ref(false);

  watchEffect(() => {
    replaceVariables({ ...settings.value }, { type: 'script', script_id: getScriptId() });
  });

  function set_layout(layout: HubLayoutMode) {
    settings.value.layout = layout;
  }

  function set_font_scale(font_scale: number) {
    settings.value.font_scale = _.clamp(font_scale, 0.75, 1.5);
  }

  function set_font_family(font_family: HubFontFamily) {
    settings.value.font_family = font_family;
  }

  function toggle_panel() {
    panel_open.value = !panel_open.value;
  }

  function close_panel() {
    panel_open.value = false;
  }

  return {
    settings,
    panel_open,
    font_scale_options: FONT_SCALE_OPTIONS,
    font_family_options: FONT_FAMILY_OPTIONS,
    set_layout,
    set_font_scale,
    set_font_family,
    toggle_panel,
    close_panel,
  };
});
