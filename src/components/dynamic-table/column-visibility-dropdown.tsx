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
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnsIcon } from "lucide-react";
import type { TableColumn, ColumnState } from "./dynamic-table";

interface ColumnVisibilityDropdownProps {
  columns: TableColumn[];
  columnStates: ColumnState[];
  onColumnVisibilityChange: (field: string, visible: boolean) => void;
}

export function ColumnVisibilityDropdown({
  columns,
  columnStates,
  onColumnVisibilityChange,
}: ColumnVisibilityDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1">
          <ColumnsIcon className="h-4 w-4 mr-1" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
          {columns.map((column) => {
            const columnState = columnStates.find((c) => c.field === column.field);
            const isVisible = columnState?.visible ?? true;

            return (
              <DropdownMenuItem key={column.field} onSelect={(e) => e.preventDefault()}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`column-toggle-${column.field}`}
                    checked={isVisible}
                    onCheckedChange={(checked) => onColumnVisibilityChange(column.field, !!checked)}
                  />
                  <label
                    htmlFor={`column-toggle-${column.field}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {column.headerName}
                  </label>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
