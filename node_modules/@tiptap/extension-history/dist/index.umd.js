(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@tiptap/core'), require('@tiptap/pm/history')) :
  typeof define === 'function' && define.amd ? define(['exports', '@tiptap/core', '@tiptap/pm/history'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@tiptap/extension-history"] = {}, global.core, global.history));
})(this, (function (exports, core, history) { 'use strict';

  const History = core.Extension.create({
      name: 'history',
      addOptions() {
          return {
              depth: 100,
              newGroupDelay: 500,
          };
      },
      addCommands() {
          return {
              undo: () => ({ state, dispatch }) => {
                  return history.undo(state, dispatch);
              },
              redo: () => ({ state, dispatch }) => {
                  return history.redo(state, dispatch);
              },
          };
      },
      addProseMirrorPlugins() {
          return [
              history.history(this.options),
          ];
      },
      addKeyboardShortcuts() {
          return {
              'Mod-z': () => this.editor.commands.undo(),
              'Mod-Z': () => this.editor.commands.undo(),
              'Mod-y': () => this.editor.commands.redo(),
              'Mod-Y': () => this.editor.commands.redo(),
              'Shift-Mod-z': () => this.editor.commands.redo(),
              'Shift-Mod-Z': () => this.editor.commands.redo(),
              // Russian keyboard layouts
              'Mod-я': () => this.editor.commands.undo(),
              'Shift-Mod-я': () => this.editor.commands.redo(),
          };
      },
  });

  exports.History = History;
  exports["default"] = History;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
