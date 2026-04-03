"use client";

import { useRef, useTransition } from "react";
import { Button, Input, Select, Modal } from "@/components/ui";
import { createWishlistItem, updateWishlistItem } from "@/actions/wishlist";

const PRIORITY_OPTIONS = [
  { label: "P1 - High", value: "p1" },
  { label: "P2 - Medium", value: "p2" },
  { label: "P3 - Low", value: "p3" },
];

const STATUS_OPTIONS = [
  { label: "Wishlist", value: "wishlist" },
  { label: "Researching", value: "researching" },
  { label: "Ready to Buy", value: "ready_to_buy" },
  { label: "Purchased", value: "purchased" },
];

interface CategoryOption {
  label: string;
  value: string;
}

interface WishlistItemData {
  id: string;
  name: string;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  priority: string;
  categoryId: string | null;
  url: string | null;
  status: string;
  purchaseDate: string | null;
  notes: string | null;
}

interface WishlistFormProps {
  open: boolean;
  onClose: () => void;
  item?: WishlistItemData;
  categories: CategoryOption[];
}

export function WishlistForm({
  open,
  onClose,
  item,
  categories,
}: WishlistFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!item;
  const isPurchased = item?.status === "purchased";

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEdit) {
        await updateWishlistItem(formData);
      } else {
        await createWishlistItem(formData);
      }
      formRef.current?.reset();
      onClose();
    });
  };

  const defaultEstimated = item?.estimatedCostCents
    ? (item.estimatedCostCents / 100).toFixed(2)
    : "";
  const defaultActual = item?.actualCostCents
    ? (item.actualCostCents / 100).toFixed(2)
    : "";

  const categoryOptions: CategoryOption[] = [
    { label: "No category", value: "" },
    ...categories,
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Wishlist Item" : "Add Wishlist Item"}
    >
      <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
        {isEdit && <input type="hidden" name="id" value={item.id} />}

        <Input
          label="Name"
          name="name"
          placeholder="e.g. New Headphones, Standing Desk"
          defaultValue={item?.name ?? ""}
          required
        />

        <Input
          label="Estimated Cost"
          name="estimatedCost"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaultEstimated}
        />

        <Select
          label="Priority"
          name="priority"
          options={PRIORITY_OPTIONS}
          defaultValue={item?.priority ?? "p2"}
          required
        />

        <Select
          label="Category"
          name="categoryId"
          options={categoryOptions}
          defaultValue={item?.categoryId ?? ""}
        />

        <Input
          label="URL"
          name="url"
          type="url"
          placeholder="https://..."
          defaultValue={item?.url ?? ""}
        />

        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          defaultValue={item?.status ?? "wishlist"}
          required
        />

        {isEdit && isPurchased && (
          <>
            <Input
              label="Actual Cost"
              name="actualCost"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              defaultValue={defaultActual}
            />

            <Input
              label="Purchase Date"
              name="purchaseDate"
              type="date"
              defaultValue={item?.purchaseDate ?? ""}
            />
          </>
        )}

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
            defaultValue={item?.notes ?? ""}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          />
        </div>

        <div className="mt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
