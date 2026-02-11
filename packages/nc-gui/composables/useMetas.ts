import type { TableType } from 'nocodb-sdk'

export const useMetas = createSharedComposable(() => {
  const { $api } = useNuxtApp()

  const { ncNavigateTo } = useGlobal()

  const { tables: _tables } = storeToRefs(useBase())

  const { activeProjectId } = storeToRefs(useBases())

  const { activeWorkspaceId } = storeToRefs(useWorkspace())

  const { baseTables } = storeToRefs(useTablesStore())

  const metas = useState<{ [idOrTitle: string]: TableType | any }>('metas', () => ({}))

  const metasWithIdAsKey = computed<Record<string, TableType>>(() => {
    const idEntries = Object.entries(metas.value).filter(([k, v]) => k === v.id)
    return Object.fromEntries(idEntries)
  })

  const loadingState = useState<Record<string, boolean>>('metas-loading-state', () => ({}))

  // In-flight getMeta promises. Concurrent callers for the same key share one
  // API request instead of each spinning in a while-loop creating setTimeout/watch pairs.
  const loadingPromises = new Map<string, Promise<TableType | null>>()

  const setMeta = async (model: any) => {
    metas.value = {
      ...metas.value,
      [model.id!]: model,
      [model.title]: model,
    }
  }

  const getMeta = async (
    tableIdOrTitle: string,
    force = false,
    skipIfCacheMiss = false,
    baseId?: string,
    disableError = false,
    navigateOnNotFound = false,
  ): Promise<TableType | null> => {
    if (!tableIdOrTitle) return null

    const tables = (baseId ? baseTables.value.get(baseId) : _tables.value) ?? []

    // Return cached meta if available
    if (!force && metas.value[tableIdOrTitle]) {
      return metas.value[tableIdOrTitle]
    }

    // If another caller is already loading this meta, await the same promise
    // instead of creating new setTimeout/watch pairs in a while-loop.
    if (!force && loadingPromises.has(tableIdOrTitle)) {
      return loadingPromises.get(tableIdOrTitle)!
    }

    // return null if cache miss
    if (skipIfCacheMiss) return null

    loadingState.value[tableIdOrTitle] = true

    const promise = (async () => {
      try {
        const modelId =
          (tables.find((t) => t.id === tableIdOrTitle) || tables.find((t) => t.title === tableIdOrTitle))?.id || tableIdOrTitle

        const model = await $api.dbTable.read(modelId)
        metas.value = {
          ...metas.value,
          [model.id!]: model,
          [model.title]: model,
        }

        return model
      } catch (e: any) {
        if (!disableError) {
          message.error(await extractSdkResponseErrorMsg(e))
        }

        if (navigateOnNotFound) {
          ncNavigateTo({
            workspaceId: activeWorkspaceId.value,
            baseId: activeProjectId.value,
          })
        }
        return null
      } finally {
        delete loadingState.value[tableIdOrTitle]
        // Only remove if this is still the active promise (a force-load may have replaced it)
        if (loadingPromises.get(tableIdOrTitle) === promise) {
          loadingPromises.delete(tableIdOrTitle)
        }
      }
    })()

    loadingPromises.set(tableIdOrTitle, promise)
    return promise
  }

  const clearAllMeta = () => {
    metas.value = {}
  }

  const removeMeta = (idOrTitle: string) => {
    const meta = metas.value[idOrTitle]

    if (meta) {
      delete metas.value[meta.id]
      delete metas.value[meta.title]
    }
  }

  // return partial metadata for related table of a meta service
  const getPartialMeta = async (linkColumnId: string, tableIdOrTitle: string): Promise<TableType | null> => {
    if (!tableIdOrTitle || !linkColumnId) return null

    if (metas.value[tableIdOrTitle]) {
      return metas.value[tableIdOrTitle]
    }

    // wait until loading is finished if requesting same meta
    await until(() => !loadingState.value[tableIdOrTitle]).toBeTruthy({
      timeout: 5000,
    })

    try {
      loadingState.value[tableIdOrTitle] = true
      const model = await $api.dbLinks.tableRead(linkColumnId, tableIdOrTitle)
      metas.value[tableIdOrTitle] = model
      return model
    } catch (e) {
      message.error(await extractSdkResponseErrorMsg(e))
    } finally {
      loadingState.value[tableIdOrTitle] = false
    }
  }
  return { getMeta, clearAllMeta, metas, metasWithIdAsKey, removeMeta, setMeta, getPartialMeta }
})
