# IEM GPT

Vue 3 chat workspace with a Koa API and an OpenAI-compatible model endpoint.

## Local Development

Requires Node.js 22.18 or newer and pnpm.

```sh
pnpm install
pnpm dev
```

The frontend proxies `/api` to `http://127.0.0.1:3000`. Use `API_PROXY_TARGET` to select a different backend. An unconfigured backend serves health information and returns a visible configuration error for chat requests.

Set these values in the git-ignored `.env` file; `.env.example` lists the available options:

- `DEEPSEEK_API_KEY` (or `OPENAI_API_KEY`): upstream credential, used only by the server.
- `DEEPSEEK_BASE_URL` and `DEEPSEEK_MODEL`: upstream endpoint and model.
- `CHAT_API_TOKEN`: printable ASCII access token without spaces. Enter the same token in the frontend connection settings. The frontend keeps it in memory, not browser storage.
- `HOST` and `PORT`: API listener, defaulting to `127.0.0.1:3000`.

Restart the API after changing `.env`. The default model name is inherited from the project; availability must be checked with your provider.

## Deployment

```sh
pnpm build
NODE_ENV=production pnpm start
```

Production requires both an upstream key and `CHAT_API_TOKEN`. The server serves `dist` and the API from one origin. Use HTTPS and an appropriately configured reverse proxy when exposing it beyond localhost.

For a separate frontend origin, configure `VITE_API_BASE_URL` before building and list the frontend origin in the server's `CORS_ORIGINS` (comma-separated). Do not put the upstream API key into a `VITE_*` variable.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Tests use mocked upstream responses and do not spend model API credits. They cover SSE framing, UTF-8 splits, authorization, message validation, conversation context, cancellation, failures, retry, and Markdown sanitization. Vue component checking uses `vue-tsc` with TypeScript 6; the current checker does not support the project's previous native TypeScript 7 CLI.

## Conversation Data

Conversations are kept in the current tab's session storage and can be exported as Markdown. The access token is not included in exports or storage. Requests send the conversation to the configured model provider. Assistant HTML is sanitized with DOMPurify; embedded remote media are blocked.
