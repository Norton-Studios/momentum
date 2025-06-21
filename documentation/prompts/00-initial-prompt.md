Create a plan and set of prompts for AI agents to develop an extensible web app that measures developer productivity. The goal is to create a product that can be rolled out to different organisations either in a multi client SaaS configuration or a self hosted option.
The project should be structured with AI in mind. There should be a documentation folder to capture all previous prompts, the overall design of the system, architecture decision records, rules for ai agents and the goals of the project. It should be modular and minimalist.
There should be a plugin based architecture where there are different metrics like pipeline runs, pipelines stages and then different data sources to feed into those measures such as Jenkins or GitHub action pipelines.
There should be a monorepo with the top level folders: documentation, frontend, API, crons, reports, metrics, data-sources and e2e-tests. Inside metrics, data sources and reports there may be db, frontend, cron and api folders, for example /data-sources/jenkins/cron or /metrics/pipeline/frontend. The base frontend, api and cron folders will scan all the reports, data sources and metrics for APIs, frontend react components and crons to run.
It should use a node.js with typescript written with express 5 and use remix/react for the frontend. It should use Prisma ORM and postgres for its database. The tables in the metrics should track the data source they came from.
Where possible make each data source, metric and report as self contained as possible so each metric should have its own Prisma definitions in the db folder. Reports may also have their own DB structure for things like views.
There should be a way of marking the dependencies of the data sources so that if collecting pipelines from Jenkins has a dependency on having repositories we can track that then build a dependency graph to ensure we collect data in the correct order. We will also need a way of marking the dependencies between Prisma ORM files (it may already have a way of doing that so it might not be necessary).
It should be possible to vary the collection window to incrementally catch up from the last collection point. Running the script on the same collection window should be idempotent using upsert.
I imagine there will be a data_source table that tracks the dependencies between data sources and the last time they were collected and the last date data was collected too.
For the multi client SaaS version it should be possible to store different clients data in different databases so we may need to be able to dynamically toggle between db clients depending on the user using the system.
The reports should be scripts the crons can trigger that run queries and perform processing and then generate a report. There will need to be a queue table to manage the reports. Make report delivery modular and configurable so they can be emailed or potentially delivered by sftp.
For the website we will need to think about the basic pages but also the sign up and  onboarding flow. I imagine each client will have their own database so we will need to dynamically create them on the fly as they sign up. We can then ask them to input basic information like their teams and which repositories they own.
I think there will be some mandatory metrics such as the repositories and teams with a mapping between teams and repositories. We should offer a couple of ways for people to assign repositories to teams: a regex matcher on the repository name or a label. There may be other options too (feel free to suggest some).
Break the plan down into bitesize chunks that agents can handle, covering the initial setup of the project structure, then set up of each component, then adding metrics and data sources. We will also need to think about adding a cicd pipeline.
Also provide a set of rules and instructions for the AI agents to follow, such as running tests after making changes and updating documentation.

Tech stack:
- npm workspaces
- biome v2 (no eslint or prettier)
- express 5.x with remix
- Prisma ORM
