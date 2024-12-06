import { useRef } from "react";
import { useEvent } from "react-use-event-hook";
import { WindowVirtualizer } from "virtua";
import type { VStreamFeedViewPostSlice } from "~/types";
import { useWindowVirtualizeCached } from "~/hooks/useWindowVirtualizeCached";
import { useAutoplaySingleton } from "~/hooks/useAutoplaySingleton";
import { useFeedData } from "~/hooks/useFeedData";
import { FeedSlice } from "./post";

export function Feed({
  name,
  initialSlices,
  initialCursor,
  showTopBorder,
}: {
  name: string;
  initialSlices: VStreamFeedViewPostSlice[];
  initialCursor?: string;
  showTopBorder?: boolean;
}) {
  const { slices, loadMore } = useFeedData(name, initialSlices, initialCursor);
  const { cache, ref } = useWindowVirtualizeCached(name, slices[0]._reactKey);
  const fetchedCountRef = useRef(-1);
  const count = slices.length;

  const onScroll = useEvent(async () => {
    if (!ref.current) return;
    if (fetchedCountRef.current < count && ref.current.findEndIndex() + 10 > count) {
      fetchedCountRef.current = count;
      loadMore();
    }
  });

  // Autoplay a single video in the feed at a time
  useAutoplaySingleton();

  return (
    <div className="mx-auto w-full max-w-[100vw] md:max-w-[42.5rem]">
      <WindowVirtualizer ref={ref} cache={cache} itemSize={500} ssrCount={10} onScroll={onScroll}>
        {slices.map((s, idx) => (
          <FeedSlice key={s._reactKey} hideTopBorder={!showTopBorder && idx === 0} slice={s} />
        ))}
      </WindowVirtualizer>
    </div>
  );
}
