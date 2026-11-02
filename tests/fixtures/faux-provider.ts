import { fauxProvider, fauxAssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const faux = fauxProvider({ provider: "pi-trim-test", models: [{ id: "local" }] });
  faux.setResponses([(context) => {
    const system = context.messages.find((message) => message.role === "system");
    if (!system) throw new Error("Missing system message");
    return fauxAssistantMessage(JSON.stringify({
      preamble: system.sections?.preamble,
      docs: system.sections?.docs,
      addendum: system.sections?.addendum,
      tools: system.toolsAdded?.map((tool) => tool.name),
    }));
  }]);
  pi.registerProvider(faux.provider);
}
