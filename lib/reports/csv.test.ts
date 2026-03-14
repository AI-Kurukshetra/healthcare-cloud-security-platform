import { describe, expect, it } from "vitest";

import { toCsv } from "@/lib/reports/csv";

describe("toCsv", () => {
  it("serializes rows with a header", () => {
    const csv = toCsv(
      [
        { title: "Control A", status: "compliant" },
        { title: "Control B", status: "at_risk" },
      ],
      [
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
      ],
    );

    expect(csv).toBe("Title,Status\nControl A,compliant\nControl B,at_risk");
  });

  it("escapes commas, quotes, and nulls", () => {
    const csv = toCsv(
      [{ note: 'Said "check, now"', details: null }],
      [
        { key: "note", label: "Note" },
        { key: "details", label: "Details" },
      ],
    );

    expect(csv).toBe('Note,Details\n"Said ""check, now""",');
  });
});
