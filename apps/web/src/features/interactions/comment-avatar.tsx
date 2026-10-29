import { Avatar, AvatarFallback, AvatarImage } from "@lyrx/ui/components/avatar"
import { cn } from "@lyrx/ui/lib/utils"

export function CommentAvatar({
  name,
  src,
}: {
  name: string
  src?: string | null
}) {
  const tones = [
    "from-brand/80 to-brand-foreground",
    "from-primary/80 to-brand-foreground",
    "from-accent/80 to-brand-foreground",
  ]
  const index =
    Array.from(name).reduce((sum, c) => sum + c.charCodeAt(0), 0) % tones.length
  return (
    <Avatar className="size-9" aria-hidden="true">
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback
        className={cn("bg-linear-to-br text-hero-foreground", tones[index])}
      >
        {name.trim().charAt(0).toLocaleUpperCase() || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
