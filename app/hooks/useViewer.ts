import { useRouteLoaderData } from "react-router";
import type { loader } from "~/root";
import type { VStreamProfileViewSimple } from "~/types";

export function useViewer(): VStreamProfileViewSimple | null {
  const data = useRouteLoaderData<typeof loader>("root");
  if (!data) throw new Error("Mising root data");
  return data.viewer;
}
