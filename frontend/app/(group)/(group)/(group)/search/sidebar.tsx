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
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  inputVariants,
} from "@/components/ui"

const Budget = () => {
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
        Budget
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

const Industry = () => {
  const [industries, setIndustries] = React.useState({
    Fintech: false,
    "Real Estate": false,
    Technology: false,
    Healthcare: false,
    Finance: false,
    Education: false,
  })
  const reset = () => {
    const nextState = keys(industries).reduce(
      (prev, current) => ({ ...prev, [current]: false }),
      {} as { [Property in Keys<typeof industries>]: boolean }
    )
    setIndustries(nextState)
  }

  const enabledOptions = keys(industries).filter((item) => industries[item])
  const disableOption = (key: Keys<typeof industries>) => {
    setIndustries((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div className="flex flex-col gap-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Industry
        </span>

        {keys(industries).some((key) => industries[key]) && (
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
            Select Industry
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {keys(industries).map((item, index) => (
            <DropdownMenuCheckItem
              checked={industries[item]}
              onCheckedChange={(checked) =>
                setIndustries((prev) => ({ ...prev, [item]: checked }))
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

const Category = () => {
  const [categories, setCategories] = useState({
    "Mobile Wallet": false,
    "Payment App": false,
    FinTech: false,
    SaaS: false,
    "Product Management": false,
  })
  const reset = () => {
    const nextState = keys(categories).reduce(
      (prev, current) => ({ ...prev, [current]: false }),
      {} as { [Property in Keys<typeof categories>]: boolean }
    )
    setCategories(nextState)
  }

  const enabledOptions = keys(categories).filter((item) => categories[item])
  const disableOption = (key: Keys<typeof categories>) => {
    setCategories((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div className="flex flex-col gap-y-[15px] pb-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Category
        </span>

        {keys(categories).some((key) => categories[key]) && (
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
            Select Category
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
          {keys(categories).map((item, index) => (
            <DropdownMenuCheckItem
              checked={categories[item]}
              onCheckedChange={(checked) =>
                setCategories((prev) => ({ ...prev, [item]: checked }))
              }
              key={index}
            >
              {item}
            </DropdownMenuCheckItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-col items-start gap-y-[15px]">
        <Button visual="gray" variant="link">
          <ArrowLeft className="size-[15px]" />
          Mobile Development
        </Button>
        <Button visual="gray" variant="link">
          <ArrowLeft className="size-[15px]" />
          Swift Development
        </Button>
      </div>

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

  const filteredSkills = skills.filter((skill) =>
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

  const filteredAdditionalTags = additionalTags.filter((additionalTag) =>
    additionalTag.toLowerCase().includes(inputValue.toLowerCase())
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
          Additional Tags
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
              {filteredAdditionalTags.map((additionalTag, index) => (
                <ComboboxOption key={index} value={additionalTag}>
                  {additionalTag}
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
