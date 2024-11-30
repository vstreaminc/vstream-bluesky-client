import * as React from "react";
import { useFetcher } from "@remix-run/react";
import { useHover } from "@react-aria/interactions";
import { FormattedMessage } from "react-intl";
import { $path } from "remix-routes";
import { Popover } from "react-aria-components";
import { handleOrDid } from "~/lib/utils";
import type { loader as profileApiLoader } from "~/routes/api.profile.$handleOrDid";
import type { VStreamProfileViewSimple } from "~/types";
import { linkToProfile } from "~/lib/linkHelpers";
import { Avatar, AvatarImage } from "./ui/avatar";
import { DescriptionAutoLinker } from "./descriptionAutoLinker";
import { UnstyledLink } from "./ui/link";
import { FollowButton } from "./followButton";

type Profile = Partial<VStreamProfileViewSimple> & {
  did: string;
  handle: string;
};

type Props = {
  profile: Profile;
  children: (props: Record<string, unknown>) => React.ReactNode;
};

export function ProfileFlyout(props: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isHighlightHovered, setIsHighlightHovered] = React.useState(false);
  const { isHovered: isChildrenHovered, hoverProps } = useHover({});
  const triggerRef = React.useRef(null);

  React.useEffect(() => {
    let timerID: number | undefined;
    const shouldBeOpen = isHighlightHovered || isChildrenHovered;
    if (shouldBeOpen && !isOpen) {
      timerID = window.setTimeout(() => {
        setIsOpen(true);
      }, 500);
    } else if (!shouldBeOpen && isOpen) {
      timerID = window.setTimeout(() => {
        setIsOpen(false);
      }, 250);
    }

    return () => {
      window.clearTimeout(timerID);
    };
  }, [isOpen, isHighlightHovered, isChildrenHovered]);

  return (
    <>
      {props.children({ ref: triggerRef, ...hoverProps })}
      <Popover
        placement="bottom left"
        triggerRef={triggerRef}
        isOpen={isOpen}
        isNonModal
        isKeyboardDismissDisabled
      >
        <div className="w-[18.75rem] bg-muted shadow-2xl shadow-black data-[exiting]:duration-300 data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0">
          <ProfileCard
            profile={props.profile}
            onHoverChange={setIsHighlightHovered}
          />
        </div>
      </Popover>
    </>
  );
}

interface ProfileCardProps {
  profile: Profile;
  onAvatarClicked?: () => void;
  onChannelFollowed?: () => void;
  onDisplayNameClicked?: () => void;
  onHoverChange?: (isHovered: boolean) => void;
  onUsernameClicked?: () => void;
}

/**
 * Renders a profile "card"/popover with profile details
 */
function ProfileCard(props: ProfileCardProps) {
  const { load, data: serverProfile } = useFetcher<typeof profileApiLoader>({
    key: `flyout-${props.profile.did}`,
  });
  const { hoverProps } = useHover({ onHoverChange: props.onHoverChange });
  const profileApiPath = $path("/api/profile/:handleOrDid", {
    handleOrDid: handleOrDid(props.profile),
  });
  const profileLink = linkToProfile(props.profile);

  const profile = serverProfile ?? props.profile;
  // TODO: Figure out how to get these back
  const pronouns: string[] = [];

  React.useEffect(() => {
    load(profileApiPath);
  }, [load, profileApiPath]);

  return (
    <div className="hidden md:block" {...hoverProps}>
      <div
        className="bg-black/4 aspect-[3/1] w-full rounded-t-md bg-cover bg-center"
        style={{
          maxHeight: "100px",
          backgroundImage: profile.banner
            ? `linear-gradient(rgba(0,0,0,0.527),rgba(0,0,0,0.5)),url(${profile.banner})`
            : undefined,
        }}
      />
      <div className="flex -translate-y-8 flex-col gap-2 px-4 py-0">
        <div className="flex">
          <UnstyledLink
            href={profileLink}
            className="inline-block"
            onPress={props.onAvatarClicked}
          >
            <Avatar className="size-20 border-4 border-muted">
              <AvatarImage alt={profile.displayName} src={profile.avatar} />
            </Avatar>
          </UnstyledLink>
          {profile.viewer ? (
            <FollowButton
              profile={profile as VStreamProfileViewSimple}
              size="sm"
              className="ml-auto translate-y-10"
            />
          ) : null}
        </div>
        <div className="flex flex-col">
          <h3 className="truncate font-semibold">
            <UnstyledLink
              href={profileLink}
              onPress={props.onDisplayNameClicked}
            >
              {profile.displayName}{" "}
            </UnstyledLink>
            {pronouns.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                ({pronouns.join("/")})
              </span>
            ) : null}
          </h3>
          <div className="text-sm text-muted-foreground">{profile.handle}</div>
        </div>
        {profile.description ? (
          <div className="line-clamp-6 text-xs">
            <DescriptionAutoLinker description={profile.description} />
          </div>
        ) : null}
        <div className="flex gap-3">
          {typeof profile.followersCount === "number" ? (
            <UnstyledLink className="cursor-pointer text-sm text-muted-foreground">
              <FormattedMessage
                description="Explains how many followers this channel has"
                defaultMessage="<b>{followerCount, number, ::compact-short}</b> {followerCount, plural, one {follower} other {followers}}"
                values={{
                  b: (chunks) => (
                    <span className="text-foreground">{chunks}</span>
                  ),
                  followerCount: profile.followersCount,
                }}
              />
            </UnstyledLink>
          ) : null}
          {typeof profile.followsCount === "number" ? (
            <UnstyledLink className="cursor-pointer text-sm text-muted-foreground">
              <FormattedMessage
                description="Explains how many channels _this_ channel follows"
                defaultMessage="<b>{followingCount, number, ::compact-short}</b> following"
                values={{
                  b: (chunks) => (
                    <span className="text-foreground">{chunks}</span>
                  ),
                  followingCount: profile.followsCount,
                }}
              />
            </UnstyledLink>
          ) : null}
        </div>
      </div>
      {/* TODO: Bring this back */}
      {/* eslint-disable-next-line no-constant-condition */}
      {false ? (
        <div className="border-t-regular border-stroke-100 p-3">
          <FollowingSince value={null} />
        </div>
      ) : null}
    </div>
  );
}

function FollowingSince({ value }: { value: string | null | undefined }) {
  const since = React.useMemo(() => (value ? new Date(value) : null), [value]);

  return (
    <span className="text-sm">
      {since ? (
        <>
          <span className="font-emoji">&#x2764;&#xfe0f;</span>{" "}
          <FormattedMessage
            description="Lets a user know that this other user has been following another channel from some time"
            defaultMessage="Following since {since, date, long}"
            values={{ since }}
          />
        </>
      ) : (
        <>
          <span className="font-emoji">&#x2764;&#xfe0f;</span>{" "}
          <FormattedMessage
            description="Lets a user know that this other user has been following another channel since forever"
            defaultMessage="Following since the beginning of time"
          />
        </>
      )}
    </span>
  );
}
