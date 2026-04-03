export class SummaryCardDto {
  amount:          string;
  displayCurrency: string;
  hoursLogged:     number;
  hoursLabel:      string;
  changePercent:   number | null;
  changeLabel:     string | null;
  changeDirection: 'up' | 'down' | 'unchanged';
  periodLabel:     string;
  dateRangeLabel:  string;
}

export class EarningsSummaryDto {
  today:     SummaryCardDto;
  thisWeek:  SummaryCardDto;
  thisMonth: SummaryCardDto;
  allTime:   SummaryCardDto;
}
