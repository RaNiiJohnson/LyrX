export type CommunitySaveState<TId extends string> = {
  id?: TId
  revision?: number
  signature?: string
}

// Publication precedes owner-bound artwork upload. Remember the saved text and
// revision before uploading so image-only retries never publish or edit again.
export async function saveCommunityContribution<TId extends string>(
  state: CommunitySaveState<TId>,
  signature: string,
  save: (
    id: TId | undefined,
    revision: number | undefined
  ) => Promise<{
    id: TId
    revision: number
  }>,
  upload?: (id: TId) => Promise<void>
) {
  if (!state.id || state.signature !== signature) {
    const saved = await save(state.id, state.revision)
    state.id = saved.id
    state.revision = saved.revision
    state.signature = signature
  }
  const id = state.id
  if (!id) throw new Error("Saved contribution has no identifier")
  if (upload) {
    await upload(id)
    state.revision = (state.revision ?? 0) + 1
  }
  return id
}
