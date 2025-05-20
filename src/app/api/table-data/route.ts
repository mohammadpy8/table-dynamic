import { type NextRequest, NextResponse } from "next/server";

function generateMockData(count: number) {
  const statuses = ["Active", "Inactive", "Pending"];

  return Array.from({ length: count }, (_, i) => {
    const id = i + 1;
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString(),
      isVerified: Math.random() > 0.3,
    };
  });
}

// Sample data
const mockData = generateMockData(100);

export async function GET(request: NextRequest) {
  // Get search params
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase();

  // Get pagination params
  const page = Number.parseInt(searchParams.get("page") || "1");
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "25");

  // Process filter parameters
  const filterParams: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("filter[") && key.endsWith("]")) {
      const field = key.slice(7, -1); // Extract field name from filter[field]
      filterParams[field] = value;
    }
  }

  // Apply filters and search
  let filteredData = [...mockData];

  // Apply search across all fields
  if (search) {
    filteredData = filteredData.filter((item) =>
      Object.values(item).some(
        (val) => val !== null && val !== undefined && val.toString().toLowerCase().includes(search)
      )
    );
  }

  // Apply specific filters
  Object.entries(filterParams).forEach(([field, value]) => {
    if (value) {
      filteredData = filteredData.filter((item) => {
        const itemValue = (item as any)[field];

        // Handle different types of comparisons based on field type
        if (typeof itemValue === "boolean") {
          return value === "true" ? itemValue : !itemValue;
        } else if (typeof itemValue === "number") {
          return itemValue.toString() === value;
        } else {
          return itemValue.toString().toLowerCase().includes(value.toLowerCase());
        }
      });
    }
  });

  // Get total count before pagination
  const totalCount = filteredData.length;

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Simulate server delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Return data with pagination metadata
  return NextResponse.json({
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      totalRows: totalCount,
    },
  });
}
