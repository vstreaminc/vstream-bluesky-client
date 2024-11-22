import * as React from "react";
import type {
  LoaderFunctionArgs,
  MetaDescriptor,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/node";
import type { Organization, WithContext } from "schema-dts";
import {
  Await,
  type ClientLoaderFunctionArgs,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { SECOND } from "@atproto/common";
import { WindowVirtualizer } from "virtua";
import { useEvent } from "react-use-event-hook";
import { MainLayout } from "~/components/mainLayout";
import { PRODUCT_NAME } from "~/lib/constants";
import logoSvg from "~/imgs/logo.svg";
import { feedGenerator, hydrateFeedViewVStreamPost } from "~/lib/bsky.server";
import { FeedSlice } from "~/components/post";
import { take } from "~/lib/utils";
import { useWindowVirtualizeCached } from "~/hooks/useWindowVirtualizeCached";
import type { VStreamFeedViewPostSlice } from "~/types";

export type SearchParams = {
  cursor?: string;
};

export const meta: MetaFunction<typeof loader> = (args) => {
  const metas: MetaDescriptor[] = [
    { title: args.data?.title ?? PRODUCT_NAME },
    { name: "description", content: "~~~Under Construction~~~" },
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
  ];

  // https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox
  // https://developers.google.com/search/docs/appearance/site-names
  // https://schema.org/WebPage
  // TODO: Bring this back when search is implmented
  // const ldWebSite: WithContext<WebSite> = {
  //   "@context": "https://schema.org",
  //   "@type": "WebSite",
  //   name: PRODUCT_NAME,
  //   potentialAction: {
  //     "@type": "SearchAction",
  //     target: {
  //       "@type": "EntryPoint",
  //       urlTemplate: "https://vstream.com/search?q={search_term_string}",
  //     },
  //     // @ts-expect-error Does not know this is required
  //     "query-input": "required name=search_term_string",
  //   },
  //   url: "https://vstream.com",
  // };

  // https://developers.google.com/search/docs/appearance/structured-data/logo
  // https://schema.org/Organization
  const ldOrg: WithContext<Organization> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    founders: [
      {
        "@type": "Person",
        familyName: "Koslow",
        givenName: "Eric",
        image:
          "https://pbs.twimg.com/profile_images/1540529950939156480/bet_J3yK_400x400.jpg",
        jobTitle: "CEO",
        name: "Eric Koslow",
      },
      {
        "@type": "Person",
        familyName: "Jikan",
        givenName: "E",
        image:
          "https://pbs.twimg.com/profile_images/1497678405478670339/cLcWqzUl_400x400.jpg",
        name: "E Jikan",
      },
    ],
    foundingDate: "2022-04-04",
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "US",
        addressRegion: "Califonia",
        addressLocality: "San Francisco",
      },
    },
    logo: "https://vstream.com" + logoSvg,
    name: PRODUCT_NAME,
    sameAs: [
      "https://twitter.com/vstream_en",
      "https://twitter.com/vstream_jp",
      "https://www.linkedin.com/company/vstreaminc",
    ],
    url: "https://vstream.com",
  };

  metas.push({ "script:ld+json": [/* ldWebSite, */ ldOrg] });

  return metas;
};

export async function loader(args: LoaderFunctionArgs) {
  const [agent, t] = await Promise.all([
    args.context.requireLoggedInUser(),
    args.context.intl.t(),
  ]);
  const cursorFromQuery =
    new URLSearchParams(args.request.url.split("?")[1]).get("cursor") ??
    undefined;

  async function getSlices(cursor?: string): Promise<{
    slices: VStreamFeedViewPostSlice[];
    cursor: string | undefined;
  }> {
    const gen = feedGenerator(
      (opts) => agent.getTimeline(opts),
      agent.assertDid,
      cursor,
    );
    const res = await take(gen, 20);
    const finders = {
      getProfile: (did: string) =>
        args.context.bsky.cachedFindProfile(agent, did),
    };
    await Promise.all(
      res.flatMap((slice) =>
        slice.items.map((post) => hydrateFeedViewVStreamPost(post, finders)),
      ),
    );
    return { slices: res, cursor: gen.cursor };
  }

  const { slices, cursor } = await (cursorFromQuery
    ? getSlices(cursorFromQuery)
    : // Only cache when not using a cursor
      (await args.context.cache()).getOrSet("timeline", getSlices, {
        expiresIn: 5 * SECOND,
      }));
  const title = t.formatMessage(
    {
      defaultMessage: "Home | {productName}",
      description: "Title for the home page of website",
    },
    { productName: PRODUCT_NAME },
  );

  return { title, slices, cursor };
}

const cache = new Map<string, SerializeFrom<typeof loader>>();

export async function clientLoader(args: ClientLoaderFunctionArgs) {
  const queryParams = new URLSearchParams(args.request.url.split("?")[1]);
  const cursor = queryParams.get("cursor");
  queryParams.delete("cursor");
  queryParams.delete("index");
  const cacheKey = queryParams.toString();
  if (cursor) {
    const res = await args.serverLoader<typeof loader>();
    const cached = cache.get(cacheKey);
    if (cached) {
      cached.slices.push(...res.slices);
      cached.cursor = res.cursor;
    }
    return res;
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      serverData: args.serverLoader<typeof loader>().then((res) => {
        const slices = mergeSlices(cached.slices, res.slices);
        const toReturn = {
          ...res,
          slices,
          cursor: cached.cursor,
        };
        cache.set(cacheKey, toReturn);
        return toReturn;
      }),
    };
  }
  const res = await args.serverLoader<typeof loader>();
  cache.set(cacheKey, res);
  return res;
}

clientLoader.hydrate = true;

export default function Index() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();

  return (
    <MainLayout>
      {"serverData" in data ? (
        <React.Suspense fallback={<FeedPage feed="home" {...data} />}>
          <Await resolve={data.serverData}>
            {(data) => <FeedPage feed="home" {...data} />}
          </Await>
        </React.Suspense>
      ) : (
        <FeedPage feed="home" {...data} />
      )}
    </MainLayout>
  );
}

function FeedPage({
  feed,
  ...props
}: {
  cursor?: string | undefined;
  slices: VStreamFeedViewPostSlice[];
  feed: "home";
}) {
  const [slices, setSlices] = React.useState(props.slices);
  const [cursor, setCusor] = React.useState(props.cursor);
  const count = slices.length;
  const { data, load } = useFetcher<typeof loader>({ key: `feed-${feed}` });
  const { cache, ref } = useWindowVirtualizeCached(feed, slices[0]._reactKey);
  const fetchedCountRef = React.useRef(-1);
  const onScroll = useEvent(async () => {
    if (!ref.current) return;
    if (
      fetchedCountRef.current < count &&
      ref.current.findEndIndex() + 10 > count
    ) {
      fetchedCountRef.current = count;
      load(`/?index&cursor=${cursor}`);
    }
  });
  React.useEffect(() => {
    if (!data) return;
    setCusor(data.cursor);
    setSlices((slices) => [...slices, ...data.slices]);
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-[100vw] md:max-w-[42.5rem]">
      <WindowVirtualizer
        ref={ref}
        cache={cache}
        itemSize={500}
        ssrCount={10}
        onScroll={onScroll}
      >
        {slices.map((s, idx) => (
          <FeedSlice key={s._reactKey} hideTopBorder={idx === 0} slice={s} />
        ))}
      </WindowVirtualizer>
    </div>
  );
}

function mergeSlices(
  cachedSlices: VStreamFeedViewPostSlice[],
  incomingSlices: VStreamFeedViewPostSlice[],
): VStreamFeedViewPostSlice[] {
  const toReturn: VStreamFeedViewPostSlice[] = [];
  let cachedIdx = 0;
  for (let idx = 0; idx < incomingSlices.length; idx++) {
    const cached = cachedSlices[cachedIdx];
    const incoming = incomingSlices[idx];

    // If match, it's a duplicate and we can add the cached item (which may have
    // WeakMap cached applied to it) to the final list
    if (incoming._reactKey === cached?._reactKey) {
      toReturn.push(cached);
      cachedIdx += 1;
      continue;
    }

    // It's a new item at the start of the list
    toReturn.push(incoming);
  }

  // Add the last parts of the cached list
  toReturn.push(...cachedSlices.slice(cachedIdx));

  return toReturn;
}
