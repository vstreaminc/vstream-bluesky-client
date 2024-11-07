"use client";

import type {
  FocusEventHandler,
  MouseEventHandler,
  TouchEventHandler,
} from "react";
import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import {
  Link as AriaLink,
  LinkProps as AriaLinkProps,
  composeRenderProps,
} from "react-aria-components";
import { cn } from "~/lib/utils";
import { buttonVariants } from "./button";
import { PrefetchPageLinks } from "@remix-run/react";

/**
 * Defines the prefetching behavior of the link:
 *
 * - "none": Never fetched
 * - "intent": Fetched when the user focuses or hovers the link
 * - "render": Fetched when the link is rendered
 * - "viewport": Fetched when the link is in the viewport
 */
type PrefetchBehavior = "intent" | "render" | "none" | "viewport";

interface LinkProps extends AriaLinkProps, VariantProps<typeof buttonVariants> {
  prefetch?: PrefetchBehavior;
}

interface PrefetchHandlers {
  onFocus?: FocusEventHandler;
  onBlur?: FocusEventHandler;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
  onTouchStart?: TouchEventHandler;
}

// See: https://github.com/remix-run/remix/blob/1bd7f943c3f90c9e7e9ca5742324f1bb2622958c/packages/remix-react/components.tsx#L133
function usePrefetchBehavior<T extends HTMLAnchorElement>(
  prefetch: PrefetchBehavior,
  theirElementProps: PrefetchHandlers,
): [boolean, React.RefObject<T>, Required<PrefetchHandlers>] {
  const [maybePrefetch, setMaybePrefetch] = React.useState(false);
  const [shouldPrefetch, setShouldPrefetch] = React.useState(false);
  const { onFocus, onBlur, onMouseEnter, onMouseLeave, onTouchStart } =
    theirElementProps;

  const ref = React.useRef<T>(null);

  React.useEffect(() => {
    if (prefetch === "render") {
      setShouldPrefetch(true);
    }

    if (prefetch === "viewport") {
      const callback: IntersectionObserverCallback = (entries) => {
        entries.forEach((entry) => {
          setShouldPrefetch(entry.isIntersecting);
        });
      };
      const observer = new IntersectionObserver(callback, { threshold: 0.5 });
      if (ref.current) observer.observe(ref.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [prefetch]);

  const setIntent = () => {
    if (prefetch === "intent") {
      setMaybePrefetch(true);
    }
  };

  const cancelIntent = () => {
    if (prefetch === "intent") {
      setMaybePrefetch(false);
      setShouldPrefetch(false);
    }
  };

  React.useEffect(() => {
    if (maybePrefetch) {
      const id = setTimeout(() => {
        setShouldPrefetch(true);
      }, 100);
      return () => {
        clearTimeout(id);
      };
    }
  }, [maybePrefetch]);

  return [
    shouldPrefetch,
    ref,
    {
      onFocus: composeEventHandlers(onFocus, setIntent),
      onBlur: composeEventHandlers(onBlur, cancelIntent),
      onMouseEnter: composeEventHandlers(onMouseEnter, setIntent),
      onMouseLeave: composeEventHandlers(onMouseLeave, cancelIntent),
      onTouchStart: composeEventHandlers(onTouchStart, setIntent),
    },
  ];
}

function composeEventHandlers<EventType extends React.SyntheticEvent | Event>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theirHandler: ((event: EventType) => any) | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ourHandler: (event: EventType) => any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (event: EventType) => any {
  return (event) => {
    theirHandler && theirHandler(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeRefs<T = any>(
  ...refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

const ABSOLUTE_URL_REGEX = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, variant, size, prefetch = "none", ...props }, forwardedRef) => {
    const isAbsolute =
      typeof props.href === "string" && ABSOLUTE_URL_REGEX.test(props.href);
    const [shouldPrefetch, ref, prefetchHandlers] = usePrefetchBehavior(
      prefetch,
      props,
    );

    return (
      <>
        <AriaLink
          className={composeRenderProps(className, (className) =>
            cn(
              buttonVariants({
                variant,
                size,
                className,
              }),
            ),
          )}
          {...props}
          {...prefetchHandlers}
          ref={mergeRefs(forwardedRef, ref)}
        />
        {shouldPrefetch && props.href && !isAbsolute ? (
          <PrefetchPageLinks page={props.href} />
        ) : null}
      </>
    );
  },
);
Link.displayName = "Link";

export { Link };
export type { LinkProps };
