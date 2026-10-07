import { backendOnline } from "./api";

const HELP = [
  "help              list commands",
  "clear             clear the terminal",
  "echo <text>       print text",
  "history           show previous commands",
  "status            check the backend",
  "ask <prompt>      send a prompt to the assistant",
  "model [name]      list models, or choose which answers first",
  "open ide|gpt|hud  switch panels",
  "record            start or stop voice capture",
  "mute / unmute     turn spoken replies off or on",
  "exit              close the terminal",
  "Shell execution is not connected yet.",
];

/**
 * Runs one terminal command line.
 *
 * `ctx` supplies the actions the terminal can take:
 *   print(lines), clear(), history (array of earlier lines),
 *   ask(prompt) -> Promise<string>, open(target), toggleRecording(),
 *   setSpeech(on), close(), providers ({ active, providers } or null),
 *   selectProvider(id) -> Promise
 *
 * Resolves to true if the command succeeded, false if it failed or was misused.
 */
export async function runCommand(line, ctx) {
  const [name = "", ...args] = line.trim().split(/\s+/);
  const rest = line.trim().slice(name.length).trim();

  switch (name.toLowerCase()) {
    case "":
      return true;
    case "help":
      ctx.print(HELP);
      return true;
    case "clear":
      ctx.clear();
      return true;
    case "echo":
      ctx.print([rest]);
      return true;
    case "history":
      ctx.print(ctx.history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`));
      return true;
    case "status": {
      const online = await backendOnline();
      ctx.print([online ? "Backend online" : "Backend offline"]);
      return online;
    }
    case "ask":
      if (!rest) {
        ctx.print(["usage: ask <prompt>"]);
        return false;
      }
      try {
        ctx.print((await ctx.ask(rest)).split("\n"));
        return true;
      } catch (e) {
        ctx.print([e.message]);
        return false;
      }
    case "open": {
      const target = (args[0] || "").toLowerCase();
      if (!["ide", "gpt", "hud"].includes(target)) {
        ctx.print(["usage: open ide|gpt|hud"]);
        return false;
      }
      ctx.open(target);
      return true;
    }
    case "model": {
      const list = ctx.providers;
      if (!list) {
        ctx.print(["Backend offline: model list unavailable"]);
        return false;
      }
      const wanted = (args[0] || "").toLowerCase();
      if (wanted) {
        const match = list.providers.find((p) => p.id === wanted || p.label.toLowerCase() === wanted);
        if (!match) {
          ctx.print([`Unknown model: ${args[0]} (try ${list.providers.map((p) => p.id).join(", ")})`]);
          return false;
        }
        await ctx.selectProvider(match.id);
        ctx.print([`${match.label} now answers first${match.available ? "" : ` (offline: ${match.reason})`}`]);
        return true;
      }
      ctx.print(
        list.providers.map(
          (p) =>
            `${p.active ? "*" : " "} ${p.id.padEnd(9)} ${(p.model || "-").padEnd(28)} ${p.available ? "ready" : p.reason}`
        )
      );
      return true;
    }
    case "record":
      ctx.toggleRecording();
      return true;
    case "mute":
    case "unmute": {
      const on = name.toLowerCase() === "unmute";
      ctx.setSpeech(on);
      ctx.print([on ? "Spoken replies on" : "Spoken replies off"]);
      return true;
    }
    case "exit":
      ctx.close();
      return true;
    default:
      ctx.print([`${name}: command not found (type help)`]);
      return false;
  }
}
