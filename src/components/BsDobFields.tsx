"use client";

import { useState } from "react";
// @ts-ignore -- Package exports bypass types / types are not resolved correctly via exports
import { bsToAd, adToBs } from "@sbmdkl/nepali-date-converter";

interface BsDobFieldsProps {
  /** Name of the AD DOB field sent to the server */
  adName?: string;
}

export default function BsDobFields({ adName = "dob" }: BsDobFieldsProps) {
  const [bsDate, setBsDate] = useState("");
  const [adDate, setAdDate] = useState("");

  const handleBsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBsDate(value);

    try {
      // Check if it's a valid date format YYYY-MM-DD
      const dateParts = value.split("-");
      if (dateParts.length !== 3) return;
      const [y, m, d] = dateParts.map((p) => parseInt(p, 10));
      if (!y || !m || !d) return;
      const normalizedBs = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const adDateString = bsToAd(normalizedBs);
      // Library returns AD as YYYY-MM-DD string; ensure HTML date input-compatible
      if (typeof adDateString === "string" && adDateString.split("-").length === 3) {
        setAdDate(adDateString);
      }
    } catch {
      // ignore parse/convert errors; user can still type AD directly
    }
  };

  const handleAdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAdDate(value);

    try {
      // When AD changes, update BS field as well (AD → BS)
      if (!value) return;
      const parts = value.split("-");
      if (parts.length !== 3) return;
      const [y, m, d] = parts.map((p) => parseInt(p, 10));
      if (!y || !m || !d) return;
      const normalizedAd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const bsDateString = adToBs(normalizedAd);
      if (typeof bsDateString === "string" && bsDateString.split("-").length === 3) {
        setBsDate(bsDateString);
      }
    } catch {
      // ignore conversion errors; user can still type BS directly
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Nepali DOB (BS)</label>
        <input
          name="dobBs"
          value={bsDate}
          onChange={handleBsChange}
          placeholder="YYYY-MM-DD (BS)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Date of Birth (AD)</label>
        <input
          name={adName}
          type="date"
          value={adDate}
          onChange={handleAdChange}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 transition-all duration-200 text-sm"
        />
      </div>
    </div>
  );
}
