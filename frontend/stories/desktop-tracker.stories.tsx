import { Meta, StoryObj } from "@storybook/react"
import {
  AccountMenu,
  ActiveTrackingBar,
  ContractEntry,
  DateTimeBar,
  DaySummary,
  NewTaskForm,
  TaskSearch,
  TimeTrackerApp,
  TimerControls,
  TimerDisplay,
  TrackerHeader,
} from "@/components/desktop-tracker"

const meta: Meta = {
  title: "Desktop Time Tracker",
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light-gray",
      values: [{ name: "light-gray", value: "#F2F4F7" }],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 8 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta

// ─── Full App: Idle State ────────────────────────────────────────────────────

export const AppIdle: StoryObj = {
  render: () => (
    <TimeTrackerApp
      date="July 22nd, 2025"
      utcTime="UTC 12:23 PM"
      days={[
        {
          label: "Today",
          hoursTracked: "5",
          totalHours: "8",
          earned: "$150",
          contracts: [
            {
              id: "1",
              name: "Detecting Edges Usi...",
              clientHandle: "bitcoinmasters321",
              totalHours: "0 hrs",
              tasks: [],
            },
            {
              id: "2",
              name: "Detecting Edges Usi...",
              clientHandle: "bitcoinmasters321",
              totalHours: "0 hrs",
              tasks: [],
            },
          ],
        },
        {
          label: "Yesterday",
          hoursTracked: "5",
          totalHours: "8",
          earned: "$150",
          contracts: [
            {
              id: "3",
              name: "Detecting Edges Usi...",
              clientHandle: "bitcoinmasters321",
              totalHours: "0 hrs",
              tasks: [],
            },
          ],
        },
      ]}
    />
  ),
}

// ─── Full App: Active Tracking ───────────────────────────────────────────────

export const AppTracking: StoryObj = {
  render: () => (
    <TimeTrackerApp
      isRunning
      hours={0}
      minutes={26}
      seconds={3}
      amountEarned="$18.65"
      activeTask={{
        taskName: "Low-fidelity wireframing",
        contractName: "Detecting Edges Usi...",
      }}
      utcTime="UTC 12:23 PM"
      days={[]}
    />
  ),
}

// ─── Full App: With Tasks Expanded ───────────────────────────────────────────

export const AppWithTasks: StoryObj = {
  render: () => {
    const tasks = [
      {
        id: "t1",
        name: "Card sorting features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 60,
      },
      {
        id: "t2",
        name: "Low-fidelity wireframing",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t3",
        name: "Fine-tuning wireframes",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t4",
        name: "Competitive analysis of features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 80,
      },
      {
        id: "t5",
        name: "Auditing 10 screenshots of each f...",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 40,
      },
    ]

    return (
      <div className="w-[323px] h-[528px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col">
        <TrackerHeader />
        <DateTimeBar date="July 22nd, 2025" utcTime="UTC 12:23 PM" />
        <div className="px-4 pt-3 pb-2">
          <TaskSearch />
        </div>
        <div className="py-3">
          <TimerControls />
        </div>
        <DaySummary
          label="Today"
          hoursTracked="5"
          totalHours="8"
          earned="$150"
        />
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <ContractEntry
            contractName="Detecting Edges Usi..."
            clientHandle="bitcoinmasters321"
            totalHours="0 hrs"
            isExpanded
            tasks={tasks}
          />
        </div>
        <div className="border-t border-gray-100 px-4 py-2.5">
          <button className="w-full text-center text-sm font-medium text-dark-blue-500">
            View All Tasks
          </button>
        </div>
      </div>
    )
  },
}

// ─── Full App: All Tasks View ────────────────────────────────────────────────

export const AllTasksView: StoryObj = {
  render: () => {
    const tasks = [
      {
        id: "t1",
        name: "Card sorting features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 60,
      },
      {
        id: "t2",
        name: "Low-fidelity wireframing",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t3",
        name: "Fine-tuning wireframes",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t4",
        name: "Competitive analysis of features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 80,
      },
      {
        id: "t5",
        name: "Auditing 10 screenshots of each feature",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 40,
      },
      {
        id: "t6",
        name: "Verify final wireframes with best-in-class screenshots",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t7",
        name: "Build high-fidelity wireframes",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
      {
        id: "t8",
        name: "Card sorting features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 60,
      },
      {
        id: "t9",
        name: "Card sorting features",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
        progress: 60,
      },
      {
        id: "t10",
        name: "Low-fidelity wireframing",
        timeRange: "10:32 am - 4:39 pm",
        duration: "01:00:00",
      },
    ]

    return (
      <div className="w-[323px] h-[528px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col">
        <TrackerHeader />
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <button className="text-gray-500">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15l-5-5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13.5 13.5L17 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              placeholder="Find a task..."
              className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-b border-gray-50">
          <span>Task Name</span>
          <span>Time Tracked</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-25"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-blue-500 truncate">
                  {task.name}
                </p>
                <p className="text-xs text-gray-400">{task.timeRange}</p>
              </div>
              {task.progress !== undefined && (
                <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              )}
              <span className="text-sm font-medium text-dark-blue-500 tabular-nums shrink-0">
                {task.duration}
              </span>
              <button className="text-gray-400 hover:text-primary-500 shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path d="M6.5 5l4 3-4 3V5z" fill="currentColor" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  },
}

// ─── New Task Form ───────────────────────────────────────────────────────────

export const NewTask: StoryObj = {
  render: () => (
    <div className="w-[323px] h-[528px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden flex flex-col">
      <TrackerHeader />
      <NewTaskForm />
    </div>
  ),
}

// ─── Account Menu ────────────────────────────────────────────────────────────

export const AccountMenuStory: StoryObj = {
  name: "Account Menu",
  render: () => (
    <AccountMenu
      name="Christopher Torres"
      email="chris@marketeqdigital.com"
      avatarSrc="/images/avatar.jpg"
    />
  ),
}

// ─── Compact Timer (inline variant) ──────────────────────────────────────────

export const CompactTimerIdle: StoryObj = {
  render: () => (
    <div className="w-[323px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
      <DateTimeBar date="July 22nd, 2025" utcTime="UTC 12:23 PM" />
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0">
            <div className="h-full w-full bg-gray-200" />
          </div>
          <span className="text-sm text-dark-blue-500 truncate flex-1">
            Low-fidelity wireframing, Detecti...
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 pb-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white shadow">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 4.5v11a.5.5 0 00.77.42l8.5-5.5a.5.5 0 000-.84l-8.5-5.5A.5.5 0 007 4.5z"
              fill="currentColor"
            />
          </svg>
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="8"
              cy="8"
              r="5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M8 5v3l2 2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="3.5"
              y="3.5"
              width="9"
              height="9"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
        <div className="flex-1" />
        <TimerDisplay hours={0} minutes={0} seconds={0} size="sm" />
      </div>
    </div>
  ),
}

export const CompactTimerActive: StoryObj = {
  render: () => (
    <div className="w-[323px] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
      <ActiveTrackingBar
        taskName="Low-fidelity wireframing"
        contractName="Detecting Edges Usi..."
        utcTime="UTC 12:23 PM"
      />
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-blue-500 text-white shadow">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect
              x="5.5"
              y="4"
              width="3"
              height="12"
              rx="0.5"
              fill="currentColor"
            />
            <rect
              x="11.5"
              y="4"
              width="3"
              height="12"
              rx="0.5"
              fill="currentColor"
            />
          </svg>
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="8"
              cy="8"
              r="5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M8 5v3l2 2"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="3.5"
              y="3.5"
              width="9"
              height="9"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
        <div className="flex-1" />
        <TimerDisplay hours={0} minutes={26} seconds={3} size="sm" />
      </div>
    </div>
  ),
}

// ─── Task Search States ──────────────────────────────────────────────────────

export const SearchStates: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4 w-[323px]">
      <TaskSearch placeholder="Search by task or contract name" />
      <TaskSearch
        value="Wirefra"
        results={[
          {
            id: "1",
            taskName: "Wireframing",
            contractName: "Referrizer Web Application",
            clientHandle: "referrizerllc",
          },
        ]}
      />
      <TaskSearch
        selectedResult={{
          id: "1",
          taskName: "Wireframing",
          contractName: "Crypto App Mobile",
          clientHandle: "bitcoinmasters321",
        }}
      />
    </div>
  ),
}

// ─── Individual Components ───────────────────────────────────────────────────

export const TimerDisplayLarge: StoryObj = {
  render: () => <TimerDisplay hours={0} minutes={26} seconds={3} size="lg" />,
}

export const TimerDisplaySmall: StoryObj = {
  render: () => <TimerDisplay hours={0} minutes={0} seconds={0} size="sm" />,
}

export const TimerControlsIdle: StoryObj = {
  render: () => <TimerControls />,
}

export const TimerControlsActive: StoryObj = {
  render: () => <TimerControls isRunning />,
}

export const ContractEntryCollapsed: StoryObj = {
  render: () => (
    <div className="w-[307px]">
      <ContractEntry
        contractName="Detecting Edges Usi..."
        clientHandle="bitcoinmasters321"
        totalHours="0 hrs"
      />
    </div>
  ),
}

export const ContractEntryEmpty: StoryObj = {
  render: () => (
    <div className="w-[307px]">
      <ContractEntry
        contractName="Detecting Edges Usi..."
        clientHandle="bitcoinmasters321"
        totalHours="0 hrs"
        isExpanded
        tasks={[]}
      />
    </div>
  ),
}

export const ContractEntryWithTasks: StoryObj = {
  render: () => (
    <div className="w-[307px]">
      <ContractEntry
        contractName="Detecting Edges Usi..."
        clientHandle="bitcoinmasters321"
        totalHours="0 hrs"
        isExpanded
        tasks={[
          {
            id: "1",
            name: "Card sorting features",
            timeRange: "10:32 am - 4:39 pm",
            duration: "01:00:00",
            progress: 60,
          },
          {
            id: "2",
            name: "Low-fidelity wireframing",
            timeRange: "10:32 am - 4:39 pm",
            duration: "01:00:00",
          },
          {
            id: "3",
            name: "Fine-tuning wireframes",
            timeRange: "10:32 am - 4:39 pm",
            duration: "01:00:00",
          },
        ]}
      />
    </div>
  ),
}
