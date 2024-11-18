import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function take<T>(
  iter: AsyncIterableIterator<T>,
  num: number,
): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iter) {
    items.push(item);
    if (items.length >= num) break;
  }
  return items;
}

/**
 * Typesafe omit function
 */
export function omit<T extends object, K extends [...(keyof T)[]]>(
  obj: T,
  keys: K,
): {
  [K2 in Exclude<keyof T, K[number]>]: T[K2];
} {
  const ret = {} as {
    [K in keyof typeof obj]: (typeof obj)[K];
  };
  let key: keyof typeof obj;
  for (key in obj) {
    if (!keys.includes(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

/**
 * Typesafe pick function
 */
export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const ret = {} as {
    [K in keyof typeof obj]: (typeof obj)[K];
  };
  keys.forEach((key) => {
    ret[key] = obj[key];
  });
  return ret;
}

type Truthy<T> = T extends false | "" | 0 | null | undefined ? never : T;
export function BooleanFilter<T>(value: T): value is Truthy<T> {
  return Boolean(value);
}
