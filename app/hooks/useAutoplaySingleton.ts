import { useEffect, useRef, useSyncExternalStore } from "react";
import { useInView } from "react-intersection-observer";

/**
 * The percent of the video container that must be visible before we replace the
 * preview image with the video player element
 */
const PREVIEW_THRESHOLD = 0;

/**
 * The percent of the video container that must be visible before we start
 * autoplaying the video
 */
const AUTOPLAY_THRESHOLD = 0.66;

/**
 * A global state that manages autoplaying a single visible video at a time
 */
export interface AutoplaySingletonState {
  visibleVideos: Set<HTMLDivElement>;
  autoplayVideo: HTMLDivElement | null;
}

/**
 * A global state store that manages autoplaying a single visible video at a time
 */
export let autoplayStore: AutoplaySingletonState = {
  visibleVideos: new Set(),
  autoplayVideo: null,
};

let listeners: (() => void)[] = [];
function subscribe(listener: () => void) {
  listeners = [listener, ...listeners];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function updateStore(updater: (store: AutoplaySingletonState) => AutoplaySingletonState) {
  autoplayStore = updater(autoplayStore);
  for (const listener of listeners) {
    listener();
  }
}

function snapshot() {
  return autoplayStore;
}

function useAutoplaySingletonStore() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Gets the distance from the vertical center of the window to the vertical
 * center of the given element
 */
function distanceFromVerticalCenter(el: HTMLDivElement) {
  if (typeof window === "undefined") return 0;
  const rect = el.getBoundingClientRect();
  const centerY = window.innerHeight / 2;
  const elCenterY = rect.top + rect.height / 2;

  return Math.abs(centerY - elCenterY);
}

/**
 * A hook that sets up the global state store that manages autoplaying a single
 * visible video at a time
 */
export const useAutoplaySingleton = () => {
  const { visibleVideos } = useAutoplaySingletonStore();

  useEffect(() => {
    let timerId: number;
    /**
     * Debounced scroll handler that sets the video closest to the vertical
     * center of the window as the video to autoplay
     */
    function updateAutoplayVideo() {
      if (timerId) window.cancelAnimationFrame(timerId);

      timerId = requestAnimationFrame(() => {
        const { visibleVideos } = autoplayStore;
        const sortedVisibleVideos = Array.from(visibleVideos).sort(
          (a, b) => distanceFromVerticalCenter(a) - distanceFromVerticalCenter(b),
        );

        if (sortedVisibleVideos.length > 0) {
          updateStore((store) => ({
            ...store,
            autoplayVideo: sortedVisibleVideos[0],
          }));
        }
      });
    }

    if (visibleVideos.size > 0) {
      updateAutoplayVideo();
    }

    window.addEventListener("scroll", updateAutoplayVideo);

    return () => {
      if (timerId) window.cancelAnimationFrame(timerId);
      window.removeEventListener("scroll", updateAutoplayVideo);
    };
  }, [visibleVideos]);
};

/**
 * A hook that should be called on each video container element to setup the
 * autoplay singleton state for that video
 */
export const useShouldAutoplaySingleton = (allowAutoplay: boolean) => {
  /** We use this ref to measure the vertical distance from the center of the screen */
  const measureRef = useRef<HTMLDivElement | null>(null);

  /** We use this ref to measure the intersection ratio */
  const {
    ref: observerRef,
    inView,
    entry,
  } = useInView({ threshold: [PREVIEW_THRESHOLD, AUTOPLAY_THRESHOLD] });

  // We update both refs at the same time
  const ref = (el: HTMLDivElement | null) => {
    observerRef(el);
    measureRef.current = el;
  };

  const meetsAutoplayThreshold =
    entry !== undefined && entry.intersectionRatio >= AUTOPLAY_THRESHOLD;

  useEffect(() => {
    const el = measureRef.current;
    const canAutoplay = allowAutoplay && meetsAutoplayThreshold;

    // If the video is past the autoplay threshold, we add it to the list of
    // visible videos
    if (canAutoplay && el) {
      updateStore((state) => ({
        ...state,
        visibleVideos: state.visibleVideos.add(el),
      }));
    }

    // Cleanup by removing the video from the list of visible videos
    return () => {
      if (canAutoplay && el) {
        updateStore((state) => ({
          visibleVideos: (state.visibleVideos.delete(el), state.visibleVideos),
          autoplayVideo: state.autoplayVideo === el ? null : state.autoplayVideo,
        }));
      }
    };
  }, [allowAutoplay, meetsAutoplayThreshold]);

  const { autoplayVideo } = useAutoplaySingletonStore();

  return {
    ref,
    inView,
    autoplay: autoplayVideo !== null && autoplayVideo === measureRef.current,
  };
};
