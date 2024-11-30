import { type ReactNode, useCallback } from "react";
import { useIntl } from "react-intl";
import type { VariantProps } from "class-variance-authority";
import type { VStreamProfileViewSimple } from "~/types";
import { cn } from "~/lib/utils";
import { useFollowingState } from "~/hooks/useFollowingState";
import { Button, type buttonVariants } from "./ui/button";

export function FollowButton({
  profile,
  size,
  ...props
}: {
  className?: string;
  profile: VStreamProfileViewSimple;
  size?: VariantProps<typeof buttonVariants>["size"];
}) {
  const t = useIntl();
  const [viewerFollowsProfile, setViewerFollowsProfile] = useFollowingState(
    profile.did,
    !!profile.viewer.following,
  );
  const profileFollowsViewer = !!profile.viewer.followedBy;

  const onPress = useCallback(() => {
    setViewerFollowsProfile(!viewerFollowsProfile);
  }, [viewerFollowsProfile, setViewerFollowsProfile]);

  let children: ReactNode;
  let varient: VariantProps<typeof buttonVariants>["variant"];
  let className: string | undefined;
  if (viewerFollowsProfile && profileFollowsViewer) {
    className = "bg-pink-400 data-[hovered]:bg-pink-400/80";
    children = t.formatMessage(
      {
        defaultMessage: "<emoji></emoji> Mutuals",
        description: "Follow button text when users both follow one another",
      },
      {
        emoji: () => <span className="font-emoji mr-1">&#x2764;&#xfe0f;</span>,
      },
    );
  } else if (viewerFollowsProfile) {
    varient = "secondary";
    children = t.formatMessage({
      defaultMessage: "Following",
      description:
        "Follow button text when the current user follows the profile",
    });
  } else if (profileFollowsViewer) {
    children = t.formatMessage({
      defaultMessage: "Follow back",
      description:
        "Follow button text when the current user does not follow the profile, but the profile follows the current user",
    });
  } else {
    children = t.formatMessage({
      defaultMessage: "Follow",
      description:
        "Follow button text when the current user does not follow the profile",
    });
  }

  return (
    <Button
      className={cn(className, props.className)}
      onPress={onPress}
      size={size}
      variant={varient}
    >
      {children}
    </Button>
  );
}
