import { useEffect, useState } from "react";

/**
 * Hook to load an external script
 *
 * Ensures the script is only loaded once
 */
export function useExternalScript(src: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    let shouldAppend = false;
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      shouldAppend = true;
    } else if (script.hasAttribute("data-loaded")) {
      setLoaded(true);
      return;
    }

    const onScriptLoaded = () => {
      script.setAttribute("data-loaded", "true");
      setLoaded(true);
    };

    script.addEventListener("load", onScriptLoaded);

    if (shouldAppend) {
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", onScriptLoaded);
    };
  }, [src]);

  return loaded;
}
