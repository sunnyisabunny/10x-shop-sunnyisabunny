/**
 * NOTE: the centred card shared by Login, Sign Up and password reset.
 * Why it exists: the three pages look the same and differ only in their fields. It uses `children`, so each page
 * passes its own form and this component doesn't need to know what is inside.
 * Connects to: `LoginPage`, `SignUpPage` and `ResetPasswordPage`.
 */
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  children: ReactNode;
}

export default function AuthCard({ title, children }: AuthCardProps) {
  return (
    <section className="flex justify-center p-3.5 tablet:p-6">
      <div className="grid w-full max-w-[420px] gap-4 rounded-[10px] bg-steel-raised p-5 shadow-[inset_0_0_0_1px_var(--edge)]">
        <h1 className="text-3xl leading-tight font-bold">{title}</h1>
        {children}
      </div>
    </section>
  );
}

/** A quiet link under a form. `min-h-11` keeps it at the spec's 44px tap size. */
export const authLinkStyles = "inline-flex min-h-11 items-center font-semibold text-ink-soft hover:text-ink hover:underline";
