# **📄 04 -- Installment Plan -- Project Duration, Pricing & Dynamic Schedule Calculation**

### **🧭 Purpose**

This document explains how the installment plan logic dynamically
calculates the number of payments and schedule based on the selected
installment frequency (weekly, biweekly, monthly) and the project or
service duration and total price. Pricing and duration come from the
backend via the listings service (or user service if hiring a single
person).

Installment frequency options:

- Weekly → 1 installment per week

- Biweekly → 1 installment every 2 weeks

- Monthly → 1 installment every month

The user selects a frequency; the backend calculates the number of
payments required based on the total duration and cost of the project or
service.

### **📦 Source of Truth**

Installment frequency and logic are managed by the backend. Pricing is
pulled from:

- **Listings service** → for projects, services, or teams

- **User service** → for direct hire of a single user

Backend is responsible for:

- Validating frequency option

- Calculating number of installments

- Generating a schedule of charge dates

- Ensuring pricing matches the selected duration and frequency

### **📅 Start Date & Duration**

- The installment **start date** is set to the date the user completes
  checkout (i.e., the day they pay the upfront deposit).

- Duration is based on:

  - **Project**: Uses fixed start and end dates, with budget and phase
    breakdowns

  - **Service**: Only start date is fixed, service continues
    indefinitely

### **📐 Number of Installments**

The number of installments is calculated by:

function calculateInstallmentCount(

startDate: Date,

endDate: Date,

frequency: \'weekly\' \| \'biweekly\' \| \'monthly\'

): number {

const msInWeek = 7 \* 24 \* 60 \* 60 \* 1000;

const msInTwoWeeks = 2 \* msInWeek;

const msInMonth = 30 \* 24 \* 60 \* 60 \* 1000;

const durationMs = new Date(endDate).getTime() - new
Date(startDate).getTime();

switch (frequency) {

case \'weekly\':

return Math.ceil(durationMs / msInWeek);

case \'biweekly\':

return Math.ceil(durationMs / msInTwoWeeks);

case \'monthly\':

return Math.ceil(durationMs / msInMonth);

}

}



### **💰 Installment Amount**

Total project cost is pulled from the listings service and divided by
the number of installments:

function calculateInstallmentAmount(totalCost: number,
installmentCount: number): number {

return Math.ceil((totalCost / installmentCount) \* 100) / 100; // Round
to 2 decimal places

}

This is passed as unit_amount in the Stripe subscription item.

### **📊 Output Format Example (Installment Schedule)**

Example backend response to the frontend:

{

frequency: \'monthly\',

totalCost: 12000,

depositAmount: 3000,

numberOfInstallments: 4,

installmentAmount: 3000,

schedule: \[

{ installment: 1, chargeDate: \'2025-06-12\', amount: 3000 },

{ installment: 2, chargeDate: \'2025-07-12\', amount: 3000 },

{ installment: 3, chargeDate: \'2025-08-12\', amount: 3000 },

{ installment: 4, chargeDate: \'2025-09-12\', amount: 3000 }

\]

}



### **🔁 Recurring Conversion (Post-Project)**

- At the end of a fixed-duration project, clients may convert the
  project into a **recurring service\**

- Logic should allow for transition to indefinite monthly billing, based
  on the final phase of the scope

This logic is triggered from a separate "Make Project Recurring" flow,
not included in this sprint.
