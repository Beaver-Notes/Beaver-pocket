import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeWithPos, Predicate, Range } from '../types.js';
/**
 * Same as `findChildren` but searches only within a `range`.
 */
export declare function findChildrenInRange(node: ProseMirrorNode, range: Range, predicate: Predicate): NodeWithPos[];
