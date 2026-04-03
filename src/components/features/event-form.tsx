"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createEvent, updateEvent } from "@/actions/events";

const STATUS_OPTIONS = [
  { label: "Planned", value: "planned" },
  { label: "Booked", value: "booked" },
  { label: "Paid", value: "paid" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

interface CategoryOption {
  label: string;
  value: string;
}

interface EventData {
  id: string;
  name: string;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  targetDate: string | null;
  categoryId: string | null;
  status: string;
  notes: string | null;
}

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  event?: EventData;
  categories: CategoryOption[];
}

export function EventForm({
  open,
  onClose,
  event,
  categories,
}: EventFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!event;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateEvent(formData);
      } else {
        await createEvent(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const defaultEstimated = event?.estimatedCostCents
    ? (event.estimatedCostCents / 100).toFixed(2)
    : "";
  const defaultActual = event?.actualCostCents
    ? (event.actualCostCents / 100).toFixed(2)
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Event" : "Add Event"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={event.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. Wedding, Vacation, Home Renovation"
          defaultValue={event?.name ?? ""}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Estimated Cost"
            name="estimatedCostCents"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaultEstimated}
          />

          <Input
            label="Actual Cost"
            name="actualCostCents"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            defaultValue={defaultActual}
          />
        </div>

        <Input
          label="Target Date"
          name="targetDate"
          type="date"
          defaultValue={event?.targetDate ?? ""}
        />

        <Select
          label="Category"
          name="categoryId"
          options={categories}
          placeholder="Select category..."
          defaultValue={event?.categoryId ?? ""}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={event?.status ?? "planned"}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-zinc-300"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Optional notes..."
            defaultValue={event?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
