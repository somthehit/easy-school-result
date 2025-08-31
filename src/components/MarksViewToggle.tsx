"use client";

import React from "react";

export default function MarksViewToggle({
  view,
  subjectId,
  studentId,
  defaultSubjectId,
  defaultStudentId,
}: {
  view: "subject" | "student";
  subjectId?: string;
  studentId?: string;
  defaultSubjectId?: string;
  defaultStudentId?: string;
}) {
  function switchTo(next: "subject" | "student") {
    const u = new URL(window.location.href);
    u.searchParams.set("view", next);
    if (next === "subject") {
      const sid = subjectId && subjectId.length ? subjectId : (defaultSubjectId || "");
      if (sid) u.searchParams.set("subjectId", sid);
      u.searchParams.delete("studentId");
    } else {
      const stid = studentId && studentId.length ? studentId : (defaultStudentId || "");
      if (stid) u.searchParams.set("studentId", stid);
      u.searchParams.delete("subjectId");
    }
    window.location.assign(u.toString());
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-neutral-600">Mode:</label>
      <select
        className="rounded-md border px-3 py-1.5 bg-transparent text-sm"
        value={view}
        onChange={(e) => switchTo(e.target.value as "subject" | "student")}
      >
        <option value="subject">Subject Mode</option>
        <option value="student">Student Mode</option>
      </select>
    </div>
  );
}
