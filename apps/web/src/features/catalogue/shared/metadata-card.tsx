import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lyrx/ui/components/card"

export type MetadataItem = {
  id: string
  label: string
  value: string
}

export function MetadataCard({
  items,
  title,
}: {
  items: Array<MetadataItem>
  title: string
}) {
  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {item.label}
              </dt>
              <dd className="text-base wrap-break-word">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
