Build a private internal web app named **VeriForge**.

## Product purpose

VeriForge is a bulk email-list cleaning and correction tool.

It is NOT primarily an SMTP email verification service.

The main purpose is to:

* Upload large email lists
* Detect invalid/junk/system/generated emails
* Correct recoverable malformed emails
* Remove duplicates
* Limit excessive emails from the same company domain
* Show exactly what happened to every record
* Export clean, corrected, valid, removed, review, and full-report files

The final clean list must contain:

**Valid emails + successfully corrected emails**

after final deduplication and domain-frequency filtering.

---

# CRITICAL DEVELOPMENT INSTRUCTION

**DO NOT BUILD THE ENTIRE APPLICATION IN ONE PASS.**

Implement VeriForge strictly **phase-by-phase**.

Complete, test, and stabilize each phase before moving to the next phase.

At the end of every phase:

1. Run all relevant tests.
2. Fix errors and regressions.
3. Verify the acceptance criteria for that phase.
4. Summarize what was implemented.
5. List the important files created or modified.
6. State any known limitations.
7. Only then continue to the next phase.

Do not skip ahead and build later-phase functionality prematurely unless it is absolutely required by the current phase.

Maintain a project file such as:

`BUILD_PROGRESS.md`

Use it to track:

* Current phase
* Completed functionality
* Tests completed
* Known issues
* Remaining work
* Important architectural decisions

Keep the application runnable at the end of every major phase.

---

# TECH STACK

Use:

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Framer Motion

Backend:

* Python
* FastAPI

Processing engine:

* Python modules independent from the API

For v1, avoid unnecessary infrastructure.

Use local/server-side temporary file processing.

Design the project so PostgreSQL and Redis can be added later, but they are not required for the first working version.

Suggested structure:

veriforge/
frontend/
backend/
engine/
rules/
tests/
BUILD_PROGRESS.md
README.md

Engine structure:

engine/
normalizer.py
corrections.py
syntax_validator.py
asset_detector.py
placeholder_detector.py
example_detector.py
system_detector.py
sms_gateway_detector.py
disposable_detector.py
duplicate_detector.py
domain_frequency.py
suspicious_detector.py
classifier.py
processor.py
models.py

Rules/data files:

rules/
placeholder_usernames.json
placeholder_domains.json
example_patterns.json
system_domains.json
sms_gateway_domains.json
disposable_domains.json
free_email_domains.json
role_mailboxes.json

Do NOT put every rule into one giant regex.

Create modular, testable detection functions.

---

# PHASE 0 — PROJECT FOUNDATION

Start here.

Do NOT build the UI or full API yet.

Tasks:

* Create project directory structure
* Create Python virtual environment/dependency files
* Create frontend package structure
* Configure formatting/linting
* Create `.env.example`
* Create `.gitignore`
* Create `README.md`
* Create `BUILD_PROGRESS.md`
* Define shared result/status models
* Establish backend/engine boundaries
* Add basic test framework

Create environment-variable placeholders for:

VERIFORGE_USERNAME
VERIFORGE_PASSWORD
VERIFORGE_SESSION_SECRET

Do not put real credentials in source control.

Acceptance criteria:

* Project installs successfully
* Test runner works
* Backend imports successfully
* Frontend starts successfully
* No business logic is unnecessarily coupled to the UI
* `BUILD_PROGRESS.md` records completion of Phase 0

Only after these criteria are met, continue to Phase 1.

---

# PHASE 1 — CORE EMAIL CLEANING ENGINE

This is the highest-priority phase.

Build the standalone Python processing engine BEFORE the web interface.

The engine must work independently from FastAPI and Next.js.

Implement:

* Normalization
* Safe corrections
* Asset/file detection
* System-generated detection
* Lead-router detection
* SMS gateway detection
* Placeholder detection
* Example-email detection
* Disposable-email detection
* Syntax validation
* Exact deduplication
* Company-domain frequency limits
* Suspicious/review classification
* Final deduplication after correction
* Final classification
* CSV export generation

Create strong automated tests for every rule.

The engine should accept a Python list of raw values and return structured result records.

Example conceptual interface:

process_emails(
emails,
options
)

Results must include:

original_email
normalized_email
final_email
status
category
reason
domain
was_corrected
correction_type

Acceptance criteria:

* Core engine runs without frontend/backend
* Every rule has tests
* Provided test examples pass
* Original values are preserved
* Corrected values are auditable
* Removed emails have reasons
* Clean output contains no duplicates
* Domain cap works correctly
* Free email domains are exempt from company-domain caps
* No SMTP requests are made
* `BUILD_PROGRESS.md` updated

Do NOT start the full dashboard until this phase is stable.

---

# PHASE 2 — FILE PROCESSING AND EXPORT ENGINE

After Phase 1 passes, add bulk-file processing.

Support:

* CSV
* TXT
* XLSX

Tasks:

* Load files safely
* Detect available columns
* Allow an email column to be specified
* Auto-suggest the likely email column when confidence is high
* Preserve row-level mapping
* Handle blank cells safely
* Process in chunks when appropriate
* Generate export files

Generate:

* Valid emails
* Corrected emails
* Removed emails
* Review emails
* Clean list
* Full report

Acceptance criteria:

* CSV input works
* TXT input works
* XLSX input works
* Large inputs do not require loading unnecessary duplicate structures into memory
* Corrected records are correctly represented
* Clean list contains only final unique usable emails
* Export contents match dashboard/result counts
* `BUILD_PROGRESS.md` updated

---

# PHASE 3 — FASTAPI BACKEND

Only after the cleaning/file-processing engine works independently should the API be built.

Implement FastAPI endpoints for:

* Authentication
* Logout
* Upload
* Paste-email input
* File metadata/column discovery
* Start processing
* Job status
* Processing progress
* Results
* Result filtering
* Downloads
* Basic health endpoint

Suggested API concepts:

POST /auth/login
POST /auth/logout
POST /jobs/upload
POST /jobs/paste
POST /jobs/{id}/process
GET /jobs/{id}
GET /jobs/{id}/results
GET /jobs/{id}/download/{type}

Use a clean API architecture.

Do not move cleaning rules into route handlers.

Routes must call the standalone engine.

Acceptance criteria:

* API starts successfully
* Authentication is enforced
* Files can be uploaded
* Processing can be initiated
* Results can be retrieved
* Downloads work
* Progress/state can be queried
* Error responses are meaningful
* Automated backend tests pass
* `BUILD_PROGRESS.md` updated

---

# PHASE 4 — PRIVATE USERNAME/PASSWORD ACCESS

This app is private and internal.

Do NOT build:

* Signup
* Registration
* Forgot password
* User profiles
* Public accounts
* Subscription system

Build one secure shared access gate.

Login screen:

Username
Password
Enter VeriForge

Credentials must come from:

VERIFORGE_USERNAME
VERIFORGE_PASSWORD

Session signing secret:

VERIFORGE_SESSION_SECRET

Do not hard-code credentials in frontend source.

Authentication must be enforced server-side.

Use:

* Secure session
* HttpOnly cookie
* SameSite protection
* Secure cookie when HTTPS is enabled
* Session expiration
* Logout
* Rate limiting for repeated failed logins

Suggested session duration:

12 hours, configurable.

Acceptance criteria:

* Unauthenticated users cannot access protected app/API pages
* Valid credentials create a session
* Invalid credentials fail safely
* Logout destroys the session
* Credentials are not exposed to browser source
* `BUILD_PROGRESS.md` updated

---

# PHASE 5 — NEXT.JS APPLICATION SHELL

Now create the UI foundation.

Do not yet over-polish animations.

Build:

* Login page
* Main application shell
* Sidebar
* Header
* Dashboard placeholder
* New Clean page
* History page
* Rules page
* Exports page
* Settings page
* Help & Support page

Responsive behavior should be included.

Acceptance criteria:

* Navigation works
* Protected pages require authentication
* Layout is responsive
* Design system is consistent
* No major business logic lives in React components
* `BUILD_PROGRESS.md` updated

---

# PHASE 6 — UPLOAD AND CLEANING WORKFLOW UI

Build the primary workflow.

New Clean should support:

## Upload File

Drag & drop

Supported:

CSV
XLSX
TXT

Also provide:

Browse File

## Paste Emails

Allow direct bulk paste.

After upload:

* Show file name
* Show detected row count
* Show available columns
* Let user choose email column
* Show cleaning settings

Cleaning rules UI:

Basic Cleaning:

* Invalid formatting
* Exact duplicates
* Empty values

Junk Detection:

* Placeholder/example emails
* Website assets
* System-generated emails
* SMS gateways
* Lead-routing addresses
* Disposable emails

Smart Corrections:

* Phone prefixes
* Accidental `20` prefixes
* Trailing scraped text
* TLD/trailing corruption
* Stray leading characters

Company Filtering:

* Maximum company-domain emails

Options:

1
2
3
5
Custom

Default:

2

Acceptance criteria:

* User can upload or paste
* User can select email column
* Rules can be configured
* Settings are sent correctly to backend
* Processing can be started
* `BUILD_PROGRESS.md` updated

---

# PHASE 7 — PROCESSING EXPERIENCE

Create the processing state.

Show:

* File name
* Total rows
* Processed rows
* Percentage
* Progress bar
* Current stage
* Live counts where practical

Possible stages:

Normalizing
Applying corrections
Detecting asset strings
Detecting system emails
Checking placeholders
Checking syntax
Removing duplicates
Analyzing company domains
Classifying review records
Preparing exports

Example:

Analyzing 10,000 emails...

78%

7,214 Valid
491 Corrected
1,187 Removed
38 Review

Current stage:
Analyzing company domains

Acceptance criteria:

* UI does not freeze
* Progress updates are understandable
* Errors are surfaced clearly
* User cannot accidentally start duplicate jobs by repeatedly clicking
* Completion transitions to results page
* `BUILD_PROGRESS.md` updated

---

# PHASE 8 — RESULTS DASHBOARD

Build the full result experience.

Summary cards:

Total Processed
Valid
Corrected
Removed
Review
Clean Ready-to-Use

Clean Ready-to-Use should be the most prominent metric.

Example:

12,846 Total
9,438 Valid
892 Corrected
2,411 Removed
105 Review
10,330 Clean Ready-to-Use

Clean Ready-to-Use means:

Valid + Corrected

after:

* final duplicate removal
* company-domain filtering

---

# RESULTS TABLE

Tabs:

All Results
Valid
Corrected
Removed
Review

Controls:

Search
Status filter
Category/reason filter
Domain filter

Columns:

#

Original Email
Final Email
Status
Reason
Domain
Action

Examples:

[928-776-0050info@hoamco.com](mailto:928-776-0050info@hoamco.com)
→ [info@hoamco.com](mailto:info@hoamco.com)
Corrected
Removed phone prefix

[204@3x.png](mailto:204@3x.png)
→ —
Removed
Asset/file string

[aaron@modernrenoaz.com](mailto:aaron@modernrenoaz.com)
→ [aaron@modernrenoaz.com](mailto:aaron@modernrenoaz.com)
Valid
Passed all checks

[2067@scottsdaleshadows.com](mailto:2067@scottsdaleshadows.com)
→ [2067@scottsdaleshadows.com](mailto:2067@scottsdaleshadows.com)
Review
Numeric-only local part

Use pagination or virtualization.

Do not render 100,000 rows simultaneously.

Acceptance criteria:

* Counts match engine results
* Tabs work
* Filters work
* Search works
* Original/corrected values are clear
* Reasons are visible
* Large result sets remain responsive
* `BUILD_PROGRESS.md` updated

---

# PHASE 9 — LIST HEALTH VISUALIZATION

Add a VeriForge-specific before/after view.

Example:

LIST HEALTH

Before:
12,846 records

After:
10,330 clean emails

Duplicates: 621 → 0
Invalid: 428 → 0
System/Junk: 937 → 0
Asset Strings: 276 → 0
Correctable: 892 → 892 repaired

Do not turn this into a deliverability score.

VeriForge is a list-cleaning tool, not an SMTP verifier.

Acceptance criteria:

* Numbers come from actual processing data
* Visualization remains simple
* No misleading verification claims
* `BUILD_PROGRESS.md` updated

---

# PHASE 10 — DOWNLOADS AND EXPORT EXPERIENCE

Provide buttons for:

Download Valid Emails
Download Corrected Emails
Download Removed Emails
Download Review Emails
Download Full Report

Primary CTA:

**Download Clean List**

## Valid export

email

## Corrected export

original_email
corrected_email
reason

## Removed export

original_email
category
reason
domain

## Review export

original_email
final_email
reason
domain

## Clean List

email

Contains:

VALID + CORRECTED

after final deduplication and domain filtering.

## Full Report

original_email
normalized_email
final_email
status
category
reason
domain
was_corrected
correction_type

Support CSV.

Add XLSX where practical.

Acceptance criteria:

* All downloads work
* Download counts match UI
* Clean list contains no duplicate final emails
* Removed emails never enter Clean List
* Review emails are excluded from Clean List by default
* `BUILD_PROGRESS.md` updated

---

# PHASE 11 — ANIMATIONS AND UI POLISH

Only add significant animation AFTER the functionality works.

Use Framer Motion.

Animations must be subtle and professional.

Do NOT use:

* excessive particles
* neon effects
* gaming-style animations
* constant bouncing
* distracting background movement

Add:

## Upload

On drag-over:

* border turns purple smoothly
* subtle background tint
* upload icon lifts slightly

## File added

Card fades/slides in.

## Processing

Animated progress bar.

Counters increment smoothly.

Processing-stage text transitions.

## Corrected email

Where practical:

[928-776-0050info@hoamco.com](mailto:928-776-0050info@hoamco.com)
→
[info@hoamco.com](mailto:info@hoamco.com)

Removed characters may fade away.

## Completion

Cards fade/slide into place.

Clean Ready-to-Use count animates.

Download Clean List appears with subtle scale/fade.

## Tabs

Smooth active indicator.

## Cards/buttons

2–4px hover lift.

Typical animation duration:

150–400ms

Acceptance criteria:

* Animations do not slow bulk processing
* Reduced-motion preference is respected
* Table performance remains good
* App still feels professional
* `BUILD_PROGRESS.md` updated

---

# PHASE 12 — HISTORY

Create a basic processing history.

Show:

* Date/time
* File name
* Total records
* Valid
* Corrected
* Removed
* Review
* Clean count

If persistent database storage is not part of v1, history may be:

* session-based
* local metadata
* lightweight local backend storage

Do not over-engineer it.

Acceptance criteria:

* Completed jobs can be recognized
* Counts are visible
* No unnecessary long-term storage of raw email data
* `BUILD_PROGRESS.md` updated

---

# PHASE 13 — PERFORMANCE AND HARDENING

After all core functionality works, optimize.

Test approximately:

1,000 rows
10,000 rows
50,000 rows
100,000 rows

Improve:

* Chunked processing
* Memory consumption
* API response sizes
* Table pagination
* Export performance
* Temporary file cleanup
* Error handling
* Rate limiting
* Input size validation
* Malformed file handling

Do not prematurely introduce Redis/PostgreSQL unless actual requirements justify them.

Acceptance criteria:

* UI remains responsive
* Processing is stable
* Large results use pagination/virtualization
* Temporary files are cleaned
* Errors do not crash server
* `BUILD_PROGRESS.md` updated

---

# PHASE 14 — FINAL QA AND RELEASE

Before calling v1 complete:

Run all automated tests.

Perform full manual workflow:

Open VeriForge
→
Login
→
New Clean
→
Upload CSV/XLSX/TXT
→
Select email column
→
Configure rules
→
Process
→
View results
→
Inspect corrected emails
→
Inspect removed emails
→
Inspect review emails
→
Download Valid
→
Download Corrected
→
Download Removed
→
Download Review
→
Download Full Report
→
Download Clean List
→
Logout

Check:

* No duplicate final clean emails
* No removed email enters clean export
* Review is excluded from clean output
* Corrections are traceable
* Domain limits work
* Gmail/public domains are exempt
* Authentication works
* No real password is committed to repository
* No SMTP verification exists
* Uploaded data is not sent to external APIs

Update:

README.md
BUILD_PROGRESS.md
.env.example

Document:

* Local setup
* How to run frontend
* How to run backend
* How to set username/password
* How to change company-domain limit
* How to add rules
* How to deploy privately

Only after all acceptance tests pass should v1 be considered complete.

---

# AUTHENTICATION

This is a private personal/team tool.

Do NOT build:

* Signup
* Registration
* Forgot password
* User profiles
* Public accounts
* Subscription system

Build one secure shared access gate.

Login screen:

Username
Password
Enter VeriForge

Credentials must come from environment variables:

VERIFORGE_USERNAME
VERIFORGE_PASSWORD

Do not hard-code credentials in frontend source.

Authentication must be enforced server-side.

Use:

* Secure session
* HttpOnly cookie
* SameSite protection
* Secure cookie when HTTPS is enabled
* Session expiration
* Logout
* Rate limiting for repeated failed logins

Suggested session duration:

12 hours, configurable.

---

# FILE INPUT

Support:

* CSV
* XLSX
* TXT

Also provide:

* Paste Emails

For uploaded spreadsheets:

Allow the user to choose which column contains emails.

If email column can be detected confidently, auto-select it but let the user change it.

Handle large lists efficiently without freezing the browser.

Normalize all imported values.

---

# PROCESSING ORDER

The exact order matters.

Use this pipeline:

1. Normalize
2. Safe corrections
3. Asset/file detection
4. System/generated email detection
5. SMS gateway detection
6. Placeholder/example detection
7. Disposable detection
8. Syntax validation
9. Exact duplicate detection
10. Domain-frequency filtering
11. Suspicious-pattern review
12. Final deduplication after corrections
13. Export classification

Correction must happen BEFORE rejection whenever the original value may contain a recoverable real email.

---

# NORMALIZATION

Before processing:

* Trim leading/trailing whitespace
* Lowercase email addresses
* Remove invisible Unicode characters
* Normalize common whitespace corruption
* Remove surrounding quotation marks where safe
* Preserve original raw value separately
* Never overwrite original_email

Data model should include:

original_email
normalized_email
final_email
status
category
reason
domain
was_corrected
correction_type

---

# RESULT CATEGORIES

Primary statuses:

VALID
CORRECTED
REMOVED
REVIEW

Detailed categories:

INVALID_SYNTAX
INVALID_ASSET_STRING
PLACEHOLDER
EXAMPLE_EMAIL
FAKE_OR_JUNK
SYSTEM_GENERATED
LEAD_ROUTER
SMS_GATEWAY
DISPOSABLE
DUPLICATE
EXCESS_DOMAIN
SUSPICIOUS_NUMERIC_LOCAL
CORRECTED_PHONE_PREFIX
CORRECTED_20_PREFIX
CORRECTED_TRAILING_JUNK
CORRECTED_LEADING_JUNK_CHARACTER
CORRECTED_TLD
CORRECTED_EXTRACTED_EMAIL

A removed email must always have a specific reason.

A corrected email must always show:

original_email
final_email
reason

---

# CORRECTION ENGINE

Corrections must be conservative.

Never aggressively modify an address unless confidence is high.

## Leading phone / numeric garbage

[928-776-0050info@hoamco.com](mailto:928-776-0050info@hoamco.com)
→ [info@hoamco.com](mailto:info@hoamco.com)

[85331602-850-7553info@grayhawkstructural.com](mailto:85331602-850-7553info@grayhawkstructural.com)
→ [info@grayhawkstructural.com](mailto:info@grayhawkstructural.com)

[245-4547inspiredrenovationsaz@gmail.com](mailto:245-4547inspiredrenovationsaz@gmail.com)
→ [inspiredrenovationsaz@gmail.com](mailto:inspiredrenovationsaz@gmail.com)

[520-349-0839chauncey@chaunceymeyer.com](mailto:520-349-0839chauncey@chaunceymeyer.com)
→ [chauncey@chaunceymeyer.com](mailto:chauncey@chaunceymeyer.com)

[592-3477arboriststandards@gmail.com](mailto:592-3477arboriststandards@gmail.com)
→ [arboriststandards@gmail.com](mailto:arboriststandards@gmail.com)

[888-9093sales@finessedesignstudio.com](mailto:888-9093sales@finessedesignstudio.com)
→ [sales@finessedesignstudio.com](mailto:sales@finessedesignstudio.com)

Detect leading phone-like garbage containing:

digits
hyphens
spaces
parentheses
plus signs

when followed by a plausible email.

---

## Accidental leading "20"

[20esther@estherboivininteriors.com](mailto:20esther@estherboivininteriors.com)
→ [esther@estherboivininteriors.com](mailto:esther@estherboivininteriors.com)

[20info@stairs4less.com](mailto:20info@stairs4less.com)
→ [info@stairs4less.com](mailto:info@stairs4less.com)

[20ryan@nelsondevelop.com](mailto:20ryan@nelsondevelop.com)
→ [ryan@nelsondevelop.com](mailto:ryan@nelsondevelop.com)

Do NOT remove `20` from every address.

Possible legitimate addresses:

[2020design@company.com](mailto:2020design@company.com)
[20twenty@company.com](mailto:20twenty@company.com)

Only correct when confidence is high.

---

## Trailing scraped text

[886-8401sellwithsusan1@gmail.comreceive](mailto:886-8401sellwithsusan1@gmail.comreceive)
→ [sellwithsusan1@gmail.com](mailto:sellwithsusan1@gmail.com)

[429-9922info@werkurbandesign.comwerkurbandesign.com](mailto:429-9922info@werkurbandesign.comwerkurbandesign.com)
→ [info@werkurbandesign.com](mailto:info@werkurbandesign.com)

Detect safely extractable emails.

Do not blindly truncate arbitrary domains.

---

## Trailing TLD garbage

[acquisitions@grossmancompany.comt](mailto:acquisitions@grossmancompany.comt)
→ [acquisitions@grossmancompany.com](mailto:acquisitions@grossmancompany.com)

Only fix when confidence is strong.

---

## High-confidence TLD correction

[acquisitions@grossmancompany.co](mailto:acquisitions@grossmancompany.co)
→ [acquisitions@grossmancompany.com](mailto:acquisitions@grossmancompany.com)

IMPORTANT:

`.co` is valid.

Do NOT globally convert `.co` to `.com`.

Only correct when supporting evidence exists.

---

## Leading stray character

[einfo@anticus.com](mailto:einfo@anticus.com)
→ [info@anticus.com](mailto:info@anticus.com)

Only correct when the remaining local part strongly matches a known role mailbox, for example:

info
sales
contact
admin
office
support
hello
leasing
careers
billing
accounts
estimating

Do NOT transform:

[eric@company.com](mailto:eric@company.com)
→ [ric@company.com](mailto:ric@company.com)

---

# ASSET / FILE STRING DETECTION

Remove:

[204@3x.png](mailto:204@3x.png)
[4@3x.png](mailto:4@3x.png)
[8@2x-1.webp](mailto:8@2x-1.webp)
[9@2x-2.webp](mailto:9@2x-2.webp)
[ajax-loader@2x.gif](mailto:ajax-loader@2x.gif)
[banner@2x-scaled.jpg](mailto:banner@2x-scaled.jpg)
[_@astro.cng6o1fu.css](mailto:_@astro.cng6o1fu.css)

[656924549d9b4a0707be08c0_01-phone-ui-one-maintenance@2x.webp](mailto:656924549d9b4a0707be08c0_01-phone-ui-one-maintenance@2x.webp)

[656a207ae8d416267a3908a6_02-computer-ui-one-maintenance@2x-p-1080.webp](mailto:656a207ae8d416267a3908a6_02-computer-ui-one-maintenance@2x-p-1080.webp)

Classification:

INVALID_ASSET_STRING

Detect:

@2x
@3x
@4x
-p-500
-p-800
-p-1080
150x150

and file extensions such as:

.webp
.png
.jpg
.jpeg
.gif
.svg
.css
.js
.ico
.woff
.woff2
.ttf
.mp4
.webm
.pdf
.zip

---

# SYSTEM GENERATED EMAILS

Remove:

[79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com](mailto:79baaa8e09c746d2b7401643b99792e0@sentry.wixpress.com)

[88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com](mailto:88170cb0c9d64f94b5821ca7fd2d55a4@sentry-next.wixpress.com)

[8c4075d5481d476e945486754f783364@sentry.io](mailto:8c4075d5481d476e945486754f783364@sentry.io)

Detect hash/UUID/high-entropy identifiers combined with known infrastructure domains.

Classification:

SYSTEM_GENERATED

Do not reject arbitrary long legitimate usernames solely because they are long.

---

# LEAD ROUTER EMAILS

Remove:

[800201.lead.429097796@leads.leadrouter.com](mailto:800201.lead.429097796@leads.leadrouter.com)

[900630.lead.lag.101024223@leads.leadrouter.com](mailto:900630.lead.lag.101024223@leads.leadrouter.com)

Classification:

LEAD_ROUTER

---

# SMS / MMS GATEWAY EMAILS

Remove:

[5132910955@vtext.com](mailto:5132910955@vtext.com)
[5134903008@txt.att.net](mailto:5134903008@txt.att.net)
[5132758569@txt.att.net](mailto:5132758569@txt.att.net)

Known gateway domains include:

vtext.com
txt.att.net
tmomail.net
messaging.sprintpcs.com
vmobl.com
mymetropcs.com
sms.myboostmobile.com
email.uscc.net

Classification:

SMS_GATEWAY

---

# PLACEHOLDER / EXAMPLE EMAILS

Remove obvious examples/placeholders such as:

[filler@godaddy.com](mailto:filler@godaddy.com)
[test@test.com](mailto:test@test.com)
[example@example.com](mailto:example@example.com)
[fake@gmail.com](mailto:fake@gmail.com)
[you@email.com](mailto:you@email.com)
[john@example.com](mailto:john@example.com)
[john@company.com](mailto:john@company.com)
[johns@gmail.com](mailto:johns@gmail.com)

Possible placeholder indicators:

filler
placeholder
dummy
sample
example
test
testing
fake
unknown
none
null
noemail
yourname
name
user
demo

Use contextual/conservative matching rather than substring-only deletion.

The strict example-email rule should remain configurable.

---

# DUPLICATES

Deduplicate case-insensitively.

Run deduplication again after corrections.

Example:

[acquisitions@grossmancompany.com](mailto:acquisitions@grossmancompany.com)
[acquisitions@grossmancompany.comt](mailto:acquisitions@grossmancompany.comt)

After correction both become:

[acquisitions@grossmancompany.com](mailto:acquisitions@grossmancompany.com)

Keep only one.

---

# COMPANY DOMAIN FREQUENCY

Default maximum:

2 emails per company domain.

Example:

[karen@retsy.com](mailto:karen@retsy.com)
[chris@retsy.com](mailto:chris@retsy.com)
[shawna@retsy.com](mailto:shawna@retsy.com)
[lara@retsy.com](mailto:lara@retsy.com)

With limit 2:

Keep first two.

Others:

EXCESS_DOMAIN

Do NOT apply this limit to public/free providers including:

gmail.com
outlook.com
hotmail.com
yahoo.com
icloud.com
aol.com

Support:

1
2
3
5
Custom

Default:

2

---

# SUSPICIOUS EMAILS

Do not automatically delete uncertain emails.

Examples:

[2067@scottsdaleshadows.com](mailto:2067@scottsdaleshadows.com)
[2080@scottsdaleshadows.com](mailto:2080@scottsdaleshadows.com)

Classify:

REVIEW
SUSPICIOUS_NUMERIC_LOCAL

Keep:

[4x4sedona@gmail.com](mailto:4x4sedona@gmail.com)

Keep:

[aa@societygrouppr.com](mailto:aa@societygrouppr.com)

Prefer REVIEW over REMOVED when confidence is insufficient.

---

# ROLE-BASED EMAILS

Keep addresses such as:

info@
sales@
admin@
contact@
support@

These are valid for VeriForge purposes unless another explicit rule rejects them.

---

# DESIGN

Use a bright, premium SaaS interface inspired by the cleanliness and usability of modern email SaaS dashboards such as Emailable.

Do NOT copy Emailable's:

* exact layout
* branding
* proprietary graphics
* wording
* component design
* visual identity

VeriForge must remain original.

Suggested theme:

Background: #F7F8FC
Cards: #FFFFFF
Primary: #6557E8
Primary Hover: #5748D7
Accent Blue: #4F8CFF
Text: #1D2433
Muted Text: #72798A
Border: #E8EAF1

Use soft shadows, rounded cards, clean typography, generous whitespace, and restrained color.

---

# PRIVACY

This is an internal tool.

Prefer temporary file processing.

Do not permanently store uploaded lists unless explicitly configured.

Delete temporary files after expiration.

Do not send email-list contents to third-party APIs.

Do not perform SMTP verification.

Do not send emails.

---

# FINAL ENGINEERING PRINCIPLES

1. Preserve original data.
2. Corrections occur before rejection.
3. Corrections must be conservative.
4. Do not convert every `.co` to `.com`.
5. Do not strip every leading `20`.
6. Do not strip arbitrary first letters.
7. Do not reject every numeric username.
8. Do not apply domain caps to public/free providers.
9. Run deduplication after correction.
10. Never claim SMTP verification.
11. Clean List must contain unique final addresses only.
12. Every non-valid record must have a human-readable reason.
13. Keep configurable detection data outside core code where practical.
14. Keep the engine independent from FastAPI and Next.js.
15. Add tests for every important detection/correction rule.
16. Do not move to the next development phase until current phase acceptance criteria pass.
17. Maintain `BUILD_PROGRESS.md` throughout development.
18. Keep the application runnable after each completed phase.
19. Do not over-engineer v1.
20. Functional accuracy takes priority over animation and visual polish.
