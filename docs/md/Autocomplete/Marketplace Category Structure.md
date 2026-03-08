# **Marketplace Category Structure**

**Location:** data/autocomplete/category_structure.json

This document defines the starting structure for marketplace categories
used to organize all core objects in the remote talent network ---
including talent profiles, services, projects, job posts, skills, and
insights.

These categories are stored in PostgreSQL and will be mirrored in Strapi
CMS for dynamic management. Each category is organized into three tiers:
top-level categories, secondary categories, and detailed subcategories.\
\
This three-tiered structure offers clarity and flexibility, serving as a
foundational taxonomy for organizing the platform.

## **🧱 Structure Format**

****{

\"name\": \"\<Top-level category\>\",

\"subcategories\": \[

{

\"name\": \"\<Secondary category\>\",

\"subcategories\": \[\"\<Third-level subcategory 1\>\", \"\<Third-level
subcategory 2\>\", \...\]

}

\]

}



## **✅ Three-Level Category Structure**

****\[

{

\"name\": \"Development\",

\"subcategories\": \[

{

\"name\": \"Web Development\",

\"subcategories\": \[\"Frontend Development\", \"Backend Development\",
\"Full Stack Development\", \"Web Performance Optimization\", \"Static
Site Generation\", \"Jamstack\", \"HTML/CSS/JS\", \"Web Accessibility\",
\"Cross-Browser Testing\", \"API Integration\"\]

},

{

\"name\": \"Mobile Development\",

\"subcategories\": \[\"iOS Development\", \"Android Development\",
\"Cross-Platform Apps\", \"Flutter\", \"React Native\", \"Mobile
UI/UX\", \"App Store Optimization\", \"Push Notifications\", \"In-App
Purchases\", \"Mobile Security\"\]

},

{

\"name\": \"AI & Machine Learning\",

\"subcategories\": \[\"Artificial Intelligence\", \"Machine Learning\",
\"Natural Language Processing\", \"Computer Vision\", \"Recommendation
Systems\", \"AI Model Deployment\", \"TensorFlow\", \"PyTorch\",
\"MLOps\", \"AI Ethics\"\]

},

{

\"name\": \"Cyber Security\",

\"subcategories\": \[\"Penetration Testing\", \"Security Audits\",
\"Cloud Security\", \"Application Security\", \"Network Security\",
\"Incident Response\", \"SIEM\", \"Vulnerability Scanning\", \"Security
Awareness Training\", \"Compliance Monitoring\"\]

},

{

\"name\": \"Blockchain & Web3\",

\"subcategories\": \[\"Smart Contracts\", \"NFT Development\", \"DeFi
Protocols\", \"Solidity\", \"Ethereum\", \"Tokenomics\", \"Blockchain
Infrastructure\", \"Web3 Dapps\", \"DAOs\", \"Wallet Integration\"\]

},

{

\"name\": \"Data Engineering\",

\"subcategories\": \[\"ETL Pipelines\", \"Data Warehousing\", \"Data
Lakes\", \"Airflow\", \"Snowflake\", \"BigQuery\", \"PostgreSQL\",
\"MongoDB\", \"Data APIs\", \"Streaming Data\"\]

},

{

\"name\": \"DevOps & Infrastructure\",

\"subcategories\": \[\"CI/CD Pipelines\", \"Docker\", \"Kubernetes\",
\"Terraform\", \"AWS Infrastructure\", \"GCP Setup\", \"Azure DevOps\",
\"Monitoring & Logging\", \"Load Balancing\", \"Serverless
Architecture\"\]

},

{

\"name\": \"Software Architecture\",

\"subcategories\": \[\"System Design\", \"Microservices\", \"API
Design\", \"Event-Driven Architecture\", \"Scalability Planning\",
\"Code Audits\", \"Refactoring\", \"Monolith to Microservices\",
\"Distributed Systems\", \"Technical Roadmapping\"\]

},

{

\"name\": \"Game Development\",

\"subcategories\": \[\"Unity\", \"Unreal Engine\", \"Game Prototyping\",
\"Multiplayer Architecture\", \"Character Animation\", \"Shader
Programming\", \"2D/3D Game Design\", \"VR/AR Integration\", \"Game
Monetization\", \"Level Design\"\]

},

{

\"name\": \"Open Source Software\",

\"subcategories\": \[\"Community Projects\", \"Documentation\", \"Issue
Tracking\", \"Maintainer Support\", \"Release Engineering\", \"Code
Review\", \"Contribution Onboarding\", \"Dependency Management\",
\"Security Patching\", \"License Review\"\]

}

\]

},

{

\"name\": \"Mobile Development\",

\"subcategories\": \[\"iOS Development\", \"Android Development\",
\"Cross-Platform Apps\", \"Flutter\", \"React Native\", \"Mobile
UI/UX\", \"App Store Optimization\", \"Push Notifications\", \"In-App
Purchases\", \"Mobile Security\"\]

},

{

\"name\": \"AI & Machine Learning\",

\"subcategories\": \[\"Artificial Intelligence\", \"Machine Learning\",
\"Natural Language Processing\", \"Computer Vision\", \"Recommendation
Systems\", \"AI Model Deployment\", \"TensorFlow\", \"PyTorch\",
\"MLOps\", \"AI Ethics\"\]

},

{

\"name\": \"Cyber Security\",

\"subcategories\": \[\"Penetration Testing\", \"Security Audits\",
\"Cloud Security\", \"Application Security\", \"Network Security\",
\"Incident Response\", \"SIEM\", \"Vulnerability Scanning\", \"Security
Awareness Training\", \"Compliance Monitoring\"\]

},

{

\"name\": \"Blockchain & Web3\",

\"subcategories\": \[\"Smart Contracts\", \"NFT Development\", \"DeFi
Protocols\", \"Solidity\", \"Ethereum\", \"Tokenomics\", \"Blockchain
Infrastructure\", \"Web3 Dapps\", \"DAOs\", \"Wallet Integration\"\]

}

\]

},

{

\"name\": \"Design\",

\"subcategories\": \[

{\"name\": \"UX/UI Design\",\"subcategories\": \[\"UX Research\",
\"Wireframing\", \"Prototyping\", \"User Testing\", \"Information
Architecture\", \"Interaction Design\", \"UI Design\", \"Design
Systems\", \"Accessibility Design\", \"Mobile UX\"\]},

{\"name\": \"Brand & Visual Design\",\"subcategories\": \[\"Logo
Design\", \"Visual Identity\", \"Typography\", \"Color Theory\",
\"Illustration\", \"Iconography\", \"Style Guides\", \"Moodboards\",
\"Creative Direction\", \"Digital Branding\"\]},

{\"name\": \"Product Design\",\"subcategories\": \[\"Design Sprints\",
\"Lean UX\", \"Minimum Viable Design\", \"Feature Prioritization\",
\"A/B Testing Design\", \"Design QA\", \"Component Libraries\",
\"Product Feedback Loops\", \"Cross-functional Handoff\",
\"User-Centered Design\"\]},

{\"name\": \"Motion Design\",\"subcategories\": \[\"After Effects\",
\"2D Animation\", \"3D Motion\", \"Microinteractions\", \"Explainer
Videos\", \"Storyboarding\", \"Animation Principles\", \"Render
Optimization\", \"Transitions\", \"Motion Branding\"\]},

{\"name\": \"Design Strategy\",\"subcategories\": \[\"Design Thinking\",
\"Value Proposition Mapping\", \"Product-Market Fit Analysis\",
\"Usability Benchmarking\", \"Customer Journey Mapping\", \"Design
KPIs\", \"Market Research Integration\", \"Innovation Workshops\",
\"Design Leadership\", \"Vision Roadmaps\"\]},

{\"name\": \"Print Design\",\"subcategories\": \[\"Packaging Design\",
\"Brochures\", \"Flyers\", \"Poster Design\", \"Print Layout\", \"DPI
Preparation\", \"Prepress Setup\", \"Large Format Design\", \"Print
Branding\", \"Editorial Design\"\]},

{\"name\": \"Design Systems\",\"subcategories\": \[\"Component
Libraries\", \"Design Tokens\", \"Figma Libraries\", \"Versioning\",
\"Documentation\", \"Theming\", \"Design Linting\", \"System
Governance\", \"Cross-Team Handoff\", \"Atomic Design\"\]},

{\"name\": \"Interaction Design\",\"subcategories\":
\[\"Microinteractions\", \"Interactive Prototypes\", \"Gestural
Design\", \"Usability Patterns\", \"Responsive Behavior\", \"Multimodal
UI\", \"Feedback Design\", \"Control Mapping\", \"Onboarding Flows\",
\"Animation Feedback\"\]},

{\"name\": \"Accessibility\",\"subcategories\": \[\"WCAG Guidelines\",
\"ARIA Labels\", \"Screen Reader Support\", \"Keyboard Navigation\",
\"Color Contrast\", \"Focus States\", \"Accessible Forms\", \"Voice
Interfaces\", \"Assistive Tech Testing\", \"Inclusive Design\"\] \]

},

{

\"name\": \"Marketing\",

\"subcategories\": \[

{

\"name\": \"Performance Marketing\",

\"subcategories\": \[\"PPC Campaigns\", \"Google Ads\", \"Facebook
Ads\", \"Ad Optimization\", \"Conversion Rate Optimization\", \"Landing
Pages\", \"UTM Tracking\", \"Retargeting\", \"Attribution Modeling\",
\"A/B Testing\"\]

},

{

\"name\": \"Content & SEO\",

\"subcategories\": \[\"SEO Audits\", \"Technical SEO\", \"On-Page
Optimization\", \"Keyword Research\", \"Blog Strategy\", \"Content
Writing\", \"Backlink Building\", \"Content Calendars\", \"SERP
Analysis\", \"Content Repurposing\"\]

},

{

\"name\": \"Social Media Marketing\",

\"subcategories\": \[\"Instagram Growth\", \"LinkedIn Strategy\",
\"Twitter/X Growth\", \"Social Scheduling\", \"Hashtag Strategy\",
\"Influencer Marketing\", \"Analytics Reporting\", \"Engagement
Strategy\", \"Community Management\", \"Social Listening\"\]

}

\]

},

{

\"name\": \"Finance\",

\"subcategories\": \[

{

\"name\": \"Accounting & Bookkeeping\",

\"subcategories\": \[\"Accounts Payable\", \"Accounts Receivable\",
\"Payroll Processing\", \"QuickBooks\", \"Xero\", \"Tax Filing\",
\"Expense Tracking\", \"Invoicing\", \"Reconciliations\", \"Cash Flow
Management\"\]

},

{

\"name\": \"Financial Planning\",

\"subcategories\": \[\"FP&A\", \"Financial Modeling\", \"Budget
Forecasting\", \"Scenario Planning\", \"KPI Dashboards\", \"P&L
Management\", \"Balance Sheets\", \"Investor Reports\", \"Strategic
Advisory\", \"Valuation Analysis\"\]

}

\]

},

{

\"name\": \"Legal\",

\"subcategories\": \[

{

\"name\": \"Tech & IP Law\",

\"subcategories\": \[\"Software Licensing\", \"SaaS Agreements\", \"Open
Source Compliance\", \"Patent Research\", \"Trademark Filing\",
\"Copyright Registration\", \"NDA Drafting\", \"Terms of Service\",
\"Privacy Policies\", \"GDPR Compliance\"\]

},

{

\"name\": \"Business Law\",

\"subcategories\": \[\"Contract Law\", \"Employment Law\", \"Commercial
Agreements\", \"Corporate Structuring\", \"Regulatory Advisory\",
\"Startup Legal\", \"Legal Risk Analysis\", \"Dispute Resolution\",
\"Due Diligence\", \"M&A Support\"\]

}

\]

}

\]



## **🔄 Usage**

- This structure is used for categorizing all marketplace objects:
  Talent, Projects, Jobs, Services, and Insights.

- Categories are stored in Postgres (categories table) and mirrored in
  Strapi CMS.

- Each tier is indexed separately to support fuzzy matching,
  autocomplete, filters, and grouping logic.

- Categories can later be expanded with internal IDs, slugs, and
  localization fields if needed.
