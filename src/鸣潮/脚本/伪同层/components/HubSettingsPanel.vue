<template>
  <div v-if="hub_settings.panel_open" class="hub-settings-backdrop" @click="hub_settings.close_panel()">
    <div class="hub-settings" @click.stop>
      <header class="hub-settings__head">
        <h3>界面设置</h3>
        <button type="button" class="hub-settings__close" @click="hub_settings.close_panel()">×</button>
      </header>

      <section class="hub-settings__section">
        <div class="hub-settings__label">界面布局</div>
        <div class="hub-settings__choices">
          <button
            type="button"
            class="hub-settings__choice"
            :class="{ active: hub_settings.settings.layout === 'desktop' }"
            @click="hub_settings.set_layout('desktop')"
          >
            电脑版
          </button>
          <button
            type="button"
            class="hub-settings__choice"
            :class="{ active: hub_settings.settings.layout === 'mobile' }"
            @click="hub_settings.set_layout('mobile')"
          >
            手机版
          </button>
        </div>
        <p class="hub-settings__note">
          电脑版：宽屏外框（960×768）+ 横排大头像气泡。<br />
          手机版：窄屏竖屏外框（440×865，375:737）+ 竖排居中气泡。
        </p>
      </section>

      <section class="hub-settings__section">
        <div class="hub-settings__label">角色聊天框样式</div>
        <p class="hub-settings__note hub-settings__note--inline">随上方布局自动切换，对应参考 regex 电脑/手机专用聊天框。</p>
      </section>

      <section class="hub-settings__section">
        <div class="hub-settings__label">字体</div>
        <div class="hub-settings__choices">
          <button
            v-for="option in hub_settings.font_family_options"
            :key="option.value"
            type="button"
            class="hub-settings__choice"
            :class="{ active: hub_settings.settings.font_family === option.value }"
            @click="hub_settings.set_font_family(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>

      <section class="hub-settings__section">
        <div class="hub-settings__label">字体大小</div>
        <div class="hub-settings__choices">
          <button
            v-for="option in hub_settings.font_scale_options"
            :key="option.value"
            type="button"
            class="hub-settings__choice"
            :class="{ active: hub_settings.settings.font_scale === option.value }"
            @click="hub_settings.set_font_scale(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHubSettingsStore } from '../hubSettingsStore';

const hub_settings = useHubSettingsStore();
</script>

<style scoped lang="scss">
.hub-settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100001;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.hub-settings {
  width: min(100%, 360px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
  padding: 16px;
  color: #334155;
}

.hub-settings__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: #0369a1;
  }
}

.hub-settings__close {
  border: none;
  background: #f1f5f9;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.hub-settings__section + .hub-settings__section {
  margin-top: 16px;
}

.hub-settings__label {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.hub-settings__choices {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hub-settings__choice {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;

  &.active {
    border-color: #38bdf8;
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 700;
  }
}

.hub-settings__note {
  margin: 8px 0 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;

  &--inline {
    margin-top: 0;
  }
}
</style>
