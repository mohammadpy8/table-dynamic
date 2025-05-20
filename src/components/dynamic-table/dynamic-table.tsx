"use client";

import type React from "react";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { debounce } from "lodash";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, SlidersHorizontal, X, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { PaginationControls } from "./pagination-controls";
import { ColumnVisibilityDropdown } from "./column-visibility-dropdown";
import { ColumnPresetsDropdown } from "./column-presets-dropdown";

// Types
export interface TableColumn {
  field: string;
  headerName: string;
  type?: "text" | "number" | "date" | "boolean" | "select";
  width?: number;
  sortable?: boolean;
  filter?: boolean;
  editable?: boolean;
  filterOptions?: string[];
  valueFormatter?: (value: any) => string;
  visible?: boolean;
}

export interface TableConfig {
  url: string;
  columns: TableColumn[];
  defaultSortField?: string;
  defaultSortDirection?: "asc" | "desc";
  pageSize?: number;
  pageSizeOptions?: number[];
  selectionMode?: "single" | "multiple" | "none";
  onRowSelected?: (rows: any[]) => void;
  onRowDeleted?: (row: any) => void;
  onRowEdited?: (oldData: any, newData: any) => void;
  queryParams?: Record<string, string>;
  serverSidePagination?: boolean;
}

export interface FilterState {
  [key: string]: any;
}

export interface ColumnState {
  field: string;
  width: number;
  visible: boolean;
  order: number;
}

const DynamicTable = ({ config }: { config: TableConfig }) => {
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({});
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(config.pageSize || 25);
  const [totalRows, setTotalRows] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string | null>(config.defaultSortField || null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(config.defaultSortDirection || "asc");

  // Column state management
  const [columnStates, setColumnStates] = useState<ColumnState[]>(() =>
    config.columns.map((col, index) => ({
      field: col.field,
      width: col.width || 150,
      visible: col.visible !== false,
      order: index,
    }))
  );

  // Refs for drag and drop
  const draggedColumn = useRef<string | null>(null);
  const resizingColumn = useRef<string | null>(null);
  const startResizeX = useRef<number>(0);
  const startResizeWidth = useRef<number>(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // Get ordered columns
  const getOrderedColumns = () => {
    return [...columnStates]
      .sort((a, b) => a.order - b.order)
      .filter((col) => col.visible)
      .map((colState) => {
        const originalCol = config.columns.find((c) => c.field === colState.field)!;
        return {
          ...originalCol,
          width: colState.width,
        };
      });
  };

  // Fetch data with TanStack Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "tableData",
      config.url,
      pageIndex,
      pageSize,
      searchText,
      filterState,
      config.queryParams,
      sortField,
      sortDirection,
    ],
    queryFn: async () => {
      // Build URL with query parameters
      const url = new URL(config.url, window.location.origin);

      // Add pagination parameters
      if (config.serverSidePagination) {
        url.searchParams.append("page", String(pageIndex));
        url.searchParams.append("pageSize", String(pageSize));
      }

      // Add filter parameters
      Object.entries(filterState).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(`filter[${key}]`, String(value));
        }
      });

      // Add search parameter
      if (searchText) {
        url.searchParams.append("search", searchText);
      }

      // Add sort parameters
      if (sortField) {
        url.searchParams.append("sortField", sortField);
        url.searchParams.append("sortDirection", sortDirection);
      }

      // Add any additional query parameters from config
      if (config.queryParams) {
        Object.entries(config.queryParams).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();

      // Handle both formats: direct array or { data, pagination } object
      if (Array.isArray(result)) {
        return { data: result, pagination: { totalRows: result.length } };
      } else if (result.data) {
        setTotalRows(result.pagination?.totalRows || result.data.length);
        return result;
      }

      return { data: [], pagination: { totalRows: 0 } };
    },
    enabled: !!config.url,
  });

  // Update table data when query data changes
  useEffect(() => {
    if (data?.data) {
      setTableData(data.data);
      if (data.pagination?.totalRows) {
        setTotalRows(data.pagination.totalRows);
      }
    }
  }, [data]);

  // Client-side sorting
  const sortData = (data: any[]) => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];

      // Handle different types of values
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }

      if (valueA instanceof Date && valueB instanceof Date) {
        return sortDirection === "asc" ? valueA.getTime() - valueB.getTime() : valueB.getTime() - valueA.getTime();
      }

      // Default numeric comparison
      return sortDirection === "asc" ? (valueA || 0) - (valueB || 0) : (valueB || 0) - (valueA || 0);
    });
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchText(value);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (field: string, value: any) => {
    setFilterState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterState({});
    setSearchText("");
  };

  // Handle row selection
  const handleRowSelection = (row: any) => {
    if (config.selectionMode === "none") return;

    if (config.selectionMode === "single") {
      const isSelected = selectedRows.some((r) => r.id === row.id);
      const newSelectedRows = isSelected ? [] : [row];
      setSelectedRows(newSelectedRows);
      if (config.onRowSelected) {
        config.onRowSelected(newSelectedRows);
      }
    } else {
      // Multiple selection
      const isSelected = selectedRows.some((r) => r.id === row.id);
      const newSelectedRows = isSelected ? selectedRows.filter((r) => r.id !== row.id) : [...selectedRows, row];
      setSelectedRows(newSelectedRows);
      if (config.onRowSelected) {
        config.onRowSelected(newSelectedRows);
      }
    }
  };

  // Check if row is selected
  const isRowSelected = (row: any) => {
    return selectedRows.some((r) => r.id === row.id);
  };

  // Delete selected rows
  const deleteSelectedRows = () => {
    if (config.onRowDeleted && selectedRows.length > 0) {
      selectedRows.forEach((row) => {
        if (config.onRowDeleted) {
          config.onRowDeleted(row);
        }
      });
      // Remove from local data
      const newData = tableData.filter((row) => !selectedRows.some((r) => r.id === row.id));
      setTableData(newData);
      setSelectedRows([]);
    }
  };

  // Generate filter form based on column definitions
  const renderFilterForm = () => {
    if (!showFilters) return null;

    return (
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.columns
              .filter((col) => col.filter !== false)
              .map((column) => (
                <div key={column.field} className="flex flex-col space-y-2">
                  <Label htmlFor={`filter-${column.field}`}>{column.headerName}</Label>

                  {column.type === "boolean" ? (
                    <Checkbox
                      id={`filter-${column.field}`}
                      checked={!!filterState[column.field]}
                      onCheckedChange={(checked) => handleFilterChange(column.field, checked)}
                    />
                  ) : column.type === "select" && column.filterOptions ? (
                    <select
                      id={`filter-${column.field}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={filterState[column.field] || ""}
                      onChange={(e) => handleFilterChange(column.field, e.target.value)}
                    >
                      <option value="">All</option>
                      {column.filterOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`filter-${column.field}`}
                      type={column.type === "number" ? "number" : "text"}
                      value={filterState[column.field] || ""}
                      onChange={(e) => handleFilterChange(column.field, e.target.value)}
                      placeholder={`Filter by ${column.headerName.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters} className="mr-2">
              Clear Filters
            </Button>
            <Button onClick={() => setShowFilters(false)}>Apply Filters</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Format cell value based on column type and formatter
  const formatCellValue = (value: any, column: TableColumn) => {
    if (value === undefined || value === null) return "";

    if (column.valueFormatter) {
      return column.valueFormatter(value);
    }

    if (column.type === "date" && value) {
      return new Date(value).toLocaleDateString();
    }

    if (column.type === "boolean") {
      return value ? "Yes" : "No";
    }

    return value.toString();
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setPageIndex(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPageIndex(1); // Reset to first page when changing page size
  };

  // Get displayed data (with client-side pagination if needed)
  const getDisplayedData = () => {
    let displayData = sortData([...tableData]);

    if (!config.serverSidePagination && displayData.length > 0) {
      const startIndex = (pageIndex - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      displayData = displayData.slice(startIndex, endIndex);
    }

    return displayData;
  };

  // Column drag and drop handlers
  const handleDragStart = (field: string) => {
    draggedColumn.current = field;
  };

  const handleDragOver = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    if (!draggedColumn.current || draggedColumn.current === field) return;

    const draggedIndex = columnStates.find((col) => col.field === draggedColumn.current)!.order;
    const targetIndex = columnStates.find((col) => col.field === field)!.order;

    if (draggedIndex === targetIndex) return;

    // Update column orders
    setColumnStates((prev) => {
      const newColumnStates = [...prev];

      // If moving right, all columns between draggedIndex and targetIndex move left
      if (draggedIndex < targetIndex) {
        newColumnStates.forEach((col) => {
          if (col.field === draggedColumn.current) {
            col.order = targetIndex;
          } else if (col.order > draggedIndex && col.order <= targetIndex) {
            col.order--;
          }
        });
      }
      // If moving left, all columns between targetIndex and draggedIndex move right
      else {
        newColumnStates.forEach((col) => {
          if (col.field === draggedColumn.current) {
            col.order = targetIndex;
          } else if (col.order >= targetIndex && col.order < draggedIndex) {
            col.order++;
          }
        });
      }

      return newColumnStates;
    });
  };

  const handleDragEnd = () => {
    draggedColumn.current = null;
  };

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();

    const columnState = columnStates.find((col) => col.field === field);
    if (!columnState) return;

    resizingColumn.current = field;
    startResizeX.current = e.clientX;
    startResizeWidth.current = columnState.width;

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;

    const diff = e.clientX - startResizeX.current;
    const newWidth = Math.max(50, startResizeWidth.current + diff); // Minimum width of 50px

    setColumnStates((prev) =>
      prev.map((col) => (col.field === resizingColumn.current ? { ...col, width: newWidth } : col))
    );
  };

  const handleResizeEnd = () => {
    resizingColumn.current = null;
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeEnd);
  };

  // Handle column visibility change
  const handleColumnVisibilityChange = (field: string, visible: boolean) => {
    setColumnStates((prev) => prev.map((col) => (col.field === field ? { ...col, visible } : col)));
  };

  // Apply column preset
  const applyColumnPreset = (preset: { field: string; visible: boolean }[]) => {
    setColumnStates((prev) => {
      const newColumnStates = [...prev];

      preset.forEach(({ field, visible }) => {
        const colState = newColumnStates.find((col) => col.field === field);
        if (colState) {
          colState.visible = visible;
        }
      });

      return newColumnStates;
    });
  };

  // Reset column state
  const resetColumnState = () => {
    setColumnStates(
      config.columns.map((col, index) => ({
        field: col.field,
        width: col.width || 150,
        visible: col.visible !== false,
        order: index,
      }))
    );
  };

  return (
    <div className="w-full" ref={tableRef}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." onChange={handleSearchChange} className="pl-8" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1">
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>

          <ColumnVisibilityDropdown
            columns={config.columns}
            columnStates={columnStates}
            onColumnVisibilityChange={handleColumnVisibilityChange}
          />

          <ColumnPresetsDropdown
            columns={config.columns}
            onApplyPreset={applyColumnPreset}
            onResetColumns={resetColumnState}
          />

          {config.selectionMode !== "none" && selectedRows.length > 0 && (
            <Button variant="destructive" onClick={deleteSelectedRows} className="flex items-center gap-1">
              <X className="h-4 w-4 mr-1" />
              Delete Selected ({selectedRows.length})
            </Button>
          )}
        </div>
      </div>

      {renderFilterForm()}

      {error ? (
        <div className="text-red-500 mb-4">Error loading data: {(error as Error).message}</div>
      ) : (
        <div className="border rounded-md overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {config.selectionMode !== "none" && <TableHead className="w-[50px]">Select</TableHead>}
                {getOrderedColumns().map((column) => (
                  <TableHead
                    key={column.field}
                    style={{
                      width: `${columnStates.find((c) => c.field === column.field)?.width || 150}px`,
                      position: "relative",
                      userSelect: "none",
                    }}
                    className={column.sortable !== false ? "cursor-pointer" : ""}
                    onClick={column.sortable !== false ? () => handleSort(column.field) : undefined}
                    draggable
                    onDragStart={() => handleDragStart(column.field)}
                    onDragOver={(e) => handleDragOver(e, column.field)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-center">
                      <GripVertical
                        className="h-4 w-4 mr-1 cursor-grab opacity-50 hover:opacity-100"
                        onDragStart={(e) => e.stopPropagation()}
                      />
                      {column.headerName}
                      {sortField === column.field && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-gray-300"
                      onMouseDown={(e) => handleResizeStart(e, column.field)}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={getOrderedColumns().length + (config.selectionMode !== "none" ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    Loading data...
                  </TableCell>
                </TableRow>
              ) : getDisplayedData().length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={getOrderedColumns().length + (config.selectionMode !== "none" ? 1 : 0)}
                    className="h-24 text-center"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                getDisplayedData().map((row, rowIndex) => (
                  <TableRow
                    key={row.id || rowIndex}
                    className={`${isRowSelected(row) ? "bg-muted" : ""} ${
                      config.selectionMode !== "none" ? "cursor-pointer" : ""
                    }`}
                    onClick={config.selectionMode !== "none" ? () => handleRowSelection(row) : undefined}
                  >
                    {config.selectionMode !== "none" && (
                      <TableCell>
                        <Checkbox checked={isRowSelected(row)} onCheckedChange={() => handleRowSelection(row)} />
                      </TableCell>
                    )}
                    {getOrderedColumns().map((column) => (
                      <TableCell key={`${row.id || rowIndex}-${column.field}`}>
                        {formatCellValue(row[column.field], column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4">
        <PaginationControls
          currentPage={pageIndex}
          totalPages={Math.ceil(totalRows / pageSize)}
          pageSize={pageSize}
          pageSizeOptions={config.pageSizeOptions || [10, 25, 50, 100]}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
};

export default DynamicTable;
