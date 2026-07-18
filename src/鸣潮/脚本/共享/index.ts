import { ensureWuWaSharedRegistered } from '../../shared/register';
import { registerHeroineGuard } from '../../shared/heroineGuard';
import { exposeWuwaConsoleTools } from '../../shared/wuwaConsoleTools';
import { publishWuwaAssetsBase } from '../../shared/wuwaMedia';

let heroine_guard_cleanups: EventOnReturn[] = [];

$(async () => {
  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 8000)),
  ]);

  errorCatched(() => {
    publishWuwaAssetsBase();
    ensureWuWaSharedRegistered();
    exposeWuwaConsoleTools();
    heroine_guard_cleanups = registerHeroineGuard();
    console.info('[鸣潮共享] 已加载（控制台: await __WUWA_REPAIR_HEROINES__("秧秧")）');
  })();

  $(window).on('pagehide', () => {
    heroine_guard_cleanups.forEach(off => off.stop());
    heroine_guard_cleanups = [];
  });
});
