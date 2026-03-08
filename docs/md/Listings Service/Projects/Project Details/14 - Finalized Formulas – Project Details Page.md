**Finalized Formulas -- Project Details Page**

This document contains **all confirmed formulas and logic rules** for
every calculated or derived field on the Project Details Page. These
formulas power logic related to task assignments, project estimates,
review scoring, team workload, preview tokens, and moderation rules. All
logic is final, implemented in the system, and version-controlled.

If any formula is updated, the version number must be incremented and
commit messages must reflect the change.

### **📅 Project Timeline Calculations**

**1. Total Estimated Hours per Project**

****TotalEstimatedHours = sum(task.estimated_hours for all tasks in all
phases)

> Adds up the estimated hours across all tasks in all phases.

**2. Project Duration (in weeks)**

****ProjectDurationWeeks = max(1, ceil(max(task.end_day for all tasks)
/ 7))

> Duration is based on the highest task end_day, rounded to weeks.
> Minimum is 1 week.

**3. Project Start and End Dates**

****StartDate = assigned manually by project owner\\EndDate =
StartDate + (ProjectDurationWeeks \* 7 days)

> End date is automatically calculated from the start date and project
> duration.

### **👥 Team & Workload Calculations**

**4. Total Tasks per Project**

****TotalTasks = sum(length(phase.tasks) for all phases)

> Sums the total number of tasks defined across all phases.

**5. Total Assigned Team Members**

****TotalTeamMembers = count(unique users in assigned_team array)

> Each unique team member is only counted once.

**6. Team Member Workload Validation**

****WorkloadPerUser = sum(task.estimated_hours assigned to user)

MaxAllowedHours = based on user.schedule.max_hours

if WorkloadPerUser \> MaxAllowedHours:

throw validation error

> Prevents assigning a user more work than their weekly schedule
> allows.

### **💵 Budget & Pricing Calculations**

**7. Estimated Total Project Cost**

****EstimatedCost = sum(task.estimated_hours \* role.hourly_rate)

> Total cost is calculated from the estimated time and hourly rate for
> each task.

**8. Cost per Phase (optional)**

****PhaseCost = sum(task.estimated_hours \* role.hourly_rate for each
task in phase)

> Breaks down total cost by each project phase.

### **🔎 Related Projects & Suggestions**

**9. Related Projects**

****Match on:

\- Shared skills (\>= 3)

\- Shared tags (\>= 2)

\- Matching subcategory

RelatedScore = weight(skills=0.5, tags=0.3, subcategory=0.2)

Sort by RelatedScore descending

> Suggests similar projects based on skill and tag overlap.

**10. Related Categories (Cross-promotion)**

****RelatedCategories = find categories with overlapping skill profiles

> Used for suggestion engine and internal content matching.

**11. Related Skills Suggestions**

****SuggestedSkills = AI.extract_keywords(project.description +
category + tags)

> Generates skill suggestions for improving visibility and
> categorization.

### **⚠️ Moderation & Auto-Flagging**

**12. Flag Score**

****FlagScore =

+5 if short_description.length \> 300

+10 if tags.length \> 10

+15 if duplicate title exists

+20 if bio or description contains flagged words

if FlagScore \>= 20:

status = \'needs_update\'

> Flags project for review if quality or compliance rules are violated.

**13. Force Review Trigger (auto-flag logic)**

****if any of \[title, description, deliverables, tags, skills,
video_url\] is updated:

moderation_status = \'pending\'

force_review_on_edit = true

> Automatically flags sensitive content edits for moderation.

### **⭐ Reviews & Client Metrics**

**14. Client Success Rating (from reviews)**

****ClientSuccessRating = calculateClientSuccessRating(projectId:
string): number =\> {

const reviews = getReviewsByProjectId(projectId)

.filter(review =\> !review.is_flagged && !review.is_deleted)

if (reviews.length === 0) return 0

const totalScore = reviews.reduce((sum, review) =\> sum + review.rating,
0)

return parseFloat((totalScore / reviews.length).toFixed(2))

}

> Calculates average rating excluding invalid reviews.

**15. Review Status Distribution**

****ReviewSummary = count of reviews grouped by status

> Used in admin UI to show review counts per status.

### **🔐 Audit Logs & Versioning**

**16. Unified Audit Log Entry**

****LogEntry = {

action_type: \'update\',

source: \'project_owner\' \| \'admin\',

performed_by: user.email or admin.email,

field_changed: \'description\',

old_value: \"\...\",

new_value: \"\...\",

timestamp: Date.now()

}

> Tracks updates from either the frontend or Strapi.

### **🔗 Token Logic & Preview**

**17. Preview Token Expiry Check**

****isPreviewTokenValid = currentDate \< token.expiryDate

> Used to determine whether a preview link is still valid.

### **📌 Project Status Logic**

**18. Project Moderation Status**

****status = one of \[\"draft\", \"pending_review\", \"published\",
\"needs_update\"\]

> Draft = not yet submitted, Pending = in moderation, Needs Update =
> failed moderation, Published = approved and visible.

All logic here is final. Front-end and backend engineers must reference
this when syncing field values or rendering state-based components. All
future changes must follow version control.
