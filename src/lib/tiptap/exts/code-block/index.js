import { ReactNodeView } from '@tiptap/react';
import { lowlight } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CodeBlockComponent from './CodeBlockComponent.jsx';

export default CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeView(CodeBlockComponent);
  },
}).configure({ lowlight });