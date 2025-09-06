
import React from "react";
import clsx from "clsx"; // or your own cn function

const buttonVariants = {
  default:
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-black text-white hover:bg-neutral-800",
  outline:
    "inline-flex items-center justify-center rounded-md border border-input bg-white text-black shadow-sm hover:bg-neutral-100",
  ghost:
    "inline-flex items-center justify-center rounded-md text-black hover:bg-neutral-100",
};

export const Button = React.forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonVariants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";


