# limbo theme template

This template is a starting point for creating a [limbo](https://github.com/limbo-llm) theme with:

-   [SCSS](https://sass-lang.com)

## Useful resources

-   todo include link to limbo developer and style docs

## Development

To start development and automatically rebuild your theme when changed, run one of the following command depending on your package manager.

```sh
npm run watch

# or

pnpm watch

# or

yarn watch
```

### Hot reloading

The limbo desktop app can watch your custom styles directory for changes. To copy your built theme to the limbo styles directory after a build automatically, create a file `.env` with the absolute path to your local limbo styles directory.

#### Example

```sh
# usual location on macOS
LIMBO_STYLES_DIR_PATH="/Users/[user]/Library/Application Support/limbo/styles"
```
