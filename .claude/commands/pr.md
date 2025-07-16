# Create a PR

- Run the following tasks in parallel agents:
    - Ensure you're on an appropriate branch, if not create a new branch
    - Check that the progress is updated in `documentation/PROGRESS.md`
    - Update the main documentation if necessary
    - Ensure the code is formatted by running `yarn format`
    - Ensure the code is linted by running `yarn lint`
    - Ensure tests are passing by running `yarn test`
    - Ensure the e2e tests are passing by running `yarn test:e2e`
    - Create a summary of the context and conversation in `documentation/prompts/[branch-name].md` - filter out any sensitive information or profanity
- Commit the changes with a clear message
- Create the PR with a clear title and description. If a PR already exists, update it with the latest changes.
