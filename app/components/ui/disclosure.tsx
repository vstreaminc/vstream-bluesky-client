"use client";

import { useContext } from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import {
  UNSTABLE_Disclosure as AriaDisclosure,
  UNSTABLE_DisclosureGroup as AriaDisclosureGroup,
  type DisclosureGroupProps as AriaDisclosureGroupProps,
  UNSTABLE_DisclosurePanel as AriaDisclosurePanel,
  type DisclosurePanelProps as AriaDisclosurePanelProps,
  type DisclosureProps as AriaDisclosureProps,
  Button,
  type ButtonProps,
  composeRenderProps,
  DisclosureGroupStateContext,
  Heading,
} from "react-aria-components";
import { cn } from "~/lib/utils";

export interface DisclosureProps extends AriaDisclosureProps {
  children: React.ReactNode;
}

function Disclosure({ children, className, ...props }: DisclosureProps) {
  const isInGroup = useContext(DisclosureGroupStateContext) !== null;
  return (
    <AriaDisclosure
      {...props}
      className={composeRenderProps(className, (className, _renderProps) =>
        cn("group min-w-64", isInGroup && "border-0 border-b last:border-b-0", className),
      )}
    >
      {children}
    </AriaDisclosure>
  );
}

export interface DisclosureHeaderProps {
  children: React.ReactNode;
  className?: ButtonProps["className"];
  Icon?: React.ComponentType<React.ComponentProps<typeof ChevronDownIcon>>;
}

function DisclosureHeader({ children, className, Icon = ChevronDownIcon }: DisclosureHeaderProps) {
  return (
    <Heading className="flex">
      <Button
        slot="trigger"
        className={composeRenderProps(className, (className) => {
          return cn(
            "group flex flex-1 items-center justify-between rounded-md py-4 text-sm font-medium ring-offset-background transition-all hover:underline",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2",
            "outline-none",
            className,
          );
        })}
      >
        {children}
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            "group-data-[expanded]:rotate-180",
            "group-data-[disabled]:opacity-50",
          )}
        />
      </Button>
    </Heading>
  );
}

export interface DisclosurePanelProps extends AriaDisclosurePanelProps {
  children: React.ReactNode;
}

function DisclosurePanel({ children, className, ...props }: DisclosurePanelProps) {
  return (
    <AriaDisclosurePanel {...props} className={"overflow-hidden text-sm transition-all"}>
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AriaDisclosurePanel>
  );
}

export interface DisclosureGroupProps extends AriaDisclosureGroupProps {
  children: React.ReactNode;
}

function DisclosureGroup({ children, className, ...props }: DisclosureGroupProps) {
  return (
    <AriaDisclosureGroup
      {...props}
      className={composeRenderProps(className, (className, _renderProps) => cn("", className))}
    >
      {children}
    </AriaDisclosureGroup>
  );
}

export const UnstyledDisclosure = AriaDisclosure;
export const UnstyledDisclosurePanel = AriaDisclosurePanel;

export { Disclosure, DisclosureHeader, DisclosurePanel, DisclosureGroup };
