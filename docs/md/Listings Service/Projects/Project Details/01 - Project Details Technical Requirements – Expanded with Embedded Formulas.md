**Project Details Technical Requirements -- Expanded with Embedded
Formulas**

### **Title: Live Chat**

**Summary:** The live chat is used for users to have their questions
answered by either the team lead or someone on the team.

**Introduction:** Questions asked in the live chat are answered by the
team lead. The questions are answered by other team members when the
team lead is unavailable. The appearance of a green status indicator
indicates that there is at least one person who is online and who can
attend to the live chat. When there are two or more team members online,
their names are displayed. Otherwise, the green status indicator is not
displayed when there is no one on the team available.

### **Title: Total Project Price**

**Summary:** The total project cost is calculated by taking the stages
of the project scope and the team members' rates into consideration. The
total cost is calculated based on the amount of hours each person works.
That total is then divided by the duration, which includes week, two
weeks, month, quarter, and year, to show the cost breakdown over time.
When the project is shorter than a year, the year option will not be
displayed in the drop-down menu.

**Formula:**

**1. Total Project Cost\**
Total_Cost = (Hours₁ × Rate₁) + (Hours₂ × Rate₂) + \... + (Hoursₙ ×
Rateₙ)

- Each team member has their own hourly rate.

- For unassigned roles, use a default rate based on job title and
  region.

**2. Cost Per Time Period\**
Cost_Per_Period = Total_Cost ÷ Number_of_Periods

- A "period" can be week, 2 weeks, month, quarter, or year.

- If the project is shorter than a year, the year option is excluded.

**Example Table:**

****\| Person \| Hours \| Rate (\$) \| Cost (\$) \|

\|\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\--\|\-\-\-\-\-\--\|\-\-\-\-\-\-\-\-\--\|\-\-\-\-\-\-\-\-\--\|

\| Alice (assigned) \| 100 \| 100 \| 10,000 \|

\| Bob (assigned) \| 60 \| 90 \| 5,400 \|

\| UX Role (open) \| 40 \| 80 \| 3,200 \|

\| \*\*Total\*\* \| \| \| 18,600 \|

If the project is 3 months long:\
Cost_Per_Month = 18,600 ÷ 3 = 6,200

### **Title: Project Details**

**Summary:** The details of a project are derived from the project
publishing process, with the badges coming from the review system.

### **Title: Deliverables**

**Summary:** The deliverables of the project scope are derived from an
artificial intelligence (AI) summary that uses a large language model
(LLM).

**Introduction:** The LLM data is based on the scope and it utilizes AI
to generate deliverables based on:

- Task title

- Job title for each assignee

- Task description

The deliverables are edited by the team lead. Calculations are needed to
determine the project duration as well as the total price of hiring each
team member.

### **Title: Team Members**

**Summary:** The number of team members is chosen by the client, while
the actual team members are chosen by the project owner. The project
scope includes the minimum required number of team members. Clients can
add more phases, which increases team size.

**Introduction:** If a team member is assigned to a different project, a
vacancy may occur and a replacement is required.

### **Title: Timestamps**

**Summary:** Timestamps reflect the duration of the project:

- If duration \< 7 days → show days

- If duration \< 4 weeks → show weeks

- Otherwise → show months

The project status changes from "Created By" to "Current Team" when more
than one person is on the team.

### **Title: Team Information Generation**

**Summary:** The team section displays:

- First name and username of the project lead

- Locations of team members

- Languages spoken

- Top 5 skills

**Introduction:**

- Skills are generated using rule-based keyword matching between scope
  tasks and team skills.

- One skill per phase (up to 5), or two skills if fewer phases exist.

- Only two rows of clickable skills (5 total), with a non-clickable
  \"View More\" indicator.

### **Title: Programming Languages and Development Tech**

**Summary:** The programming languages and development technology tags
are clickable and are linked with additional project tags.

### **Title: Subcategories, Tags, and Industry**

**Summary:** The subcategories, tags, and industry are clickable and
lead to the project Search Results page with the selected subcategory
and tag filter activated.

### **Title: Date Published**

**Summary:** The Date Published feature that is displayed in the Project
Details underneath the Programming Languages, Development Tech,
Subcategories, and Tags is not clickable.

### **Title: Team Lead**

**Summary:** The team lead is clickable and by clicking on the talent
name and username, it will lead users to the team lead's profile.

### **Title: Skills and Expertise, Location**

**Summary:** The Skills and Expertise button and the Locations button
are all clickable. When clicked, it leads users to the Talent Search
Results page with the selected skill and location filter activated.

### **Title: Languages**

**Summary:** The Languages feature, which is displayed in the About The
Team section, is clickable when the language is added as a filter.

### **Title: Payment Plan Tooltip**

**Summary:** By clicking on the tooltip located beside the text about
the payment plans, users will see a popup with more information about
the different available payment plan options.

### **Title: Rich Text Editor**

**Summary:** The website includes a rich text editor that allows the
user to:

- Add bullet points, numbered bullet points, checkboxes, divider lines

- Italicize, bold, strikethrough, underline text

**Limitations:**

- Users cannot change CSS styles

- Cannot add links

- Can only use preset sizes for H1, H2, and H3 headlines

### **Title: Login Module**

**Summary:** The login module appears when users who are not signed in
want to 'Ask a Question'. After logging in, the module disappears and
the Ask a Question module appears.

### **Title: Save**

**Summary:** Users can save a project to their favorites by clicking the
star icon near the project price.

- Hover → "Save to favorites" message

- Click → "Saved" message

- Saved projects appear in "My Favorites"

### **Title: Share**

**Summary:** Clicking the Share button (under the project price) opens
the Share window.

### **Title: Project Scope Duration**

**Summary:** Estimated time frame for project phases and overall
completion.

**Introduction:**

- Duration calculated per team member, based on hours per week

- Part-time = 20 or 30 hrs/week

- Full-time = 30+ or 40 hrs/week

- Custom schedules allowed

- First month duration determines deposit estimate

- Overall duration is rounded up to the nearest month

**Edge Case:** Part-time members close to 30 hrs/week may be slightly
overcharged.

### **Title: Top-Rated Projects**

**Summary:** Projects with higher reviews are more likely to be
top-rated.

**Introduction:**

- 20+ reviews

- 4.0+ average rating (scale of 1--5)

**Edge Cases:**

- Low review count = unreliable data

- Review authenticity can skew ratings

### **Title: Similar Projects**

**Summary:** Shows projects that share viewer interest history.

**Introduction:**

- Calculates overlap of viewers between projects

**Edge Cases:**

- Bias toward popular projects

- Ignores project content or tags

- No behavioral context

**Solution:** Combine view-based score with:

- Scroll depth

- Time spent

- Shared tags or categories

### **Title: Hybrid Model Recommendation Algorithm -- Recommended Projects**

**Summary:** Combines collaborative filtering + content-based filtering.

**Introduction:**

- Collaborative filtering: based on similar user behavior

- Content-based filtering: based on project metadata and tags

- Cold start: first-clicked project drives suggestions

**Edge Cases:**

- High resource cost

- Complex to implement, tune, and maintain

### **Title: Related Categories**

**Summary:** Consist of categories with up to 5 subcategories each.

**Edge Cases:**

- Shallow relationships

- Binary match only

- Ignores weight/direction

- Hard limit of 5 subcategories

### **Title: Related Skills**

**Summary:** Based on scope contents --- especially job title and
project type.

**Edge Cases:**

- Exact match only

- No semantic logic

- Equal weight for all fields

- Ignores keyword frequency
