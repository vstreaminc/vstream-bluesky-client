import { OAuthResolverError } from "@atproto/oauth-client-node";
import { isValidHandle } from "@atproto/syntax";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useActionData, useSubmit } from "@remix-run/react";
import { Form, Text } from "react-aria-components";
import { FormattedMessage, useIntl } from "react-intl";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input, JollyTextField } from "~/components/ui/textfield";
import { ctas } from "~/lib/messages";

export async function action({ request, context }: ActionFunctionArgs) {
  const { handle } = Object.fromEntries(await request.formData());
  if (typeof handle !== "string" || !isValidHandle(handle)) {
    return json({ errors: { handle: "Handle is invalid" } });
  }

  try {
    const url = await context.atProtoClient.authorize(handle);
    return redirect(url.toString());
  } catch (err) {
    console.error(err);
    return json({
      errors: {
        _:
          err instanceof OAuthResolverError
            ? err.message
            : "couldn't initiate login",
      },
    });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const t = useIntl();
  const submit = useSubmit();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(e.currentTarget);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background px-4">
      <Form
        method="post"
        validationErrors={actionData?.errors}
        onSubmit={onSubmit}
      >
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
                      <a
                        href="https://bsky.app"
                        className="text-foreground underline"
                      >
                        {nodes}
                      </a>
                    ),
                  }}
                />
              </Text>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              <FormattedMessage {...ctas.logIn} />
            </Button>
          </CardFooter>
        </Card>
      </Form>
    </div>
  );
}
