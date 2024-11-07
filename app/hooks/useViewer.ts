import { useRouteLoaderData } from "@remix-run/react";
import { loader } from "~/root";
import { ProfileViewVStreamSimple } from "~/types";

export function useViewer(): ProfileViewVStreamSimple | null {
  const data = useRouteLoaderData<typeof loader>("root");
  if (!data) throw new Error("Mising root data");
  return data.viewer;
}
