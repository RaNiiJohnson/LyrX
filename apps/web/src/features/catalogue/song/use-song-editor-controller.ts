import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { useState } from "react"

import { api } from "@lyrx/backend/convex/_generated/api"
import type { Id } from "@lyrx/backend/convex/_generated/dataModel"
import { toast } from "@lyrx/ui/lib/toast"

import { useLocale } from "@/app/locale-provider"
import {
  emptySongValues,
  toSongMutationInput,
} from "@/features/catalogue/lib/catalogue-form"
import { songValuesFromDetail } from "@/features/catalogue/lib/song-values"
import { getErrorMessage } from "@/lib/errors"
import { useAppForm } from "@/lib/app-form"
import type { SongDetail } from "./song-types"

export function useSongEditorController({
  detail,
  primaryArtist,
  songId,
}: {
  detail?: SongDetail
  primaryArtist: string
  songId?: Id<"songs">
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const createSong = useMutation(api.catalogue.createSong)
  const updateSong = useMutation(api.catalogue.updateSong)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0)
  const steps = [
    t("studio.stepBasics"),
    t("studio.stepCredits"),
    t("studio.stepLyrics"),
  ]

  const form = useAppForm({
    defaultValues: detail
      ? songValuesFromDetail(detail)
      : emptySongValues(primaryArtist),
    onSubmit: async ({ value }) => {
      setError(null)
      setSaving(true)
      try {
        const input = toSongMutationInput(value)
        const savedSongId = songId
          ? await updateSong({ songId, ...input }).then(() => songId)
          : await createSong(input)
        toast.success(songId ? t("catalogue.saved") : t("catalogue.created"))
        await navigate({
          to: "/studio/songs/$songId/preview",
          params: { songId: savedSongId },
        })
      } catch (caught) {
        const message = getErrorMessage(caught, t)
        setError(message)
        toast.error(t("catalogue.saveError"), { description: message })
      } finally {
        setSaving(false)
      }
    },
  })

  async function saveCurrentChanges() {
    if (!songId) return
    setError(null)
    setSaving(true)
    try {
      await updateSong({
        songId,
        ...toSongMutationInput(form.state.values),
      })
      toast.success(t("catalogue.saved"))
    } catch (caught) {
      const message = getErrorMessage(caught, t)
      setError(message)
      toast.error(t("catalogue.saveError"), { description: message })
    } finally {
      setSaving(false)
    }
  }

  async function nextStep() {
    if (step === 0) {
      for (const name of [
        "title",
        "primaryArtist",
        "primaryLanguage",
      ] as const) {
        const errors = await form.validateField(name, "blur")
        if (errors.length > 0) {
          document.getElementById(name)?.focus()
          return
        }
      }
    }
    setStep((current) => Math.min(steps.length - 1, current + 1))
  }

  return {
    error,
    form,
    nextStep,
    previousStep: () => setStep((current) => Math.max(0, current - 1)),
    saveCurrentChanges,
    saving,
    setError,
    step,
    steps,
  }
}
