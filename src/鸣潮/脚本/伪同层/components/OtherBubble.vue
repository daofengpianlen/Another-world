<template>
  <div class="other-bubble">
    <div class="other-bubble__name">{{ name }}</div>
    <details class="other-bubble__flip">
      <summary>
        <div class="other-bubble__card">
          <div class="other-bubble__face other-bubble__face--front">
            <div class="other-bubble__speech">{{ speech }}</div>
          </div>
          <div class="other-bubble__face other-bubble__face--back">
            <div class="other-bubble__heart-label">· {{ name }} 的内心 ·</div>
            <div class="other-bubble__heart">“ {{ heart }} ”</div>
          </div>
        </div>
      </summary>
    </details>
  </div>
</template>

<script setup lang="ts">
defineProps<{ name: string; heart: string; speech: string }>();
</script>

<style scoped lang="scss">
.other-bubble {
  position: relative;
  margin: 25px 0 15px;
  font-family: var(--hub-font-family, 'Microsoft YaHei', sans-serif);
}

.other-bubble__name {
  position: absolute;
  top: -12px;
  left: 15px;
  background: #505064;
  color: #fff;
  padding: 2px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.other-bubble__flip {
  cursor: pointer;

  summary {
    list-style: none;
    outline: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &[open] .other-bubble__card {
    transform: rotateY(180deg);
  }
}

.other-bubble__card {
  width: 100%;
  min-height: 80px;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  display: grid;
  grid-template-columns: 100%;
}

.other-bubble__face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  border-radius: 12px;
  padding: 18px 15px 12px;
  display: flex;
  align-items: center;

  &--front {
    background: rgba(60, 60, 75, 0.85);
    border: 2px solid rgba(230, 230, 250, 0.2);
    color: #f0f8ff;
    z-index: 2;
  }

  &--back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #f3e7ff 0%, #e9d5ff 100%);
    color: #6b46c1;
    border: 2px dashed #b794f4;
    border-radius: 35px 20px 35px 20px / 20px 35px 20px 35px;
    text-align: center;
    flex-direction: column;
    justify-content: center;
  }
}

.other-bubble__speech {
  line-height: 1.6;
  font-size: 14px;
  width: 100%;
  word-break: break-word;
  white-space: pre-wrap;
}

.other-bubble__heart-label {
  font-size: 10px;
  color: #9f7aea;
  margin-bottom: 4px;
  font-weight: bold;
}

.other-bubble__heart {
  font-style: italic;
  font-size: 13.5px;
  white-space: pre-wrap;
}
</style>
