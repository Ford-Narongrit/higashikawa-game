"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const TreeView = dynamic(() => import("@/components/screen/tree/TreeView").then((m) => m.TreeView), { ssr: false });

/** Performance test: /screen/tree-test?n=450 renders N fake photos with an FPS counter. */
export default function TreeTest() {
  const [n] = useState(() =>
    typeof window === "undefined" ? 450 : Number(new URLSearchParams(location.search).get("n")) || 450,
  );
  return (
    <div className="fixed inset-0 bg-black">
      <TreeView demo={n} showFps />
    </div>
  );
}
