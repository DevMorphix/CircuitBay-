import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// Loads GET /api<path> after mount. `reload()` refetches (keeping the old
// data on screen meanwhile). Pass `null` as the path to skip loading.
export function useApi(path) {
  const [state, setState] = useState({ data: undefined, error: null, path: null })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    let cancelled = false
    api
      .get(path)
      .then((data) => !cancelled && setState({ data, error: null, path }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, error, path })))
    return () => {
      cancelled = true
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const current = state.path === path
  return { data: current ? state.data : undefined, error: current ? state.error : null, loading: Boolean(path) && !current, reload }
}
