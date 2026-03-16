"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Settings2,
  Eye,
  EyeOff,
  Search,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { formatDuration, formatPace } from "@/lib/activityUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LapsTableProps {
  laps: any[];
  usePace: boolean;
}

const STORAGE_KEY = "laps-table-config";

export function LapsTable({ laps, usePace }: LapsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.visibility) setColumnVisibility(config.visibility);
        if (config.order) setColumnOrder(config.order);
      } catch (e) {
        console.error("Failed to load table config", e);
      }
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    if (Object.keys(columnVisibility).length > 0 || columnOrder.length > 0) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ visibility: columnVisibility, order: columnOrder }),
      );
    }
  }, [columnVisibility, columnOrder]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "index",
        header: "Lap",
        cell: (info) => info.row.index + 1,
      },
      {
        accessorKey: "total_distance",
        header: "Distance",
        cell: (info) => {
          const val = info.getValue() as number;
          return val ? (val / 1000).toFixed(2) + " km" : "0.00 km";
        },
      },
      {
        accessorKey: "total_timer_time",
        header: "Duration",
        cell: (info) => formatDuration(info.getValue() as number),
      },
      {
        accessorKey: "avg_speed",
        header: usePace ? "Avg Pace" : "Avg Speed",
        cell: (info) => {
          const val = info.getValue() as number;
          if (!val || val <= 0) return "--";
          return usePace
            ? `${formatPace(1000 / (val * 60))}/km`
            : `${(val * 3.6).toFixed(1)} km/h`;
        },
      },
      {
        accessorKey: "max_speed",
        header: usePace ? "Max Pace" : "Max Speed",
        cell: (info) => {
          const val = info.getValue() as number;
          if (!val || val <= 0) return "--";
          return usePace
            ? `${formatPace(1000 / (val * 60))}/km`
            : `${(val * 3.6).toFixed(1)} km/h`;
        },
      },
      {
        accessorKey: "avg_heart_rate",
        header: "Avg HR",
        cell: (info) => info.getValue() ?? "--",
      },
      {
        accessorKey: "max_heart_rate",
        header: "Max HR",
        cell: (info) => info.getValue() ?? "--",
      },
      {
        accessorKey: "avg_cadence",
        header: "Avg Cadence",
        cell: (info) => info.getValue() ?? "--",
      },
      {
        accessorKey: "max_cadence",
        header: "Max Cadence",
        cell: (info) => info.getValue() ?? "--",
      },
      {
        accessorKey: "avg_power",
        header: "Avg Power",
        cell: (info) => (info.getValue() ? `${info.getValue()} W` : "--"),
      },
      {
        accessorKey: "max_power",
        header: "Max Power",
        cell: (info) => (info.getValue() ? `${info.getValue()} W` : "--"),
      },
      {
        accessorKey: "total_ascent",
        header: "Ascent",
        cell: (info) => (info.getValue() ? `${info.getValue()} m` : "--"),
      },
      {
        accessorKey: "total_descent",
        header: "Descent",
        cell: (info) => (info.getValue() ? `${info.getValue()} m` : "--"),
      },
      {
        accessorKey: "total_calories",
        header: "Calories",
        cell: (info) => (info.getValue() ? `${info.getValue()} kcal` : "--"),
      },
    ],
    [usePace],
  );

  const table = useReactTable({
    data: laps,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Search laps..."
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border",
              isConfigOpen
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
            )}
          >
            <Settings2 className="w-4 h-4" />
            <span>Configure Columns</span>
          </button>

          {isConfigOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-30 p-4 max-h-[400px] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Visible Columns
                  </span>
                  <button
                    onClick={() => {
                      table.setColumnVisibility({});
                      table.setColumnOrder([]);
                      setColumnOrder([]);
                    }}
                    className="text-[10px] text-blue-600 hover:underline font-bold uppercase"
                  >
                    Reset
                  </button>
                </div>
                {table.getAllLeafColumns().map((column, index, all) => {
                  return (
                    <div
                      key={column.id}
                      className="flex items-center justify-between group py-1"
                    >
                      <label className="flex items-center space-x-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          {column.columnDef.header as string}
                        </span>
                      </label>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...table.getState().columnOrder];
                            if (newOrder.length === 0) {
                              // Initialize order if empty
                              all.forEach((col) => newOrder.push(col.id));
                            }
                            const pos = newOrder.indexOf(column.id);
                            if (pos > 0) {
                              [newOrder[pos], newOrder[pos - 1]] = [
                                newOrder[pos - 1],
                                newOrder[pos],
                              ];
                              setColumnOrder(newOrder);
                            }
                          }}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          disabled={index === all.length - 1}
                          onClick={() => {
                            const newOrder = [...table.getState().columnOrder];
                            if (newOrder.length === 0) {
                              all.forEach((col) => newOrder.push(col.id));
                            }
                            const pos = newOrder.indexOf(column.id);
                            if (pos < newOrder.length - 1) {
                              [newOrder[pos], newOrder[pos + 1]] = [
                                newOrder[pos + 1],
                                newOrder[pos],
                              ];
                              setColumnOrder(newOrder);
                            }
                          }}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center space-x-1",
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : "",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                          {{
                            asc: <ChevronUp className="w-3 h-3" />,
                            desc: <ChevronDown className="w-3 h-3" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 text-sm text-gray-600"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.getRowModel().rows.length === 0 && (
          <div className="py-12 text-center text-gray-500 italic">
            No laps found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
