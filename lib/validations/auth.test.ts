import { updatePasswordSchema } from "@/lib/validations/auth";

describe("auth validations", () => {
  it("accepts matching passwords", () => {
    const parsed = updatePasswordSchema.safeParse({
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const parsed = updatePasswordSchema.safeParse({
      password: "SecurePass123!",
      confirmPassword: "SecurePass123!x",
    });

    expect(parsed.success).toBe(false);
  });
});
