import * as React from "react"
import { ChevronDown, SearchMd } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  Autocomplete,
  AutocompleteButton,
  AutocompleteInput,
  AutocompleteOption,
  AutocompleteOptions,
  AutocompleteRoot,
  AutocompleteTrigger,
  ScaleOutIn,
} from "@/components/ui"

const meta: Meta = {
  title: "Autocomplete",
  parameters: {
    design: [
      {
        type: "figma",
        url: "https://www.figma.com/file/wTW5aoJfEb9KtPeU8KkbG3/BM---Integration-Partner---Development?type=design&node-id=3-90426&mode=design&t=mtAmgsFKD9OIeM0k-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/wTW5aoJfEb9KtPeU8KkbG3/BM---Integration-Partner---Development?type=design&node-id=3-89818&mode=design&t=mtAmgsFKD9OIeM0k-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/wTW5aoJfEb9KtPeU8KkbG3/BM---Integration-Partner---Development?type=design&node-id=3-89819&mode=design&t=mtAmgsFKD9OIeM0k-4",
      },
      {
        type: "figma",
        url: "https://www.figma.com/file/wTW5aoJfEb9KtPeU8KkbG3/BM---Integration-Partner---Development?type=design&node-id=3-89820&mode=design&t=mtAmgsFKD9OIeM0k-4",
      },
    ],
  },
}

export default meta

export const Default = () => {
  const [users] = React.useState([
    { id: 1, name: "Wade Cooper" },
    { id: 2, name: "Arlene Mccoy" },
    { id: 3, name: "Devon Webb" },
    { id: 4, name: "Tom Cook" },
    { id: 5, name: "Tanya Fox" },
    { id: 6, name: "Hellen Schmidt" },
    { id: 7, name: "Chris Torres" },
    { id: 8, name: "Max" },
    { id: 9, name: "David" },
    { id: 10, name: "Logan" },
    { id: 11, name: "Andrew" },
  ])
  const [selected, setSelected] = React.useState<typeof users>([])
  const [query, setQuery] = React.useState("")

  const filteredPeople =
    query === ""
      ? users
      : users.filter((user) =>
          user.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )

  return (
    <AutocompleteRoot value={selected} onChange={setSelected} multiple>
      <Autocomplete>
        <AutocompleteTrigger>
          <AutocompleteInput
            onChange={(event) => setQuery(event.target.value)}
          />
          <AutocompleteButton>
            {({ open }) =>
              open ? (
                <SearchMd className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )
            }
          </AutocompleteButton>
        </AutocompleteTrigger>
        <ScaleOutIn afterLeave={() => setQuery("")}>
          <AutocompleteOptions>
            {filteredPeople.map((user) => (
              <AutocompleteOption key={user.id} value={user}>
                {user.name}
              </AutocompleteOption>
            ))}
          </AutocompleteOptions>
        </ScaleOutIn>
      </Autocomplete>
    </AutocompleteRoot>
  )
}
