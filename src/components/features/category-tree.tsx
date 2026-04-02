"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryForm } from "./category-form";
import { deleteCategory } from "@/actions/categories";
import { formatCents, cn } from "@/lib/utils";
import type { Category, CategoryGroup } from "@/db/queries/categories";

interface CategoryTreeProps {
  groups: CategoryGroup[];
  parentCategories: Category[];
}

export function CategoryTree({ groups, parentCategories }: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.parent.id)),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | undefined>();
  const [formParentId, setFormParentId] = useState<string | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAdd() {
    setEditCategory(undefined);
    setFormParentId(undefined);
    setFormOpen(true);
  }

  function openAddSub(parentId: string) {
    setEditCategory(undefined);
    setFormParentId(parentId);
    setFormOpen(true);
  }

  function openEdit(cat: Category) {
    setEditCategory(cat);
    setFormParentId(undefined);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditCategory(undefined);
    setFormParentId(undefined);
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setDeleteConfirm(null);
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Categories</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {groups.length} categories,{" "}
            {groups.reduce((sum, g) => sum + g.children.length, 0)} subcategories
          </p>
        </div>
        <Button onClick={openAdd}>+ Add Category</Button>
      </div>

      {/* Tree */}
      <div className="space-y-2">
        {groups.map(({ parent, children }) => {
          const isExpanded = expanded.has(parent.id);
          const isDeleting = deleteConfirm === parent.id;

          return (
            <div
              key={parent.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900"
            >
              {/* Parent row */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Expand toggle */}
                <button
                  onClick={() => toggle(parent.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <svg
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-90",
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                {/* Color swatch */}
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-700"
                  style={{ backgroundColor: parent.color ?? "#6b7280" }}
                />

                {/* Icon */}
                {parent.icon && (
                  <span className="text-lg leading-none">{parent.icon}</span>
                )}

                {/* Name */}
                <span className="font-medium text-zinc-100">{parent.name}</span>

                {/* Child count badge */}
                {children.length > 0 && (
                  <Badge variant="default">{children.length}</Badge>
                )}

                {/* Budget */}
                {parent.budgetAmountCents != null && (
                  <span className="text-sm text-zinc-400">
                    {formatCents(parent.budgetAmountCents)}/mo
                  </span>
                )}

                {/* Default badge */}
                {parent.isDefault && (
                  <Badge variant="info">default</Badge>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAddSub(parent.id)}
                    title="Add subcategory"
                  >
                    + Sub
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(parent)}
                    title="Edit"
                  >
                    Edit
                  </Button>
                  {!parent.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteConfirm(parent.id);
                      }}
                      title="Delete"
                    >
                      Del
                    </Button>
                  )}
                </div>
              </div>

              {/* Delete confirmation */}
              {isDeleting && (
                <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-red-400">
                      Delete &quot;{parent.name}&quot; and all its data?
                    </span>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={isPending}
                      onClick={() => handleDelete(parent.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteConfirm(null);
                        setDeleteError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    {deleteError && (
                      <span className="text-xs text-red-400">{deleteError}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Children */}
              {isExpanded && children.length > 0 && (
                <div className="border-t border-zinc-800">
                  {children.map((child) => {
                    const isChildDeleting = deleteConfirm === child.id;

                    return (
                      <div key={child.id}>
                        <div className="flex items-center gap-3 py-2.5 pl-14 pr-4">
                          {/* Color swatch */}
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-700"
                            style={{
                              backgroundColor: child.color ?? "#6b7280",
                            }}
                          />

                          {/* Name */}
                          <span className="text-sm text-zinc-300">
                            {child.name}
                          </span>

                          {/* Budget */}
                          {child.budgetAmountCents != null && (
                            <span className="text-xs text-zinc-500">
                              {formatCents(child.budgetAmountCents)}/mo
                            </span>
                          )}

                          {/* Spacer */}
                          <div className="flex-1" />

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(child)}
                              title="Edit"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteConfirm(child.id);
                              }}
                              title="Delete"
                            >
                              Del
                            </Button>
                          </div>
                        </div>

                        {/* Child delete confirmation */}
                        {isChildDeleting && (
                          <div className="bg-zinc-950 px-4 py-2.5 pl-14">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-red-400">
                                Delete &quot;{child.name}&quot;?
                              </span>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={isPending}
                                onClick={() => handleDelete(child.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteConfirm(null);
                                  setDeleteError(null);
                                }}
                              >
                                Cancel
                              </Button>
                              {deleteError && (
                                <span className="text-xs text-red-400">
                                  {deleteError}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 py-12 text-center">
          <p className="text-zinc-400">No categories yet.</p>
          <Button className="mt-4" onClick={openAdd}>
            Create your first category
          </Button>
        </div>
      )}

      {/* Form modal — conditionally rendered so useActionState resets on each open */}
      {formOpen && (
        <CategoryForm
          open={formOpen}
          onClose={closeForm}
          category={editCategory}
          parentId={formParentId}
          parentCategories={parentCategories}
        />
      )}
    </div>
  );
}
