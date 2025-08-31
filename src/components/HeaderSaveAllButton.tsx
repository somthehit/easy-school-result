"use client";

import React from "react";

export default function HeaderSaveAllButton({ eventName = "saveAll", label = "Save All" }: { eventName?: string; label?: string }) {
  function handleClick() {
    window.dispatchEvent(new Event(eventName));
  }
  return (
    <button
      onClick={handleClick}
      className="px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow hover:opacity-90"
    >
      {label}
    </button>
  );
}
