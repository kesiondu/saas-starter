"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  submitVideoTaskAction,
  type SubmitTaskState,
} from "@/app/(app)/tasks/actions"
import type { VideoModelConfig } from "@/config/video-models"

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Submitting
        </>
      ) : (
        "Generate video"
      )}
    </Button>
  )
}

interface Props {
  models: VideoModelConfig[]
  availableCredits: number
}

export function NewTaskForm({ models, availableCredits }: Props) {
  const [state, formAction] = useActionState<SubmitTaskState, FormData>(
    submitVideoTaskAction,
    {},
  )

  const defaultModel = models[0]
  const notEnough = !defaultModel || availableCredits < defaultModel.creditsCost

  return (
    <form action={formAction} className="space-y-8">
      <fieldset>
        <legend className="text-sm font-medium text-foreground">Model</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a model. Credit cost varies by provider.
        </p>
        <RadioGroup
          name="modelCode"
          defaultValue={defaultModel?.code}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          required
        >
          {models.map((m) => (
            <label
              key={m.code}
              htmlFor={`model-${m.code}`}
              className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-foreground/10"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{m.name}</span>
                <RadioGroupItem id={`model-${m.code}`} value={m.code} />
              </div>
              <p className="text-xs text-muted-foreground">{m.description}</p>
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>{m.creditsCost} credits</span>
                <span>~{Math.round(m.estimatedSeconds / 60)} min</span>
              </div>
            </label>
          ))}
        </RadioGroup>
        {state.fieldErrors?.modelCode ? (
          <p className="mt-2 text-xs text-destructive">
            {state.fieldErrors.modelCode[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          name="prompt"
          rows={5}
          placeholder="Describe the scene, motion, style, camera angle…"
          required
          maxLength={2000}
        />
        {state.fieldErrors?.prompt ? (
          <p className="text-xs text-destructive">{state.fieldErrors.prompt[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">
          Image URL <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="imageUrl"
          name="imageUrl"
          type="url"
          inputMode="url"
          placeholder="https://…"
        />
        <p className="text-xs text-muted-foreground">
          Some models use this as an initial frame reference.
        </p>
        {state.fieldErrors?.imageUrl ? (
          <p className="text-xs text-destructive">{state.fieldErrors.imageUrl[0]}</p>
        ) : null}
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Balance:{" "}
          <span className="font-medium text-foreground">
            {availableCredits} credits
          </span>
        </p>
        <SubmitButton disabled={notEnough} />
      </div>
    </form>
  )
}
