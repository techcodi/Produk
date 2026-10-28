import {
  AudioLines,
  Contact,
  CreditCard,
  FileImage,
  FileOutput,
  FilePen,
  FileText,
  FileType,
  IdCard,
  Images,
  Eraser,
  Minimize2,
  PartyPopper,
  QrCode,
  ReceiptText,
  Scaling,
  Scissors,
  type LucideIcon,
} from "lucide-react";

export type ToolCategory = "pdf" | "image" | "audio" | "business" | "design" | "developer";
export type ToolStatus = "live" | "soon";

export interface ToolDefinition {
  /** URL segment; the tool lives at `/${slug}`. */
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  category: ToolCategory;
  status: ToolStatus;
  /** Search-result title, led by the phrase people actually search for. Falls back to `name`. */
  seoTitle?: string;
  keywords: string[];
  steps?: string[];
}

/**
 * Single source of truth for every tool on the platform. The home page,
 * navigation, sitemap and per-tool metadata are all derived from this list,
 * so shipping a new tool means: add an entry here + add its route.
 */
export const tools: ToolDefinition[] = [
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    tagline: "Merge photos into a single PDF",
    description:
      "Combine JPG, PNG, WebP and iPhone HEIC photos into one PDF. Reorder, rotate and choose page size — all on your device.",
    icon: Images,
    category: "pdf",
    status: "live",
    seoTitle: "JPG to PDF Converter — Photos to PDF, Free",
    keywords: ["jpg to pdf", "image to pdf", "photo to pdf", "png to pdf", "convert jpg to pdf", "pictures to pdf", "heic to pdf", "iphone photos to pdf", "combine images into one pdf", "jpg to pdf free"],
    steps: [
      "Add your photos — drag & drop, browse, or paste.",
      "Drag to reorder pages and rotate any that are sideways.",
      "Pick a page size and quality, then download your PDF.",
    ],
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    tagline: "Join multiple PDFs into one",
    description: "Combine several PDF files into one document. Drag to set the order — nothing is uploaded.",
    icon: FileOutput,
    category: "pdf",
    status: "live",
    seoTitle: "Merge PDF Files Online Free — Combine PDFs",
    keywords: ["merge pdf", "combine pdf", "merge pdf files", "join pdf", "combine pdf files into one", "pdf merger", "merge pdf free", "merge pdf online"],
    steps: [
      "Add two or more PDFs — drag & drop or browse.",
      "Drag the files into the order you want.",
      "Merge and download your single PDF.",
    ],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    tagline: "Pull out the pages you need",
    description: "Extract pages from a PDF, split it by ranges, or cut it into equal parts — right on your device.",
    icon: Scissors,
    category: "pdf",
    status: "live",
    seoTitle: "Split PDF Online Free — Extract Pages from a PDF",
    keywords: ["split pdf", "extract pages from pdf", "pdf splitter", "separate pdf pages", "split pdf online", "remove pages from pdf", "save one page of a pdf", "split pdf free"],
    steps: [
      "Open a PDF to see every page.",
      "Tap the pages to keep, or type ranges like 1-3, 5.",
      "Download one PDF, or a ZIP with each part.",
    ],
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    tagline: "Export every page as a picture",
    description: "Turn PDF pages into high-quality JPG or PNG images, at screen or print resolution.",
    icon: FileImage,
    category: "pdf",
    status: "live",
    seoTitle: "PDF to JPG Converter — PDF to Image, Free",
    keywords: ["pdf to jpg", "pdf to image", "pdf to png", "convert pdf to jpg", "pdf to picture", "save pdf as image", "pdf to jpg high quality", "pdf to jpg free"],
    steps: [
      "Open a PDF to preview its pages.",
      "Choose JPG or PNG, a resolution, and which pages to convert.",
      "Download one image, or a ZIP with all of them.",
    ],
  },
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    tagline: "Fix text, sign and add images",
    description: "Change existing text, add new text, sign, insert images and white out anything in a PDF — all on your device.",
    icon: FilePen,
    category: "pdf",
    status: "live",
    seoTitle: "Edit PDF Online Free — Edit Text & Sign PDFs",
    keywords: ["edit pdf", "pdf editor", "edit pdf online free", "edit pdf text", "sign pdf", "add signature to pdf", "add image to pdf", "add text to pdf", "fill pdf", "white out pdf"],
    steps: [
      "Open a PDF to see its pages.",
      "Edit text, add text, sign, insert images or white out mistakes.",
      "Save and download your edited PDF.",
    ],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    tagline: "Convert and edit .docx files",
    description: "Open a Word document, edit it right in your browser, then save it as a PDF or a new Word file.",
    icon: FileType,
    category: "pdf",
    status: "live",
    seoTitle: "Word to PDF Converter — DOCX to PDF, Free",
    keywords: ["word to pdf", "docx to pdf", "convert word to pdf", "doc to pdf", "word to pdf free", "edit word document online", "docx editor online", "word to pdf without microsoft word"],
    steps: [
      "Open a Word (.docx) file.",
      "Edit the text, headings, lists, tables and images.",
      "Download it as a PDF or as a Word document.",
    ],
  },
  {
    slug: "text-to-pdf",
    name: "Text to PDF",
    tagline: "Write or paste, then save as PDF",
    description: "Type or paste text, format it with headings, lists, tables and images, and download a clean PDF or Word file.",
    icon: FileText,
    category: "pdf",
    status: "live",
    seoTitle: "Text to PDF Converter — Create a PDF Online, Free",
    keywords: ["text to pdf", "txt to pdf", "convert text to pdf", "create pdf online", "make a pdf", "write pdf online", "notes to pdf", "text to word document"],
    steps: [
      "Type, paste, or open a .txt file.",
      "Format it with headings, lists, tables and images.",
      "Pick a page size and font, then download a PDF or Word file.",
    ],
  },
  {
    slug: "compress-image",
    name: "Compress Image",
    tagline: "Shrink photos without visible loss",
    description: "Reduce JPG, PNG, WebP and HEIC file sizes for faster uploads and sharing — compressed on your device.",
    icon: Minimize2,
    category: "image",
    status: "live",
    seoTitle: "Compress Image Online — Reduce JPG & PNG Size, Free",
    keywords: ["compress image", "compress jpg", "reduce image size", "compress png", "image compressor", "reduce photo size", "compress image to kb", "shrink image file size", "compress heic"],
    steps: [
      "Add your photos — drag & drop, browse, or paste.",
      "Pick a compression level and output format.",
      "Compress and download — see exactly how much you saved.",
    ],
  },
  {
    slug: "resize-image",
    name: "Resize Image",
    tagline: "Exact dimensions in seconds",
    description: "Resize photos by percentage or to exact pixel dimensions, one at a time or in a batch.",
    icon: Scaling,
    category: "image",
    status: "live",
    seoTitle: "Resize Image Online Free — Change Photo Size in Pixels",
    keywords: ["resize image", "image resizer", "resize photo", "change image size", "resize image in pixels", "resize jpg", "resize png", "bulk resize images", "make image smaller"],
    steps: [
      "Add your photos — drag & drop, browse, or paste.",
      "Scale by percentage, or enter an exact width and height.",
      "Resize and download one image or a ZIP of all of them.",
    ],
  },
  {
    slug: "remove-background",
    name: "Remove Background",
    tagline: "Cut out any photo in seconds",
    description: "Remove the background from a photo with on-device AI, then download a transparent PNG or put it on a new colour.",
    icon: Eraser,
    category: "image",
    status: "live",
    seoTitle: "Remove Background from Image — Free, No Sign-up",
    keywords: ["remove background", "background remover", "remove background from image", "remove bg", "transparent background", "make background transparent", "white background photo", "remove background from photo free", "cut out image"],
    steps: [
      "Add a photo — drag & drop, browse, or paste.",
      "The AI cuts out the subject on your device. Try High quality for hair and fur.",
      "Keep it transparent or pick a new background colour, then download.",
    ],
  },
  {
    slug: "passport-photo",
    name: "Passport Photo Maker",
    tagline: "ID and visa photos at the right size",
    description:
      "Make passport, visa and ID photos from any selfie: background removed, sized to 35×45 mm, 2×2 in and more, with print-ready sheets.",
    icon: IdCard,
    category: "image",
    status: "live",
    seoTitle: "Passport Photo Maker Online Free — 35×45 mm & 2×2 in",
    keywords: ["passport photo maker", "passport photo online", "passport size photo", "35x45 photo", "2x2 photo", "us passport photo", "uk passport photo", "canada passport photo", "visa photo", "schengen visa photo", "id photo maker", "passport photo white background", "passport photo print sheet"],
    steps: [
      "Take or upload a photo against a plain wall, facing the camera.",
      "Pick your document size and background, then line the face up with the guides.",
      "Download a single photo, a 4×6 print sheet, or an A4 sheet to print at home.",
    ],
  },
  {
    slug: "text-to-audio",
    name: "Text to Audio",
    tagline: "Turn any text into natural speech",
    description:
      "Listen to text instantly, or save it as an audio file with natural voices in 6 languages. Your text never leaves your device.",
    icon: AudioLines,
    category: "audio",
    status: "live",
    seoTitle: "Text to Speech Online Free — Natural AI Voices",
    keywords: ["text to speech", "text to audio", "tts", "text to voice", "ai voice generator", "read text aloud", "convert text to audio file", "text to wav", "text to speech free", "word document to audio"],
    steps: [
      "Type or paste your text, or open a .txt or Word file.",
      "Pick a voice and speed, or tap Listen to hear it right away.",
      "Create the audio file, then play, download or share it.",
    ],
  },
  {
    slug: "invoice-generator",
    name: "Invoice Generator",
    tagline: "Professional invoices in minutes",
    description:
      "Create invoices, quotes and receipts from five templates. Add your logo and colours, then download a PDF or share it — all on your device.",
    icon: ReceiptText,
    category: "business",
    status: "live",
    seoTitle: "Free Invoice Generator — Create an Invoice PDF Online",
    keywords: ["invoice generator", "free invoice generator", "invoice maker", "invoice template", "create invoice pdf", "quotation maker", "receipt generator", "invoice generator nigeria", "naira invoice", "invoice with logo"],
    steps: [
      "Fill in your business, your client and the items or services.",
      "Pick a template, then make it yours with a logo and colour.",
      "Download the PDF or share it straight to WhatsApp, email and more.",
    ],
  },
  {
    slug: "qr-code-generator",
    name: "QR Code Generator",
    tagline: "Any text, link or Wi-Fi as a QR code",
    description: "Turn any text, link or Wi-Fi login into a QR code. Pick your colours and download it as PNG or SVG — free, no sign-up, never expires.",
    icon: QrCode,
    category: "business",
    status: "live",
    seoTitle: "Free QR Code Generator — No Expiry, No Sign-up",
    keywords: ["qr code generator", "free qr code generator", "create qr code", "qr code maker", "wifi qr code", "link to qr code", "qr code that never expires", "qr code png", "qr code svg"],
    steps: [
      "Type any text or link, or enter your Wi-Fi details.",
      "Choose colours and how sturdy the code should be.",
      "Download it as a PNG image or an SVG for print.",
    ],
  },
  {
    slug: "business-card-maker",
    name: "Business Card Maker",
    tagline: "Print-ready business cards in minutes",
    description:
      "Design business cards from templates with your logo, colours and a scannable QR code. Download a print-ready PDF or PNG.",
    icon: Contact,
    category: "business",
    status: "live",
    seoTitle: "Business Card Maker Online Free — Print-ready PDF",
    keywords: ["business card maker", "business card design", "free business card maker", "visiting card maker", "business card template", "business card with qr code", "print business cards at home"],
    steps: [
      "Enter your name, job title and contact details.",
      "Pick a template, then add your logo, colours and a QR code.",
      "Download a print-ready PDF, a sheet for home printing, or a PNG.",
    ],
  },
  {
    slug: "card-maker",
    name: "Card Maker",
    tagline: "Greeting cards, invitations and passes",
    description:
      "Make birthday and thank-you cards, invitations, event passes and membership cards. Add a photo, personalise every word, then download or share.",
    icon: PartyPopper,
    category: "design",
    status: "live",
    seoTitle: "Free Card Maker — Birthday Cards & Invitations Online",
    keywords: ["card maker", "greeting card maker", "birthday card maker", "invitation maker", "wedding invitation maker", "thank you card maker", "event pass maker", "membership card maker", "online card maker"],
    steps: [
      "Choose a card type and a design.",
      "Write your message and add a photo or logo.",
      "Download it as an image or PDF, or share it straight from your phone.",
    ],
  },
  {
    slug: "test-card-numbers",
    name: "Test Card Numbers",
    tagline: "Official sandbox cards for payment testing",
    description:
      "Every official test card from Stripe, Paystack and Flutterwave in one place, by brand and scenario, plus a card number checker that runs on your device.",
    icon: CreditCard,
    category: "developer",
    status: "live",
    seoTitle: "Test Card Numbers — Stripe, Paystack & Flutterwave",
    keywords: ["test card numbers", "stripe test cards", "paystack test card", "flutterwave test card", "test credit card numbers", "sandbox card numbers", "luhn checker", "card number validator"],
    steps: [
      "Pick your payment provider and the scenario you want to test.",
      "Copy the card number, expiry, CVC and any PIN or OTP shown.",
      "Paste a number into the checker to see its brand and whether its format is valid.",
    ],
  },
];

export function getTool(slug: string): ToolDefinition {
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) throw new Error(`Unknown tool: ${slug}`);
  return tool;
}

export const liveTools = tools.filter((t) => t.status === "live");

export const categoryLabels: Record<ToolCategory, string> = {
  pdf: "PDF tools",
  image: "Image tools",
  audio: "Audio tools",
  business: "Business tools",
  design: "Design tools",
  developer: "Developer tools",
};

export const toolHref = (tool: ToolDefinition) => `/${tool.slug}`;
