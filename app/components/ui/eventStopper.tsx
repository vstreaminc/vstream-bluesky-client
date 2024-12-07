import { useCallback, type ReactNode } from "react";

/**
 * This utility function captures events and stops them from propagating upwards. fadfdafdsajfadslfjadldjlkfdjlfkjdaslfdsja
 */
export function EventStopper({
  children,
  className,
  id,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stop = useCallback((e: any) => {
    e.stopPropagation();
  }, []);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div id={id} onClick={stop} onKeyDown={stop} className={className}>
      {children}
    </div>
  );
}
