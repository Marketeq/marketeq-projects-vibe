# **Document 02.b -- Matching Score Logic & Manual Review Criteria**

This document defines how the platform calculates confidence scores for
incoming wire transfers, prioritizing human review over automation. This
system supports internal AR (Accounts Receivable) teams by providing a
clear basis for manual verification and decision-making. No wire
transfers are auto-verified.

## **📁 Microservice Structure**

****/wire-transfer-verification-service

│

├── src/

│ ├── controllers/

│ │ └── match.controller.ts

│ ├── services/

│ │ └── match-score.service.ts

│ ├── utils/

│ │ └── score-weights.ts

│ └── dto/

│ └── MatchResult.dto.ts

│

├── test/

│ └── match-score.service.spec.ts

│

├── main.ts

├── app.module.ts

└── README.md



## **✅ Matching Score Logic**

The match score is calculated as a weighted sum of individual match
signals.

### **score-weights.ts**

****export const SCORE_WEIGHTS = {

projectIdMatch: 50,

amountMatch: 20,

emailMatch: 10,

clientNameMatch: 10,

quickBooksInvoiceIdMatch: 5,

expectedAmountDifferencePenalty: 5, // Negative weight for mismatched
totals

};



### **match-score.service.ts**

****import { Injectable } from \'@nestjs/common\';

import { SCORE_WEIGHTS } from \'../utils/score-weights\';

\@Injectable()

export class MatchScoreService {

calculateScore(matchInput: {

projectIdMatches: boolean;

amountMatches: boolean;

emailMatches: boolean;

clientNameMatches: boolean;

quickBooksInvoiceIdMatches: boolean;

expectedAmountDifference?: number;

}): number {

let score = 0;

if (matchInput.projectIdMatches) {

score += SCORE_WEIGHTS.projectIdMatch;

}

if (matchInput.amountMatches) {

score += SCORE_WEIGHTS.amountMatch;

}

if (matchInput.emailMatches) {

score += SCORE_WEIGHTS.emailMatch;

}

if (matchInput.clientNameMatches) {

score += SCORE_WEIGHTS.clientNameMatch;

}

if (matchInput.quickBooksInvoiceIdMatches) {

score += SCORE_WEIGHTS.quickBooksInvoiceIdMatch;

}

if (

matchInput.expectedAmountDifference &&

matchInput.expectedAmountDifference \> 0

) {

score -= SCORE_WEIGHTS.expectedAmountDifferencePenalty;

}

return Math.max(score, 0);

}

}



## **🧠 Manual Review Logic**

### **Match Score Thresholds**

  ----------------------------------------------------------------------
  **Match Score     **Recommended      **Auto       **Admin Action
  Range**           Action**           Decision**   Required**
  ----------------- ------------------ ------------ --------------------
  90--100%          Strong match       No           Suggested
                                                    \"Verified\"

  70--89%           Likely match       No           Mark after review

  50--69%           Possible match     No           Requires manual
                                                    check

  0--49%            Likely mismatch    No           Suggest \"Rejected\"
  ----------------------------------------------------------------------

### **Matching Field Explanations**

- **Project ID**: Most critical identifier. Must match metadata or
  payment memo.

- **Amount**: Must match expected contract/project budget.

- **Email**: Can differ (e.g. CFO paying on behalf of team).

- **Client Name**: Useful for human comparison.

- **QuickBooks Invoice ID**: If present in memo, increases confidence.

## **📨 Review Criteria for AR Team**

Transactions will show in Airtable (not the admin dashboard), where AR
staff can:

- View **match score** and reasoning

- Change **status** using dropdown: Pending, Verified, Rejected, Needs
  Review

- Log **Reviewed By** user

- See platform vs received **amount difference\**

- Cross-reference **project ID** and **QuickBooks invoice ID\**

No status change in Airtable affects platform state. Platform status is
only updated when **QuickBooks shows invoice as paid**.
