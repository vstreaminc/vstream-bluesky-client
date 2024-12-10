import { useCallback, useEffect, useSyncExternalStore } from "react";
import { $path } from "safe-routes";
import { useFetcher } from "react-router";
import type { VStreamProfileViewSimple } from "~/types";
import type { loader as profileApiLoader } from "~/routes/api/load-profile";
import { handleOrDid } from "~/lib/utils";

type Listener = () => void;

const profileDB = new Map<string, { listeners: Listener[]; value?: VStreamProfileViewSimple }>();

export function loadProfile(handleOrDid: string) {
  return profileDB.get(handleOrDid)?.value;
}

export function saveProfile(handleOrDid: string, profile: VStreamProfileViewSimple) {
  let db = profileDB.get(handleOrDid);
  if (db === undefined) {
    db = { value: profile, listeners: [] };
    profileDB.set(handleOrDid, db);
  }
  db.value = profile;

  for (const listener of db.listeners) {
    listener();
  }
}

/**
 * Returns a full profile from a potential partial profile
 *
 * This function will load the profile first from the client cache, then if it
 * doesn't exist there it will load the profile from the API instead then
 * backfill the client cache for future loads.
 */
export function useLoadedProfile<T extends { did: string; handle: string }>(
  profile: T,
): VStreamProfileViewSimple | undefined {
  const key = handleOrDid(profile);

  const subscribe = useCallback(
    (listener: Listener) => {
      let db = profileDB.get(key);
      if (db === undefined) {
        db = { listeners: [] };
        profileDB.set(key, db);
      }
      db.listeners.push(listener);
      return () => {
        db.listeners = db.listeners.filter((l) => l !== listener);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    return profileDB.get(key)?.value;
  }, [key]);

  const clientProfile = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const { load, data: serverProfile } = useFetcher<typeof profileApiLoader>({
    key: `flyout-${profile.did}`,
  });

  const profileApiPath = $path("/api/profile/:handleOrDid", {
    handleOrDid: key,
  });

  useEffect(() => {
    if (!clientProfile) {
      load(profileApiPath);
    }
  }, [load, profileApiPath, clientProfile]);

  useEffect(() => {
    if (serverProfile) {
      saveProfile(key, serverProfile);
    }
  }, [key, serverProfile]);

  return serverProfile ?? clientProfile;
}
