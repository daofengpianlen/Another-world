type BgmType = 'bgm' | 'ambient';

function resolveAudioApi() {
  const root = globalThis as typeof globalThis & {
    getCurrentAudio?: typeof getCurrentAudio;
    playAudio?: typeof playAudio;
    pauseAudio?: typeof pauseAudio;
    TavernHelper?: {
      getCurrentAudio?: typeof getCurrentAudio;
      playAudio?: typeof playAudio;
      pauseAudio?: typeof pauseAudio;
    };
  };
  return {
    getCurrentAudio: root.getCurrentAudio ?? root.TavernHelper?.getCurrentAudio,
    playAudio: root.playAudio ?? root.TavernHelper?.playAudio,
    pauseAudio: root.pauseAudio ?? root.TavernHelper?.pauseAudio,
  };
}

export function readCurrentAudioPlaying(type: BgmType): boolean {
  try {
    return resolveAudioApi().getCurrentAudio?.(type)?.playing ?? false;
  } catch {
    return false;
  }
}

export function toggleTavernAudio(type: BgmType, url?: string): boolean {
  const api = resolveAudioApi();
  try {
    if (api.getCurrentAudio?.(type)?.playing) {
      api.pauseAudio?.(type);
      return false;
    }
    if (url) {
      api.playAudio?.(type, { url });
      return true;
    }
  } catch (error) {
    console.warn('[音频] 播放控制失败', error);
  }
  return false;
}
