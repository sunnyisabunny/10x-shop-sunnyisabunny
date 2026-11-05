/**
 * NOTE: the shop's button styles and a typed <button>.
 * Why it exists: the same look is needed on real buttons and on links styled as buttons, so the classes
 * live in one place and every button stays at least 44px tall, as the spec requires.
 * Connects to: nearly every page. Links use `buttonStyles` directly, because a link can't be a <button>.
 */
import type { ButtonHTMLAttributes } from "react";

/**
 * `primary` is pink, which means "act". It sits on a hard shadow and drops 3px when pressed, like a
 * physical machine button. `quiet` is for everything that shouldn't compete with it.
 */
export const buttonStyles = {
  primary:
    "inline-flex min-h-11 items-center justify-center rounded-md bg-pink px-[18px] font-bold text-on-pink no-underline shadow-[0_3px_0_var(--color-pink-deep),inset_0_1px_0_rgb(255_255_255/0.35)] transition-[translate,box-shadow,filter] duration-100 hover:brightness-110 active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-steel-raised disabled:text-ink-soft disabled:shadow-[inset_0_0_0_1px_var(--edge)] disabled:brightness-100",
  quiet:
    "inline-flex min-h-11 items-center justify-center rounded-md bg-steel-raised px-3.5 font-semibold text-ink no-underline shadow-[inset_0_0_0_1px_var(--edge-bright)] transition-colors duration-150 hover:bg-edge disabled:cursor-not-allowed disabled:text-ink-soft",
} as const;

/**
 * `keyof typeof` builds the union "primary" | "quiet" from the object above, so adding a style to the
 * object automatically makes it a valid prop value, and a typo is a compile error.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonStyles;
}

/**
 * A <button> with our styling. `...rest` passes on everything else (onClick, disabled, type).
 * `type` defaults to "button" because inside a form a plain <button> would submit it by accident.
 */
export default function Button({ variant = "primary", className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonStyles[variant]} ${className}`} {...rest} />;
}
