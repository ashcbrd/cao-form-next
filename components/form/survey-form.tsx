"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { QuestionRenderer } from "./question-renderer";
import { validateSection, shouldShowQuestion } from "@/lib/form/validation";
import type { SurveySchema, FormState, FormResponse } from "@/lib/form/types";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  AlertTriangle,
} from "lucide-react";

// ---- tiny helpers ----------------------------------------------------------
function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay = 800
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

function formatTime(date: Date) {
  const d = new Date(date);
  return d.toLocaleString();
}
// ----------------------------------------------------------------------------

interface SurveyFormProps {
  schema: SurveySchema;
  initialResponses?: FormResponse;
  onSave: (responses: FormResponse, isComplete: boolean) => Promise<void>;
  onSubmit: (responses: FormResponse) => Promise<void>;
  /** optional: enable autosave on change (default true) */
  autosave?: boolean;
  /** optional: debounce ms for autosave (default 800ms) */
  autosaveDelayMs?: number;
}

/** Determine if a required question is validly answered (matches the schema you shared). */
function isRequiredAnswered(q: any, responses: Record<string, any>): boolean {
  if (!(q.isRequired || q.validation?.required)) return true; // non-required => doesn't block progress

  const v = responses[q.id];

  const num = (x: any) => {
    if (x === null || x === undefined || x === "") return null;
    const n = Number(String(x).replace(/[, ]+/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const within = (n: number, min?: number, max?: number) =>
    (min === undefined || n >= min) && (max === undefined || n <= max);

  switch (q.type) {
    case "TEXT":
    case "TEXTAREA":
      return typeof v === "string" && v.trim().length > 0;

    case "NUMBER":
    case "MONEY":
    case "PERCENT": {
      const n = num(v);
      if (n === null) return false;
      const max =
        q.type === "PERCENT" ? (q.validation?.max ?? 100) : q.validation?.max;
      return within(n, q.validation?.min, max);
    }

    case "SELECT":
      return v !== null && v !== undefined && String(v).trim() !== "";

    case "MULTISELECT":
      return Array.isArray(v) && v.length > 0;

    case "YES_NO_WITH_EXPLANATION": {
      const picked = v === true || v === false ? v : null;
      if (picked === null) return false;
      if (picked === true) {
        const exp = responses[`${q.id}_explanation`];
        return typeof exp === "string" && exp.trim().length > 0;
      }
      return true;
    }

    case "MULTISELECT_WITH_EXPLANATION": {
      const arr: string[] = Array.isArray(v) ? v : [];
      if (arr.length === 0) return false;
      if (arr.includes("Other")) {
        const exp = responses[`${q.id}_explanation`];
        return typeof exp === "string" && exp.trim().length > 0;
      }
      return true;
    }

    default:
      return v !== null && v !== undefined && String(v).trim() !== "";
  }
}

export function SurveyForm({
  schema,
  initialResponses = {},
  onSave,
  onSubmit,
  autosave = true,
  autosaveDelayMs = 800,
}: SurveyFormProps) {
  const [formState, setFormState] = useState<FormState>({
    responses: initialResponses,
    currentSection: 0,
    completedSections: [],
    isValid: false,
    errors: {},
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const totalSections = schema.sections.length;
  const currentSection = schema.sections[formState.currentSection];

  // Visible questions for current section (respect conditional visibility)
  const visibleQuestions = useMemo(
    () =>
      currentSection.questions.filter((q) =>
        shouldShowQuestion(q, formState.responses)
      ),
    // recompute when section or responses change
    [currentSection.id, formState.responses]
  );

  // ---- NEW: section validation helpers (for gating & unlocking) ------------
  const sectionIsValid = useCallback(
    (sectionIndex: number) => {
      const s = schema.sections[sectionIndex];
      const visible = s.questions.filter((q) =>
        shouldShowQuestion(q, formState.responses)
      );
      const errors = validateSection(visible, formState.responses);
      return Object.keys(errors).length === 0;
    },
    [schema.sections, formState.responses]
  );

  const allSectionsValid = useMemo(
    () => schema.sections.every((_, i) => sectionIsValid(i)),
    [schema.sections, sectionIsValid]
  );

  // Furthest unlocked section index (all previous sections valid)
  const furthestUnlocked = useMemo(() => {
    let furthest = 0;
    for (let i = 0; i < schema.sections.length; i++) {
      const prevValid = Array.from({ length: i }).every((_, j) =>
        sectionIsValid(j)
      );
      if (!prevValid) break;
      furthest = i;
      if (!sectionIsValid(i)) break;
    }
    return furthest;
  }, [schema.sections, sectionIsValid]);

  // ---- NEW: accurate progress (required, visible, valid answers) -----------
  const { totalRequired, answeredRequired, progressPct } = useMemo(() => {
    let total = 0;
    let answered = 0;

    for (const section of schema.sections) {
      const visible = section.questions.filter((q) =>
        shouldShowQuestion(q, formState.responses)
      );
      const reqQs = visible.filter(
        (q) => q.isRequired || q.validation?.required
      );
      total += reqQs.length;
      for (const q of reqQs) {
        if (isRequiredAnswered(q, formState.responses)) answered += 1;
      }
    }

    const pct = total === 0 ? 100 : Math.round((answered / total) * 100);
    return {
      totalRequired: total,
      answeredRequired: answered,
      progressPct: pct,
    };
  }, [schema.sections, formState.responses]);

  // Validate current section whenever answers/section change (keeps your current behavior)
  useEffect(() => {
    const errors = validateSection(visibleQuestions, formState.responses);
    const isValid = Object.keys(errors).length === 0;

    setFormState((prev) => ({
      ...prev,
      errors,
      isValid,
    }));
  }, [visibleQuestions, formState.responses]);

  // Warn on unload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Autosave (debounced) whenever responses change
  const debouncedAutosave = useDebouncedCallback(
    async (responses: FormResponse) => {
      if (!autosave) return;
      try {
        setIsSaving(true);
        setSaveError(null);
        await onSave(responses, false);
        setLastSavedAt(new Date());
        setIsDirty(false);
      } catch (err: any) {
        setSaveError(err?.message || "Failed to autosave");
      } finally {
        setIsSaving(false);
      }
    },
    autosaveDelayMs
  );

  useEffect(() => {
    if (!autosave) return;
    if (!isDirty) return;
    debouncedAutosave(formState.responses);
  }, [formState.responses, debouncedAutosave, autosave, isDirty]);

  // -- Handlers ---------------------------------------------------------------

  const handleResponseChange = (questionId: string, value: any) => {
    setSubmitError(null);
    setSaveError(null);
    setIsDirty(true);
    setFormState((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value,
      },
    }));
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(formState.responses, allSectionsValid);
      setLastSavedAt(new Date());
      setIsDirty(false);
    } catch (error: any) {
      setSaveError(error?.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const goToSection = (index: number) => {
    // 🚫 lock jumps beyond furthest unlocked
    if (index > furthestUnlocked) return;
    setFormState((prev) => ({
      ...prev,
      currentSection: index,
    }));
  };

  const handleNext = async () => {
    // gate on current section validity
    if (!formState.isValid) return;

    const nextIndex = formState.currentSection + 1;
    const isLast = nextIndex >= schema.sections.length;

    // save checkpoint when moving forward
    if (!isLast && isDirty) {
      try {
        setIsSaving(true);
        setSaveError(null);
        await onSave(formState.responses, false);
        setLastSavedAt(new Date());
        setIsDirty(false);
      } catch (e: any) {
        setSaveError(e?.message || "Failed to save draft");
      } finally {
        setIsSaving(false);
      }
    }

    if (!isLast) {
      setFormState((prev) => ({
        ...prev,
        currentSection: nextIndex,
        completedSections: Array.from(
          new Set([...prev.completedSections, currentSection.id])
        ),
      }));
    }
  };

  const handlePrevious = () => {
    if (formState.currentSection > 0) {
      setFormState((prev) => ({
        ...prev,
        currentSection: prev.currentSection - 1,
      }));
    }
  };

  const handleSubmit = async () => {
    // require ALL sections valid
    if (!formState.isValid || !allSectionsValid) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (isDirty) {
        await onSave(formState.responses, true);
        setIsDirty(false);
      }
      await onSubmit(formState.responses);
    } catch (error: any) {
      setSubmitError(error?.message || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts: Ctrl/Cmd+S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isLastSection = formState.currentSection === totalSections - 1;
  const canProceedNext = formState.isValid && !isSubmitting; // next button gating
  const canSubmit = formState.isValid && allSectionsValid && !isSubmitting; // submit gating

  // Compute a simple error list for the current section
  const sectionErrors = useMemo(() => {
    return Object.entries(formState.errors)
      .filter(([qid]) => visibleQuestions.some((q) => q.id === qid))
      .map(([qid, msg]) => ({ id: qid, message: msg as string }));
  }, [formState.errors, visibleQuestions]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">SUGB Survey</h1>

          <div className="flex items-center gap-2">
            {isDirty && <Badge variant="destructive">Unsaved</Badge>}
            {!isDirty && lastSavedAt && (
              <Badge variant="secondary">Saved {formatTime(lastSavedAt)}</Badge>
            )}
            <Badge variant="outline">
              Section {formState.currentSection + 1} of {totalSections}
            </Badge>
          </div>
        </div>

        {/* 🔁 Progress now based on required, visible, valid answers */}
        <Progress value={progressPct} className="mb-2" />
        <p className="text-sm text-gray-600">
          {progressPct}% complete · {answeredRequired}/{totalRequired} required
          fields valid
        </p>
      </div>

      {/* Current Section */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentSection.name}
            {currentSection.isRequired && (
              <Badge variant="secondary">Required</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Please complete all required fields in this section to continue.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error summary (current section) */}
      {sectionErrors.length > 0 && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Please fix the following:</p>
              <ul className="list-disc ml-5 mt-1">
                {sectionErrors.map(({ id, message }) => (
                  <li key={id}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {visibleQuestions.map((question) => (
          <QuestionRenderer
            key={question.id}
            question={question}
            value={formState.responses[question.id]}
            onChange={(value) => handleResponseChange(question.id, value)}
            error={formState.errors[question.id]}
          />
        ))}
      </div>

      {/* Footer alerts */}
      {(saveError || submitError) && (
        <div className="mt-6 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError || submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={formState.currentSection === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {/* 🔒 Quick jump: only up to furthestUnlocked */}
          <div className="hidden md:flex items-center gap-2">
            {schema.sections.map((s, idx) => {
              const unlocked = idx <= furthestUnlocked;
              const thisValid = sectionIsValid(idx);
              return (
                <Button
                  key={s.id}
                  variant={
                    idx === formState.currentSection ? "secondary" : "ghost"
                  }
                  size="sm"
                  onClick={() => goToSection(idx)}
                  disabled={!unlocked || isSubmitting}
                  className={!unlocked ? "opacity-40 cursor-not-allowed" : ""}
                  title={s.name}
                >
                  {idx + 1}
                  {thisValid ? " ✓" : ""}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualSave}
            disabled={isSaving || isSubmitting}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>

          {isLastSection ? (
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Survey"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceedNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Section Summary */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          {formState.completedSections.length} of {totalSections} sections
          completed
        </p>
      </div>
    </div>
  );
}
