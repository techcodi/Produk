export type ProviderId = "stripe" | "flutterwave" | "paystack";
export type Outcome = "success" | "declined" | "authentication";

export interface Provider {
  id: ProviderId;
  name: string;
  docsUrl: string;
  /** Rules that apply to every card unless a card says otherwise. */
  defaults: { expiry: string; cvc: string };
  notes: string[];
}

export interface TestCard {
  provider: ProviderId;
  brand: string;
  /** Digits only. */
  number: string;
  scenario: string;
  outcome: Outcome;
  expiry?: string;
  cvc?: string;
  pin?: string;
  otp?: string;
}

export type CardBrand =
  | "Visa"
  | "Mastercard"
  | "American Express"
  | "Discover"
  | "Diners Club"
  | "JCB"
  | "UnionPay"
  | "Verve"
  | "Maestro";

export interface CardCheck {
  digits: string;
  brand: CardBrand | null;
  /** Whether the length is one the detected brand issues. */
  lengthOk: boolean;
  luhnOk: boolean;
}
