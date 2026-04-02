"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCategory, updateCategory } from "@/actions/categories";
import type { Category } from "@/db/queries/categories";

interface CategoryFormProps {
  open: boolean;
  onClose: () => void;
  category?: Category;
  parentId?: string;
  parentCategories: Category[];
}

const initialState: { error?: string; success?: boolean } = {};

function formAction(
  _prev: typeof initialState,
  formData: FormData,
): Promise<typeof initialState> {
  const id = formData.get("id") as string;
  if (id) return updateCategory(formData);
  return createCategory(formData);
}

export function CategoryForm({
  open,
  onClose,
  category,
  parentId,
  parentCategories,
}: CategoryFormProps) {
  const [state, dispatch, isPending] = useActionState(formAction, initialState);

  const isEdit = !!category;
  const title = isEdit
    ? `Edit ${category.name}`
    : parentId
      ? "Add Subcategory"
      : "Add Category";

  // Close on success
  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  // Format cents to dollar string for the input default
  const budgetDefault =
    category?.budgetAmountCents != null
      ? (category.budgetAmountCents / 100).toFixed(2)
      : "";

  const defaultParentId = category?.parentId ?? parentId ?? "";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form action={dispatch} className="flex flex-col gap-4">
        {/* Hidden ID for edits */}
        {isEdit && <input type="hidden" name="id" value={category.id} />}

        <Input
          label="Name"
          name="name"
          required
          defaultValue={category?.name ?? ""}
          placeholder="e.g. Groceries"
        />

        {/* Parent select */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="parentId"
            className="text-sm font-medium text-zinc-300"
          >
            Parent Category
          </label>
          <select
            id="parentId"
            name="parentId"
            defaultValue={defaultParentId}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <option value="">None (top-level)</option>
            {parentCategories.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="color"
              className="text-sm font-medium text-zinc-300"
            >
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="color"
                name="color"
                defaultValue={category?.color ?? "#6b7280"}
                className="h-9 w-12 cursor-pointer rounded border border-zinc-700 bg-zinc-900"
              />
              <span className="text-xs text-zinc-500">Hex color</span>
            </div>
          </div>

          {/* Icon */}
          <Input
            label="Icon"
            name="icon"
            defaultValue={category?.icon ?? ""}
            placeholder="e.g. 🍔"
            maxLength={50}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Budget */}
          <Input
            label="Budget ($/mo)"
            name="budgetAmount"
            type="text"
            inputMode="decimal"
            defaultValue={budgetDefault}
            placeholder="0.00"
          />

          {/* Sort order */}
          <Input
            label="Sort Order"
            name="sortOrder"
            type="number"
            defaultValue={category?.sortOrder?.toString() ?? "0"}
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending}>
            {isEdit ? "Save Changes" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
