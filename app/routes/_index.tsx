import * as React from "react";
import type {
  LoaderFunctionArgs,
  MetaDescriptor,
  MetaFunction,
} from "@remix-run/node";
import type { Organization, WithContext } from "schema-dts";
import { useLoaderData } from "@remix-run/react";
import { SECOND } from "@atproto/common";
import {
  type CacheSnapshot,
  WindowVirtualizer,
  type WindowVirtualizerHandle,
} from "virtua";
import { MainLayout } from "~/components/mainLayout";
import { PRODUCT_NAME } from "~/lib/constants";
import logoSvg from "~/imgs/logo.svg";
import { feedGenerator, hydrateFeedViewVStreamPost } from "~/lib/bsky.server";
import { FeedSlice } from "~/components/post";
import { take } from "~/lib/utils";

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
  const slices = await (
    await args.context.cache()
  ).getOrSet(
    "timeline",
    async () => {
      const gen = feedGenerator(
        (opts) => agent.app.bsky.feed.getTimeline(opts),
        agent.assertDid,
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
      return res;
    },
    {
      expiresIn: 5 * SECOND,
    },
  );

  const title = t.formatMessage(
    {
      defaultMessage: "Home | {productName}",
      description: "Title for the home page of website",
    },
    { productName: PRODUCT_NAME },
  );

  return { title, slices };
}

export default function Index() {
  const { slices } = useLoaderData<typeof loader>();
  const cacheKey = "window-list-cache-home";
  const ref = React.useRef<WindowVirtualizerHandle>(null);
  const cache = React.useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const serialized = sessionStorage.getItem(cacheKey);
    if (!serialized) return undefined;
    try {
      return JSON.parse(serialized) as CacheSnapshot;
    } catch (e) {
      return undefined;
    }
  }, []);

  React.useLayoutEffect(() => {
    const handle = ref.current;
    if (!handle) return;
    return () => {
      sessionStorage.setItem(cacheKey, JSON.stringify(handle.cache));
    };
  }, []);

  return (
    <MainLayout>
      <div className="mx-auto w-full max-w-[100vw] md:max-w-[42.5rem]">
        <WindowVirtualizer
          ref={ref}
          cache={cache}
          count={slices.length}
          itemSize={200}
          ssrCount={Math.min(slices.length, 10)}
        >
          {(idx) => {
            const s = slices[idx];
            return (
              <FeedSlice
                key={s._reactKey}
                hideTopBorder={idx === 0}
                slice={s}
              />
            );
          }}
        </WindowVirtualizer>
      </div>
    </MainLayout>
  );
}
