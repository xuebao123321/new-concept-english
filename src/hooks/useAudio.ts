import { useRef, useCallback, useState, useEffect } from 'react';
import { Howl } from 'howler';

interface UseAudioReturn {
  play: (audioSrc: string) => void;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
  currentSrc: string | null;
}

export function useAudio(): UseAudioReturn {
  const howlRef = useRef<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  // 清理前一个 Howl 实例
  const cleanup = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const play = useCallback(
    (audioSrc: string) => {
      // 如果播放的是同一个音频且正在播放，则暂停
      if (currentSrc === audioSrc && isPlaying) {
        howlRef.current?.pause();
        setIsPlaying(false);
        return;
      }

      // 切换音频时先停止前一个
      if (howlRef.current) {
        howlRef.current.unload();
      }

      const howl = new Howl({
        src: [audioSrc],
        html5: true,
        onplay: () => setIsPlaying(true),
        onpause: () => setIsPlaying(false),
        onstop: () => setIsPlaying(false),
        onend: () => {
          setIsPlaying(false);
          setCurrentSrc(null);
        },
        onloaderror: (_id, err) => {
          console.warn('Audio load error:', audioSrc, err);
          setIsPlaying(false);
        },
        onplayerror: (_id, err) => {
          console.warn('Audio play error:', audioSrc, err);
          setIsPlaying(false);
        },
      });

      howl.play();
      howlRef.current = howl;
      setCurrentSrc(audioSrc);
    },
    [currentSrc, isPlaying]
  );

  const pause = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop();
      setIsPlaying(false);
      setCurrentSrc(null);
    }
  }, []);

  return { play, pause, stop, isPlaying, currentSrc };
}
