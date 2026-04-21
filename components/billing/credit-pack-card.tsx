import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CreditPackageConfig } from "@/config/credit-packages"

interface CreditPackCardProps {
  pack: CreditPackageConfig
  action: React.ReactNode
}

function formatPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(2)}`
}

export function CreditPackCard({ pack, action }: CreditPackCardProps) {
  return (
    <Card className={cn("flex flex-col gap-4", pack.isPopular && "border-foreground")}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{pack.name}</CardTitle>
          {pack.isPopular ? (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
              Best value
            </span>
          ) : null}
        </div>
        {pack.description ? (
          <CardDescription>{pack.description}</CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div>
          <span className="text-3xl font-bold tracking-tight">
            {formatPrice(pack.price)}
          </span>
        </div>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{pack.credits}</span>{" "}
            credits
          </span>
          <span>Valid for {pack.validityDays} days</span>
        </div>
      </CardContent>

      <CardFooter>{action}</CardFooter>
    </Card>
  )
}
