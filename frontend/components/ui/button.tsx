import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-primary-foreground hover:bg-brand-primary-hover",
        outline:
          "border-border-default bg-surface text-text-primary hover:bg-surface-hover hover:text-text-primary",
        secondary:
          "bg-surface-muted text-text-primary hover:bg-surface-hover hover:text-text-primary",
        ghost:
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
        destructive:
          "border-danger bg-danger-soft text-danger-text hover:bg-danger-border/40 focus-visible:border-danger focus-visible:ring-danger/40",
        success:
          "bg-success text-primary-foreground hover:bg-success-soft",
        workflow:
          "bg-blue-primary text-white hover:bg-blue-hover",
        primary: "bg-brand-primary text-primary-foreground hover:bg-brand-primary-hover",
        accent: "bg-blue-primary text-white hover:bg-blue-hover",
        link: "text-blue-text underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5",
        xs: "h-6 gap-1 text-xs",
        sm: "h-7 gap-1 text-[0.8rem]",
        lg: "h-9 gap-1.5 px-2.5",
        icon: "size-8",
        "icon-xs":
          "size-6",
        "icon-sm":
          "size-7",
        "icon-lg": "size-9",
        small: "h-8 gap-1.5 px-3 rounded-md",
        large: "h-11 gap-1.5 px-5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
