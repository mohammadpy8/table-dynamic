"use client";

import { useState } from "react";
import DynamicTable, { type TableConfig } from "./dynamic-table";

interface TableWrapperProps {
  config: TableConfig;
}

export function TableWrapper({ config }: TableWrapperProps) {
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a modified config that includes the total rows
  const enhancedConfig: TableConfig = {
    ...config,
    totalRows,
  };

  // This component can be used to add additional functionality around the table
  // such as custom toolbar actions, export buttons, etc.

  return <DynamicTable config={enhancedConfig} />;
}
