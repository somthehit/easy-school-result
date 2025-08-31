"use client";

import React from "react";

type ClassItem = { id: string; name: string; section: string };

export default function ClassSelectWithSection({
  classes,
  defaultClassId = "",
  classSelectName = "classId",
  sectionInputName = "section",
}: {
  classes: ClassItem[];
  defaultClassId?: string;
  classSelectName?: string;
  sectionInputName?: string;
}) {
  const [selectedId, setSelectedId] = React.useState<string>(defaultClassId);
  const current = React.useMemo(
    () => classes.find((c) => c.id === selectedId),
    [classes, selectedId]
  );
  const [section, setSection] = React.useState<string>(current?.section ?? "");

  React.useEffect(() => {
    // When class changes, auto-fill section from the class
    setSection(current?.section ?? "");
  }, [selectedId]);

  return (
    <div className="flex items-center gap-3">
      <select
        name={classSelectName}
        className="rounded-md border px-3 py-2 bg-transparent"
        value={selectedId}
        onChange={(e) => setSelectedId(e.currentTarget.value)}
      >
        <option value="">Select Class</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} - {c.section}
          </option>
        ))}
      </select>
      <input
        name={sectionInputName}
        placeholder="Section"
        className="rounded-md border px-3 py-2 bg-transparent"
        value={section}
        onChange={(e) => setSection(e.currentTarget.value)}
      />
    </div>
  );
}
