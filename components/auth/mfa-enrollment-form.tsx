"use client";

import Image from "next/image";
import { startTransition, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type EnrollmentState = {
  factorId: string;
  qrCodeDataUrl: string | null;
  secret: string | null;
  usesExistingFactor: boolean;
};

type MfaEnrollmentFormProps = Readonly<{
  isRequired: boolean;
}>;

export function MfaEnrollmentForm({ isRequired }: MfaEnrollmentFormProps) {
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function isFriendlyNameConflict(message: string | undefined) {
    if (!message) {
      return false;
    }

    return message.toLowerCase().includes("friendly name") && message.toLowerCase().includes("already exists");
  }

  async function handleEnroll() {
    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Healthcare Project Authenticator",
    });

    if (enrollError || !data) {
      if (isFriendlyNameConflict(enrollError?.message)) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

        setIsSubmitting(false);

        if (factorsError || !factorsData) {
          setError(factorsError?.message ?? "Unable to load existing MFA factors.");
          return;
        }

        const existingTotpFactor =
          factorsData.totp.find((factor) => factor.friendly_name === "Healthcare Project Authenticator") ??
          factorsData.totp[0];

        if (!existingTotpFactor) {
          setError("A TOTP factor already exists, but no reusable factor was returned. Try signing in again.");
          return;
        }

        setEnrollment({
          factorId: existingTotpFactor.id,
          qrCodeDataUrl: null,
          secret: null,
          usesExistingFactor: true,
        });
        return;
      }

      setIsSubmitting(false);
      setError(enrollError?.message ?? "Unable to start MFA enrollment.");
      return;
    }

    setIsSubmitting(false);

    setEnrollment({
      factorId: data.id,
      qrCodeDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`,
      secret: data.totp.secret,
      usesExistingFactor: false,
    });
  }

  async function handleVerify() {
    if (!enrollment) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollment.factorId,
    });

    if (challengeError || !challengeData) {
      setIsSubmitting(false);
      setError(challengeError?.message ?? "Unable to create MFA challenge.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challengeData.id,
      code: verificationCode,
    });

    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    startTransition(() => {
      window.location.href = "/dashboard";
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Multi-Factor Authentication</p>
        <h2 className="text-3xl font-semibold tracking-tight">Secure privileged access.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          {isRequired
            ? "Your role requires MFA before you can access the protected workspace."
            : "MFA is already configured, but you can re-check your setup here."}
        </p>
      </div>
      {!enrollment ? (
        <button
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleEnroll}
          type="button"
        >
          {isSubmitting ? "Preparing authenticator setup" : "Start MFA setup"}
        </button>
      ) : (
        <div className="space-y-5 rounded-[1.5rem] border border-border bg-card/90 p-6">
          {enrollment.qrCodeDataUrl && enrollment.secret ? (
            <>
              <Image
                alt="Authenticator QR code"
                className="rounded-2xl border border-border bg-white p-3"
                height={220}
                src={enrollment.qrCodeDataUrl}
                unoptimized
                width={220}
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Manual setup secret</p>
                <code className="block rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{enrollment.secret}</code>
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              Existing authenticator detected. Enter a current code to continue.
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="verificationCode">
              Verification code
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              id="verificationCode"
              inputMode="numeric"
              onChange={(event) => setVerificationCode(event.target.value)}
              placeholder="123456"
              type="text"
              value={verificationCode}
            />
          </div>
          <button
            className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || verificationCode.length < 6}
            onClick={handleVerify}
            type="button"
          >
            {isSubmitting ? "Verifying code" : enrollment.usesExistingFactor ? "Verify existing authenticator" : "Verify and continue"}
          </button>
        </div>
      )}
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
