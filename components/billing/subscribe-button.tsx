"use client"

import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SubscribeButtonProps {
  action: (formData: FormData) => Promise<void>
  payload: Record<string, string>
  label: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  className?: string
  disabled?: boolean
}

/**
 * 通用的 checkout 触发按钮：包裹一个隐藏字段 form，
 * 在点击时以 transition 进入 pending 状态，避免重复提交。
 */
export function SubscribeButton({
  action,
  payload,
  label,
  variant = "default",
  className,
  disabled,
}: SubscribeButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await action(formData)
        })
      }}
      className="w-full"
    >
      {Object.entries(payload).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button
        type="submit"
        disabled={disabled || isPending}
        variant={variant}
        className={className ?? "w-full"}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Redirecting…
          </>
        ) : (
          label
        )}
      </Button>
    </form>
  )
}
