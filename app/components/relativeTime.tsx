import * as React from "react";
import { FormattedRelativeTime, useIntl } from "react-intl";

interface Props
  extends Omit<React.ComponentProps<typeof FormattedRelativeTime>, "value"> {
  value: string | Date;
}

/**
 * A component that returns an internationalized relative time string.
 * In English, this is something like "2 minutes ago".
 */
export function RelativeTime({
  numeric,
  updateIntervalInSeconds,
  value,
  ...rest
}: Props) {
  const date = React.useMemo(() => new Date(value), [value]);

  const [val, unit] = React.useMemo(() => {
    // Get the amount of seconds between the given date and now
    const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);

    // Array reprsenting one minute, hour, day, week, month, etc in seconds
    const cutoffs = [
      60,
      3_600,
      86_400,
      86_400 * 7,
      86_400 * 30,
      86_400 * 365,
      Infinity,
    ];

    // Array equivalent to the above but in the string representation of the units
    const units: Props["unit"][] = [
      "second",
      "minute",
      "hour",
      "day",
      "week",
      "month",
      "year",
    ];

    // Grab the ideal cutoff unit
    const unitIndex = cutoffs.findIndex(
      (cutoff) => cutoff > Math.abs(deltaSeconds),
    );

    // Get the divisor to divide from the seconds. E.g. if our unit is "day" our divisor
    // is one day in seconds, so we can divide our seconds by this to get the # of days
    const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;
    return [Math.floor(deltaSeconds / divisor), units[unitIndex]];
  }, [date]);

  const title = useClientOnlyTitle(date);

  return (
    <time dateTime={date.toJSON()} title={title}>
      <FormattedRelativeTime
        {...rest}
        value={val}
        unit={unit}
        numeric={numeric ?? "auto"}
        updateIntervalInSeconds={
          unit === "second" || unit === "minute"
            ? (updateIntervalInSeconds ?? 60)
            : undefined
        }
      />
    </time>
  );
}

/**
 * During the server render, the server won't format the title the same way the client does
 * because the two are often in different zones.
 *
 * This hook returns undefined on both the server render and the first client render. After that,
 * it returns the title formatted to the browser's locale.
 */
function useClientOnlyTitle(date: Date) {
  // title is undefined during server render and on the first client render
  const [title, setTitle] = React.useState<string | undefined>(undefined);
  const t = useIntl();

  // After the first client render, we can set the title formatted to the browser's locale.
  React.useEffect(() => {
    setTitle(t.formatDate(date, { dateStyle: "medium", timeStyle: "medium" }));
  }, [date, t]);

  return title;
}
