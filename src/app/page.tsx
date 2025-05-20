"use client";
import DynamicTable, { type TableConfig } from "@/components/dynamic-table/dynamic-table";

export default function Home() {
  // Example table configuration
  const tableConfig: TableConfig = {
    url: "/api/table-data", // This will be the endpoint that returns your data
    columns: [
      {
        field: "id",
        headerName: "ID",
        type: "number",
        width: 80,
      },
      {
        field: "name",
        headerName: "Name",
        type: "text",
        editable: true,
      },
      {
        field: "email",
        headerName: "Email",
        type: "text",
        editable: true,
      },
      {
        field: "status",
        headerName: "Status",
        type: "select",
        filterOptions: ["Active", "Inactive", "Pending"],
        editable: true,
      },
      {
        field: "createdAt",
        headerName: "Created Date",
        type: "date",
        valueFormatter: (params) => {
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        field: "isVerified",
        headerName: "Verified",
        type: "boolean",
      },
    ],
    defaultSortField: "createdAt",
    defaultSortDirection: "desc",
    pageSize: 25,
    selectionMode: "multiple",
    onRowSelected: (rows) => {
      console.log("Selected rows:", rows);
    },
    onRowEdited: (oldData, newData) => {
      console.log("Row edited:", { oldData, newData });
      // Here you would typically make an API call to update the data
    },
    onRowDeleted: (row) => {
      console.log("Row deleted:", row);
      // Here you would typically make an API call to delete the data
    },
    serverSidePagination: true,
  };

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Dynamic Table Example</h1>
      <DynamicTable config={tableConfig} />
    </main>
  );
}
