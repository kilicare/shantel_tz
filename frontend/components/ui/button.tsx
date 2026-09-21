import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-body font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-blue-primary focus-visible:ring-2 focus-visible:ring-blue-primary/25 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/25 dark:aria-invalid:border-danger dark:aria-invalid:ring-danger/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
          "border-danger bg-danger-soft text-danger-text hover:bg-danger hover:bg-danger-border/40 focus-visible:border-danger focus-visible:ring-danger/25",
        success:
          "bg-success text-primary-foreground hover:bg-success-hover",
        workflow:
          "bg-blue-primary text-white hover:bg-blue-hover",
        primary: "bg-brand-primary text-primary-foreground hover:bg-brand-primary-hover",
        accent: "bg-blue-primary text-white hover:bg-blue-hover",
        link: "text-blue-text underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-4 rounded-md",
        small:
          "h-8 gap-1.5 px-3 rounded-md text-small",
        sm:
          "h-8 gap-1.5 px-3 rounded-md text-small",
        large:
          "h-11 gap-1.5 px-5 rounded-md",
        icon: "size-10 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-11 rounded-md",
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
