import * as React from "react";
import { useEvent } from "react-use-event-hook";

export function useDimensions() {
  const [state, setState] = React.useState({
    width: 0,
    height: 0,
  });
  const prevSizeRef = React.useRef<{ width?: number; height?: number }>({});
  const observerRef = React.useRef<ResizeObserver>();
  const ref = React.useRef<HTMLElement>();

  const unobserve = useEvent(() => {
    if (observerRef.current) observerRef.current.disconnect();
  });

  const observe = useEvent((element?: HTMLElement) => {
    if (element && element !== ref.current) {
      unobserve();
      ref.current = element;
      setState({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    }
    if (observerRef.current && ref.current) observerRef.current.observe(ref.current);
  });

  React.useEffect(() => {
    if (!("ResizeObserver" in window) || !("ResizeObserverEntry" in window)) {
      return () => null;
    }

    observerRef.current = new ResizeObserver(([entry]) => {
      const { contentBoxSize, borderBoxSize, contentRect } = entry;

      const boxSize = borderBoxSize?.[0] ?? contentBoxSize?.[0];

      const width = boxSize ? boxSize.inlineSize : contentRect.width;
      const height = boxSize ? boxSize.blockSize : contentRect.height;

      if (width === prevSizeRef.current.width && height === prevSizeRef.current.height) return;

      prevSizeRef.current = { width, height };
      setState({ width, height });
    });

    observe();
    return unobserve;
  }, [observe, unobserve]);

  return { ...state, observe, unobserve };
}
