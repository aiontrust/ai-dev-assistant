# SATI Avatar

Self-contained 3D bust for the AI Dev Assistant. Vite + TypeScript, no React. A VS Code webview can load the built files, and the SATI HUD in `frontend/` can embed the same page later (iframe, or `mountAvatar` from a bundler).

The bust is framed on the head and shoulders over a transparent canvas. The page background uses the HUD palette from `frontend/src/styles/hud.css` (`#001c2b`, `#71dfff`, `#9dcdf1`). Pass `?background=transparent` when the host already paints the backdrop.

## Model

No `.vrm` is committed. Pixiv's three-vrm examples (including `VRM1_Constraint_Twist_Sample`) are under the [VRM Public License 1.0](https://vrm.dev/licenses/1.0/), not a permissive license: redistribution defaults to off, and use is limited by each file's meta. Until you export a character from VRoid Studio, the module draws a procedural placeholder and drives the same behaviours on it. That mesh is compiled into the JavaScript in `dist/assets/`; the demo does not fetch a model file unless you set a URL.

Loading another model does not require a code change:

- Demo: **Load URL**, the file picker, or open `/demo.html?model=./models/you.vrm`
- Host message: `{ "type": "loadModel", "url": "https://…/you.vrm" }`
- `"placeholder"` (or an empty config) restores the procedural bust
- Build-time default: `VITE_AVATAR_MODEL_URL`
- Page global, set before the module runs: `window.__SATI_AVATAR_MODEL_URL__`

Put a local file in `avatar/public/…` and it is served at the site root. You are responsible for that file's license if you commit it.

VRM expressions used for host names:

| Host | VRM preset |
| --- | --- |
| `neutral` | `neutral` |
| `happy` | `happy` |
| `thinking` | `relaxed` |
| `surprised` | `surprised` |
| `sad` | `sad` |

`thinking` also tilts the head and darts the eyes. `listening` leans in. `error` holds `sad`. Blink, look-at, and the `aa` / `ih` / `ou` / `ee` / `oh` visemes use the matching presets when the VRM defines them.

## Scripts

```sh
cd avatar
npm install
npm test
npm run dev    # demo at /, also available at /demo.html
npm run build  # static avatar/dist for the webview and for Cloudflare
npm run preview
```

`dist/` is a build output and is not committed. `/` and `/demo.html` are the demo (avatar plus control panel). `/embed.html` is the same bust without the panel, which is what the webview should load. Asset URLs are relative (`./assets/…`), so they resolve when `dist/` is the site root. Copy `dist/` into the extension (for example `media/avatar`) before packaging.

## Behaviours

- Idle breathing and sway, random blinks (including the occasional double blink).
- Look-at follows the pointer, a normalised `{x, y}` point, or the camera.
- Expressions: `neutral`, `happy`, `thinking`, `surprised`, `sad`. Optional `intensity` (0–1) and `durationMs` (then the face returns to the current state's expression). A `state` message resets the face to that state's expression.
- `speak` with `audioUrl` or `audioBase64` (raw base64 or a `data:audio/…;base64,` URL) plays the clip and maps an AnalyserNode's loudness and spectral centroid onto the five visemes. `audioBase64` wins when both are set.
- `speak` with only `text` uses `speechSynthesis` (optional `voice` name or BCP-47 tag) and a timed mouth flap. If synthesis is missing or errors immediately, the flap still runs for a duration estimated from the text. If audio fails and text is present, synthesis is the fallback.
- `stopSpeaking` cuts audio and synthesis.

## Message contract

Source of truth: [`src/protocol.ts`](src/protocol.ts). Import it (`@sati/avatar/protocol` via the package `exports` map) or copy the file into the extension. Payloads are plain JSON objects. The postMessage and WebSocket adapters do not wrap them.

Host → avatar:

| `type` | Fields |
| --- | --- |
| `speak` | `text`, optional `audioUrl`, `audioBase64`, `voice` |
| `stopSpeaking` | — |
| `state` | `value`: `idle` \| `listening` \| `thinking` \| `speaking` \| `error` |
| `expression` | `name`, optional `intensity`, `durationMs` |
| `lookAt` | `{x, y}` in -1..1 (clamped) **or** `{target: "cursor" \| "camera"}` |
| `loadModel` | `url`, or `"placeholder"` |

Avatar → host:

| `type` | Fields |
| --- | --- |
| `ready` | Sent once the view can take messages |
| `speakingStarted` / `speakingEnded` | — |
| `modelLoaded` | `url` (`string` or `null`), `source`: `"vrm"` \| `"placeholder"` |
| `error` | `message` |
| `clicked` | The user pressed the avatar |

`postMessage` works with `acquireVsCodeApi()` inside a webview and with `window.postMessage` otherwise (the parent frame when embedded, otherwise the same window, which is what the demo uses). A WebSocket transport sends one JSON text frame per message:

```ts
import { createWebSocketTransport, mountAvatar } from '@sati/avatar';

mountAvatar(document.querySelector('#avatar')!, {
  transport: createWebSocketTransport('ws://127.0.0.1:8765'),
});
```

Invalid host messages with a string `type` produce an `error` reply. The avatar ignores its own outbound messages if they echo back through `window.postMessage`.

## VS Code webview

Framework-agnostic. Copy `avatar/dist` to `media/avatar` inside the extension and load `embed.html` (not the demo). The built HTML uses relative `./assets/…` URLs and no `crossorigin` attribute, so the snippet below can rewrite them with `asWebviewUri`.

```js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

function avatarHtml(webview, distUri) {
  const indexPath = path.join(distUri.fsPath, 'embed.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/(href|src)="\.\/([^"]+)"/g, (_, attr, rel) => {
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(distUri, rel));
    return `${attr}="${uri}"`;
  });
  const csp = [
    "default-src 'none'",
    `img-src ${webview.cspSource} https: data:`,
    `media-src ${webview.cspSource} https: blob: data:`,
    // 'unsafe-inline' covers style attributes three.js may set on the canvas.
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource} https: http: ws: wss: blob:`,
    `worker-src ${webview.cspSource} blob:`,
  ].join('; ');
  return html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
}

function openAvatar(context) {
  const distUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'avatar');
  const panel = vscode.window.createWebviewPanel('satiAvatar', 'SATI Avatar', vscode.ViewColumn.Beside, {
    enableScripts: true,
    localResourceRoots: [distUri],
  });
  panel.webview.html = avatarHtml(panel.webview, distUri);

  panel.webview.onDidReceiveMessage((message) => {
    if (message.type === 'ready') {
      panel.webview.postMessage({ type: 'state', value: 'idle' });
    } else if (message.type === 'speakingEnded') {
      panel.webview.postMessage({ type: 'state', value: 'idle' });
    }
  });

  return panel;
}

// Later, from the extension host:
// panel.webview.postMessage({ type: 'speak', text: 'Build finished.' });
// panel.webview.postMessage({ type: 'state', value: 'thinking' });
// panel.webview.postMessage({ type: 'loadModel', url: 'https://example.com/you.vrm' });
```

A sidebar view is the same HTML. Register a provider and use `resolveWebviewView` instead of `createWebviewPanel`:

```js
vscode.window.registerWebviewViewProvider('sati.avatar', {
  resolveWebviewView(webviewView) {
    const distUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'avatar');
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [distUri] };
    webviewView.webview.html = avatarHtml(webviewView.webview, distUri);
    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.type === 'clicked') {
        // focus the chat, start listening, etc.
      }
    });
  },
});
```

`acquireVsCodeApi()` is called once inside the page. The extension receives avatar messages with `onDidReceiveMessage` and sends host messages with `webview.postMessage`. Contribution point for the view:

```json
"views": { "sati": [{ "type": "webview", "id": "sati.avatar", "name": "Avatar" }] }
```

Audio and model URLs must be allowed by `connect-src` / `media-src`. `speechSynthesis` is the browser API inside the Chromium webview; a missing voice still moves the mouth. For a fully transparent webview, load `embed.html?background=transparent` (rewrite that query in the HTML or set the body class yourself).

## Cloudflare

`avatar/wrangler.jsonc` publishes `dist/` as Workers static assets under the name `ai-dev-avatar`. The file has no account id, token, or other credentials. Do not put those in the repo. Connect the Git repository in the Cloudflare dashboard (Workers Builds) with:

| Setting | Value |
| --- | --- |
| Root directory | `avatar` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node.js version | 22 |

The worker origin serves the demo at `/` and `/demo.html`. `/embed.html` is the panel-free page. There is no single-page-application fallback: these are real HTML files, and a fallback that served `index.html` from some other path would break the relative `./assets` URLs. `html_handling` is `none` for the same reason (no trailing-slash redirect).

## Embedding in the HUD later

The React app does not import this package. When you want it on the dashboard, either iframe `dist/embed.html` (or `dist/index.html` for the demo) or mount the runtime from a bundler that compiles this TypeScript:

```ts
import { mountAvatar } from '../avatar/src/avatar';

mountAvatar(document.querySelector('#avatar-slot'), {
  background: 'transparent',
  modelUrl: null,
});
```

Pass a `transport` from `createPostMessageTransport` or `createWebSocketTransport` if the HUD should not use the default `window.postMessage` channel.
