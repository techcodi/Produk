import type { Provider, TestCard } from "./types";

/** When the lists below were last checked against each provider's documentation. */
export const CHECKED_ON = "28 October 2026";

export const PROVIDERS: Provider[] = [
  {
    id: "stripe",
    name: "Stripe",
    docsUrl: "https://docs.stripe.com/testing",
    defaults: { expiry: "Any future date, e.g. 12/34", cvc: "Any 3 digits (Amex: any 4)" },
    notes: ["Use test-mode API keys. These numbers are rejected in live mode."],
  },
  {
    id: "flutterwave",
    name: "Flutterwave",
    docsUrl: "https://developer.flutterwave.com/docs/testing",
    defaults: { expiry: "As listed", cvc: "As listed" },
    notes: [
      "Use test-mode keys (they start with FLWSECK_TEST).",
      "Any OTP passes in test mode. In the payment modal, OTP 5548 simulates a wrong OTP and 6648 insufficient funds.",
    ],
  },
  {
    id: "paystack",
    name: "Paystack",
    docsUrl: "https://paystack.com/docs/payments/test-payments/",
    defaults: { expiry: "Any future date", cvc: "As listed" },
    notes: [
      "Use test-mode keys (sk_test_…).",
      "Paystack’s PIN and OTP values have differed between versions of its docs, so they aren’t repeated here. Check the linked page when prompted.",
    ],
  },
];

const stripe = (brand: string, number: string, scenario: string, outcome: TestCard["outcome"] = "success"): TestCard => ({
  provider: "stripe",
  brand,
  number,
  scenario,
  outcome,
});

/** Verbatim from https://docs.stripe.com/testing. */
const STRIPE: TestCard[] = [
  stripe("Visa", "4242424242424242", "Successful payment"),
  stripe("Visa (debit)", "4000056655665556", "Successful payment"),
  stripe("Mastercard", "5555555555554444", "Successful payment"),
  stripe("Mastercard (2-series)", "2223003122003222", "Successful payment"),
  stripe("Mastercard (debit)", "5200828282828210", "Successful payment"),
  stripe("Mastercard (prepaid)", "5105105105105100", "Successful payment"),
  stripe("American Express", "378282246310005", "Successful payment"),
  stripe("American Express", "371449635398431", "Successful payment"),
  stripe("Discover", "6011111111111117", "Successful payment"),
  stripe("Discover", "6011000990139424", "Successful payment"),
  stripe("Discover (debit)", "6011981111111113", "Successful payment"),
  stripe("Diners Club", "3056930009020004", "Successful payment"),
  stripe("Diners Club (14-digit)", "36227206271667", "Successful payment"),
  stripe("BCcard and DinaCard", "6555900000604105", "Successful payment"),
  stripe("JCB", "3566002020360505", "Successful payment"),
  stripe("UnionPay", "6200000000000005", "Successful payment"),
  stripe("UnionPay (debit)", "6200000000000047", "Successful payment"),
  stripe("UnionPay (19-digit)", "6205500000000000004", "Successful payment"),
  stripe("Cartes Bancaires / Visa", "4000002500001001", "Successful payment (co-branded)"),
  stripe("Cartes Bancaires / Mastercard", "5555552500001001", "Successful payment (co-branded)"),
  stripe("eftpos Australia / Visa", "4000050360000001", "Successful payment (co-branded)"),
  stripe("eftpos Australia / Mastercard", "5555050360000080", "Successful payment (co-branded)"),
  stripe("Visa", "4000008260000000", "Successful payment · United Kingdom card"),
  stripe("Visa (debit)", "4000058260000005", "Successful payment · United Kingdom card"),
  stripe("Mastercard", "5555558265554449", "Successful payment · United Kingdom card"),
  stripe("Visa", "4000000760000002", "Successful payment · Brazil card"),
  stripe("Visa", "4000003560000008", "Successful payment · India card"),
  stripe("Visa", "4000000000000002", "Generic decline (card_declined)", "declined"),
  stripe("Visa", "4000000000009995", "Insufficient funds", "declined"),
  stripe("Visa", "4000000000009987", "Lost card", "declined"),
  stripe("Visa", "4000000000009979", "Stolen card", "declined"),
  stripe("Visa", "4000000000000069", "Expired card (expired_card)", "declined"),
  stripe("Visa", "4000000000000127", "Incorrect CVC (incorrect_cvc)", "declined"),
  stripe("Visa", "4000000000000119", "Processing error (processing_error)", "declined"),
  stripe("Visa", "4242424242424241", "Incorrect number (incorrect_number)", "declined"),
  stripe("Visa", "4000000000006975", "Exceeds velocity limit (card_velocity_exceeded)", "declined"),
  stripe("Visa", "4000000000000341", "Attaching to a customer succeeds, but charges fail", "declined"),
  stripe("Visa", "4100000000000019", "Always blocked by Radar as fraud", "declined"),
  stripe("Visa", "4000000000003220", "3D Secure required, succeeds", "authentication"),
  stripe("Visa", "4000008400000027", "3D Secure required, succeeds (US-issued)", "authentication"),
  stripe("Visa", "4000008400001629", "3D Secure required, declined after authentication", "authentication"),
  stripe("Visa", "4000000000003055", "3D Secure supported, succeeds", "authentication"),
  stripe("Visa", "4000000032200000", "3D Secure required, frictionless flow, succeeds", "authentication"),
  stripe("Visa", "4000002500003155", "Authenticate unless set up for future payments", "authentication"),
  stripe("Visa", "4000002760003184", "Always authenticate", "authentication"),
  stripe("Visa", "4000008260003178", "Requires authentication, then declines (insufficient_funds)", "authentication"),
  stripe("Visa", "4000582600000045", "3D Secure 2 mobile challenge: one-time passcode", "authentication"),
  stripe("Visa", "4000582600000094", "3D Secure 2 mobile challenge: out of band", "authentication"),
];

/** Verbatim from https://developer.flutterwave.com/docs/testing (page updated 19 Oct 2026). */
const FLUTTERWAVE: TestCard[] = [
  { provider: "flutterwave", brand: "Mastercard", number: "5531886652142950", scenario: "PIN authentication", outcome: "success", expiry: "09/32", cvc: "564", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Mastercard", number: "5438898014560229", scenario: "3D Secure authentication", outcome: "success", expiry: "10/31", cvc: "564", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Visa", number: "4187427415564246", scenario: "3D Secure authentication", outcome: "success", expiry: "09/32", cvc: "828", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Afrigo", number: "5640003941605320", scenario: "3D Secure authentication", outcome: "success", expiry: "05/31", cvc: "044" },
  { provider: "flutterwave", brand: "Verve", number: "5061460410120223210", scenario: "PIN authentication", outcome: "success", expiry: "10/31", cvc: "780", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Verve", number: "5061460166976054667", scenario: "No authentication (NoAuth)", outcome: "success", expiry: "10/29", cvc: "564", pin: "3310" },
  { provider: "flutterwave", brand: "Visa", number: "4556052704172643", scenario: "Address verification (AVS)", outcome: "success", expiry: "09/32", cvc: "899", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Mastercard", number: "5377283645077450", scenario: "Pre-authorisation", outcome: "success", expiry: "09/31", cvc: "789", pin: "3310" },
  { provider: "flutterwave", brand: "Mastercard", number: "5143010522339965", scenario: "Do not honour", outcome: "declined", expiry: "08/32", cvc: "276", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Mastercard", number: "5590131743294314", scenario: "Card fraudulent", outcome: "declined", expiry: "11/32", cvc: "887", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Mastercard", number: "5258585922666506", scenario: "Insufficient funds", outcome: "declined", expiry: "09/31", cvc: "883", pin: "3310", otp: "12345" },
  { provider: "flutterwave", brand: "Afrigo", number: "5640007065275380", scenario: "Insufficient funds", outcome: "declined", expiry: "05/31", cvc: "044" },
  { provider: "flutterwave", brand: "Mastercard", number: "5399834697894723", scenario: "Incorrect PIN", outcome: "declined", expiry: "09/31", cvc: "883", pin: "3310", otp: "12345" },
];

/** Numbers and CVVs that agree across Paystack's published doc versions. */
const PAYSTACK: TestCard[] = [
  { provider: "paystack", brand: "Visa", number: "4084084084084081", scenario: "Success, no validation (reusable)", outcome: "success", cvc: "408" },
  { provider: "paystack", brand: "Verve", number: "507850785078507812", scenario: "Success after PIN validation", outcome: "authentication", cvc: "081" },
  { provider: "paystack", brand: "Verve", number: "507850785078507804", scenario: "Success after PIN and OTP validation", outcome: "authentication" },
  { provider: "paystack", brand: "Visa", number: "4084080000005408", scenario: "Declined", outcome: "declined", cvc: "001" },
  { provider: "paystack", brand: "Verve", number: "507850785078507853", scenario: "Fails with “Token Not Generated”", outcome: "declined", cvc: "082" },
];

export const TEST_CARDS: TestCard[] = [...STRIPE, ...FLUTTERWAVE, ...PAYSTACK];
