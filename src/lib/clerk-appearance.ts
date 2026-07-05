/**
 * Shared dark-mode appearance for Clerk's hosted <SignIn /> / <SignUp /> components.
 *
 * Tailwind class tokens mirror the BaddieLegal design system (DESIGN.md): pink
 * primary on near-black surfaces, hairline borders, muted secondary text. The
 * focus treatment on inputs follows the DESIGN.md focus spec — a visible pink
 * ring on keyboard focus, not a border-only change (a11y P0, WCAG 2.1 AA).
 *
 * The object literal is intentionally untyped here; Clerk's `appearance` prop
 * validates the shape at each call site (`<SignIn appearance={...} />`), so any
 * typo in a key or unsupported token surfaces there.
 */
export const darkAppearance = {
  variables: {
    colorBackground: "#111111",
    colorInputBackground: "#000000",
    colorInputText: "#ffffff",
    colorPrimary: "#ff69b4",
    colorPrimaryForeground: "#000000",
    colorText: "#ffffff",
    colorTextSecondary: "#888888",
    colorNeutral: "#222222",
    colorDanger: "#ff4466",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans), sans-serif",
  },
  elements: {
    formButtonPrimary:
      "bg-primary text-primary-foreground hover:bg-primary-hover font-semibold",
    card: "bg-card border border-border shadow-xl",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "border border-border bg-background text-foreground hover:bg-accent",
    socialButtonsBlockButtonText: "text-foreground",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldLabel: "text-muted-foreground",
    formFieldInput:
      "bg-background border border-input text-foreground focus:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
    footerActionLink: "text-primary hover:text-primary-hover",
  },
};
