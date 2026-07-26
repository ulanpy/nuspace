import { useEffect, useState } from "react"

/**
 * A value that only catches up once it stops changing.
 *
 * Search boxes drive a network request per keystroke otherwise. Debouncing the
 * value rather than the handler keeps the input itself immediate — the field
 * updates as fast as it is typed, and only the query lags behind.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value)
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delayMs])

  return settled
}
