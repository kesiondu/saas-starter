import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { SubscriptionPlanConfig } from "@/config/plans"

interface PlanCardProps {
  plan: SubscriptionPlanConfig
  action: React.ReactNode
  /** 当前用户所在计划代码，用于高亮 */
  currentPlanCode?: string | null
}

function formatPrice(priceCents: number) {
  if (priceCents === 0) return "Free"
  return `$${(priceCents / 100).toFixed(2)}`
}

export function PlanCard({ plan, action, currentPlanCode }: PlanCardProps) {
  const isCurrent = currentPlanCode === plan.code
  const isPopular = !!plan.isPopular

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4",
        isPopular && "border-foreground shadow-md",
      )}
    >
      {isPopular ? (
        <span className="absolute -top-3 left-6 rounded-full bg-foreground px-3 py-0.5 text-xs font-medium text-background">
          Most Popular
        </span>
      ) : null}

      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          {isCurrent ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
              Current
            </span>
          ) : null}
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        <div>
          <span className="text-4xl font-bold tracking-tight">
            {formatPrice(plan.priceMonthly)}
          </span>
          {plan.priceMonthly > 0 ? (
            <span className="ml-1 text-sm text-muted-foreground">/ month</span>
          ) : null}
        </div>
        <ul className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check
                className="mt-0.5 size-4 shrink-0 text-foreground"
                aria-hidden="true"
              />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>{action}</CardFooter>
    </Card>
  )
}

/** 用在未配置 Stripe Price ID 的免费计划上，占位按钮 */
export function DisabledPlanButton({ label = "Included" }: { label?: string }) {
  return (
    <Button disabled className="w-full" variant="outline">
      {label}
    </Button>
  )
}
