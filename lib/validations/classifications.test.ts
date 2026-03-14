import { createDataClassificationSchema, updateDataClassificationLevelSchema } from "@/lib/validations/classifications";

describe("data classification validations", () => {
  it("accepts a valid classification payload", () => {
    const parsed = createDataClassificationSchema.safeParse({
      assetName: "EHR Encounter Export",
      dataType: "CSV export",
      classificationLevel: "phi_restricted",
      containsPhi: true,
      containsPii: true,
      encryptionRequired: true,
      retentionDays: 90,
      notes: "Contains patient identifiers and clinical diagnosis fields.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid classification level updates", () => {
    const parsed = updateDataClassificationLevelSchema.safeParse({
      classificationId: "bad-id",
      classificationLevel: "secret",
      encryptionRequired: true,
    });

    expect(parsed.success).toBe(false);
  });
});

