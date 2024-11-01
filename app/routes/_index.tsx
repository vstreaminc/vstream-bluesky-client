import {
  type MetaFunction,
} from "@remix-run/node";
import { useViewer } from "~/hooks/useViewer";

export const meta: MetaFunction = () => {
  return [
    { title: "VStream" },
    { name: "description", content: "~~~Under Construction~~~" },
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
  ];
};

export default function Index() {
  const viewer = useViewer();

  return (
    <>
      <h1>VStream</h1>
      {viewer ? <pre>{JSON.stringify(viewer, null, 2)}</pre> : null}
    </>
  );
}
