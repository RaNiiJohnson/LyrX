// Remember the persisted id before uploading: retrying a failed image upload
// must update the existing draft, not create another song/album.
export async function saveCatalogueDraft<TId extends string>(
  draft: { id: TId | undefined },
  save: (id: TId | undefined) => Promise<TId>,
  upload?: (id: TId) => Promise<boolean>
) {
  const id = await save(draft.id)
  draft.id = id
  return { id, artworkSaved: upload ? await upload(id) : true }
}
