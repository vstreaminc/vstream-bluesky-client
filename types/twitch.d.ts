declare global {
  declare namespace Twitch {
    declare class Player {
      static CAPTIONS: symbol;
      static ENDED: symbol;
      static PAUSE: symbol;
      static PLAY: symbol;
      static PLAYBACK_BLOCKED: symbol;
      static PLAYING: symbol;
      static OFFLINE: symbol;
      static ONLINE: symbol;
      static READY: symbol;
      static SEEK: symbol;

      constructor(
        id: string,
        options: {
          channel?: string | undefined;
          video?: string | undefined;
          parent?: string[];
          width: string | number;
          height: string | number;
          /**
           * If true, the video starts playing automatically, without the user clicking play. The exception is mobile devices, on which video cannot be played without user interaction. Default: `true`.
           */
          autoplay?: boolean;
          /**
           * Specifies whether the initial state of the video is muted. Default: `false`.
           */
          muted?: boolean;
          /**
           * Only valid for Video on Demand content. Time in the video where playback starts. Specifies hours, minutes, and seconds. Default: `0h0m0s` (the start of the video).
           */
          time?: string;
        },
      );

      setVolume(vol: number): void;

      /**
       * Begins playing the specified video.
       */
      play(): void;

      /**
       * Pauses the player.
       */
      pause(): void;

      /**
       * Returns `true` if the player is muted; otherwise, `false`.
       */
      getMuted(): boolean;

      /**
       * If `true`, mutes the player; otherwise, unmutes it. This is independent of the volume setting.
       */
      setMuted(muted: boolean): void;

      /**
       * Returns `true` if the video is paused; otherwise, false. Buffering or seeking is considered playing.
       */
      isPaused(): boolean;

      /**
       * Returns `true` if the live stream or VOD has ended; otherwise, `false`.
       */
      getEnded(): boolean;

      addEventListener(event: typeof Player.ENDED, callback: () => void);
      addEventListener(event: typeof Player.CAPTIONS, callback: () => void);
      addEventListener(event: typeof Player.ENDED, callback: () => void);
      addEventListener(event: typeof Player.PAUSE, callback: () => void);
      addEventListener(event: typeof Player.PLAY, callback: () => void);
      addEventListener(event: typeof Player.PLAYBACK_BLOCKED, callback: () => void);
      addEventListener(event: typeof Player.PLAYING, callback: () => void);
      addEventListener(event: typeof Player.OFFLINE, callback: () => void);
      addEventListener(event: typeof Player.ONLINE, callback: () => void);
      addEventListener(event: typeof Player.READY, callback: () => void);
      addEventListener(event: typeof Player.SEEK, callback: () => void);
    }
  }
}

export {};
