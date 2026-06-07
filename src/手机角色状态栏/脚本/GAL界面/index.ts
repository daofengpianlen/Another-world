import { mountStreamingMessages } from '@util/streaming';
import GameRoot from '../../GameRoot.vue';
import '../../global.scss';
import { isOpeningFloor } from '../../messageScope';
import { publishGalAssetsBase } from '../../media';

$(async () => {
  publishGalAssetsBase();
  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 5000)),
  ]);

  const { unmount } = mountStreamingMessages(
    () => createApp(GameRoot).use(createPinia()),
    {
      host: 'iframe',
      prefix: 'gal-game-ui',
      /** 仅第 0 楼挂载：开局表单 → 同一面板持续显示最新 GAL 剧情 */
      filter: message_id => isOpeningFloor(message_id),
    },
  );

  console.info('[异世界大冒险] 第 0 楼游戏面板已挂载（开局 → 最新 GAL 剧情）');

  $(window).on('pagehide', () => unmount());
});
