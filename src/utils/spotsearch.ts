import { SpotSearch, SpotItem as PluginSpotItem } from '@daniele-rolli/capacitor-spotsearch';
import { useNoteStore } from '@/store/note';

const BATCH = 100;

async function chunked<T>(arr: T[], size = BATCH): Promise<T[][]> {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

export async function indexData() {
    const noteStore = useNoteStore.getState();
    const notes = Object.values(noteStore.data || {});

    const items: PluginSpotItem[] = notes.map((n: any) => ({
        id: String(n.id),
        domain: 'notes',
        title: n.title || '',
        snippet:
            n.content && typeof n.content === 'object'
                ? getPlainText(n.content).slice(0, 500)
                : '',
        keywords: Array.isArray(n.labels) ? n.labels : [],
        url: `beaver-pocket://note/${n.id}`,
    }));

    const groups = await chunked(items);
    for (const group of groups) {
        await SpotSearch.indexItems({ items: group });
    }
}

export async function clearIndex() {
    await SpotSearch.deleteDomain({ domain: 'notes' });
}

export function getPlainText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getPlainText).join(' ');
    if (typeof node === 'object' && node.text) return node.text;
    if (typeof node === 'object' && Array.isArray(node.content)) {
        return node.content.map(getPlainText).join(' ');
    }
    return '';
}
