import { useRouteLoaderData } from "@remix-run/react";
import { loader } from "~/root";
import { ProfileViewSimple } from "~/types";

export function useViewer(): ProfileViewSimple | null {
  const data = useRouteLoaderData<typeof loader>("root");
  if (!data) throw new Error("Mising root data");
  return data.viewer;
}
