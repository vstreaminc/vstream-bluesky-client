import * as React from "react";
import {
  FormattedDisplayName,
  FormattedMessage,
  IntlProvider,
} from "react-intl";
import { ChevronsUpDown, Globe, House, LogOut } from "lucide-react";
import { Link } from "@remix-run/react";
import logoSvg from "~/imgs/logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useViewer } from "~/hooks/useViewer";
import { ctas } from "~/lib/messages";
import { SUPPORTED_LOCALES } from "~/lib/locale";

export function ApplicationSidebar() {
  return (
    <Sidebar>
      <ApplicationSidebarHeader />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link to="/" prefetch="intent">
                    <div>
                      <House className="size-6" />
                    </div>
                    <span className="text-lg">
                      <FormattedMessage
                        defaultMessage="Home"
                        description="Name of root page of application"
                      />
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <ApplicationSidebarFooter />
    </Sidebar>
  );
}

function ApplicationSidebarHeader() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link to="/">
              <img className="h-auto w-fit" src={logoSvg} alt="" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

function ApplicationSidebarFooter() {
  const viewer = useViewer();
  if (!viewer) return null;

  const avatar = (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={viewer.avatar} alt={viewer.displayName} />
        <AvatarFallback className="rounded-lg">@</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">
          {viewer.displayName ?? ""}
        </span>
        <span className="truncate text-xs">@{viewer.handle}</span>
      </div>
    </>
  );

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {avatar}
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  {avatar}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <LocaleSwitcher />
              <DropdownMenuItem>
                <LogOut />
                <FormattedMessage {...ctas.logOut} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

const LocaleSwitcher = React.memo(function LocaleSwitcher() {
  const locales = SUPPORTED_LOCALES.filter((l) => l.length !== 2);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe />
        <FormattedMessage
          defaultMessage="Switch locale"
          description="CTA to switch the current locale"
        />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {locales.map((l) => (
            <DropdownMenuItem key={l}>
              <span>
                <IntlProvider locale={l}>
                  <FormattedDisplayName type="language" value={l} />
                </IntlProvider>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
});
