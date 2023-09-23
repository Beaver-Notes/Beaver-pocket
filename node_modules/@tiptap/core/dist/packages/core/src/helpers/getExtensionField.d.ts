import { AnyExtension, MaybeThisParameterType, RemoveThis } from '../types.js';
export declare function getExtensionField<T = any>(extension: AnyExtension, field: string, context?: Omit<MaybeThisParameterType<T>, 'parent'>): RemoveThis<T>;
