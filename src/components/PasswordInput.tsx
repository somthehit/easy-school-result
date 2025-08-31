"use client";

import React from "react";

export default function PasswordInput({ name, placeholder, required = false }: { name: string; placeholder?: string; required?: boolean }) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 bg-white text-black placeholder-gray-400 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10"
        required={required}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
