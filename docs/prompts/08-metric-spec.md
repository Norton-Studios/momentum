Help me write a spec (@documentation/specs/metrics.md) for the metrics we want to display on the website. Lets brainstorm the developer productivity metrics we want to display and how best to structure them


I'm thinking of breaking them into three broad categories
- organisation
- team
- individual

# Organisational

- total number of cves with a chart showing each severity level. 
- overall pipeline stability (rolling average of % master pipeline successes)
- delivery rates (number of successful master pipeline runs)
- time of day commits
- day of week commits

# Team

Delivery:
- Number of successful master pipeline runs
- Number of open merge requests
- Average time to merge requests
- Cycle time: Merge Request duration and JIRA ticket time (measuring time from first non default status to close status)
- WIP: Number of Merge Requests and number of JIRAs in a non default and non closed state at any one time
- Average ticket time in JIRA column (exclusive of closed and default states) 
Operational:
- Master Pipeline failure rates (number of failed pipeline runs)
- Average Master Pipeline duration
- Distribution of steps that cause pipeline failures
- Code review time (average time from MR creation to first review)
Quality:
- Code churn (lines of code added/removed over time)
- Code complexity (average cyclomatic complexity of code changes)
- Code coverage (percentage of code covered by tests)
- Code review comments (number of comments per MR, average time to resolve comments)
- Sonar Qube issues (number of issues found, severity levels)
- Code smells (number of code smells found, severity levels)
Individual
- Number of commits
- Number of lines of code added/removed
- Number of merge requests created
- Average time to first review on merge requests
- Average time to resolve comments on merge requests
- Number of code review comments made
- Commit streak (number of commits over time)
- Time of day / day of week of commits

# General notes

Charts should be interactive, allowing the user to turn on and off different data sets when there are multiple data sets on the same chart (e.g. chart showing CVEs 
severity should be able to toggle the different severities on and off

There should be a date range selector with default options of 90 days, 60 days, 30 days, 7 days.

I'm not sure how best to structure the metrics on the page. Perhaps we can have a dashboard-like layout with each category having its own section, and within each section, we can have cards or panels for each metric. 

I am also not sure how to do the navigation. When you select a category under teams should you see a comparison of all teams, or should you select a team first and then see the metrics for that team? Maybe we make that behaviour consistent for teams and individuals, but organisations is just top level metrics.

Read https://waydev.co/features/ for inspiration on how to structure the metrics and what additional metrics might be useful.