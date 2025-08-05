import { useLabelStore } from "@/store/label";
import Suggestion from "./suggestion";

const labelStore = useLabelStore.getState();

const LabelSuggestion = Suggestion({
  name: "noteLabel",
  props: {
    showAdd: true,
    onAdd: async (query: string, command: (args: { id: string }) => void) => {
      const name = await labelStore.add(query);
      if (name) {
        command({ id: name });
      }
    },
    onSelect: ({
      item,
      command,
    }: {
      item: string;
      command: (args: { id: string }) => void;
    }) => {
      command({ id: item });
    },
  },
}).configure({
  HTMLAttributes: {
    class: "mention",
  },
  suggestion: {
    char: "#",
    items: async ({ query }: { query: string }) => {
      const labels = await labelStore.retrieve();
      return labels
        .filter((label: any) =>
          label.toLowerCase().startsWith(query.toLowerCase())
        )
        .slice(0, 7);
    },
  },
});

export default LabelSuggestion;
