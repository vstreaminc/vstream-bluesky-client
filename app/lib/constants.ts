import type {
  BskyPreferences,
  LabelPreference,
  ModerationPrefs,
} from "@atproto/api";

export const PRODUCT_NAME = "VStream";
export const TWITTER_HANDLE_EN = "@vstream_en";

/**
 * More strict than our default settings for logged in users.
 */
export const DEFAULT_LOGGED_OUT_LABEL_PREFERENCES: Record<
  string,
  LabelPreference
> = {
  porn: "hide",
  sexual: "hide",
  nudity: "hide",
  "graphic-media": "hide",
};

export const DEFAULT_LOGGED_OUT_MODERATION_PREFERENCES: ModerationPrefs = {
  adultContentEnabled: false,
  labels: DEFAULT_LOGGED_OUT_LABEL_PREFERENCES,
  labelers: [],
  mutedWords: [],
  hiddenPosts: [],
};

export const DEFAULT_LOGGED_OUT_PREFERENCES: BskyPreferences = {
  birthDate: new Date("2022-11-17"),
  moderationPrefs: DEFAULT_LOGGED_OUT_MODERATION_PREFERENCES,
  interests: { tags: [] },
  savedFeeds: [],
  feeds: {},
  feedViewPrefs: {},
  threadViewPrefs: {
    sort: "newest",
    prioritizeFollowedUsers: true,
  },
  bskyAppState: {
    queuedNudges: [],
    activeProgressGuide: undefined,
    nuxs: [],
  },
};
