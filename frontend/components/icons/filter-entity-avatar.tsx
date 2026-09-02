import { cn } from "@/utils/functions"

export function FilterEntityAvatar({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8 shrink-0", className)}
      aria-hidden
    >
      <circle cx="16" cy="16" r="15.5" fill="white" stroke="#D0D5DD" />
      <g transform="translate(5.25 5.5)">
        <path
          d="m20.2 1.6-6.4 18.4-3.7-8.2L2 8.1Z"
          fill="white"
          stroke="#306CFE"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M20.2 1.6 10.1 11.8"
          stroke="#306CFE"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M10.1 11.8 2 8.1 6.4 11.8Z" fill="#2459DB" />
      </g>
    </svg>
  )
}
