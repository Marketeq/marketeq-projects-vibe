"use client"

import React, { useEffect, useState } from "react"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty } from "@/utils/functions"
import { useUncontrolledState } from "@/utils/hooks"
import {
  ArrowLeft,
  ArrowUp,
  Building06,
  Check,
  ChevronDown,
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

const jobTitles = [
  "Front-end Developer",
  "Backend Developer",
  "Dev-ops Developer",
  "App Developer",
  "Design Engineer",
  "UX Research",
  "Product Design",
]

const JobTitle = () => {
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
            <ScrollArea viewportClassName="max-h-[304px]">
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

const industries = [
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

const IndustryKnowledge = () => {
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
            <ScrollArea viewportClassName="max-h-[304px]">
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

const Skills = () => {
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

const locations = [
  "New York",
  "London",
  "San Francisco",
  "Tokyo",
  "Berlin",
  "Paris",
  "Sydney",
  "Toronto",
  "Singapore",
  "Dubai",
  "Los Angeles",
  "Hong Kong",
  "Amsterdam",
  "Mumbai",
  "Seoul",
  "Chicago",
  "Mexico City",
  "Bangkok",
  "São Paulo",
  "Copenhagen",
]

const Location = () => {
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
            <ScrollArea viewportClassName="max-h-[304px]">
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
            <ScrollArea viewportClassName="max-h-[304px]">
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

const Availability = () => {
  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Experience Level
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-x-3.5">
          <Checkbox id="full-time-40-hours" />{" "}
          <Label
            htmlFor="full-time-40-hours"
            className="font-normal text-[#667085]"
            size="sm"
          >
            Full Time (40 + hours)
          </Label>
        </div>
        <div className="flex items-center gap-x-3.5">
          <Checkbox id="part-time-40-hours" />{" "}
          <Label
            htmlFor="part-time-40-hours"
            className="font-normal text-[#667085]"
            size="sm"
          >
            Part Time (40 + hours)
          </Label>
        </div>
        <div className="flex items-center gap-x-3.5">
          <Checkbox id="project-based" />{" "}
          <Label
            htmlFor="project-based"
            className="font-normal text-[#667085]"
            size="sm"
          >
            Project Based
          </Label>
        </div>
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

const Sidebar = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <JobTitle />
      <IndustryKnowledge />
      <HourlyRate />
      <Skills />
      <Location />
      <Tags />
      <Availability />
    </div>
  )
}

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

export default function TalentSearch() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [isOpen, toggleIsOpen] = useToggle(false)
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

      <div className="pt-3 md:pt-6 lg:pt-[50px] lg:p-[50px] pb-10 bg-[#F9FAFB] lg:flex gap-x-[50px]">
        <Sidebar />
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
                  <Toggle asChild>
                    <Button
                      className="group data-[state=on]:opacity-100 opacity-50 xs:max-lg:h-[33.33px] xs:max-lg:px-[11.67px] xs:max-lg:text-[10px] xs:max-lg:leading-[11.67px]"
                      visual="gray"
                      variant="outlined"
                    >
                      <ArrowUp className="group-data-[state=on]:inline-block hidden size-3 lg:size-[15px] text-gray-500" />
                      Mobile Wallet App
                    </Button>
                  </Toggle>
                  <Toggle asChild>
                    <Button
                      className="group data-[state=on]:opacity-100 opacity-50 xs:max-lg:h-[33.33px] xs:max-lg:px-[11.67px] xs:max-lg:text-[10px] xs:max-lg:leading-[11.67px]"
                      visual="gray"
                      variant="outlined"
                    >
                      <ArrowUp className="group-data-[state=on]:inline-block hidden size-3 lg:size-[15px] text-gray-500" />
                      Mobile Payments App
                    </Button>
                  </Toggle>
                  <Toggle asChild>
                    <Button
                      className="group data-[state=on]:opacity-100 opacity-50 xs:max-lg:h-[33.33px] xs:max-lg:px-[11.67px] xs:max-lg:text-[10px] xs:max-lg:leading-[11.67px]"
                      visual="gray"
                      variant="outlined"
                    >
                      <ArrowUp className="group-data-[state=on]:inline-block hidden size-3 lg:size-[15px] text-gray-500" />
                      Mobile CRM Application
                    </Button>
                  </Toggle>
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
                        <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
                        <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>

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

                <div className="flex items-center gap-x-3 xs:max-lg:hidden">
                  <span className="inline-block text-sm text-gray-500 leading-[16.94px] font-medium">
                    Skills required for this role
                  </span>
                  <div className="inline-flex items-center gap-x-1">
                    <Button
                      className="opacity-50 hover:opacity-100"
                      visual="gray"
                      variant="link"
                    >
                      Graphic Design,
                    </Button>
                    <Button
                      className="opacity-50 hover:opacity-100"
                      visual="gray"
                      variant="link"
                    >
                      UX Prototyping,
                    </Button>
                    <Button
                      className="opacity-50 hover:opacity-100"
                      visual="gray"
                      variant="link"
                    >
                      Adobe Illustrator,
                    </Button>
                    <Button
                      className="opacity-50 hover:opacity-100"
                      visual="gray"
                      variant="link"
                    >
                      UX Research
                    </Button>
                  </div>
                </div>

                <Button variant="link">
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
