export class FeeBreakdownDto {
  grossAmountDisplay:  string;
  grossAmountRaw:      string;
  feeAmountDisplay:    string;
  feeAmountRaw:        string;
  feeLabel:            string;
  feePercent:          string;
  netAmountRaw:        string;
  currency:            string;
  displayCurrency:     string;
}

export class FeeLineItemDto {
  label:       string;
  amount:      string;
  currency:    string;
  amountRaw:   string;
  currencyRaw: string;
  isTotal?:    boolean;
}

export class FeeSectionDto extends FeeBreakdownDto {
  grossAmountUsd:  string;
  feeAmountUsd:    string;
  netAmountUsd:    string;
  billingCurrency: string;
  fxRateToUsd:     string;
  fxRateLabel:     string;
  lineItems:       FeeLineItemDto[];
}
