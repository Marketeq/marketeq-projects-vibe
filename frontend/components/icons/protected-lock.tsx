import { cn } from "@/utils/functions"

export const ProtectedLock = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("h-[50px] w-[50px]", className)}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M37.5 29.1665L43.75 31.2498C43.75 39.5832 42.4583 41.8748 37.5 43.7498C32.5417 41.8748 31.25 39.5832 31.25 31.2498L37.5 29.1665Z"
        stroke="#22376B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M37.5 20.8332V18.7498C37.5 18.1973 37.2805 17.6674 36.8898 17.2767C36.4991 16.886 35.9692 16.6665 35.4167 16.6665H29.1667L25 20.8332H8.33333C7.7808 20.8332 7.25089 21.0527 6.86019 21.4434C6.46949 21.8341 6.25 22.364 6.25 22.9165V37.4998C6.25 38.0524 6.46949 38.5823 6.86019 38.973C7.25089 39.3637 7.7808 39.5832 8.33333 39.5832H22.9167"
        stroke="#306CFE"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29.1666 16.6667L25 20.8333H10.4166V8.33333C10.4166 7.7808 10.6361 7.25089 11.0268 6.86019C11.4175 6.46949 11.9474 6.25 12.5 6.25H31.25C31.8025 6.25 32.3324 6.46949 32.7231 6.86019C33.1138 7.25089 33.3333 7.7808 33.3333 8.33333V16.6667H29.1666Z"
        stroke="#306CFE"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
