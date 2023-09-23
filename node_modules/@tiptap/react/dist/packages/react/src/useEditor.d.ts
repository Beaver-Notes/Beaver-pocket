import { EditorOptions } from '@tiptap/core';
import { DependencyList } from 'react';
import { Editor } from './Editor.js';
export declare const useEditor: (options?: Partial<EditorOptions>, deps?: DependencyList) => Editor | null;
