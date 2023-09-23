var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/prosemirror-trailing-node/src/index.ts
var src_exports = {};
__export(src_exports, {
  trailingNode: () => trailingNode
});
module.exports = __toCommonJS(src_exports);

// packages/prosemirror-trailing-node/src/trailing-node-plugin.ts
var import_prosemirror_state = require("prosemirror-state");
var import_core_helpers = require("@remirror/core-helpers");
var trailingNodePluginKey = new import_prosemirror_state.PluginKey("trailingNode");
function trailingNode(options) {
  const { ignoredNodes = [], nodeName = "paragraph" } = options ?? {};
  const ignoredNodeNames = (0, import_core_helpers.uniqueArray)([...ignoredNodes, nodeName]);
  let type;
  let types;
  return new import_prosemirror_state.Plugin({
    key: trailingNodePluginKey,
    appendTransaction(_, __, state) {
      const { doc, tr } = state;
      const shouldInsertNodeAtEnd = trailingNodePluginKey.getState(state);
      const endPosition = doc.content.size;
      if (!shouldInsertNodeAtEnd) {
        return;
      }
      return tr.insert(endPosition, type.create());
    },
    state: {
      init: (_, { doc, schema }) => {
        var _a;
        const nodeType = schema.nodes[nodeName];
        if (!nodeType) {
          throw new Error(`Invalid node being used for trailing node extension: '${nodeName}'`);
        }
        type = nodeType;
        types = Object.values(schema.nodes).map((node) => node).filter((node) => !ignoredNodeNames.includes(node.name));
        return (0, import_core_helpers.includes)(types, (_a = doc.lastChild) == null ? void 0 : _a.type);
      },
      apply: (tr, value) => {
        var _a;
        if (!tr.docChanged) {
          return value;
        }
        return (0, import_core_helpers.includes)(types, (_a = tr.doc.lastChild) == null ? void 0 : _a.type);
      }
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  trailingNode
});
