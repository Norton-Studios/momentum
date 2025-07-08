# GitHub Data Source

This data source is responsible for collecting repository data from GitHub and ingesting it into the `repository` resource.

## Data Schema

This data source populates the `Repository` model defined in the `plugins/resources/repository/db/schema.prisma` file.

## Environment Variables

To connect to the GitHub API, you need to provide a Personal Access Token with the `repo` scope.

-   `GITHUB_TOKEN`: Your GitHub Personal Access Token.
