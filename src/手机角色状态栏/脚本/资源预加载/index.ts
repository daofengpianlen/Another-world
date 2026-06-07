import { collectBundledMediaUrls } from '../../mediaCatalog';
import { preloadMediaUrls } from '../../mediaCache';

const Settings = z
  .object({
    enabled: z.boolean().default(false),
    concurrency: z.number().int().min(1).max(6).default(3),
    notify: z.boolean().default(true),
  })
  .prefault({});

let abort_controller: AbortController | null = null;
let running = false;

const settings = ref(
  Settings.parse(getVariables({ type: 'script', script_id: getScriptId() })),
);

watchEffect(() => {
  replaceVariables(klona(settings.value), { type: 'script', script_id: getScriptId() });
});

function collectPreloadUrls(): string[] {
  const urls = collectBundledMediaUrls();
  const hero_avatar = read_hero_avatar().trim();
  if (/^https?:/i.test(hero_avatar)) urls.push(hero_avatar);
  return [...new Set(urls)];
}

async function run_preload(reason: string) {
  if (!settings.value.enabled || running) return;

  abort_controller?.abort();
  abort_controller = new AbortController();
  running = true;

  const urls = collectPreloadUrls();
  console.info(`[资源预加载] ${reason}，共 ${urls.length} 项`);

  try {
    const result = await preloadMediaUrls(urls, {
      concurrency: settings.value.concurrency,
      signal: abort_controller.signal,
      onProgress: progress => {
        if (progress.done % 25 === 0 || progress.done === progress.total) {
          console.info(`[资源预加载] ${progress.done}/${progress.total}`);
        }
      },
    });

    console.info('[资源预加载] 完成', result);
    if (settings.value.notify && !abort_controller.signal.aborted) {
      toastr.success(`资源缓存完成：${result.cached} 成功，${result.failed} 失败`);
    }
  } catch (error) {
    console.error('[资源预加载] 异常', error);
    if (settings.value.notify) toastr.error('资源预加载失败，请查看控制台');
  } finally {
    running = false;
  }
}

$(() => {
  appendInexistentScriptButtons([
    { name: '重新预加载资源', visible: true },
    { name: '暂停资源预加载', visible: true },
  ]);

  eventOn(getButtonEvent('重新预加载资源'), () => {
    void run_preload('手动触发');
  });

  eventOn(getButtonEvent('暂停资源预加载'), () => {
    abort_controller?.abort();
    running = false;
    toastr.info('已暂停资源预加载');
  });

  void run_preload('脚本加载');

  eventOn(tavern_events.CHAT_CHANGED, () => {
    void run_preload('聊天切换');
  });
});

$(window).on('pagehide', () => {
  abort_controller?.abort();
});
