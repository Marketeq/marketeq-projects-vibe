"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty } from "@/utils/functions"
import { useUncontrolledState } from "@/utils/hooks"
import {
  ArrowLeft,
  ArrowUp,
  Building06,
  Check,
  ChevronDown,
  ChevronRight,
  DollarSign,
  MapPin,
  MarkerPin02,
  Plus,
  Sliders04,
  Star,
  Tag,
  X,
  X2,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { TalentSearchCard } from "@/components/talent-search-card"
import { TalentSearchCardLandscape } from "@/components/talent-search-card-landscape"
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
  ComboboxOption,
  ComboboxOptions,
  ComboboxPrimitive,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  Label,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  inputVariants,
} from "@/components/ui"
import { DROPDOWN_MAX_HEIGHT } from "../search/dropdown-height"
import { useCategoryTree, type CategoryTreeNode } from "../search/use-category-tree"
import { getSortOptions } from "../search/sort-options"
import { useAutocompleteList } from "./use-autocomplete-list"

type CategoryNode = CategoryTreeNode

const Category = () => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<CategoryNode[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const { data: categoryTree = [] } = useCategoryTree()

  const currentLevel = path.length > 0 ? path[path.length - 1].children ?? [] : categoryTree

  const reset = () => {
    setSelected([])
    setPath([])
  }

  const toggleLeaf = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    )
  }

  const removeSelected = (name: string) => {
    setSelected((prev) => prev.filter((item) => item !== name))
  }

  const goToBreadcrumb = (index: number) => {
    setPath((prev) => prev.slice(0, index))
  }

  return (
    <div className="flex flex-col gap-y-[15px] pb-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Category
        </span>

        {(getIsNotEmpty(selected) || path.length > 0) && (
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
            Select Category
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {path.length > 0 && (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault()
                setPath((prev) => prev.slice(0, -1))
              }}
            >
              <ArrowLeft className="size-4 text-gray-400" />
              Back
            </DropdownMenuItem>
          )}

          {currentLevel.map((node) =>
            node.children ? (
              <DropdownMenuItem
                key={node.uuid ?? node.name}
                onSelect={(event) => {
                  event.preventDefault()
                  setPath((prev) => [...prev, node])
                }}
              >
                {node.name}
                <ChevronRight className="ml-auto size-4 text-gray-400" />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckItem
                checked={selected.includes(node.name)}
                onCheckedChange={() => toggleLeaf(node.name)}
                key={node.uuid ?? node.name}
              >
                {node.name}
              </DropdownMenuCheckItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {path.length > 0 && (
        <div className="flex flex-col items-start gap-y-[15px]">
          {path.map((node, index) => (
            <Button
              key={`${node.uuid ?? node.name}-${index}`}
              visual="gray"
              variant="link"
              onClick={() => goToBreadcrumb(index)}
            >
              <ArrowLeft className="size-[15px]" />
              {node.name}
            </Button>
          ))}
        </div>
      )}

      {getIsNotEmpty(selected) && (
        <div className="flex gap-3 flex-wrap">
          {selected.map((item) => (
            <Badge visual="primary" key={item}>
              {item}
              <button
                className="focus-visible:outline-none"
                onClick={() => removeSelected(item)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Button
        className="self-start h-6 w-fit min-w-[111px] justify-center items-center gap-2 p-0 underline decoration-current/30 underline-offset-2 hover:decoration-current"
        visual="gray"
        variant="link"
        onClick={() => router.push("/c")}
      >
        View All Categories
      </Button>
    </div>
  )
}

const JobTitle = () => {
  const jobTitles = useAutocompleteList("job_titles")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredJobTitles = jobTitles.filter((jobTitle) =>
    jobTitle.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 pb-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Job Title
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
            placeholder="Enter Job Title"
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
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredJobTitles.map((jobTitle, index) => (
                <ComboboxOption key={index} value={jobTitle}>
                  {jobTitle}
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

const IndustryKnowledge = () => {
  const industries = useAutocompleteList("industries")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredIndustries = industries.filter((industry) =>
    industry.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Industry Knowledge
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
            placeholder="Enter Industry"
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
            <Building06 className="size-4" />
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredIndustries.map((industry, index) => (
                <ComboboxOption key={index} value={industry}>
                  {industry}
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

const Skills = ({
  onValuesChange,
}: {
  onValuesChange?: (values: string[]) => void
}) => {
  const skills = useAutocompleteList("skills")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    onValuesChange?.(values)
  }, [values, onValuesChange])

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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredSkills = skills.filter((skill) =>
    skill.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Skills
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
            placeholder="Add skills by keyword"
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
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
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

const Location = () => {
  const locations = useAutocompleteList("locations")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredLocations = locations.filter((location) =>
    location.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Location
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
            placeholder="Add location(s)"
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
            <MapPin className="size-4" />
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredLocations.map((location, index) => (
                <ComboboxOption key={index} value={location}>
                  {location}
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

const Tags = () => {
  const industries = useAutocompleteList("industries")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredIndustries = industries.filter((industry) =>
    industry.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Tags
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
            placeholder="Add tag(s)"
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
            <Tag className="size-4" />
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredIndustries.map((industry, index) => (
                <ComboboxOption key={index} value={industry}>
                  {industry}
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

const CheckboxGroup = ({
  title,
  options,
}: {
  title: string
  options: string[]
}) => {
  const [selected, setSelected] = useState<string[]>([])

  const reset = () => setSelected([])

  const toggle = (option: string) => {
    setSelected((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    )
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {getIsNotEmpty(selected) && (
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
        {options.map((option) => {
          const id = `${title}-${option}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <Checkbox
                id={id}
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
              />
              <Label htmlFor={id} className="font-normal text-[#667085]" size="sm">
                {option}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Languages = () => {
  const languages = useAutocompleteList("languages")
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>([])
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
    const value = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((item) => item !== value)
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

  const filteredLanguages = languages.filter((language) =>
    language.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )
      return [...prevValues, ...filteredSelected]
    })
  }, [selected])

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Languages
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
            placeholder="Add language(s)"
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
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredLanguages.map((language, index) => (
                <ComboboxOption key={index} value={language}>
                  {language}
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

const HourlyRate = () => {
  const [minRate, setMinRate] = useState("")
  const [maxRate, setMaxRate] = useState("")
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
  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        Hourly Rate
      </h1>

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

const Sidebar = ({
  className,
  onSkillsChange,
}: {
  className?: string
  onSkillsChange?: (values: string[]) => void
}) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <Category />
      <JobTitle />
      <IndustryKnowledge />
      <HourlyRate />
      <Skills onValuesChange={onSkillsChange} />
      <Location />
      <Tags />
      <CheckboxGroup
        title="Experience Level"
        options={[
          "Junior (1 - 3 years)",
          "Middle (3 - 5 years)",
          "Senior (5 - 7 years)",
          "Lead (7 - 10 years)",
          "Super Senior (10 + years)",
          "Custom Range",
        ]}
      />
      <CheckboxGroup
        title="Projects Completed"
        options={["1 - 10", "10 - 25", "25 - 50", "50 + projects"]}
      />
      <CheckboxGroup
        title="Average Rating"
        options={["5.0", "4.5 & above", "4.0 & above", "Any rating"]}
      />
      <CheckboxGroup
        title="Client Success Rate"
        options={["95% +", "90% +", "80% +", "Any"]}
      />
      <CheckboxGroup
        title="Availability"
        options={[
          "Available now",
          "Available within 1 week",
          "Available within 1 month",
        ]}
      />
      <Languages />
    </div>
  )
}

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

function TalentSearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categorySlug = searchParams?.get("category") ?? ""
  return <TalentSearchBase router={router} categorySlug={categorySlug} />
}

export default function TalentSearch() {
  return (
    <Suspense fallback={null}>
      <TalentSearchPage />
    </Suspense>
  )
}

function TalentSearchBase({ router, categorySlug }: { router: ReturnType<typeof useRouter>; categorySlug: string }) {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [isOpen, toggleIsOpen] = useToggle(false)
  const { data: categoryTree = [] } = useCategoryTree()
  const [activeMobileCategory, setActiveMobileCategory] = useState<string | null>(null)
  const mobileCategoryChips = categoryTree.slice(0, 3)
  const [requiredSkills, setRequiredSkills] = useState<string[]>([])
  const sortOptions = getSortOptions("talent")
  const [sortId, setSortId] = useState(sortOptions[0]?.id ?? "")
  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent
          variant="unanimated"
          className="py-[68px] px-0 bg-[#F9FAFB] rounded-none data-[state=open]:duration-150 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 right-0 inset-y-0 w-full md:w-[375px]"
        >
          <div className="h-12 absolute top-0 border-b border-gray-200 inset-x-0 flex items-center bg-white justify-between pl-3.5 p-1">
            <span className="text-xs leading-5 font-semibold text-dark-blue-400">
              Filters
            </span>
            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray">
                <X className="size-[18px]" />
              </IconButton>
            </DialogClose>
          </div>
          <ScrollArea
            className="h-full"
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            <Sidebar className="block w-full px-5" />
          </ScrollArea>
          <div className="h-12 absolute border-t border-gray-200 bg-white bottom-0 inset-x-0 flex items-center justify-between pl-3.5 p-1">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Clear Filters
            </Button>

            <Button variant="outlined" visual="gray">
              Show 42 results
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="pt-3 md:pt-6 lg:pt-[50px] lg:p-[50px] pb-10 bg-[#F9FAFB] lg:flex gap-x-[50px] overflow-x-hidden">
        <Sidebar onSkillsChange={setRequiredSkills} />
        <div className="flex-auto">
          <div className="flex flex-col-reverse lg:flex-col gap-y-3.5">
            <div className="lg:flex xs:max-lg:space-y-3.5 lg:gap-y-3.5 lg:flex-row lg:items-end justify-between">
              <h1 className="text-xs leading-[14.52px] lg:text-base lg:leading-[19.36px] font-light text-dark-blue-400 xs:max-md:px-3 md:max-lg:px-6">
                <span className="font-semibold lg:font-bold">174</span> Results
                for{" "}
                <span className="font-semibold lg:font-bold">
                  “UX Architect”
                </span>
              </h1>

              <div className="lg:contents overflow-x-auto scrollbar-none flex justify-between gap-x-2 xs:max-md:px-3 md:max-lg:px-6">
                <div className="lg:hidden flex shrink-0 items-center gap-x-2">
                  {mobileCategoryChips.map((node) => (
                    <Toggle
                      key={node.uuid ?? node.name}
                      pressed={activeMobileCategory === node.name}
                      onPressedChange={(pressed) =>
                        setActiveMobileCategory(pressed ? node.name : null)
                      }
                      asChild
                    >
                      <Button
                        className="group data-[state=on]:opacity-100 opacity-50 xs:max-lg:h-[33.33px] xs:max-lg:px-[11.67px] xs:max-lg:text-[10px] xs:max-lg:leading-[11.67px]"
                        visual="gray"
                        variant="outlined"
                      >
                        <ArrowUp className="group-data-[state=on]:inline-block hidden size-3 lg:size-[15px] text-gray-500" />
                        {node.name}
                      </Button>
                    </Toggle>
                  ))}
                </div>
                <div className="flex items-center shrink-0 gap-x-3 lg:gap-x-3.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="focus-visible:outline-none shrink-0">
                        <SortAs className="size-4 lg:size-6 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <ScrollArea
                        viewportClassName="max-h-[250px]"
                        scrollBar={<ScrollBar className="w-4 p-1" />}
                      >
                        {sortOptions.map((option) => (
                          <DropdownMenuCheckItem
                            key={option.id}
                            checked={sortId === option.id}
                            onCheckedChange={() => setSortId(option.id)}
                          >
                            {option.label}
                          </DropdownMenuCheckItem>
                        ))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* List/Grid view toggle — temporarily hidden
                  <ToggleGroupRoot
                    value={value}
                    onValueChange={(details) => setValue(details.value)}
                  >
                    <ToggleGroupItem value={GRID_LAYOUT}>
                      <Grid className="size-4 lg:size-6" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value={LIST_LAYOUT}>
                      <List className="size-4 lg:size-6" />
                    </ToggleGroupItem>
                  </ToggleGroupRoot>
                  */}
                </div>
              </div>
            </div>

            <div className="lg:mt-[19px] lg:pt-[19px] xs:max-md:px-3 md:max-lg:px-6 lg:border-t lg:border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-3 lg:hidden">
                  <Button
                    variant="outlined"
                    visual="gray"
                    onClick={toggleIsOpen}
                  >
                    <Sliders04 className="size-[12.5px]" />
                    Filter
                  </Button>

                  <Button
                    className="opacity-50 hover:opacity-100"
                    variant="link"
                    visual="gray"
                  >
                    Clear Filters
                  </Button>
                </div>

                {getIsNotEmpty(requiredSkills) && (
                  <div className="flex items-center gap-x-3 xs:max-lg:hidden">
                    <span className="inline-block text-sm text-gray-500 leading-[16.94px] font-medium">
                      Skills required for this role
                    </span>
                    <div className="inline-flex items-center gap-x-1">
                      {requiredSkills.map((skill, index) => (
                        <Button
                          key={skill}
                          className="opacity-50 hover:opacity-100"
                          visual="gray"
                          variant="link"
                        >
                          {skill}
                          {index < requiredSkills.length - 1 ? "," : ""}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="link"
                  onClick={() => {
                    if (categorySlug) {
                      router.push(`/c/${categorySlug}`)
                    } else {
                      router.push("/c")
                    }
                  }}
                >
                  <ArrowLeft className="size-[15px]" />
                  Back to Categories
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-3.5 lg:mt-6 xs:max-md:px-3 md:max-lg:px-6">
            {getFirstItem(value) === GRID_LAYOUT ? (
              <div className="grid grid-cols-2 2xl:grid-cols-5 md:grid-cols-4 gap-3 md:gap-3.5 lg:gap-6">
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
                <TalentSearchCard />
              </div>
            ) : (
              <div className="grid gap-3 md:gap-3.5 lg:gap-6">
                <TalentSearchCardLandscape />
                <TalentSearchCardLandscape />
                <TalentSearchCardLandscape />
                <TalentSearchCardLandscape />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
