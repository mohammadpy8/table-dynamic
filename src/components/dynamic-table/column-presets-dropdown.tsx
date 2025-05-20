"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TableColumn } from "./dynamic-table";
import { LayoutTemplate } from "lucide-react";

interface ColumnPresetsDropdownProps {
  columns: TableColumn[];
  onApplyPreset: (preset: { field: string; visible: boolean }[]) => void;
  onResetColumns: () => void;
}

export function ColumnPresetsDropdown({ columns, onApplyPreset, onResetColumns }: ColumnPresetsDropdownProps) {
  // Predefined presets
  const presets = {
    minimal: () => {
      // Show only ID and Name columns
      return columns.map((column) => ({
        field: column.field,
        visible: ["id", "name"].includes(column.field.toLowerCase()),
      }));
    },
    compact: () => {
      // Show a small subset of important columns
      const importantFields = ["id", "name", "email", "status", "createdAt"];
      return columns.map((column) => ({
        field: column.field,
        visible: importantFields.some((field) => column.field.toLowerCase().includes(field)),
      }));
    },
    detailed: () => {
      // Show all columns except very specific ones that might be too detailed
      const excludeFields = ["updatedAt", "deletedAt", "metadata"];
      return columns.map((column) => ({
        field: column.field,
        visible: !excludeFields.some((field) => column.field.toLowerCase().includes(field)),
      }));
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1">
          <LayoutTemplate className="h-4 w-4 mr-1" />
          Presets
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Column Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onApplyPreset(presets.minimal())}>Minimal (ID & Name only)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onApplyPreset(presets.compact())}>
            Compact (Essential fields)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onApplyPreset(presets.detailed())}>Detailed (Most fields)</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onResetColumns}>Reset to Default</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
