"use client";
import { useSyncExternalStore } from "react";
import { ADMIN_LANGS, adminCopies, type AdminLang } from "@/lib/copy";

// ภาษาของหน้าแอดมิน เก็บใน localStorage ของเครื่องนี้ (ค่าเริ่มต้น: ไทย)
const KEY = "admin-lang";
const listeners = new Set<() => void>();

function read(): AdminLang {
  try {
    const v = localStorage.getItem(KEY);
    if (ADMIN_LANGS.some((l) => l.key === v)) return v as AdminLang;
  } catch {}
  return "th";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage); // sync across admin tabs
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setAdminLang(lang: AdminLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  listeners.forEach((cb) => cb());
}

export function useAdminLang(): AdminLang {
  return useSyncExternalStore(subscribe, read, () => "th");
}

export function useAdminCopy() {
  return adminCopies[useAdminLang()];
}
