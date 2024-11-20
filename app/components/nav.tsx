import * as React from "react";
import {
  FormattedDisplayName,
  FormattedMessage,
  IntlProvider,
} from "react-intl";
import {
  ChevronsUpDown,
  Compass,
  Cpu,
  Globe,
  House,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Link, useFetcher } from "@remix-run/react";
import { $path } from "remix-routes";
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
import { Logo } from "~/components/logo";
import { useViewer } from "~/hooks/useViewer";
import { ctas } from "~/lib/messages";
import { SUPPORTED_LOCALES } from "~/lib/locale";
import { useHydrated } from "~/hooks/useHydrated";
import { VStreamLocaleContext } from "./vstreamIntlProvider";

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
                <SidebarMenuButton size="lg" asChild>
                  <Link to={$path("/explore")} prefetch="intent">
                    <div>
                      <Compass className="size-6" />
                    </div>
                    <span className="text-lg">
                      <FormattedMessage
                        defaultMessage="Explore"
                        description="Link to explore page in main navigation"
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
              <div>
                <Logo className="h-auto w-fit" />
              </div>
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
        <span className="truncate text-xs">{viewer.handle}</span>
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
              <ColorSchemeSwitcher />
              <DropdownMenuSeparator />
              <LogoutItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function LogoutItem() {
  const logout = useFetcher();
  const ref = React.useRef<HTMLFormElement>(null);

  return (
    <logout.Form method="post" action="/auth/logout" ref={ref}>
      <DropdownMenuItem
        onClick={() => ref.current?.requestSubmit()}
        className="cursor-pointer"
      >
        <LogOut />
        <FormattedMessage {...ctas.logOut} />
      </DropdownMenuItem>
    </logout.Form>
  );
}

const LocaleSwitcher = React.memo(function LocaleSwitcher() {
  const locales = SUPPORTED_LOCALES.filter((l) => l.length !== 2);
  const { updateLocale } = React.useContext(VStreamLocaleContext);

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
            <DropdownMenuItem
              key={l}
              onClick={() => updateLocale(l)}
              className="cursor-pointer"
            >
              <IntlProvider locale={l}>
                <FormattedDisplayName type="language" value={l} />
              </IntlProvider>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
});

function ColorSchemeSwitcher() {
  const hydrated = useHydrated();
  const switchColorScheme = React.useCallback(
    (scheme: "dark" | "light" | null) => {
      switch (scheme) {
        case "dark":
          localStorage.setItem("theme", "dark");
          document.documentElement.classList.add("dark");
          break;
        case "light":
          localStorage.setItem("theme", "light");
          document.documentElement.classList.remove("dark");
          break;
        default:
          localStorage.removeItem("theme");
          if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          break;
      }
    },
    [],
  );

  if (!hydrated) return null;

  const prefersDarkMode =
    localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const Icon = prefersDarkMode ? Moon : Sun;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon />
        <FormattedMessage
          defaultMessage="Switch color scheme"
          description="CTA to switch the current color scheme"
        />
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            onClick={() => switchColorScheme("light")}
            className="cursor-pointer"
          >
            <Sun />
            <span>
              <FormattedMessage
                defaultMessage="Light mode"
                description="CTA to switch the application to the color scheme that is much lighter and brighter"
              />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => switchColorScheme("dark")}
            className="cursor-pointer"
          >
            <Moon />
            <span>
              <FormattedMessage
                defaultMessage="Dark mode"
                description="CTA to switch the application to the color scheme that is darker"
              />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => switchColorScheme(null)}
            className="cursor-pointer"
          >
            <Cpu />
            <span>
              <FormattedMessage
                defaultMessage="OS preference"
                description="CTA to switch the application to the color scheme that is controled by thier operating system"
              />
            </span>
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
