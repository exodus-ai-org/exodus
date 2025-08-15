import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Uploader } from '@/components/uploader'
import { Resources } from '@shared/types/db'
import { RagResourceList } from '@shared/types/rag'
import { fetcher } from '@shared/utils/http'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'

// eslint-disable-next-line react-refresh/only-export-components
export const columns: ColumnDef<Resources>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="max-w-16 truncate">{row.getValue('id')}</div>
    )
  },
  {
    accessorKey: 'content',
    header: 'Content',
    cell: ({ row }) => (
      <div className="max-w-48 truncate">{row.getValue('content')}</div>
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'CreatedAt',
    cell: ({ row }) => (
      <div className="max-w-48 truncate">
        {format(row.getValue('createdAt'), 'PPpp')}
      </div>
    )
  }
]

export function Rag() {
  const [page, setPage] = useState(1)
  console.log(setPage)

  const { data } = useSWR<RagResourceList>(`/api/rag?page=${page}&pageSize=10`)

  const [loading, setLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const handleChange = async (files: File[]) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }

    try {
      setLoading(true)
      await fetcher('/api/rag', {
        method: 'POST',
        body: formData
      })
    } finally {
      setLoading(false)
    }
  }

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection
    }
  })

  return (
    <Tabs defaultValue="embeddings">
      <TabsList className="mb-4 grid w-full grid-cols-2">
        <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
      </TabsList>
      <TabsContent value="embeddings">
        <Alert className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="inline">
            Upload your private resources from here, now supports{' '}
            <Badge variant="outline">.pdf</Badge>,{' '}
            <Badge variant="outline">.md</Badge> and{' '}
            <Badge variant="outline">.txt</Badge>.
          </AlertDescription>
        </Alert>
        <Uploader loading={loading} onChange={handleChange} />
      </TabsContent>
      <TabsContent value="resources">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
