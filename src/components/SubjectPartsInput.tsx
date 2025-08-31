"use client";

import React from "react";

export default function SubjectPartsInput({ name = "parts" }: { name?: string }) {
  const [input, setInput] = React.useState("");
  const [parts, setParts] = React.useState<string[]>([]);

  function addPart() {
    const v = input.trim();
    if (!v) return;
    if (parts.some((p) => p.toLowerCase() === v.toLowerCase())) {
      setInput("");
      return;
    }
    setParts((prev) => [...prev, v]);
    setInput("");
  }

  function removePart(idx: number) {
    setParts((prev) => prev.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addPart();
    }
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Part name (e.g., Theory)"
          className="rounded-md border px-3 py-2 bg-transparent flex-1"
        />
        <button type="button" onClick={addPart} className="px-3 py-2 rounded-md border hover:bg-neutral-100 dark:hover:bg-neutral-900">
          Add Part
        </button>
      </div>
      {parts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {parts.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border">
              {p}
              <button type="button" onClick={() => removePart(i)} aria-label={`Remove ${p}`} className="text-neutral-500 hover:text-neutral-800">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Hidden input to submit as comma-separated */}
      <input type="hidden" name={name} value={parts.join(", ")} />
      {/* Helper text */}
      <div className="text-xs text-neutral-500 mt-1">Parts are optional. Use the Add Part button to add Theory/Practical etc.</div>
    </div>
  );
}
