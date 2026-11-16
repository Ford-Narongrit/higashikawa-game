import { Fragment } from "react";

/** Renders copy text, turning `{漢字|かんじ}` into <ruby>漢字<rt>かんじ</rt></ruby>. */
export function Furi({ text }: { text: string }) {
  const parts = text.split(/(\{[^|}]+\|[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{([^|}]+)\|([^}]+)\}$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        return (
          <ruby key={i}>
            {m[1]}
            <rt>{m[2]}</rt>
          </ruby>
        );
      })}
    </>
  );
}
