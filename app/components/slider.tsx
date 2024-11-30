import { ArrowLeft, ArrowRight } from "lucide-react";
import * as React from "react";
import { useHotkeys as useReactHotKeys } from "react-hotkeys-hook";
import { useEvent } from "react-use-event-hook";
import { cn } from "~/lib/utils";
import { UnstyledButton } from "./ui/button";

/**
 * Generic Slider component, can slide anything!
 */
export function Slider({
  nodes,
  startIndex,
  containerClassName,
  contentClassName,
  leftNavClassName,
  rightNavClassName,
  enableHotKeys,
}: {
  nodes: React.ReactNode[];
  startIndex?: number;
  containerClassName?: string;
  leftNavClassName?: string;
  rightNavClassName?: string;
  enableHotKeys?: boolean;
  contentClassName?: string;
}) {
  const [page, setPage] = React.useState(startIndex ?? 0);
  const [scrollPercentage, setScrollPercentage] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const onScrollMount = React.useCallback(
    (e: HTMLDivElement | null) => {
      scrollRef.current = e;
      e?.children
        .item(2 * (startIndex ?? 0))
        ?.scrollIntoView({ behavior: "instant" });
    },
    [startIndex],
  );
  const scrollTo = useEvent((idx: number) => {
    scrollRef.current?.children.item(2 * idx)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  });
  React.useEffect(() => {
    if (startIndex) scrollTo(startIndex);
  }, [scrollTo, startIndex, scrollRef]);

  const debounceRef = React.useRef<NodeJS.Timeout>();
  const onScroll = useEvent(() => {
    const e = scrollRef.current;
    if (!e) return;
    setIsScrolling(true);
    setScrollPercentage(e.scrollLeft / (e.scrollWidth - e.clientWidth));
    setPage(Math.round(e.scrollLeft / e.clientWidth));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 50);
  });

  // Go to previous slide when the user presses 'ArrowLeft'
  useReactHotKeys(
    "ArrowLeft",
    () => {
      scrollTo(page - 1);
    },
    {
      enabled: nodes.length > 1 && enableHotKeys && !isScrolling && page > 0,
    },
  );

  // Go to next slide when the user presses 'ArrowRight'
  useReactHotKeys(
    "ArrowRight",
    () => {
      scrollTo(page + 1);
    },
    {
      enabled:
        nodes.length > 1 &&
        enableHotKeys &&
        !isScrolling &&
        page < nodes.length - 1,
    },
  );

  return (
    <div className={cn("relative flex flex-col", containerClassName)}>
      <div
        ref={onScrollMount}
        onScroll={onScroll}
        className={cn(
          "scrollbar-hide grid min-h-0 min-w-0 flex-1 snap-x snap-mandatory auto-cols-[100%] grid-flow-col grid-rows-[1fr,min-content] overflow-x-scroll scroll-smooth",
          contentClassName,
        )}
      >
        {nodes}
      </div>
      {nodes.length > 1 && (
        <>
          <UnstyledButton
            className={cn(
              "z-raised absolute right-4 top-[50%] hidden -translate-y-1/2 rounded-full transition-opacity md:block",
              page >= nodes.length - 1 && "pointer-events-none opacity-0",
              rightNavClassName,
            )}
            onPress={() => {
              scrollTo(page + 1);
            }}
          >
            <ArrowRight color="white" />
          </UnstyledButton>

          <UnstyledButton
            className={cn(
              "z-raised absolute left-4 top-[50%] hidden -translate-y-1/2 rounded-full transition-opacity md:block",
              page <= 0 && "pointer-events-none opacity-0",
              leftNavClassName,
            )}
            onPress={() => {
              scrollTo(page - 1);
            }}
          >
            <ArrowLeft color="white" />
          </UnstyledButton>

          <div className="relative flex flex-initial gap-1 self-center pt-4">
            {nodes.map((_, i) => (
              <button
                key={i}
                className="appearance-none rounded-full p-1 hover:bg-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollTo(i);
                }}
              >
                <div className="h-2 w-2 rounded-full bg-gray-400 p-1"></div>
              </button>
            ))}
            <div
              className="pointer-events-none absolute w-full transition-transform duration-75 ease-linear"
              style={{
                transform: `translateX(calc((100% - 1rem) * ${scrollPercentage}))`,
              }}
            >
              <div className="m-1 h-2 w-2 appearance-none rounded-full bg-white"></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
