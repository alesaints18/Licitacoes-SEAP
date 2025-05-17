import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const notificationBadgeVariants = cva(
  "absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        success: "bg-green-500 text-white",
        warning: "bg-yellow-500 text-white",
      },
      size: {
        default: "h-4 w-4 text-[10px]",
        sm: "h-3 w-3 text-[8px]",
        lg: "h-5 w-5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface NotificationBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof notificationBadgeVariants> {
  count?: number;
  maxCount?: number;
}

function NotificationBadge({ 
  className, 
  variant, 
  size,
  count = 0,
  maxCount = 99,
  ...props 
}: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  return (
    <div 
      className={cn(notificationBadgeVariants({ variant, size }), className)} 
      {...props}
    >
      {displayCount}
    </div>
  )
}

export { NotificationBadge, notificationBadgeVariants }