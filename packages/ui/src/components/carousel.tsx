import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { cn } from "@lyrx/ui/lib/utils"

type CarouselApi = UseEmblaCarouselType[1]
type CarouselProps = React.ComponentProps<"div"> & {
  opts?: Parameters<typeof useEmblaCarousel>[0]
  setApi?: (api: CarouselApi) => void
}
const CarouselContext = React.createContext<UseEmblaCarouselType | null>(null)
function useCarousel() {
  const context = React.useContext(CarouselContext)
  if (!context) throw new Error("Carousel content must be used within Carousel")
  return context
}

/** Horizontal shadcn carousel composition; Embla owns dragging and snap positions. */
function Carousel({
  opts,
  setApi,
  children,
  className,
  ...props
}: CarouselProps) {
  const carousel = useEmblaCarousel(opts)
  const api = carousel[1]
  React.useEffect(() => {
    if (api) setApi?.(api)
  }, [api, setApi])
  return (
    <CarouselContext.Provider value={carousel}>
      <div
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        className={cn("relative", className)}
        onKeyDownCapture={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault()
            if (event.key === "ArrowLeft") api?.scrollPrev()
            else api?.scrollNext()
          }
        }}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}
function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const [ref] = useCarousel()
  return (
    <div ref={ref} className="overflow-hidden" data-slot="carousel-content">
      <div className={cn("-ml-4 flex touch-pan-y", className)} {...props} />
    </div>
  )
}
function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="carousel-item"
      className={cn("min-w-0 shrink-0 grow-0 basis-full pl-4", className)}
      {...props}
    />
  )
}
export { Carousel, CarouselContent, CarouselItem, type CarouselApi }
