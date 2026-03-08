## **📄 06 - Installment Plans: Stripe Subscription Creation with Dynamic Pricing Support**

This document outlines the logic and implementation for creating a
Stripe subscription based on dynamically calculated pricing from the
platform. It includes full backend code, folder structure, and
subscription creation flow with dynamic billing logic and upfront
deposit handling.

### **🧩 Purpose**

To allow users to check out with a dynamically-priced installment plan
for either:

- A **Project** (fixed budget + fixed duration)

- A **Service** (ongoing, recurring, no end date)

<!-- -->

- A **Team** (collection of individuals with roles and rates)

- An **Individual Talent** (solo contractor)

This supports weekly, biweekly, or monthly billing, with deposit
collected as the first installment. All pricing is computed by the
backend and passed to Stripe.

### **📦 Stripe Setup Assumptions**

- No pre-created Stripe products

- No fixed prices stored in Stripe

- All amounts are passed directly using dynamic logic

- Subscription pricing and intervals are determined by platform logic

### **📁 Folder Structure**

****app/

└── checkout-service/

├── src/

│ ├── controllers/

│ │ └── subscription.controller.ts

│ ├── services/

│ │ └── stripe-subscription.service.ts

│ ├── dtos/

│ │ └── create-subscription.dto.ts

│ └── utils/

│ └── stripe.helper.ts

└── \...



### **🎯 Backend Logic Overview**

The platform calculates:

- Total cost (project/service)

- Total duration (for projects)

- Installment frequency (weekly, biweekly, monthly)

- Installment amount = total / number of periods

Then creates:

- Stripe Customer (if needed)

- Stripe Subscription with custom interval + amount

- Applies first payment as deposit

### **🧾 DTO: create-subscription.dto.ts**

****export class CreateSubscriptionDto {

userId: string;

listingId: string; // project/service ID

type: \'project\' \| \'service\';

frequency: \'weekly\' \| \'biweekly\' \| \'monthly\';

startDate: string; // defaults to today\'s date

metadata: Record\<string, any\>;

}



### **🧠 Service Logic: stripe-subscription.service.ts**

****\@Injectable()

export class StripeSubscriptionService {

constructor(

private readonly stripe: StripeClient,

private readonly listingsService: ListingsService,

) {}

async createSubscription(dto: CreateSubscriptionDto) {

const listing = await
this.listingsService.getListingById(dto.listingId);

const { frequency, type } = dto;

const price = this.calculateDynamicPrice(listing, frequency);

const totalPeriods = this.getTotalInstallments(listing, frequency);

const stripeCustomerId = await
this.getOrCreateStripeCustomer(dto.userId);

const subscription = await this.stripe.subscriptions.create({

customer: stripeCustomerId,

items: \[{

price_data: {

currency: \'usd\',

unit_amount: price,

recurring: {

interval: frequency,

interval_count: 1,

},

product_data: {

name: \`\${type} installment plan -- \${listing.name}\`,

},

},

}\],

metadata: {

\...dto.metadata,

listingId: dto.listingId,

totalInstallments: totalPeriods,

},

billing_cycle_anchor: Math.floor(new Date(dto.startDate).getTime() /
1000),

payment_behavior: \'default_incomplete\',

expand: \[\'latest_invoice.payment_intent\'\],

});

return subscription;

}

private calculateDynamicPrice(listing, frequency: string): number {

const total = listing.totalPrice; // provided by listings-service

const count = this.getTotalInstallments(listing, frequency);

return Math.ceil(total / count); // Round up to nearest cent

}

private getTotalInstallments(listing, frequency: string): number {

if (listing.type === \'service\') return 9999; // endless recurring

const durationWeeks = this.calculateProjectWeeks(listing);

switch (frequency) {

case \'weekly\': return durationWeeks;

case \'biweekly\': return Math.ceil(durationWeeks / 2);

case \'monthly\': return Math.ceil(durationWeeks / 4);

}

}

private calculateProjectWeeks(listing): number {

const start = new Date(listing.startDate);

const end = new Date(listing.endDate);

const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 \*
60 \* 60 \* 24));

return Math.ceil(diffDays / 7);

}

private async getOrCreateStripeCustomer(userId: string) {

// Retrieve from DB or create new in Stripe

}

}



### **🧪 Controller: subscription.controller.ts**

****\@Controller(\'subscriptions\')

export class SubscriptionController {

constructor(private readonly stripeService: StripeSubscriptionService)
{}

\@Post()

async create(@Body() dto: CreateSubscriptionDto) {

const result = await this.stripeService.createSubscription(dto);

return { subscriptionId: result.id };

}

}



### **🧠 Teams & Individual Talent** 

### The listingsService.getListingById() function must support retrieving **any type of listing**, including:

Each listing type should return:

{

id: string;

type: \'project\' \| \'service\' \| \'team\' \| \'individual\';

name: string;

startDate?: string;

endDate?: string;

members?: Array\<{ hourlyRate: number; role: string }\>;

totalPrice: number;

}

### **🧠 Handling Pricing for Teams or Individuals**

If the listing is a team or individual, pricing must be calculated using
internal platform logic that considers:

- Assigned role(s)

- Hourly rate(s)

- Estimated workload

- Duration of engagement (or default to 4 weeks if ongoing)

This pricing logic should be encapsulated in the listingsService or a
dedicated pricing utility service, and passed into the
calculateDynamicPrice() function used for subscription setup.

### **✅ Key Rules Recap**

- ✅ **Start date** = today (when checkout completes)

- ✅ **First payment = deposit** = initial installment

- ✅ **Subscription billing interval** = based on user selection

- ✅ **Total installments** = calculated by backend from listing
  duration

- ✅ **Installment amount** = total / number of installments (rounded
  up)

- ✅ **Stripe handles** billing and retries

- ✅ **No products need to be pre-configured** in Stripe
