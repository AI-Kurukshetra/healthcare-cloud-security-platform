import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("rounded-md", "rounded-lg", "bg-white")).toBe("rounded-lg bg-white");
  });
});
