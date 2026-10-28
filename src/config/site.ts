export const siteConfig = {
  name: "ProDuk",
  tagline: "Everyday file tools that run in your browser",
  /** Home page search title: the broad terms the tools have in common. */
  seoTitle: "Free Online PDF & Image Tools — No Upload, No Sign-up",
  description:
    "Free online tools to merge, split, edit and convert PDFs, compress and resize images, remove backgrounds, make passport photos, invoices and QR codes. Everything runs on your device — no uploads, no sign-up.",
  keywords: [
    "free online tools",
    "pdf tools",
    "image tools",
    "free pdf editor",
    "jpg to pdf",
    "merge pdf",
    "compress image",
    "remove background",
    "passport photo maker",
    "invoice generator",
    "qr code generator",
    "no upload",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
