"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import type { ImportWizardStep } from "@/lib/import/types";

interface ImportWizardProps {
  step: ImportWizardStep;
  onStepChange: (step: ImportWizardStep) => void;
  importCount?: number;
  importedCount?: number;
  children: ReactNode;
}

const STEPS: { key: ImportWizardStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "map", label: "Map Columns" },
  { key: "preview", label: "Preview" },
  { key: "importing", label: "Import" },
];

const STEP_ORDER: ImportWizardStep[] = [
  "upload",
  "map",
  "preview",
  "importing",
  "complete",
];

function getStepIndex(step: ImportWizardStep): number {
  return STEP_ORDER.indexOf(step);
}

const CheckIcon = () => (
  <svg
    className="h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

const Spinner = () => (
  <svg
    className="h-5 w-5 animate-spin text-zinc-100"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const SuccessIcon = () => (
  <svg
    className="h-12 w-12 text-green-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export function ImportWizard({
  step,
  onStepChange,
  importCount = 0,
  importedCount = 0,
  children,
}: ImportWizardProps) {
  const currentIndex = getStepIndex(step);

  const getPreviousStep = (): ImportWizardStep | null => {
    if (currentIndex <= 0) return null;
    if (step === "importing" || step === "complete") return null;
    return STEP_ORDER[currentIndex - 1];
  };

  const getNextStep = (): ImportWizardStep | null => {
    if (step === "complete") return null;
    if (step === "importing") return null;
    if (currentIndex >= STEP_ORDER.length - 1) return null;
    return STEP_ORDER[currentIndex + 1];
  };

  const getNextButtonText = (): string => {
    switch (step) {
      case "upload":
        return "Next";
      case "map":
        return "Next";
      case "preview":
        return `Import ${importCount} Transaction${importCount !== 1 ? "s" : ""}`;
      case "complete":
        return "Done";
      default:
        return "Next";
    }
  };

  const previousStep = getPreviousStep();
  const nextStep = getNextStep();

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <nav aria-label="Import progress" className="flex items-center gap-2">
        {STEPS.map(({ key, label }, index) => {
          const stepIndex = getStepIndex(key);
          const isActive = key === step || (step === "complete" && key === "importing");
          const isCompleted = stepIndex < currentIndex;

          return (
            <div key={key} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={cn(
                    "h-px w-6 sm:w-10",
                    isCompleted || isActive
                      ? "bg-zinc-400"
                      : "bg-zinc-700",
                  )}
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    isCompleted
                      ? "bg-zinc-100 text-zinc-900"
                      : isActive
                        ? "bg-zinc-100 text-zinc-900"
                        : "bg-zinc-800 text-zinc-600",
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-sm sm:inline",
                    isActive
                      ? "font-medium text-zinc-100"
                      : isCompleted
                        ? "text-zinc-300"
                        : "text-zinc-600",
                  )}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Step content */}
      <div className="min-h-[300px]">
        {step === "importing" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Spinner />
            <p className="text-sm text-zinc-400">
              Importing transactions...
            </p>
          </div>
        ) : step === "complete" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <SuccessIcon />
            <p className="text-lg font-medium text-zinc-100">
              Import complete
            </p>
            <p className="text-sm text-zinc-400">
              Successfully imported{" "}
              <span className="font-medium text-zinc-100">
                {importedCount}
              </span>{" "}
              transaction{importedCount !== 1 ? "s" : ""}.
            </p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
        <div>
          {previousStep && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onStepChange(previousStep)}
            >
              Back
            </Button>
          )}
        </div>
        <div>
          {step === "complete" ? (
            <Button
              type="button"
              onClick={() => onStepChange("upload")}
            >
              Done
            </Button>
          ) : nextStep ? (
            <Button
              type="button"
              onClick={() => onStepChange(nextStep)}
            >
              {getNextButtonText()}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
