# Create a PR

- Run the following tasks in parallel agents:
    - Ensure you're on an appropriate branch, if not create a new branch
    - Check that the progress is updated in `docs/PROGRESS.md` if there is no relevant items in the file, don't add them
    - Update the `docs/ARCHITECTURE.md` for any MAJOR architectural changes made in this branch. Only do it if necessary
    - Add an ADR in `docs/adr/` for any MAJOR architectural changes made in this branch. Only do it if necessary
    - Create a summary of the context and conversation in `docs/prompts/[branch-name].md` - filter out any sensitive information or profanity
- Commit the changes with a clear message
- Create the PR with a clear title and description. If a PR already exists, update it with the latest changes.
