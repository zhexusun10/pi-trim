import { fauxProvider, fauxAssistantMessage, type FauxResponseFactory } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  const faux = fauxProvider({ provider: "pi-trim-test", models: [{ id: "local" }] });
  const inspect: FauxResponseFactory = (context) => {
    const system = context.messages.find((message) => message.role === "system");
    if (!system) throw new Error("Missing system message");
    faux.appendResponses([inspect]);
    return fauxAssistantMessage(JSON.stringify({
      preamble: system.sections?.preamble,
      docs: system.sections?.docs,
      toolsSection: system.sections?.tools,
      addendum: system.sections?.addendum,
      tools: system.toolsAdded?.map((tool) => tool.name),
    }));
  };
  faux.setResponses([inspect]);
  pi.registerProvider(faux.provider);
}
