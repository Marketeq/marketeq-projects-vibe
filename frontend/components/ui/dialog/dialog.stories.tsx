import * as React from "react"
import { first, nope } from "@/utils/functions"
import { useDebounce, useToggle } from "@/utils/hooks"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle1,
  ChevronDown,
  Search,
  SearchMd,
  SwitchHorizontal02,
  Users,
  X,
  X1,
} from "@blend-metrics/icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { Meta } from "@storybook/react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  HelperText,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Label,
  RadioGroup,
  RadioGroupItem,
  RadioGroupItemSelector,
  ScaleOutIn,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Dialog",
  parameters: {
    design: {
      type: "figma",
      url: "https://www.figma.com/file/CgaxYAFROXbQH5fgPw8sX4/Blend-Metrics---New-Design-System?type=design&node-id=112-202450&mode=design&t=wZEsVBHb30vSp1s1-4",
    },
  },
}

export default meta

export const SaveChangesExit = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
            <AlertTriangle className="h-4 w-4 text-warning-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Save Changes and Exit?</DialogTitle>
            <DialogDescription>
              If you leave, any changes you’ve made will be lost.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Exit without saving
            </Button>
          </DialogClose>

          <DialogClose asChild>
            <Button>Yes, save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteAnalystRole = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
            <AlertCircle className="h-4 w-4 text-error-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Delete Analyst Role?</DialogTitle>
            <DialogDescription>
              The role will be deleted for the following user:
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-5 inline-flex items-center gap-x-3">
          <Avatar size="md">
            <AvatarImage src="/man.jpg" alt="Man" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">
              Christopher Torres
            </span>
            <span className="text-sm text-gray-500">
              chris@blendmetrics.com
            </span>
          </div>
        </div>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>

          <DialogClose asChild>
            <Button visual="error">Yes, delete</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const schema = z.object({
  confirm: z.literal("DELETE"),
})

type FormState = z.infer<typeof schema>

export const DeleteAnalystRoleConfirmation = () => {
  const [isOpen, setIsOpen] = React.useState(false)

  const {
    register,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<FormState>({
    resolver: zodResolver(schema),
  })

  const onOpenChange = (open: boolean) => {
    setIsOpen(open)
    reset()
  }

  const onSubmit: SubmitHandler<FormState> = () => {
    setIsOpen(false)
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
            <AlertCircle className="h-4 w-4 text-error-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Delete Analyst Role?</DialogTitle>
            <DialogDescription>
              Confirm that you want to delete this role
            </DialogDescription>
          </div>
        </DialogHeader>

        <form className="mt-5" onSubmit={handleSubmit(onSubmit)}>
          <Label size="sm" className="font-medium">
            Type <span className="font-bold">DELETE</span> (in all caps) to
            confirm deletion
          </Label>

          <InputGroup className="mt-1.5">
            <Input
              {...register("confirm")}
              type="text"
              isInvalid={!!errors.confirm}
            />
            {!!errors.confirm && (
              <InputRightElement>
                <AlertCircle className="text-error-500" />
              </InputRightElement>
            )}
          </InputGroup>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button visual="error" type="submit">
              Yes, delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteWriteRole = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>

      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
            <AlertCircle className="h-4 w-4 text-error-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Delete Writer Role?</DialogTitle>
            <DialogDescription>
              All users will be reassigned to the role:{" "}
              <span className="inline-flex items-center gap-x-1 font-medium text-gray-black">
                Viewer <ChevronDown className="text-gray-500 h-4 w-4" />
              </span>
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="mt-5 h-[248px]">
          <div className="space-y-3">
            <div className="flex items-center gap-x-3">
              <Avatar size="md">
                <AvatarImage src="/woman.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">
                  Christopher Torres
                </span>
                <span className="text-sm text-gray-500">
                  chris@blendmetrics.com
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-3">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">
                  Christopher Torres
                </span>
                <span className="text-sm text-gray-500">
                  chris@blendmetrics.com
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-3">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">
                  Christopher Torres
                </span>
                <span className="text-sm text-gray-500">
                  chris@blendmetrics.com
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-3">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">
                  Christopher Torres
                </span>
                <span className="text-sm text-gray-500">
                  chris@blendmetrics.com
                </span>
              </div>
            </div>
            <div className="flex items-center gap-x-3">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700">
                  Christopher Torres
                </span>
                <span className="text-sm text-gray-500">
                  chris@blendmetrics.com
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button visual="error">Yes, delete</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface User {
  photo: string
  fullName: string
  email: string
  role: string
}

const users: User[] = [
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
  {
    email: "znylen@gmail.com",
    fullName: "Zachary Nylen",
    photo: "/man.jpg",
    role: "Zachary Nylen",
  },
]

const columnHelper = createColumnHelper<User>()

const columns = [
  columnHelper.display({
    id: "checkboxes",
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
    enableGlobalFilter: false,
  }),
  columnHelper.accessor((user) => user, {
    id: "users",
    header: () => (
      <div className="text-sm font-medium text-gray-700">Select All</div>
    ),
    cell: (info) => (
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-x-3">
          <Avatar size="md">
            <AvatarImage src="/man.jpg" alt="Man" />
            <AvatarFallback>{first(info.getValue().fullName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">
              {info.getValue().fullName}
            </span>
            <span className="text-sm text-gray-500">
              {info.getValue().email}
            </span>
          </div>
        </div>
        <span className="text-xs font-medium leading-[18px] text-gray-500">
          {info.getValue().role}
        </span>
      </div>
    ),
  }),
]

export const AssignUsers = () => {
  const [data] = React.useState(users)
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState("")
  const debouncedGlobalFilter = useDebounce(globalFilter, 200)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      rowSelection,
      globalFilter: debouncedGlobalFilter,
    },
  })

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[520px] px-1.5">
        <DialogHeader className="px-[18px]">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-primary-25 bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Assign Users</DialogTitle>
            <DialogDescription>
              Select users you want to assign the{" "}
              <span className="font-bold">Writer</span> role:
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-5 px-[18px]">
          <InputGroup fieldHeight="2.25rem">
            <InputLeftElement>
              <Search className="text-gray-400 h-4 w-4" />
            </InputLeftElement>
            <Input
              className="h-9 py-1.5 text-sm leading-6"
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Find users"
              value={globalFilter}
            />
          </InputGroup>
        </div>

        <div className="mt-3 h-[280px] overflow-y-auto pl-[18px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
          <table className="w-full table-auto">
            <caption className="sr-only">Users</caption>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      className="px-1 py-1.5 text-left [&:has([role=checkbox])]:pl-0"
                      key={header.id}
                      colSpan={header.colSpan}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  className="data-[state=selected]:bg-gray-50"
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className="px-1.5 py-1.5 [&:has([role=checkbox])]:pl-0"
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="mt-8 px-[18px]">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Assign</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ChangeRole = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[630px]">
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-primary-25 bg-primary-50">
            <SwitchHorizontal02 className="h-5 w-5 text-primary-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Short description text that explain the assigning role process.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-5">
          <h3 className="text-sm font-medium leading-6 text-gray-black">
            Select the role you want to assign
          </h3>

          <RadioGroup className="mt-3 gap-y-2">
            <RadioGroupItemSelector value="Administrator">
              <Label>Administrator</Label>
              <HelperText>Can manage the content they have created</HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="Super Administrator">
              <Label>Super Administrator</Label>
              <HelperText>Can create, update and delete content</HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="Editor">
              <Label>Editor</Label>
              <HelperText>Can create, update and delete content</HelperText>
            </RadioGroupItemSelector>
            <RadioGroupItemSelector value="Analyst">
              <Label>Analyst</Label>
              <HelperText>Can create, update and delete content</HelperText>
            </RadioGroupItemSelector>
          </RadioGroup>
        </div>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Assign</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const AssignAdministratorRole = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[630px]">
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-warning-50 bg-warning-100">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Short description text that explain the assigning role process.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-2 h-[268px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-xl">
          <table className="w-full table-fixed">
            <thead>
              <tr>
                <th className="pt-3 text-left text-xs font-medium leading-5 text-gray-500">
                  Feature
                </th>
                <th className="pt-3 text-left text-xs font-medium leading-5 text-gray-500">
                  Old Permissions
                </th>
                <th className="pt-3 text-left text-xs font-medium leading-5 text-gray-500">
                  New Permissions
                </th>
              </tr>
              <tr>
                <th className="pt-3 text-left text-xs font-medium leading-5 text-gray-500">
                  Administrative
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">
                    Save, Read, Write, Delete
                  </Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Read</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">Save, Delete</Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save, Read, Delete</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">
                    Save, Read, Write, Delete
                  </Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save, Read, Delete</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">Read, Write, Delete</Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">No Access</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">Save, Delete</Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">
                    Save, Read, Write, Delete
                  </Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save, Read, Delete</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">
                    Save, Read, Write, Delete
                  </Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save, Read, Delete</Badge>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  Feature Name
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge className="line-through">
                    Save, Read, Write, Delete
                  </Badge>
                </td>
                <td className="py-1.5 pr-4 text-xs font-medium leading-5 text-gray-800">
                  <Badge visual="success">Save, Read, Delete</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Assign</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const Congratulations = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="items-center">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-success-100">
            <CheckCircle1 className="h-5 w-5 text-success-600" />
          </div>

          <div className="mx-auto flex max-w-sm flex-col gap-y-2">
            <DialogTitle className="text-center">
              Congratulations, custom role has been created!
            </DialogTitle>
            <DialogDescription className="text-center">
              Your role is ready and now you are able to assign your users to
              this role.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Go Back To Role
            </Button>
          </DialogClose>

          <DialogClose asChild>
            <Button>Assign Users</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const Rename = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-[396px]">
        <DialogHeader className="flex-row gap-x-2">
          <DialogTitle className="flex-grow">Rename this Version</DialogTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogClose asChild>
                  <IconButton
                    className="text-gray-500 hover:text-gray-900 h-7 w-7"
                    variant="ghost"
                    visual="gray"
                  >
                    <X1 className="h-[18px] w-[18px]" />
                  </IconButton>
                </DialogClose>
              </TooltipTrigger>
              <TooltipContent
                align="center"
                className="font-semibold"
                side="bottom"
              >
                Close
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogHeader>

        <div className="mt-5 space-y-1.5">
          <Label className="text-gray-700" size="sm">
            Version Name
          </Label>
          <Input className="text-gray-900" defaultValue="New Team Version" />
        </div>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const Name = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-none w-[396px]">
        <DialogHeader className="flex-row gap-x-2">
          <DialogTitle className="flex-grow">Name this Version</DialogTitle>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogClose asChild>
                  <IconButton
                    className="text-gray-500 hover:text-gray-900 h-7 w-7"
                    variant="ghost"
                    visual="gray"
                  >
                    <X1 className="h-[18px] w-[18px]" />
                  </IconButton>
                </DialogClose>
              </TooltipTrigger>
              <TooltipContent
                align="center"
                className="font-semibold"
                side="bottom"
              >
                Close
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogHeader>

        <div className="mt-5 space-y-1.5">
          <Label className="text-gray-700" size="sm">
            Version Name
          </Label>
          <Input className="text-gray-900" placeholder="Enter the name" />
        </div>

        <DialogFooter className="mt-8 grid gap-x-3">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Save</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeletePathVariant = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
            <AlertCircle className="h-4 w-4 text-error-600" />
          </div>

          <div className="flex flex-col gap-y-2">
            <DialogTitle>Delete Writer Role?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this path? This action will delete
              all subsequent actions on the path.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button visual="error">Yes, Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const DeleteSlipPathBlock = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="w-[552px]">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle>Delete Split Path Block</DialogTitle>
            <DialogDescription>
              You are removing an action in the middle of an existing series of
              actions, to continue you can:
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-8">
          <RadioGroup>
            <div className="flex gap-x-3">
              <RadioGroupItem id="sm-option-one" value="item-1" />
              <Label htmlFor="sm-item-one">Remove all paths</Label>
            </div>
            <div className="flex gap-x-3">
              <RadioGroupItem id="sm-item-two" value="item-2" />
              <Label htmlFor="sm-item-two">Select which path to keep</Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="mt-8 flex justify-end gap-x-3">
          <DialogClose asChild>
            <Button visual="gray" variant="outlined">
              Cancel
            </Button>
          </DialogClose>
          <Button>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const SaveToCollectionsVariant = () => {
  const content = React.useMemo(
    () => ["Other block 1", "Other block 2", "Other block 3", "Other block 4"],
    []
  )
  const [selected, setSelected] = React.useState<string>()
  const [query, setQuery] = React.useState("")
  const filteredContent =
    query === ""
      ? content
      : content.filter((value) =>
          value.toLowerCase().includes(query.toLowerCase())
        )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="w-[396px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex-grow">Save to Collection?</DialogTitle>
            <DialogClose asChild>
              <IconButton
                className="h-7 w-7 text-gray-500"
                visual="gray"
                variant="ghost"
              >
                <X className="h-[18px] w-[18px]" />
              </IconButton>
            </DialogClose>
          </div>

          <Combobox className="w-full" value={selected} onChange={setSelected}>
            <ComboboxLabel className="text-gray-700" size="sm">
              File Name
            </ComboboxLabel>
            <ComboboxTrigger className="mt-1.5">
              <ComboboxInput
                className="pl-3 pr-[30px]"
                onChange={(event) => setQuery(event.target.value)}
              />
              <ComboboxButton className="left-auto peer-focus:text-gray-500 right-2.5">
                <ChevronDown className="h-5 w-5 ui-open:-rotate-180 ui-not-open:-rotate-0 transition duration-300" />
              </ComboboxButton>
              <ScaleOutIn>
                <ComboboxOptions>
                  <ScrollArea className="h-[304px]">
                    {filteredContent.map((value, key) => (
                      <ComboboxOption value={value} key={key}>
                        {value}
                      </ComboboxOption>
                    ))}
                  </ScrollArea>
                </ComboboxOptions>
              </ScaleOutIn>
            </ComboboxTrigger>
            {selected && (
              <HelperText className="mt-1.5" size="sm">
                “{selected}” already exists. Do you want to replace it?
              </HelperText>
            )}
          </Combobox>
        </DialogHeader>

        <DialogFooter className="mt-8">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          {selected ? (
            <Button visual="error">Replace</Button>
          ) : (
            <Button>Save</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
