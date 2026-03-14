import { createTrainingRecordSchema, updateTrainingRecordStatusSchema } from "@/lib/validations/training";

describe("training validations", () => {
  it("accepts a valid training record payload", () => {
    const parsed = createTrainingRecordSchema.safeParse({
      title: "Annual HIPAA security awareness",
      description: "Required annual training for all workforce members handling PHI.",
      assignedUserId: "9b85b8eb-a0d8-4dc8-b4d8-80a96d92be2c",
      dueDate: "2026-06-30",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid training status updates", () => {
    const parsed = updateTrainingRecordStatusSchema.safeParse({
      trainingRecordId: "bad-id",
      status: "open",
      completionNotes: "Done",
    });

    expect(parsed.success).toBe(false);
  });
});

