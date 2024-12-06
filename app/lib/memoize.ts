export function memoize0<T>(fn: () => T): () => T {
  let value: T;
  return () => {
    if (value) return value;
    value = fn();
    return value;
  };
}

export function memoizeBasic1<T extends string | boolean | number, R>(
  fn: (arg1: T) => R,
): (arg1: T) => R {
  const map = new Map<T, R>();
  return (arg) => {
    let value = map.get(arg);
    if (value) return value;
    value = fn(arg);
    map.set(arg, value);
    return value;
  };
}

export function memoizeObject1<T extends object, R>(fn: (arg1: T) => R): (arg1: T) => R {
  const map = new WeakMap<T, R>();
  return (arg) => {
    let value = map.get(arg);
    if (value) return value;
    value = fn(arg);
    map.set(arg, value);
    return value;
  };
}
