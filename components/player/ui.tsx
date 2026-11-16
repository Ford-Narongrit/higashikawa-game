"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ROOMS, type Room } from "@/lib/types";
import { Furi } from "@/components/Furi";

export function BigButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-white text-black active:bg-zinc-300",
    secondary: "bg-zinc-800 text-white border-2 border-zinc-600 active:bg-zinc-700",
    ghost: "text-zinc-300 underline underline-offset-4",
  }[variant];
  return (
    <button
      {...props}
      className={`min-h-14 w-full rounded-2xl px-5 py-3 text-xl font-bold transition disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-lg font-bold">
        <Furi text={label} />
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-14 w-full rounded-2xl border-2 border-zinc-600 bg-zinc-900 px-4 text-2xl text-white outline-none focus:border-white";

export function RoomPicker({ value, onChange }: { value: Room | null; onChange: (r: Room) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {ROOMS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`h-14 rounded-xl text-2xl font-bold transition ${
            value === r ? "bg-white text-black" : "border-2 border-zinc-600 bg-zinc-900 text-white"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function ErrorText({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-950 px-4 py-3 text-lg font-bold text-red-200">
      {text}
    </p>
  );
}

export function Screen({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <main
      style={style}
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
    >
      {children}
    </main>
  );
}
