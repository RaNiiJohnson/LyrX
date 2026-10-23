import { formOptions } from "@tanstack/react-form"

import { emptySongValues } from "@/features/catalogue/lib/catalogue-form"

export const songFormOptions = formOptions({
  defaultValues: emptySongValues(),
})
