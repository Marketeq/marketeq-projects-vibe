import * as React from "react"
import { emojis } from "@/data/emojis"
import { Categories, configByCategory } from "@/utils/constants"
import {
  DataEmoji,
  EmojiProperties,
  emojiUnified,
  first,
  getIsNotEmpty,
  getMiddleIndex,
  keys,
  omit,
} from "@/utils/functions"
import { useUncontrolledState } from "@/utils/hooks"
import { SearchMd } from "@blend-metrics/icons"
import { useAsync } from "react-use"
import {
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

const ViewEmoji = ({ emoji }: { emoji: DataEmoji }) => {
  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${emojiUnified(
        emoji
      )}.png`}
      alt={emoji[EmojiProperties.name].join(" ")}
      className="size-6 object-contain"
    />
  )
}

export interface Gifs {
  locale: string
  results: Result[]
  next: string
}

export interface Result {
  id: string
  title: string
  content_description: string
  content_rating: string
  h1_title: string
  media: { [key: string]: Media }[]
  bg_color: string
  created: number
  itemurl: string
  url: string
  tags: any[]
  flags: any[]
  shares: number
  hasaudio: boolean
  hascaption: boolean
  source_id: string
  composite: null
}

export interface Media {
  preview: string
  duration: number
  size: number
  dims: number[]
  url: string
}

interface EmojiPickerProps {
  onEmojiSelect?: (emoji: DataEmoji) => void
  onGifSelect?: (gif: Result) => void
  children: React.ReactNode
  align?: "start" | "center" | "end"
  side?: "top" | "bottom" | "left" | "right"
}

export const EmojiPicker = ({
  onEmojiSelect,
  onGifSelect,
  children,
  align = "start",
  side = "top",
}: EmojiPickerProps) => {
  const [query, setQuery] = React.useState("")
  const [tab, setTab] = useUncontrolledState({
    defaultValue: "emojis",
    onChange: () => {
      setQuery("")
    },
  })
  const [suggestions, setSuggestions] = React.useState<DataEmoji[]>([])
  const [url, setUrl] = React.useState(
    "https://g.tenor.com/v1/trending?key=LIVDSRZULELA"
  )

  const handleEmojiClick = (emoji: DataEmoji) => {
    setSuggestions((prev) => (prev.includes(emoji) ? prev : [...prev, emoji]))
    onEmojiSelect?.(emoji)
  }

  const handleGifClick = (gif: Result) => {
    onGifSelect?.(gif)
  }

  const filteredEmojis = keys(
    omit(configByCategory, Categories.CUSTOM, Categories.SUGGESTED)
  ).reduce(
    (prev, current) => {
      const values = emojis[current].reduce(
        (prev, current) =>
          current[EmojiProperties.name].join(" ").includes(query)
            ? [...prev, current]
            : prev,
        [] as DataEmoji[]
      )

      return getIsNotEmpty(values) ? { ...prev, [current]: values } : prev
    },
    {} as Record<Categories, DataEmoji[]>
  )

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setQuery(value)
    onUrlChange(value)
  }

  const onUrlChange = (query: string) => {
    const searchParams = new URLSearchParams()
    searchParams.append("key", "LIVDSRZULELA")
    searchParams.append("q", query)
    searchParams.append("limit", "20")
    setUrl("https://g.tenor.com/v1/search?" + searchParams.toString())
  }

  const { value } = useAsync(async () => {
    const response = await fetch(url)
    return response.json() as Promise<Gifs>
  }, [url])

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        sideOffset={10}
        className="w-[344px] rounded-[12px] p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.08)] bg-white border border-gray-200"
      >
        <Tabs value={tab} onValueChange={setTab}>
          <div className="space-y-2.5">
            <TabsList className="justify-start px-0 border-transparent">
              <TabsTrigger value="emojis">Emojis</TabsTrigger>
              <TabsTrigger value="gifs">GIFs</TabsTrigger>
            </TabsList>

            <InputGroup>
              <Input
                className="h-[30px] text-xs rounded-[5px] leading-5 pl-3 pr-6"
                type="text"
                placeholder="Search"
                onChange={handleChange}
                value={query}
              />
              <InputRightElement className="w-6 justify-start">
                <SearchMd className="size-4 text-gray-400" />
              </InputRightElement>
            </InputGroup>
          </div>
          <TabsContent value="emojis">
            <div className="pt-2.5">
              <ScrollArea
                className="h-[180px]"
                scrollBar={<ScrollBar className="w-4 p-1" />}
              >
                <div className="space-y-2.5">
                  {getIsNotEmpty(suggestions) && (
                    <div className="space-y-2.5">
                      <h3 className="text-xs leading-[14.52px] font-medium text-dark-blue-400">
                        {configByCategory[Categories.SUGGESTED].name}
                      </h3>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {suggestions.map((emoji) => (
                          <button
                            key={emojiUnified(emoji)}
                            className="focus-visible:outline-none"
                            onClick={() => handleEmojiClick(emoji)}
                          >
                            <ViewEmoji emoji={emoji} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {keys(filteredEmojis).map((key) => (
                    <div className="space-y-2.5" key={key}>
                      <h3 className="text-xs leading-[14.52px] font-medium text-dark-blue-400">
                        {configByCategory[key].name}
                      </h3>

                      {filteredEmojis[key] && (
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {filteredEmojis[key].map((emoji) => (
                            <button
                              key={emojiUnified(emoji)}
                              className="focus-visible:outline-none"
                              onClick={() => handleEmojiClick(emoji)}
                            >
                              <ViewEmoji emoji={emoji} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          <TabsContent value="gifs">
            <div className="pt-2.5">
              <div className="flex items-center gap-x-1 overflow-x-auto scrollbar-none">
                <button
                  className="border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2"
                  onClick={() => onUrlChange("Exited")}
                >
                  Exited
                </button>
                <button
                  className="border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2"
                  onClick={() => onUrlChange("Vacation")}
                >
                  Vacation
                </button>
                <button
                  className="border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2"
                  onClick={() => onUrlChange("Holiday")}
                >
                  Holiday
                </button>
                <button
                  className="border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2"
                  onClick={() => onUrlChange("Laughing")}
                >
                  Laughing
                </button>
              </div>
            </div>
            <div className="pt-2.5">
              <ScrollArea
                className="h-[180px]"
                scrollBar={<ScrollBar className="w-4 p-1" />}
              >
                <div className="grid grid-cols-2 gap-x-1">
                  <div className="grid gap-y-1">
                    {value?.results
                      .slice(0, getMiddleIndex(value.results))
                      .map((gif) => (
                        <button
                          key={gif.id}
                          onClick={() => handleGifClick(gif)}
                          className="focus-visible:outline-none"
                        >
                          <img
                            src={first(gif.media).gif.url}
                            className="object-contain"
                            alt={gif.content_description}
                          />
                        </button>
                      ))}
                  </div>
                  <div className="grid gap-y-1">
                    {value?.results
                      .slice(getMiddleIndex(value.results))
                      .map((gif) => (
                        <button
                          key={gif.id}
                          onClick={() => handleGifClick(gif)}
                          className="focus-visible:outline-none"
                        >
                          <img
                            src={first(gif.media).gif.url}
                            className="object-contain"
                            alt={gif.content_description}
                          />
                        </button>
                      ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
