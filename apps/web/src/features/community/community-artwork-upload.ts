import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { prepareImageForUpload } from "@/lib/image-upload"

type UploadTarget = {
  uploadUrl: string
  intentId: Id<"communityArtworkUploadIntents">
}

export type CommunityArtworkAttempt = {
  file?: File
  contributionId?: Id<"communityContributions">
  intentId?: Id<"communityArtworkUploadIntents">
  storageId?: Id<"_storage">
}

export async function uploadCommunityArtwork(
  file: File,
  contributionId: Id<"communityContributions">,
  generateUploadUrl: (args: {
    contributionId: Id<"communityContributions">
  }) => Promise<UploadTarget>,
  saveArtwork: (args: {
    contributionId: Id<"communityContributions">
    intentId: Id<"communityArtworkUploadIntents">
    storageId: Id<"_storage">
  }) => Promise<unknown>,
  attempt: CommunityArtworkAttempt = {}
) {
  if (
    attempt.file === file &&
    attempt.contributionId === contributionId &&
    attempt.intentId &&
    attempt.storageId
  ) {
    // Retry the exact claim after an ambiguous save response, not a new upload.
    await saveArtwork({
      contributionId,
      intentId: attempt.intentId,
      storageId: attempt.storageId,
    })
    attempt.storageId = undefined
    attempt.intentId = undefined
    return
  }
  attempt.file = file
  attempt.contributionId = contributionId
  attempt.intentId = undefined
  attempt.storageId = undefined
  const optimized = await prepareImageForUpload(file, "artwork")
  const { uploadUrl, intentId } = await generateUploadUrl({ contributionId })
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": optimized.type },
    body: optimized,
  })
  if (!response.ok) throw new Error("Artwork upload failed")
  const payload: unknown = await response.json()
  if (
    !payload ||
    typeof payload !== "object" ||
    !("storageId" in payload) ||
    typeof payload.storageId !== "string"
  ) {
    throw new Error("Invalid artwork upload response")
  }
  attempt.intentId = intentId
  attempt.storageId = payload.storageId as Id<"_storage">
  await saveArtwork({
    contributionId,
    intentId,
    storageId: attempt.storageId,
  })
  attempt.storageId = undefined
  attempt.intentId = undefined
}
