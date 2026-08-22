"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogFiltersController, CatalogSortField } from "../filters";

const SORT_OPTIONS: { value: CatalogSortField; label: string }[] = [
  { value: "created_at", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "updated_at", label: "Recently updated" },
];

export function CatalogControls({
  controller,
  brandSuggestions,
}: {
  controller: CatalogFiltersController;
  brandSuggestions?: string[];
}) {
  const uniqueBrands = Array.from(new Set(brandSuggestions ?? []))
    .filter((brand) => brand.trim() !== "")
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        type="search"
        value={controller.searchDisplay}
        onChange={(event) => controller.onSearchInput(event.target.value)}
        placeholder="Search products…"
        aria-label="Search products"
        className="sm:w-64"
      />
      <Input
        type="text"
        value={controller.brandDisplay}
        onChange={(event) => controller.onBrandInput(event.target.value)}
        placeholder="Filter by brand…"
        aria-label="Filter by brand"
        list="catalog-brand-options"
        className="sm:w-52"
      />
      <datalist id="catalog-brand-options">
        {uniqueBrands.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <Select
        value={controller.values.sort}
        onValueChange={(value) =>
          controller.onSortChange(value as CatalogSortField)
        }
      >
        <SelectTrigger
          aria-label="Sort products by"
          className="w-full sm:w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={controller.onToggleDirection}
        aria-label={
          controller.values.desc
            ? "Sorted descending — switch to ascending"
            : "Sorted ascending — switch to descending"
        }
        title={controller.values.desc ? "Descending" : "Ascending"}
      >
        {controller.values.desc ? (
          <ArrowDown aria-hidden className="size-4" />
        ) : (
          <ArrowUp aria-hidden className="size-4" />
        )}
        {controller.values.desc ? "Desc" : "Asc"}
      </Button>
    </div>
  );
}
