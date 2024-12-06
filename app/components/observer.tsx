import type { ReactNode } from "react";
import { useInView } from "react-intersection-observer";
import { FormattedMessage } from "react-intl";

type Props = {
  onLoad: () => void;
  shouldLoad?: boolean;
  margin?: string;
  children?: ReactNode;
};

/**
 * Component to call an onLoad event when it's in the user's viewport
 */
export function ObserverLoader(props: Props) {
  const { shouldLoad = true, onLoad, margin = "100px" } = props;
  const children = props.children ?? (
    <div>
      <FormattedMessage
        defaultMessage="Loading..."
        description="Message shown while loading new items into a list"
      />
    </div>
  );
  const { ref } = useInView({
    rootMargin: margin,
    onChange: (inView: boolean) => {
      if (inView) {
        onLoad();
      }
    },
  });

  if (!shouldLoad) {
    return null;
  }

  return (
    <>
      <div ref={ref} />
      {/* The empty <div /> around the spinner stops the parent container from changing size while the spinner spins */}
      <div className="flex w-full flex-col items-center justify-center p-4">{children}</div>
    </>
  );
}
