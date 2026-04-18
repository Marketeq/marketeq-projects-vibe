"use client"

import React, { useEffect, useState } from "react"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty, keys } from "@/utils/functions"
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  MarkerPin02,
  Plus,
  Sliders02,
  Sliders04,
  Star,
  Tag,
  Users,
  X,
  X2,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import { Keys } from "@/types/core"
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Logo4 } from "@/components/icons/logo-4"
import { SearchCard } from "@/components/search-card"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxPrimitive,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  inputVariants,
} from "@/components/ui"

const Budget = ({
  title = "Budget",
  initialMinRate = "",
  initialMaxRate = "",
}: {
  title?: string
  initialMinRate?: string
  initialMaxRate?: string
}) => {
  const [minRate, setMinRate] = useState(initialMinRate)
  const [maxRate, setMaxRate] = useState(initialMaxRate)
  const onMinRateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    const newValue = value.replace(/\D/g, "")
    setMinRate(newValue)
  }
  const onMaxRateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    const newValue = value.replace(/\D/g, "")
    setMaxRate(newValue)
  }
  const onMinRateInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData("text")
    const digitsOnly = pastedText.replace(/\D/g, "")
    setMinRate((prevValue) => prevValue + digitsOnly)
  }
  const onMaxRateInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData("text")
    const digitsOnly = pastedText.replace(/\D/g, "")
    setMaxRate((prevValue) => prevValue + digitsOnly)
  }
  const reset = () => {
    setMinRate("")
    setMaxRate("")
  }
  const hasValues = Boolean(minRate || maxRate)
  return (
    <div className="py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </h1>

        {hasValues && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="min"
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={onMinRateInputChange}
              onPaste={onMinRateInputPaste}
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor="min" size="sm">
            Min
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="max"
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={onMaxRateInputChange}
              onPaste={onMaxRateInputPaste}
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor="max" size="sm">
            Max
          </Label>
        </div>
      </div>
    </div>
  )
}

const Industry = ({
  title = "Industry",
  placeholder = "Select Industry",
  options = [
    "Fintech",
    "Real Estate",
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
  ],
  initialSelected = [],
}: {
  title?: string
  placeholder?: string
  options?: string[]
  initialSelected?: string[]
}) => (
  <Category
    title={title}
    placeholder={placeholder}
    options={options}
    initialSelected={initialSelected}
    breadcrumbs={[]}
  />
)

const Category = ({
  title = "Category",
  placeholder = "Select Category",
  options = [
    "Mobile Wallet",
    "Payment App",
    "FinTech",
    "SaaS",
    "Product Management",
  ],
  initialSelected = [],
  breadcrumbs = ["Mobile Development", "Swift Development"],
  footerLinkLabel,
}: {
  title?: string
  placeholder?: string
  options?: string[]
  initialSelected?: string[]
  breadcrumbs?: string[]
  footerLinkLabel?: string
}) => {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState(
    Object.fromEntries(
      options.map((option) => [option, initialSelected.includes(option)])
    ) as Record<string, boolean>
  )
  const reset = () => {
    setCategories(
      Object.fromEntries(options.map((option) => [option, false])) as Record<
        string,
        boolean
      >
    )
  }

  const categoryOptions = Object.keys(categories)
  const enabledOptions = categoryOptions.filter((item) => categories[item])
  const disableOption = (key: string) => {
    setCategories((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div className="flex flex-col gap-y-[15px] pb-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {categoryOptions.some((key) => categories[key]) && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="bg-white font-normal justify-between text-gray-500 px-3 py-2"
            size="md"
            variant="outlined"
            visual="gray"
          >
            {placeholder}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {categoryOptions.map((item, index) => (
            <DropdownMenuCheckItem
              checked={categories[item]}
              onCheckedChange={(checked) => {
                setCategories((prev) => ({ ...prev, [item]: checked }))
                setOpen(false)
              }}
              key={index}
            >
              {item}
            </DropdownMenuCheckItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {breadcrumbs.length > 0 && (
        <div className="flex flex-col items-start gap-y-[15px]">
          {breadcrumbs.map((breadcrumb) => (
            <Button key={breadcrumb} visual="gray" variant="link">
              <ArrowLeft className="size-[15px]" />
              {breadcrumb}
            </Button>
          ))}
        </div>
      )}

      {footerLinkLabel && (
        <Button
          className="self-start justify-start p-0 underline decoration-current/30 underline-offset-2 hover:decoration-current"
          visual="gray"
          variant="link"
        >
          {footerLinkLabel}
        </Button>
      )}

      {enabledOptions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {enabledOptions.map((option, index) => (
            <Badge visual="primary" key={index}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => disableOption(option)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

const skills = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML",
  "CSS",
  "Git",
  "REST APIs",
  "GraphQL",
  "SQL",
  "NoSQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Google Cloud",
  "Agile Methodologies",
  "Test-Driven Development (TDD)",
  "CI/CD",
  "Machine Learning",
  "Data Analysis",
  "UI/UX Design",
  "Version Control",
  "Web Security",
]

const Skills = ({
  title = "Skills",
  placeholder = "Add skills by keyword",
  suggestions = skills,
  initialValues = [],
}: {
  title?: string
  placeholder?: string
  suggestions?: string[]
  initialValues?: string[]
}) => {
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>(initialValues)
  const [selected, setSelected] = useState<string[]>([])

  const resetInputValue = () => setInputValue("")
  const reset = () => {
    setValues([])
    setSelected([])
  }
  const addValue = () => {
    if (!inputValue) return

    setValues((prev) => {
      return prev.includes(inputValue) ? prev : [...prev, inputValue]
    })
    resetInputValue()
  }
  const removeValue = (index: number) => {
    const tag = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((value) => value !== tag)
      return nextState
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) addValue()
  }

  const filteredSkills = suggestions.filter((skill) =>
    skill.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((preValues) => {
      const filteredSelected = selected.filter(
        (value) => !preValues.includes(value)
      )
      return [...preValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {getIsNotEmpty(values) && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <Combobox
        className="w-full"
        value={selected}
        onChange={setSelected}
        multiple
      >
        <InputGroup>
          <ComboboxPrimitive.Input
            placeholder={placeholder}
            className={cn(
              inputVariants({
                className: "h-10 text-xs rounded-r-none leading-6 font-normal",
              })
            )}
            onChange={onChange}
            onKeyDown={onKeyDown}
            value={inputValue}
          />
          <InputRightAddon className="rounded-l-none size-10 bg-gray-100">
            <button className="focus-visible:outline-none" onClick={addValue}>
              <Plus className="size-4" />
            </button>
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredSkills.map((skill, index) => (
                <ComboboxOption key={index} value={skill}>
                  {skill}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      <div className="flex flex-wrap gap-3">
        {values.map((value, index) => (
          <Badge visual="primary" key={index}>
            {value}
            <button
              className="focus-visible:outline-none"
              onClick={() => removeValue(index)}
            >
              <X2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const additionalTags = [
  "Software Development",
  "Artificial Intelligence",
  "Cybersecurity",
  "Cloud Computing",
  "Blockchain",
  "Data Science",
  "Internet of Things (IoT)",
  "Pharmaceuticals",
  "Biotechnology",
  "Medical Devices",
  "Telemedicine",
  "Health Insurance",
  "Hospitals",
  "Wellness & Fitness",
  "Banking",
  "Investment Management",
  "Financial Technology",
]

const AdditionalTags = () => {
  return (
    <Skills
      title="Additional Tags"
      placeholder="Enter Job Title"
      suggestions={additionalTags}
    />
  )
}

const ProjectType = () => {
  const [projects, setProjects] = React.useState({
    "Mobile app": false,
    "Web app": false,
    "Desktop app": false,
    API: false,
    "Watch app": false,
    "TV app": false,
  })
  const reset = () => {
    const nextState = keys(projects).reduce(
      (prev, current) => ({ ...prev, [current]: false }),
      {} as { [Property in Keys<typeof projects>]: boolean }
    )
    setProjects(nextState)
  }

  const enabledOptions = keys(projects).filter((item) => projects[item])
  const disableOption = (key: Keys<typeof projects>) => {
    setProjects((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div className="flex flex-col gap-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Project Type
        </span>

        {keys(projects).some((key) => projects[key]) && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="bg-white font-normal justify-between text-gray-500 px-3 py-2"
            size="md"
            variant="outlined"
            visual="gray"
          >
            Select Project Type
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {keys(projects).map((item, index) => (
            <DropdownMenuCheckItem
              checked={projects[item]}
              onCheckedChange={(checked) =>
                setProjects((prev) => ({ ...prev, [item]: checked }))
              }
              key={index}
            >
              {item}
            </DropdownMenuCheckItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {getIsNotEmpty(enabledOptions) && (
        <div className="flex gap-3 flex-wrap">
          {enabledOptions.map((option, index) => (
            <Badge visual="primary" key={index}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => disableOption(option)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Reusable checkbox group ─────────────────────────────────────────── */

const CheckboxGroup = ({
  title,
  options,
  initialSelected = [],
}: {
  title: string
  options: string[]
  initialSelected?: string[]
}) => {
  const [open, setOpen] = useState(false)
  const [selections, setSelections] = useState<Record<string, boolean>>(
    Object.fromEntries(
      options.map((option) => [option, initialSelected.includes(option)])
    ) as Record<string, boolean>
  )

  const hasSelections = options.some((option) => selections[option])

  const reset = () => {
    setSelections(
      Object.fromEntries(options.map((option) => [option, false])) as Record<
        string,
        boolean
      >
    )
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {hasSelections && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {options.map((opt) => {
          const id = `${title}-${opt}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <Checkbox
                id={id}
                checked={selections[opt]}
                onCheckedChange={(checked) =>
                  setSelections((prev) => ({
                    ...prev,
                    [opt]: checked === true,
                  }))
                }
              />
              <Label
                htmlFor={id}
                className="font-normal text-[#667085]"
                size="sm"
              >
                {opt}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Hourly Rate ─────────────────────────────────────────────────────── */

const HourlyRate = () => {
  const [minRate, setMinRate] = useState("")
  const [maxRate, setMaxRate] = useState("")
  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        Hourly Rate
      </h1>
      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="hr-min"
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={(e) =>
                setMinRate(e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor="hr-min" size="sm">
            Min /hr
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="hr-max"
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={(e) =>
                setMaxRate(e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor="hr-max" size="sm">
            Max /hr
          </Label>
        </div>
      </div>
    </div>
  )
}

/* ─── Monthly Budget (Services) ───────────────────────────────────────── */

const MonthlyBudget = () => {
  const [minRate, setMinRate] = useState("")
  const [maxRate, setMaxRate] = useState("")
  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        Monthly Budget
      </h1>
      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="mb-min"
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={(e) =>
                setMinRate(e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor="mb-min" size="sm">
            Min /month
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id="mb-max"
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={(e) =>
                setMaxRate(e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor="mb-max" size="sm">
            Max /month
          </Label>
        </div>
      </div>
    </div>
  )
}

/* ─── Location filter (single-line text) ─────────────────────────────── */

const LocationFilter = ({ label = "Location" }: { label?: string }) => {
  const [value, setValue] = useState("")
  return (
    <div className="py-5 space-y-3">
      <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        {label}
      </span>
      <InputGroup>
        <InputLeftElement className="w-10">
          <MarkerPin02 className="text-gray-500 size-4" />
        </InputLeftElement>
        <Input
          placeholder="City, Country"
          className="pl-10 h-10 w-full"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </InputGroup>
    </div>
  )
}

const DropdownFacetSection = ({
  title,
  placeholder,
  options,
  initialSelected = [],
}: {
  title: string
  placeholder: string
  options: string[]
  initialSelected?: string[]
}) => {
  const [selections, setSelections] = useState<Record<string, boolean>>(
    Object.fromEntries(
      options.map((option) => [option, initialSelected.includes(option)])
    )
  )

  const enabledOptions = Object.keys(selections).filter(
    (option) => selections[option]
  )

  const reset = () => {
    setSelections(
      Object.fromEntries(options.map((option) => [option, false]))
    )
  }

  const disableOption = (option: string) => {
    setSelections((prev) => ({ ...prev, [option]: false }))
  }

  return (
    <div className="flex flex-col gap-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {enabledOptions.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className="bg-white font-normal justify-between text-gray-500 px-3 py-2"
            size="md"
            variant="outlined"
            visual="gray"
          >
            {placeholder}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {options.map((option) => (
            <DropdownMenuCheckItem
              checked={selections[option]}
              onCheckedChange={(checked) => {
                setSelections((prev) => ({ ...prev, [option]: checked }))
                setOpen(false)
              }}
              key={option}
            >
              {option}
            </DropdownMenuCheckItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {enabledOptions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {enabledOptions.map((option) => (
            <Badge visual="primary" key={option}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => disableOption(option)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

const TagInputSection = ({
  title,
  placeholder,
  suggestions,
  initialValues = [],
}: {
  title: string
  placeholder: string
  suggestions: string[]
  initialValues?: string[]
}) => {
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>(initialValues)
  const [selected, setSelected] = useState<string[]>([])

  const filteredOptions = suggestions.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const nextValues = selected.filter((value) => !prevValues.includes(value))
      return [...prevValues, ...nextValues]
    })
  }, [selected])

  const addValue = () => {
    if (!inputValue.trim()) return

    setValues((prev) =>
      prev.includes(inputValue.trim()) ? prev : [...prev, inputValue.trim()]
    )
    setInputValue("")
  }

  const removeValue = (target: string) => {
    setValues((prev) => prev.filter((value) => value !== target))
    setSelected((prev) => prev.filter((value) => value !== target))
  }

  const reset = () => {
    setValues([])
    setSelected([])
    setInputValue("")
  }

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {values.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <Combobox
        className="w-full"
        value={selected}
        onChange={setSelected}
        multiple
      >
        <InputGroup>
          <ComboboxPrimitive.Input
            placeholder={placeholder}
            className={cn(
              inputVariants({
                className: "h-10 text-xs rounded-r-none leading-6 font-normal",
              })
            )}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === HOT_KEYS.ENTER) addValue()
            }}
            value={inputValue}
          />
          <InputRightAddon className="rounded-l-none size-10 bg-gray-100">
            <button className="focus-visible:outline-none" onClick={addValue}>
              <Plus className="size-4" />
            </button>
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredOptions.map((option) => (
                <ComboboxOption key={option} value={option}>
                  {option}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      <div className="flex flex-wrap gap-3">
        {values.map((value) => (
          <Badge visual="primary" key={value}>
            {value}
            <button
              className="focus-visible:outline-none"
              onClick={() => removeValue(value)}
            >
              <X2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const CurrencyRangeSection = ({ title }: { title: string }) => {
  const [minValue, setMinValue] = useState("5")
  const [maxValue, setMaxValue] = useState("5")

  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        {title}
      </h1>

      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={`${title}-min`}
              type="text"
              className="pl-10 h-10 w-full"
              value={minValue}
              onChange={(event) =>
                setMinValue(event.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={`${title}-min`} size="sm">
            Min
          </Label>
        </div>

        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={`${title}-max`}
              type="text"
              className="pl-10 h-10 w-full"
              value={maxValue}
              onChange={(event) =>
                setMaxValue(event.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={`${title}-max`} size="sm">
            Max
          </Label>
        </div>
      </div>
    </div>
  )
}

const RadioSection = ({
  title,
  options,
  defaultValue = "",
}: {
  title: string
  options: string[]
  defaultValue?: string
}) => {
  const [value, setValue] = useState(defaultValue)

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>
      </div>

      <RadioGroup value={value} onValueChange={setValue} className="gap-y-3">
        {options.map((option) => {
          const id = `${title}-${option}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")

          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <RadioGroupItem id={id} value={option} />
              <Label
                htmlFor={id}
                className="font-normal text-[#667085]"
                size="sm"
              >
                {option}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

export const Sidebar = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <Category />
      <div className="space-y-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
            Tag
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="shopify" />{" "}
            <Label
              htmlFor="shopify"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Shopify
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="adobe-commerce" />{" "}
            <Label
              htmlFor="adobe-commerce"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Adobe Commerce
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="sitecore" />{" "}
            <Label
              htmlFor="sitecore"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Sitecore
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="netsuite-commerce" />{" "}
            <Label
              htmlFor="netsuite-commerce"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Netsuite Commerce
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="adobe-experience-manger" />{" "}
            <Label
              htmlFor="adobe-experience-manger"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Adobe Experience Manger
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="adobe-catalyst" />{" "}
            <Label
              htmlFor="adobe-catalyst"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Adobe Catalyst
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="asp-net-storefront" />{" "}
            <Label
              htmlFor="asp-net-storefront"
              className="font-normal text-[#667085]"
              size="sm"
            >
              Asp.net Storefront
            </Label>
          </div>
        </div>
      </div>

      <ProjectType />
      <Industry />
      <Budget />
      <Skills />
      <AdditionalTags />

      <div className="space-y-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
            Project Length
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="1-3-months" />{" "}
            <Label
              htmlFor="1-3-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              1 - 3 months
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="3-6-months" />{" "}
            <Label
              htmlFor="3-6-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              3 - 6 months
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="6-12-months" />{" "}
            <Label
              htmlFor="6-12-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              6 - 12 months
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="12-18-months" />{" "}
            <Label
              htmlFor="12-18-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              12 - 18 months
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="18-24-months" />{" "}
            <Label
              htmlFor="18-24-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              18 - 24 months
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="24-months" />{" "}
            <Label
              htmlFor="24-months"
              className="font-normal text-[#667085]"
              size="sm"
            >
              24 + months
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
            Team Size
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="1-2-members" />{" "}
            <Label
              htmlFor="1-2-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              1 - 2 members
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="2-5-members" />{" "}
            <Label
              htmlFor="2-5-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              2 - 5 members
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="5-10-members" />{" "}
            <Label
              htmlFor="5-10-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              5 - 10 members
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="10-15-members" />{" "}
            <Label
              htmlFor="10-15-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              10 - 15 members
            </Label>
          </div>
          <div className="flex items-center gap-x-3.5">
            <Checkbox id="15-20-members" />{" "}
            <Label
              htmlFor="15-20-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              15 - 20 members
            </Label>
          </div>

          <div className="flex items-center gap-x-3.5">
            <Checkbox id="20-members" />{" "}
            <Label
              htmlFor="20-members"
              className="font-normal text-[#667085]"
              size="sm"
            >
              20 + members
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Projects sidebar (alias of default) ─────────────────────────────── */

export const SidebarProjects = Sidebar

/* ─── Services sidebar ────────────────────────────────────────────────── */

export const SidebarServices = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <Category />
      <CheckboxGroup
        title="Service Type"
        options={[
          "One-time project",
          "Ongoing subscription",
          "Consultation",
          "Managed service",
        ]}
      />
      <Industry />
      <MonthlyBudget />
      <Skills />
      <AdditionalTags />
      <CheckboxGroup
        title="Delivery Time"
        options={[
          "Up to 1 week",
          "1 - 2 weeks",
          "2 - 4 weeks",
          "1 - 3 months",
          "3+ months",
        ]}
      />
    </div>
  )
}

/* ─── Talent sidebar ──────────────────────────────────────────────────── */

export const SidebarTalent = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <AdditionalTags />
      <Industry />
      <HourlyRate />
      <Skills />
      <LocationFilter />
      <CheckboxGroup
        title="Tags"
        options={["All Stars", "Verified", "Available now", "Open to travel"]}
      />
      <CheckboxGroup
        title="Experience Level"
        options={[
          "Entry level (0 - 2 yrs)",
          "Intermediate (3 - 5 yrs)",
          "Senior (6 - 9 yrs)",
          "Expert (10+ yrs)",
        ]}
      />
    </div>
  )
}

/* ─── Teams sidebar (brand new — derived from team landing page) ───── */

export const SidebarTeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <CheckboxGroup
        title="Team Specialty"
        options={[
          "Development team",
          "Design team",
          "Marketing team",
          "Product team",
          "Data team",
          "Full-service agency",
        ]}
      />
      <CheckboxGroup
        title="Team Size"
        options={[
          "2 - 5 members",
          "5 - 10 members",
          "10 - 15 members",
          "15 - 20 members",
          "20+ members",
        ]}
      />
      <Industry />
      <HourlyRate />
      <CheckboxGroup
        title="Avg Years of Experience"
        options={[
          "1 - 3 years",
          "3 - 5 years",
          "5 - 10 years",
          "10+ years",
        ]}
      />
      <LocationFilter label="Locations" />
      <Skills />
      <CheckboxGroup
        title="Previous Client Tier"
        options={[
          "Fortune 500",
          "Enterprise",
          "Mid-market",
          "Startup",
        ]}
      />
      <CheckboxGroup
        title="Availability"
        options={[
          "Available now",
          "Within 2 weeks",
          "Within 1 month",
          "Booked 1+ month out",
        ]}
      />
    </div>
  )
}

export const SidebarJobs = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <RadioSection
        title="Date Posted"
        defaultValue="Any time"
        options={["Any time", "Past 24 hours", "Past week", "Past month"]}
      />
      <div className="pt-5">
        <Category
          title="Category"
          placeholder="Select Category"
          options={["Mobile Wallet", "Payment App", "FinTech", "SaaS"]}
          breadcrumbs={[]}
          footerLinkLabel="View All Categories"
        />
      </div>
      <div className="pt-5">
        <Category
          title="Job Type"
          placeholder="Select Job Type"
          options={["Mobile App", "Desktop App", "Web App", "API"]}
          breadcrumbs={[]}
        />
      </div>
      <CheckboxGroup
        title="NDA Required"
        options={["NDA Required", "Payment Verified"]}
      />
      <CheckboxGroup
        title="Experience Level"
        options={[
          "Junior (0 - 3 years)",
          "Middle (3 - 5 years)",
          "Senior (5 - 7 years)",
          "Lead (7 - 10 years)",
          "Super Senior (10+ years)",
          "Custom Range",
        ]}
      />
      <Budget
        title="Earnings Opportunity"
      />
      <Skills
        title="Skills"
        placeholder="Add skills by keyword"
      />
      <Skills
        title="Client Location"
        placeholder="Add location"
        suggestions={[
          "Argentina",
          "Berlin",
          "New York",
          "London",
          "Toronto",
          "Sao Paulo",
        ]}
      />
      <RadioSection
        title="Work Schedule"
        defaultValue="Show All"
        options={["Show All", "Full-Time", "Part-Time", "Custom Range"]}
      />
      <CheckboxGroup
        title="Project Length"
        options={[
          "1 - 3 months",
          "3 - 6 months",
          "6 - 12 months",
          "12 - 18 months",
          "18 - 24 months",
          "24 + months",
        ]}
      />
      <div className="pt-5">
        <Industry
          title="Industry"
          placeholder="Select Industry"
          options={["Real Estate", "FinTech", "Healthcare", "Education"]}
        />
      </div>
      <Skills
        title="Languages"
        placeholder="Add language"
        suggestions={["English", "Spanish", "Portuguese", "German", "French"]}
      />
    </div>
  )
}

/* ─── Category dispatcher ─────────────────────────────────────────────── */

export type SidebarCategory =
  | "projects"
  | "services"
  | "talent"
  | "teams"
  | "jobs"
  | "all"

export const CategorySidebar = ({
  category,
  className,
}: {
  category: SidebarCategory
  className?: string
}) => {
  switch (category) {
    case "services":
      return <SidebarServices className={className} />
    case "talent":
      return <SidebarTalent className={className} />
    case "teams":
      return <SidebarTeams className={className} />
    case "jobs":
      return <SidebarJobs className={className} />
    case "projects":
    case "all":
    default:
      return <SidebarProjects className={className} />
  }
}
