import { useCallback, useState } from 'react';

/**
 * State mirrored to localStorage (JSON). Validates parsed values before use.
 */
export function useLocalStorageState<T>(
  storageKey: string,
  defaultValue: T,
  validate: (parsed: unknown) => parsed is T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw == null) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      if (validate(parsed)) return parsed;
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setPersisted = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* quota / private mode */
        }
        return next;
      });
    },
    [storageKey],
  );

  return [state, setPersisted];
}
