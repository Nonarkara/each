import { useCallback, useEffect, useState } from 'react'
import { readStore, storeApi } from '../lib/store'
import type { EachStore } from '../lib/types'

export function useStore(): [EachStore, typeof storeApi] {
  const [store, setStore] = useState<EachStore>(readStore)

  useEffect(() => storeApi.subscribe(setStore), [])

  const api = {
    get: storeApi.get,
    set: useCallback((patch: Partial<EachStore>) => storeApi.set(patch), []),
    update: useCallback((fn: (s: EachStore) => EachStore) => storeApi.update(fn), []),
    load: useCallback((obj: EachStore) => storeApi.load(obj), []),
    reset: useCallback(() => storeApi.reset(), []),
    subscribe: storeApi.subscribe,
  }

  return [store, api]
}
