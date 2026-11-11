import * as ImageManipulator from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import {
  IMAGE_POLICIES,
  acceptableInput,
  resizeFor,
  type ImageKind,
} from "@/lib/image-policy"

export type PreparedImage = { uri: string; mimeType: "image/jpeg" }

export class InvalidImageError extends Error {
  readonly code = "INVALID_IMAGE"
}

/**
 * Opens the system photo picker (no permission prompt needed), crops to the slot's
 * shape and re-encodes a bounded JPEG, so only the prepared file is ever uploaded.
 * Returns null when the member cancels.
 */
export async function pickImage(
  kind: ImageKind
): Promise<PreparedImage | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: kind === "banner" ? [3, 1] : [1, 1],
    quality: 1,
    exif: false,
  })
  if (picked.canceled) return null
  const asset = picked.assets[0]
  if (!asset || !acceptableInput(kind, asset.fileSize))
    throw new InvalidImageError()
  const resize = resizeFor(kind, { width: asset.width, height: asset.height })
  const prepared = await ImageManipulator.manipulateAsync(
    asset.uri,
    resize ? [{ resize }] : [],
    {
      compress: IMAGE_POLICIES[kind].quality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  )
  return { uri: prepared.uri, mimeType: "image/jpeg" }
}

/** POSTs the prepared file to a Convex upload URL and returns the new storage id. */
export async function uploadToStorage(
  image: PreparedImage,
  uploadUrl: string
): Promise<string> {
  const body = await (await fetch(image.uri)).blob()
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": image.mimeType },
    body,
  })
  if (!response.ok) throw new Error("UPLOAD_FAILED")
  const payload: unknown = await response.json()
  if (
    !payload ||
    typeof payload !== "object" ||
    !("storageId" in payload) ||
    typeof payload.storageId !== "string"
  )
    throw new Error("UPLOAD_INVALID_RESPONSE")
  return payload.storageId
}
