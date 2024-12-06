import * as React from "react";

export function useDevicePixelRatio() {
  const [currentDpr, setCurrentDpr] = React.useState(getDevicePixelRatio());

  React.useEffect(() => {
    const canListen = typeof window !== "undefined" && "matchMedia" in window;
    if (!canListen) {
      return;
    }

    const updateDpr = () => {
      setCurrentDpr(getDevicePixelRatio());
    };
    const mediaMatcher = window.matchMedia(`screen and (resolution: ${currentDpr}dppx)`);

    // Safari 13.1 does not have `addEventListener`, but does have `addListener`
    if (mediaMatcher.addEventListener) {
      mediaMatcher.addEventListener("change", updateDpr);
    } else {
      mediaMatcher.addListener(updateDpr);
    }

    return () => {
      if (mediaMatcher.removeEventListener) {
        mediaMatcher.removeEventListener("change", updateDpr);
      } else {
        mediaMatcher.removeListener(updateDpr);
      }
    };
  }, [currentDpr]);

  return currentDpr;
}

function getDevicePixelRatio() {
  const hasDprProp = typeof window !== "undefined" && typeof window.devicePixelRatio === "number";
  return hasDprProp ? window.devicePixelRatio : 1;
}
