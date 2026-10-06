import { backendOnline } from "./api";

const HELP = [
  "help              list commands",
  "clear             clear the terminal",
  "echo <text>       print text",
  "history           show previous commands",
  "status            check the backend",
  "ask <prompt>      send a prompt to the GPT assistant",
  "open ide|gpt|hud  switch panels",
  "record            start or stop voice capture",
  "exit              close the terminal",
  "Shell execution is not connected yet.",
];

/**
 * Runs one terminal command line.
 *
 * `ctx` supplies the actions the terminal can take:
 *   print(lines), clear(), history (array of earlier lines),
 *   ask(prompt) -> Promise<string>, open(target), toggleRecording(), close()
 */
export async function runCommand(line, ctx) {
  const [name = "", ...args] = line.trim().split(/\s+/);
  const rest = line.trim().slice(name.length).trim();

  switch (name.toLowerCase()) {
    case "":
      return;
    case "help":
      ctx.print(HELP);
      return;
    case "clear":
      ctx.clear();
      return;
    case "echo":
      ctx.print([rest]);
      return;
    case "history":
      ctx.print(ctx.history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`));
      return;
    case "status":
      ctx.print([(await backendOnline()) ? "Backend online" : "Backend offline"]);
      return;
    case "ask":
      if (!rest) {
        ctx.print(["usage: ask <prompt>"]);
        return;
      }
      try {
        ctx.print((await ctx.ask(rest)).split("\n"));
      } catch (e) {
        ctx.print([`Assistant offline: ${e.message}`]);
      }
      return;
    case "open": {
      const target = (args[0] || "").toLowerCase();
      if (!["ide", "gpt", "hud"].includes(target)) {
        ctx.print(["usage: open ide|gpt|hud"]);
        return;
      }
      ctx.open(target);
      return;
    }
    case "record":
      ctx.toggleRecording();
      return;
    case "exit":
      ctx.close();
      return;
    default:
      ctx.print([`${name}: command not found (type help)`]);
  }
}
