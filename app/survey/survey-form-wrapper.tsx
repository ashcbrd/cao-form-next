"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SurveyForm } from "@/components/form/survey-form";
import { Button } from "@/components/ui/button"; // assuming you use shadcn/ui
import { BackButton } from "@/components/common/back-button";

type Props = {
  schema: any;
  initialResponses: any;
  // These are server actions passed from the server component
  onSave: (responses: any, isComplete: boolean) => Promise<void>;
  onSubmit: (responses: any) => Promise<void>;
};

export function SurveyFormWrapper({
  schema,
  initialResponses,
  onSave,
  onSubmit,
}: Props) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (responses: any, isComplete: boolean) => {
    setError(null);
    return new Promise<void>((resolve) => {
      startSaving(async () => {
        try {
          await onSave(responses, isComplete);
        } catch (e: any) {
          setError(e?.message || "Failed to save survey");
        }
        resolve();
      });
    });
  };

  const handleSubmit = async (responses: any) => {
    setError(null);
    return new Promise<void>((resolve) => {
      startSubmitting(async () => {
        try {
          // This will server-redirect on success
          await onSubmit(responses);
        } catch (e: any) {
          setError(e?.message || "Failed to submit survey");
        }
        resolve();
      });
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Back button */}
      <div className="mb-4">
        <div className="mb-4">
          <BackButton label="Back" hrefFallback="/dashboard" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <SurveyForm
        schema={schema}
        initialResponses={initialResponses}
        onSave={handleSave}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
