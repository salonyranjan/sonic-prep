"use client";

import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import {
  FormField as Field,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  description?: string;
}

export default function FormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = "text",
  autoComplete,
  description,
}: FormFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {label}
          </FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                type={type === "password" && visible ? "text" : type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                autoCapitalize={type === "email" ? "none" : undefined}
                spellCheck={
                  type === "email" || type === "password" ? false : undefined
                }
                className="h-12 rounded-xl border-border bg-white/60 dark:bg-zinc-950/60 px-4 pr-12 text-base text-foreground dark:text-white placeholder:text-zinc-600 dark:text-zinc-500 focus-visible:border-primary-200 focus-visible:ring-primary-200/25 md:text-base"
              />
            </FormControl>
            {type === "password" && (
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-foreground dark:text-white focus-visible:outline-2 focus-visible:outline-primary-200"
              >
                {visible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
          {description && (
            <FormDescription className="text-xs text-zinc-600 dark:text-zinc-400">
              {description}
            </FormDescription>
          )}
          <FormMessage role="alert" />
        </FormItem>
      )}
    />
  );
}
