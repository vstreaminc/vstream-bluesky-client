import type {
  LoaderFunctionArgs,
  MetaDescriptor,
  MetaFunction,
} from "@remix-run/node";
import type { Organization, WithContext } from "schema-dts";
import { MainLayout } from "~/components/mainLayout";
import { useViewer } from "~/hooks/useViewer";
import { PRODUCT_NAME } from "~/lib/constants";
import logoSvg from "~/imgs/logo.svg";

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
  const t = await args.context.intl.t();
  const title = t.formatMessage(
    {
      defaultMessage: "Home | {productName}",
      description: "Title for the home page of website",
    },
    { productName: PRODUCT_NAME },
  );

  return { title };
}

export default function Index() {
  const viewer = useViewer();

  return (
    <MainLayout>
      <h1>{PRODUCT_NAME}</h1>
      {viewer ? <pre>{JSON.stringify(viewer, null, 2)}</pre> : null}
    </MainLayout>
  );
}
