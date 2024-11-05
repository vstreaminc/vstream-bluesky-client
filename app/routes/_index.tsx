import { type MetaFunction } from "@remix-run/node";
import { MainLayout } from "~/components/mainLayout";
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
    <MainLayout>
      <h1>VStream</h1>
      {viewer ? <pre>{JSON.stringify(viewer, null, 2)}</pre> : null}
    </MainLayout>
  );
}
