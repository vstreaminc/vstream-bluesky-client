import * as React from "react";
import type {
  LoaderFunctionArgs,
  MetaDescriptor,
  MetaFunction,
} from "@remix-run/node";
import type { Organization, WithContext } from "schema-dts";
import {
  Await,
  type ClientLoaderFunctionArgs,
  useLoaderData,
} from "@remix-run/react";
import { MainLayout } from "~/components/mainLayout";
import { PRODUCT_NAME } from "~/lib/constants";
import logoSvg from "~/imgs/logo.svg";
import { BooleanFilter } from "~/lib/utils";
import type { VStreamFeedViewPostSlice } from "~/types";
import { canonicalURL, hrefLangs } from "~/lib/linkHelpers";
import { Feed } from "~/components/feed";
import { loadFeed } from "~/hooks/useFeedData";
import { loader as fetchFeedSlices } from "./api.feed.$feed";

export const meta: MetaFunction<typeof loader> = (args) => {
  const metas: MetaDescriptor[] = [
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
    args.data?.title && { title: args.data.title },
    args.data?.canonicalURL && {
      tagName: "link",
      rel: "canonical",
      href: args.data.canonicalURL,
    },
    ...(args.data?.hrefLangs ?? []).map(({ locale, href }) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: locale,
      href,
    })),
  ].filter(BooleanFilter);

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
  const [t, { slices, cursor }] = await Promise.all([
    args.context.intl.t(),
    fetchFeedSlices({ ...args, params: { feed: "home" } }),
  ]);

  const title = t.formatMessage(
    {
      defaultMessage: "Home | {productName}",
      description: "Title for the home page of website",
    },
    { productName: PRODUCT_NAME },
  );

  return {
    title,
    slices,
    cursor,
    canonicalURL: canonicalURL(args.request.url, t.locale),
    hrefLangs: hrefLangs(args.request.url),
  };
}

export async function clientLoader(args: ClientLoaderFunctionArgs) {
  const cached = loadFeed(args.params.feed!)?.value;
  if (cached) {
    return {
      slices: cached.slices,
      cursor: cached.cursor,
      serverData: args.serverLoader<typeof loader>(),
    };
  }
  return args.serverLoader<typeof loader>();
}

export default function Index() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();

  return (
    <MainLayout>
      {"serverData" in data ? (
        <React.Suspense fallback={<FeedPage {...data} />}>
          <Await resolve={data.serverData}>
            {(data) => <FeedPage {...data} />}
          </Await>
        </React.Suspense>
      ) : (
        <FeedPage {...data} />
      )}
    </MainLayout>
  );
}

function FeedPage({
  cursor,
  slices,
}: {
  cursor?: string | undefined;
  slices: VStreamFeedViewPostSlice[];
}) {
  return <Feed name="home" initialSlices={slices} initialCursor={cursor} />;
}
