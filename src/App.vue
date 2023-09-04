<template>
  <div v-if="editor" class="top-bar w-full bg-[#F9F9F9] dark:bg-[#1a1a1a] rounded-xl">
  <div v-if="editor">
    <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }">
      <i class="ri-paragraph"></i>
    </button>
    <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }">
      h1
    </button>
    <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }">
      h2
    </button>
    <button @click="editor.chain().focus().toggleBold().run()" :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }">
      <i class="ri-bold"></i>
    </button>
    <button @click="editor.chain().focus().toggleItalic().run()" :disabled="!editor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }">
      <i class="ri-italic"></i>
    </button>
    <button @click="editor.chain().focus().toggleStrike().run()" :disabled="!editor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }">
      <i class="ri-strikethrough"></i>
    </button>
    <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">
      <i class="ri-list-unordered"></i>    
    </button>
    <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }">
      <i class="ri-list-ordered"></i>    
    </button>
    <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'is-active': editor.isActive('codeBlock') }">
      <i class="ri-code-box-line"></i>
    </button>
    <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }">
      <i class="ri-double-quotes-l"></i>
    </button>
  </div>
  </div>
  <div class="py-4">
    <input v-model="noteTitle" class="text-lg font-bold w-full py-2 px-4 !outline-none" placeholder="Enter title" @input="saveContentToLocalStorage"/>
    <editor-content :editor="editor" />
</div>

<div>
  <!-- Notes List -->
  <div class="notes-list">
    <button v-for="(note, index) in notes" :key="index" @click="switchNote(index)" :class="{ 'active': activeNoteIndex === index }">
      {{ note.title }}
    </button>
    <button @click="createNewNote">New Note</button>
  </div>

  <!-- Editor -->
  <div class="editor-container">
    <div v-if="editor" class="top-bar">
      <!-- Your existing buttons for formatting -->
    </div>
    <div class="py-4">
      <input v-model="noteTitle" class="text-lg font-bold w-full py-2 px-4 !outline-none" placeholder="Enter title" @input="saveNoteToLocalStorage" />
      <editor-content :editor="editor" />
    </div>
  </div>
</div>
</template>

<script>
import StarterKit from '@tiptap/starter-kit';
import BulletList from '@tiptap/extension-bullet-list';
import { Editor, EditorContent } from '@tiptap/vue-3';

export default {
  components: {
    EditorContent,
    BulletList,
  },

  data() {
    return {
      editor: null,
      noteTitle: '',
      notes: [], // List of notes
      activeNoteIndex: 0, // Index of the currently active note
    };
  },

  mounted() {
    this.editor = new Editor({
      extensions: [
        StarterKit,
      ],
    });

    // Load notes and content from local storage when the page loads
    this.loadNotesFromLocalStorage();

    this.editor.on('update', this.saveNoteToLocalStorage);
  },

  beforeUnmount() {
    this.editor.off('update', this.saveNoteToLocalStorage);
    this.editor.destroy();
  },

  methods: {
    // Switch to the selected note
    switchNote(index) {
      this.saveNoteToLocalStorage(); // Save the current note before switching
      this.activeNoteIndex = index;
      this.editor.commands.setContent(this.notes[index].content);
      this.noteTitle = this.notes[index].title;
    },

    // Create a new note
    createNewNote() {
      const newNote = {
        title: 'New Note',
        content: '',
      };
      this.notes.push(newNote);
      this.activeNoteIndex = this.notes.length - 1;
      this.editor.commands.setContent('');
      this.noteTitle = newNote.title;
      this.saveNoteToLocalStorage();
    },

    // Save the current note to local storage
    saveNoteToLocalStorage() {
      if (!this.editor) return;

      const editorContent = this.editor.getHTML();
      const note = {
        title: this.noteTitle,
        content: editorContent,
      };

      this.notes[this.activeNoteIndex] = note;
      localStorage.setItem('notes', JSON.stringify(this.notes));
    },

    // Load notes from local storage
    loadNotesFromLocalStorage() {
      const savedNotes = localStorage.getItem('notes');
      if (savedNotes) {
        this.notes = JSON.parse(savedNotes);
        console.log('Notes loaded from local storage');
      }
    },
  },
};
</script>

<style lang="scss">
.tiptap {
  > * + * {
    margin-top: 0.75em;
  }

ul ,
  ol {
    padding: 0 1rem;
  }


  code {
    background-color: rgba(#E4E4E6, 5);
    color: #E4E4E6;
  }

  pre {
    background: #0D0D0D;
    color: #FFF;
    font-family: 'JetBrainsMono', monospace;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;

    code {
      color: inherit;
      padding: 0;
      background: none;
      font-size: 0.8rem;
    }
  }

  img {
    max-width: 100%;
    height: auto;
  }

  blockquote {
    padding-left: 1rem;
    border-left: 4px solid;
    border-left-color: #E4E4E6;
  }

  hr {
    border: none;
    border-top: 2px solid rgba(#0D0D0D, 0.1);
    margin: 2rem 0;
  }
}
</style>