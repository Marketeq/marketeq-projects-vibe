### **Document 18: Content Moderation Reporting**

#### **Overview:**

This document outlines how to implement **content moderation reporting**
within the **Content Moderation Microservice**. It describes the **log
storage**, **aggregation** of moderation actions, and **generation of
reports**. This system ensures that all content moderation activities
(approvals, rejections, flagged content) are tracked, reported, and made
accessible for analysis.

The **moderation logs** are stored in a **centralized PostgreSQL
database**, using clear tables to track content moderation actions
(e.g., project submission, media validation, and text validation).

#### **1. Reporting Objectives**

The main objectives of **content moderation reporting** are to:

- **Track moderation actions**: Log all moderation activities, including
  approvals, rejections, and flagged content.

- **Monitor platform health**: Ensure the system is efficiently
  moderating content and alerting users appropriately.

- **Improve moderation accuracy**: Identify trends in flagged content
  and ensure the filters are working as intended.

Reports generated will focus on key performance indicators (KPIs), such
as content rejection rates, flagging trends, and system performance
(moderation speed).

#### **2. Types of Reports**

##### **2.1. Violation Summary Report**

This report aggregates all **moderation actions** over a specific
period. It categorizes the actions by type of violation (e.g.,
profanity, explicit content, banned keywords) and includes the number of
approvals, rejections, and flagged content.

**Fields**:

- **Date range** (e.g., daily, weekly, monthly)

- **Approvals**: Number of projects approved by the system.

- **Rejections**: Number of projects rejected due to content violations.

- **Flagged Content**: Number of projects that are flagged but not yet
  approved.

- **Violation Categories**:

  - **Profanity**: Number of projects rejected due to profanity.

  - **Explicit Content**: Number of projects rejected due to explicit
    media.

  - **Banned Keywords**: Number of projects rejected for banned
    keywords.

##### **2.2. Moderation Efficiency Report**

This report focuses on **moderation efficiency**, monitoring how quickly
projects are reviewed and moderated.

**Fields**:

- **Average review time**: Time taken to approve or reject a project.

- **First response time**: Time taken to provide the first moderation
  response (e.g., rejection or approval).

- **False positives/negatives rate**: Percentage of content incorrectly
  flagged.

##### **2.3. User Feedback Report**

This report tracks user engagement and their actions after receiving
feedback on rejected content.

**Fields**:

- **Rejection reasons**: Common reasons for content rejection.

- **Resubmission rate**: Percentage of users who resubmit after
  rejection.

- **Approval after resubmission**: Percentage of projects that are
  approved after being resubmitted.

#### **3. Log Data Storage**

The **moderation logs** are stored in the **PostgreSQL database** to
allow for efficient querying and reporting. The data structure is as
follows:

##### **3.1. Log Table Schema**

****CREATE TABLE moderation_logs (

id SERIAL PRIMARY KEY,

timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

project_id INT NOT NULL,

action VARCHAR(255) NOT NULL, \-- \'approved\', \'rejected\',
\'flagged\'

field_type VARCHAR(255), \-- \'title\', \'description\', \'media\'

reason VARCHAR(255), \-- Reason for rejection (e.g., \'profanity\',
\'explicit content\')

media_url TEXT, \-- If media is involved, the URL of the media

error_message TEXT \-- Any error message, if applicable

);

**Explanation of fields**:

- **timestamp**: The time when the action was performed.

- **project_id**: The ID of the project being moderated.

- **action**: The moderation action taken (approved, rejected, or
  flagged).

- **field_type**: The type of content being moderated (e.g., title,
  description, media).

- **reason**: The reason for rejection or flagging (e.g., profanity,
  explicit content).

- **media_url**: The URL of the media involved (if applicable).

- **error_message**: Any system error message related to the moderation
  action.

#### **4. Report Generation**

To generate the **Content Moderation Reports**, the **Content Moderation
Microservice** will query the **moderation logs** stored in the
**PostgreSQL database**. Reports can be generated for a **specific date
range** (daily, weekly, monthly) and will include key metrics such as
the number of **rejections** due to **profanity**, **explicit content**,
and **banned keywords**.

##### **4.1. Example Query for Violation Summary Report**

****SELECT

action,

COUNT(\*) AS total,

SUM(CASE WHEN reason = \'profanity\' THEN 1 ELSE 0 END) AS
profanity_count,

SUM(CASE WHEN reason = \'explicit content\' THEN 1 ELSE 0 END) AS
explicit_content_count,

SUM(CASE WHEN reason = \'banned keyword\' THEN 1 ELSE 0 END) AS
banned_keyword_count

FROM

moderation_logs

WHERE

timestamp BETWEEN \'2025-01-01\' AND \'2025-01-31\'

GROUP BY

action;

This query returns the total number of **approvals**, **rejections**,
and **flagged content** for the given date range, broken down by
**reason for rejection**.

##### **4.2. Example Report Generation Code (Node.js)**

****import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { ModerationLog } from \'./moderation-log.entity\';

\@Injectable()

export class ModerationReportService {

constructor(

\@InjectRepository(ModerationLog)

private readonly moderationLogRepository: Repository\<ModerationLog\>,

) {}

// Generate a Violation Summary Report for a specific date range

async generateViolationSummaryReport(startDate: string, endDate:
string): Promise\<any\> {

const report = await this.moderationLogRepository

.createQueryBuilder(\'log\')

.select(\'log.action, COUNT(\*) AS total, SUM(CASE WHEN log.reason =
:profanity THEN 1 ELSE 0 END) AS profanity_count\',)

.where(\'log.timestamp BETWEEN :startDate AND :endDate\', { startDate,
endDate })

.groupBy(\'log.action\')

.getRawMany();

return report;

}

}



#### **5. Reporting API Integration**

To fetch the reports, the **Listing Microservice** (or any other
relevant service) will call the **Content Moderation Microservice**'s
reporting endpoints.

##### **5.1. Example Report API Endpoint**

****import { Controller, Get, Query } from \'@nestjs/common\';

import { ModerationReportService } from \'./moderation-report.service\';

\@Controller(\'reports\')

export class ReportsController {

constructor(private readonly reportService: ModerationReportService) {}

\@Get(\'violation-summary\')

async getViolationSummary(

\@Query(\'startDate\') startDate: string,

\@Query(\'endDate\') endDate: string,

): Promise\<any\> {

return this.reportService.generateViolationSummaryReport(startDate,
endDate);

}

}



#### **6. Conclusion**

This document outlines the process for generating **content moderation
reports** within the **Content Moderation Microservice**. It explains
how to store and query **moderation logs** using **PostgreSQL**,
generate **violation reports**, and display these reports for **platform
monitoring** and **transparency**. By following this document, the
**Content Moderation Microservice** can be integrated into the broader
platform to provide valuable insights into **moderation effectiveness**,
**system performance**, and **user behavior**.
