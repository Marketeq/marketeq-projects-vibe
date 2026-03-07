import { SearchMd } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
} from "@/components/ui"

const meta: Meta = {
  title: "SearchField",
}

export default meta

export const DefaultSm = () => {
  return (
    <SearchField>
      <SearchFieldInput />
      <SearchFieldButton>
        <SearchMd className="h-4 w-4" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const DefaultSmRightIcon = () => {
  return (
    <SearchField>
      <SearchFieldInput className="pl-3 pr-[34px]" />
      <SearchFieldButton align="right">
        <SearchMd className="h-4 w-4" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const DefaultLg = () => {
  return (
    <SearchField>
      <SearchFieldInput size="lg" />
      <SearchFieldButton size="lg">
        <SearchMd className="h-5 w-5" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const DefaultLgRightIcon = () => {
  return (
    <SearchField>
      <SearchFieldInput className="pl-3.5 pr-[42px]" size="lg" />
      <SearchFieldButton size="lg" align="right">
        <SearchMd />
      </SearchFieldButton>
    </SearchField>
  )
}

export const GraySm = () => {
  return (
    <SearchField>
      <SearchFieldInput visual="gray" />
      <SearchFieldButton>
        <SearchMd className="h-4 w-4" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const GraySmRightIcon = () => {
  return (
    <SearchField>
      <SearchFieldInput className="pl-3 pr-[34px]" visual="gray" />
      <SearchFieldButton align="right">
        <SearchMd className="h-4 w-4" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const GrayLg = () => {
  return (
    <SearchField>
      <SearchFieldInput size="lg" visual="gray" />
      <SearchFieldButton size="lg">
        <SearchMd className="h-5 w-5" />
      </SearchFieldButton>
    </SearchField>
  )
}

export const GrayLgRightIcon = () => {
  return (
    <SearchField>
      <SearchFieldInput className="pl-3.5 pr-[42px]" size="lg" visual="gray" />
      <SearchFieldButton size="lg" align="right">
        <SearchMd />
      </SearchFieldButton>
    </SearchField>
  )
}
