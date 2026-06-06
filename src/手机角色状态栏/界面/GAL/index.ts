import { createApp } from 'vue';
import App from '../../App.vue';
import '../../global.scss';

$(async () => {
  await Promise.race([
    waitGlobalInitialized('Mvu'),
    new Promise<void>(resolve => setTimeout(resolve, 5000)),
  ]);
  const app = createApp(App).use(createPinia());
  app.mount('#app');
  $(window).on('pagehide', () => app.unmount());
});
