import type { ReactNode } from "react";
import { Navbar } from "~/components/nav";

type Props = {
  children: ReactNode;
};

export function MainLayout({ children }: Props) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
