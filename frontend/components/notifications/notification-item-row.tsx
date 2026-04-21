"use client"

import { BellRinging03, ChevronDown } from "@blend-metrics/icons"
import { Switch } from "@/components/ui"
import { cn } from "@/utils/functions"
import type {
  CatalogItem,
  ChannelKey,
  GlobalChannelPrefs,
  NotificationItemPref,
} from "@/service/http/notifications"
import { channelIcons, channelLabels, channelOrder, summarizeChannels } from "./shared"

interface Props {
  notification: CatalogItem
  state: NotificationItemPref
  globalChannels: GlobalChannelPrefs
  categoryEnabled: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleEnabled: () => void
  onToggleChannel: (channel: ChannelKey) => void
}

export default function NotificationItemRow({
  notification,
  state,
  globalChannels,
  categoryEnabled,
  isExpanded,
  onToggleExpand,
  onToggleEnabled,
  onToggleChannel,
}: Props) {
  return (
    <div className={cn("rounded-lg overflow-hidden", isExpanded && "bg-gray-50")}>
      <button
        onClick={onToggleExpand}
        className={cn(
          "flex items-center gap-3 w-full text-left px-4 h-16 rounded-lg transition-colors",
          isExpanded ? "bg-gray-100" : "bg-gray-50 hover:bg-gray-100",
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-blue-400">
            {notification.title}
          </p>
          <p className="text-xs text-gray-400">
            {summarizeChannels(state.channels)}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-5 text-gray-400 transition-transform shrink-0",
            isExpanded ? "rotate-180" : "",
          )}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pt-4 pb-4 space-y-5">
          <p className="text-sm text-gray-500">{notification.description}</p>

          <div className="flex items-center gap-3 py-2">
            <BellRinging03 className="size-5 text-gray-500" />
            <span className="text-sm font-semibold text-dark-blue-400 flex-1">
              Allow notifications
            </span>
            <Switch
              checked={state.enabled}
              onCheckedChange={onToggleEnabled}
              disabled={!categoryEnabled}
              size="sm"
            />
          </div>

          {state.enabled && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-dark-blue-400">
                Where do you get these notifications
              </p>
              {channelOrder.map((key) => {
                const ChannelIcon = channelIcons[key]
                const globalOff = !globalChannels[key].enabled
                return (
                  <div key={key} className="flex items-center gap-3 py-2">
                    <div
                      className={cn(
                        "flex items-center gap-2 flex-1",
                        globalOff && "opacity-50",
                      )}
                    >
                      <ChannelIcon className="size-5 text-gray-500" />
                      <span className="text-sm font-semibold text-dark-blue-400">
                        {channelLabels[key]}
                      </span>
                    </div>
                    <Switch
                      checked={state.channels[key] && !globalOff}
                      onCheckedChange={() => onToggleChannel(key)}
                      disabled={globalOff}
                      size="sm"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
