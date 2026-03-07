import { cn } from "@/utils/functions"

export const Menu = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("w-5 h-5", className)}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        y="-0.0078125"
        width="20"
        height="1.63636"
        rx="0.818182"
        fill="currentColor"
      />
      <rect
        x="4.16602"
        y="9.08203"
        width="15.8333"
        height="1.63636"
        rx="0.818182"
        fill="currentColor"
      />
      <rect
        x="9.9043"
        y="18.1758"
        width="10"
        height="1.63636"
        rx="0.818182"
        fill="currentColor"
      />
    </svg>
  )
}
