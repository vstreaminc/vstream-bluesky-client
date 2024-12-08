import { OAuthResolverError } from "@atproto/oauth-client-node";
import { isValidHandle } from "@atproto/syntax";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  type MetaDescriptor,
  redirect,
} from "@remix-run/node";
import { useActionData, useSubmit } from "@remix-run/react";
import { Form, Text } from "react-aria-components";
import { FormattedMessage, useIntl } from "react-intl";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input, JollyTextField } from "~/components/ui/textfield";
import { PRODUCT_NAME } from "~/lib/constants";
import { canonicalURL, hrefLangs } from "~/lib/linkHelpers";
import { ctas } from "~/lib/messages";
import { BooleanFilter } from "~/lib/utils";

export async function action({ request, context }: ActionFunctionArgs): Promise<{
  errors: Record<string, string>;
}> {
  const { handle } = Object.fromEntries(await request.formData());
  if (typeof handle !== "string" || !isValidHandle(handle)) {
    return { errors: { handle: "Handle is invalid" } };
  }

  let url: URL;
  try {
    url = await context.atProtoClient.authorize(handle);
  } catch (err) {
    console.error(err);
    return {
      errors: {
        _: err instanceof OAuthResolverError ? err.message : "couldn't initiate login",
      },
    };
  }
  throw redirect(url.toString());
}

export async function loader(args: LoaderFunctionArgs) {
  const t = await args.context.intl.t();
  const title = t.formatMessage(
    {
      defaultMessage: "Log in | {productName}",
      description: "Title for the log in page of website",
    },
    { productName: PRODUCT_NAME },
  );
  const description = t.formatMessage(
    {
      defaultMessage: "Log into your {productName} account",
      description: "Description for the explore page of website",
    },
    { productName: PRODUCT_NAME },
  );

  return {
    title,
    description,
    canonicalURL: canonicalURL(args.request.url, t.locale),
    hrefLangs: hrefLangs(args.request.url),
  };
}

export const meta: MetaFunction<typeof loader> = (args) => {
  const metas: MetaDescriptor[] = [
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
    args.data?.title && { title: args.data.title },
    args.data?.description && {
      name: "description",
      content: args.data.description,
    },
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

  return metas;
};

export default function Login() {
  const actionData = useActionData<typeof action>();
  const t = useIntl();
  const submit = useSubmit();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(e.currentTarget);
  };
  const genericError = actionData?.errors["_"] as string | undefined;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <Form method="post" validationErrors={actionData?.errors} onSubmit={onSubmit}>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">
              <FormattedMessage
                defaultMessage="Login into VStream"
                description="Header for the login page"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <JollyTextField
              id="handle"
              name="handle"
              type="text"
              label={t.formatMessage({
                defaultMessage: "BlueSky Handle",
                description: "Label of the handle input on login page",
              })}
              isRequired
            >
              <Input
                placeholder={t.formatMessage({
                  defaultMessage: "Enter your handle (eg alice.bsky.social)",
                  description: "Placeholder text for hande input on login page",
                })}
              />
            </JollyTextField>
            <div>
              <Text className="text-sm text-muted-foreground">
                <FormattedMessage
                  defaultMessage="Don’t have an account on BlueSky? <a>Sign up for Bluesky</a> to create one now!"
                  description="Description of the handle input on login page"
                  values={{
                    a: (nodes) => (
                      <a href="https://bsky.app" className="text-foreground underline">
                        {nodes}
                      </a>
                    ),
                  }}
                />
              </Text>
            </div>
          </CardContent>
          <CardFooter className="block">
            {genericError ? (
              <div className="mb-2 text-[0.8rem] font-medium text-destructive">{genericError}</div>
            ) : null}
            <Button type="submit" className="block w-full">
              <FormattedMessage {...ctas.logIn} />
            </Button>
          </CardFooter>
        </Card>
      </Form>
    </div>
  );
}
