import type { ReactNode } from "react";
import { ApplicationSidebar } from "~/components/nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Mark } from "./logo";

type Props = {
  children: ReactNode;
};

export function MainLayout({ children }: Props) {
  return (
    <div className="bg-[linear-gradient(192.82deg,rgba(48,32,76,0.25)_11.76%,rgba(39,33,75,0.25)_49.5%,rgba(25,37,81,0.25)_87.89%)]">
      <SidebarProvider>
        <ApplicationSidebar />
        <SidebarInset>
          <header className="relative flex h-12 max-w-[100vw] items-center px-4 lg:hidden">
            <SidebarTrigger className="-ml-1" />
            <div className="absolute inset-0 place-self-center self-center">
              <Mark className="h-6 w-auto" />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
