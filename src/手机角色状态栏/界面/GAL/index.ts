import { createApp } from 'vue';
import App from '../../App.vue';
import '../../global.scss';
import { publishGalAssetsBase } from '../../media';

$(async () => {
  publishGalAssetsBase();
  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 5000)),
  ]);
  const app = createApp(App).use(createPinia());
  app.mount('#app');
  $(window).on('pagehide', () => app.unmount());
});
