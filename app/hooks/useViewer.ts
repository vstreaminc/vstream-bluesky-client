import { useRouteLoaderData } from "@remix-run/react";
import { loader } from "~/root";

export function useViewer() {
  const data = useRouteLoaderData<typeof loader>("root");
  if (!data) throw new Error("Mising root data");
  return data.viewer;
}
