import * as React from "react"
import teamMembers from "@/public/mock/team-members.json"
import uploadedFiles from "@/public/mock/uploaded-files.json"
import users from "@/public/mock/users.json"
import { cn, first, nope } from "@/utils/functions"
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUp1,
  Copy,
  Download01,
  Edit03,
  HelpCircle,
  MoreHorizontal,
  Plus,
  SearchMd,
  Trash02,
  UploadCloud,
  Zap,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  SortingState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import * as pagination from "@zag-js/pagination"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  BadgeGroup,
  Button,
  Checkbox,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"

const meta: Meta = {
  title: "Table",
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=2-90380&mode=design&t=yQkoprgTuUj38hgL-4",
    },
  },
}

export default meta

interface User {
  user: {
    fullName: string
    email: string
    photo: string
  }
  rating: {
    percentage: number
    stat: number
  }
  lastAccessed: string
  categories: string[]
}

const columnHelper = createColumnHelper<User>()

const columns = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        {...{
          checked: table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) =>
            value !== "indeterminate"
              ? table.toggleAllRowsSelected(value)
              : nope,
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        {...{
          checked: row.getIsSelected(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          disabled: !row.getCanSelect(),
        }}
      />
    ),
    enableSorting: false,
  }),
  columnHelper.accessor("user", {
    header: "Vendor",
    cell: (info) => (
      <div className="inline-flex items-center gap-x-3">
        <Avatar size="md">
          <AvatarImage
            src={info.getValue().photo}
            alt={info.getValue().fullName}
          />
          <AvatarFallback>{first(info.getValue().fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">
            {info.getValue().fullName}
          </span>
          <span className="text-sm text-gray-500">{info.getValue().email}</span>
        </div>
      </div>
    ),
    enableMultiSort: true,
  }),
  columnHelper.accessor("rating", {
    header: "Rating",
    cell: (info) => (
      <div className="flex items-center gap-x-3">
        <Progress className="w-56" value={info.getValue().percentage} />
        <span className="text-sm font-medium text-gray-700">
          {info.getValue().percentage}%
        </span>
        <Badge visual="success">
          <ArrowUp1 className="h-3 w-3" />
          {info.getValue().stat}
        </Badge>
      </div>
    ),
    enableSorting: false,
  }),
  columnHelper.accessor("lastAccessed", {
    header: "Last accessed",
  }),
  columnHelper.accessor("categories", {
    header: "Categories",
    cell: (info) => (
      <BadgeGroup>
        {info.getValue().map((label, key) => (
          <Badge visual="primary" key={key}>
            {label}
          </Badge>
        ))}
      </BadgeGroup>
    ),
    enableSorting: false,
  }),
  columnHelper.display({
    id: "actions",
    cell: () => (
      <div className="flex items-center gap-x-1">
        <Button variant="link" visual="gray">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <UploadCloud className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <Edit03 className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <Trash02 className="h-4 w-4" />
        </Button>
      </div>
    ),
    enableSorting: false,
  }),
]

export function VendorMovements() {
  const [data] = React.useState(users)
  const [rowSelection, setRowSelection] = React.useState({})
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    state: {
      rowSelection,
      sorting,
    },
  })

  return (
    <div className="rounded-lg border border-gray-100 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <div className="space-y-1">
          <div className="flex items-center gap-x-2">
            <h3 className="text-[18px] font-semibold leading-7">
              Vendor movements
            </h3>
            <Badge visual="primary">240 vendors</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Keep track of vendor and their security ratings.
          </p>
        </div>

        <div className="flex gap-x-4">
          <div className="flex items-center gap-x-3">
            <Button variant="outlined" visual="gray">
              <UploadCloud className="h-[15px]" />
              Import
            </Button>
            <Button>
              <Plus className="h-[15px]" />
              Add Vendor
            </Button>
          </div>
          <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
            <MoreHorizontal className="h-[15px]" />
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={
                    header.column.getCanSort()
                      ? "cursor-pointer select-none"
                      : ""
                  }
                  key={header.id}
                  colSpan={header.colSpan}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="inline-flex items-center gap-x-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getIsSorted() === "asc" && (
                      <ArrowUp className="h-4 w-4" />
                    )}
                    {header.column.getIsSorted() === "desc" && (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : ""}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-gray-700">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>

        <div className="flex items-center gap-x-3">
          <Button
            variant="outlined"
            visual="gray"
            disabled={!table.getCanPreviousPage()}
            onClick={table.previousPage}
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            visual="gray"
            disabled={!table.getCanNextPage()}
            onClick={table.nextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export const EmptyVendorMovements = () => {
  return (
    <div className="rounded-lg border border-gray-100 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <div className="space-y-1">
          <div className="flex items-center gap-x-2">
            <h3 className="text-[18px] font-semibold leading-7">
              Vendor movements
            </h3>
            <Badge visual="primary">240 vendors</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Keep track of vendor and their security ratings.
          </p>
        </div>

        <div className="flex gap-x-4">
          <div className="flex items-center gap-x-3">
            <Button variant="outlined" visual="gray">
              <UploadCloud className="h-[15] w-[15px]" />
              Import
            </Button>
            <Button>
              <Plus className="h-[15] w-[15px]" />
              Add Vendor
            </Button>
          </div>
          <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
            <MoreHorizontal className="h-[15] w-[15px]" />
          </Button>
        </div>
      </div>

      <div className="border-y border-gray-200 px-4 pb-[48px] pt-10 lg:px-5">
        <div className="mx-auto flex max-w-[352px] flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-8 border-primary-25 bg-primary-50 text-primary-500">
            <SearchMd className="h-6 w-6" />
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="font-semibold text-gray-black">No vendors found</h1>
            <p className="text-sm text-gray-600">
              Your search “Stripe” did not match any vendors. Please try again
              or create add a new vendor.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-x-3">
            <Button variant="outlined" visual="gray">
              Clear Search
            </Button>
            <Button>
              <Plus className="h-[15] w-[15px]" />
              Clear Search
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Page 0 of 0</span>

        <div className="flex items-center gap-x-3">
          <Button variant="outlined" visual="gray">
            Previous
          </Button>
          <Button variant="outlined" visual="gray">
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

interface UploadedFile {
  fileName: string
  fileSize: string
  uploadedDate: string
  lastUpdated: string
  uploadedBy: string
}

const secondColumnHelper = createColumnHelper<UploadedFile>()

const secondaryColumns = [
  secondColumnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        {...{
          checked: table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) =>
            value !== "indeterminate"
              ? table.toggleAllRowsSelected(value)
              : nope,
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        {...{
          checked: row.getIsSelected(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          disabled: !row.getCanSelect(),
        }}
      />
    ),
    enableSorting: false,
  }),
  secondColumnHelper.accessor(
    ({ fileName, fileSize }) => ({ fileName, fileSize }),
    {
      id: "fileNameAndFileSize",
      header: "File name",
      cell: (info) => (
        <div className="flex items-center gap-x-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary-50 text-primary-500">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex flex-col text-sm">
            <span className="font-medium text-gray-black">
              {info.getValue().fileName}
            </span>
            <span className="text-gray-600">{info.getValue().fileSize}</span>
          </div>
        </div>
      ),
    }
  ),
  secondColumnHelper.accessor("fileSize", {
    header: "File Size",
  }),
  secondColumnHelper.accessor("uploadedDate", {
    header: "Date uploaded",
  }),
  secondColumnHelper.accessor("lastUpdated", {
    header: "Last updated",
  }),
  secondColumnHelper.accessor("uploadedBy", {
    header: "Uploaded by",
  }),
  secondColumnHelper.display({
    id: "action",
    cell: () => (
      <Button className="h-6 px-1.5 py-2" variant="link" visual="gray">
        <MoreHorizontal />
      </Button>
    ),
  }),
]

export const FilesUploaded = () => {
  const [data] = React.useState(uploadedFiles)
  const [rowSelection, setRowSelection] = React.useState({})
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns: secondaryColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    state: {
      rowSelection,
      sorting,
    },
  })

  const id = React.useId()

  return (
    <div className="rounded-lg border border-gray-100 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <h3 className="text-[18px] font-semibold leading-7">Files uploaded</h3>

        <div className="flex gap-x-4">
          <div className="flex items-center gap-x-3">
            <Button variant="outlined" visual="gray">
              <Download01 className="h-[15px] w-[15px]" />
              Download all
            </Button>
            <Button>
              <UploadCloud className="h-[15px] w-[15px]" />
              Upload
            </Button>
          </div>
          <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
            <MoreHorizontal className="h-[15px] w-[15px]" />
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  <div className="inline-flex items-center gap-x-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : ""}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export const EmptyFilesUploaded = () => {
  return (
    <div className="rounded-lg border border-gray-100 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <h3 className="text-[18px] font-semibold leading-7">Files uploaded</h3>

        <div className="flex gap-x-4">
          <Button>
            <UploadCloud className="h-[15px] w-[15px]" />
            Upload
          </Button>
          <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
            <MoreHorizontal className="h-[15px] w-[15px]" />
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 pb-[48px] pt-10 lg:px-5">
        <div className="mx-auto flex max-w-[352px] flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-8 border-gray-50 bg-gray-100 text-gray-500">
            <SearchMd className="h-6 w-6" />
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="font-semibold text-gray-black">No vendors found</h1>
            <p className="text-sm text-gray-600">
              Your search “Stripe” did not match any vendors. Please try again
              or create add a new vendor.
            </p>
          </div>

          <Button className="mt-6">
            <UploadCloud className="h-[15px] w-[15px]" />
            Upload
          </Button>
        </div>
      </div>
    </div>
  )
}

interface TeamMember {
  user: {
    fullName: string
    email: string
    photo: string
  }
  status: string
  role: string
  email: string
  teams: string[]
}

const thirdColumnHelper = createColumnHelper<TeamMember>()

const teamMemberColumns = [
  thirdColumnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        {...{
          checked: table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) =>
            value !== "indeterminate"
              ? table.toggleAllRowsSelected(value)
              : nope,
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        {...{
          checked: row.getIsSelected(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          disabled: !row.getCanSelect(),
        }}
      />
    ),
    enableSorting: false,
  }),
  thirdColumnHelper.accessor("user", {
    header: "Name",
    cell: (info) => (
      <div className="inline-flex items-center gap-x-3">
        <Avatar size="md">
          <AvatarImage
            src={info.getValue().photo}
            alt={info.getValue().fullName}
          />
          <AvatarFallback>{first(info.getValue().fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">
            {info.getValue().fullName}
          </span>
          <span className="text-sm text-gray-500">{info.getValue().email}</span>
        </div>
      </div>
    ),
    enableSorting: false,
  }),
  thirdColumnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <Badge visual="success">{info.getValue()}</Badge>,
  }),
  thirdColumnHelper.accessor("role", {
    header: () => (
      <div className="inline-flex items-center gap-x-1">
        Role <HelpCircle className="h-4 w-4 text-gray-400" />
      </div>
    ),
    enableSorting: false,
  }),
  thirdColumnHelper.accessor("email", {
    header: "Email Address",
    enableSorting: false,
  }),
  thirdColumnHelper.accessor("teams", {
    header: "Teams",
    cell: (info) => (
      <BadgeGroup>
        {info.getValue().map((label, key) => (
          <Badge visual="primary" key={key}>
            {label}
          </Badge>
        ))}
      </BadgeGroup>
    ),
    enableSorting: false,
  }),
  thirdColumnHelper.display({
    id: "actions",
    cell: () => (
      <div className="flex items-center gap-x-1">
        <Button variant="link" visual="gray">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <UploadCloud className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <Edit03 className="h-4 w-4" />
        </Button>
        <Button variant="link" visual="gray">
          <Trash02 className="h-4 w-4" />
        </Button>
      </div>
    ),
    enableSorting: false,
  }),
]

export const TeamMembers = () => {
  const [data] = React.useState(teamMembers)
  const [rowSelection, setRowSelection] = React.useState({})
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns: teamMemberColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    enableRowSelection: true,
    state: {
      rowSelection,
      sorting,
    },
  })

  const id = React.useId()
  const [state, send] = useMachine(
    pagination.machine({ id, count: teamMembers.length })
  )

  const api = pagination.connect(state, send, normalizeProps)

  return (
    <div className="rounded-lg border border-gray-200 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <div className="flex items-center gap-x-2">
          <h3 className="text-[18px] font-semibold leading-7">Team members</h3>
          <Badge visual="primary">100 users</Badge>
        </div>
        <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
          <MoreHorizontal />
        </Button>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={
                    header.column.getCanSort()
                      ? "cursor-pointer select-none"
                      : ""
                  }
                  key={header.id}
                  colSpan={header.colSpan}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="inline-flex items-center gap-x-1">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {header.column.getIsSorted() === "asc" && (
                      <ArrowUp className="h-4 w-4" />
                    )}
                    {header.column.getIsSorted() === "desc" && (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : ""}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-6 pb-4 pt-3">
        <Button
          variant="outlined"
          visual="gray"
          onClick={table.previousPage}
          disabled={!table.getCanPreviousPage()}
        >
          <ArrowLeft className="h-5 w-5" />
          Previous
        </Button>

        <nav {...api.getRootProps()}>
          <ul className="flex items-center gap-x-0.5">
            {api.pages.map((page, index) => (
              <React.Fragment key={index}>
                {page.type === "page" ? (
                  <li key={page.value}>
                    <Button
                      className={cn(page.value === api.page && "bg-gray-50")}
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      {...mergeProps(api.getItemProps(page), {
                        onClick: () => table.setPageIndex(page.value - 1),
                      })}
                    >
                      {page.value}
                    </Button>
                  </li>
                ) : (
                  <li>
                    <span
                      className="h-10 w-10 text-sm font-medium text-gray-600"
                      {...api.getEllipsisProps({ index })}
                    >
                      ...
                    </span>
                  </li>
                )}
              </React.Fragment>
            ))}
          </ul>
        </nav>

        <Button
          variant="outlined"
          visual="gray"
          onClick={table.nextPage}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export const EmptyTeamMembers = () => {
  return (
    <div className="rounded-lg border border-gray-100 shadow-xs">
      <div className="mb-5 flex items-start justify-between px-6 pt-5">
        <div className="flex items-center gap-x-2">
          <h3 className="text-[18px] font-semibold leading-7">Team members</h3>
          <Badge visual="primary">100 users</Badge>
        </div>
        <Button className="h-6 px-1.5 py-2" variant="ghost" visual="gray">
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </Button>
      </div>

      <div className="border-t border-gray-200 px-4 pb-[48px] pt-10 lg:px-5">
        <div className="mx-auto flex max-w-[352px] flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100 text-warning-500">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="mt-4 space-y-1">
            <h1 className="font-semibold text-gray-black">No vendors found</h1>
            <p className="text-sm text-gray-600">
              Your search “Stripe” did not match any vendors. Please try again
              or create add a new vendor.
            </p>
          </div>

          <Button className="mt-6">
            <UploadCloud className="h-[15px] w-[15px]" />
            Upload
          </Button>
        </div>
      </div>
    </div>
  )
}
