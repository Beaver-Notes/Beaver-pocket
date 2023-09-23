import { InputRule, InputRuleFinder } from '../InputRule.js';
/**
 * Build an input rule that replaces text when the
 * matched text is typed into it.
 */
export declare function textInputRule(config: {
    find: InputRuleFinder;
    replace: string;
}): InputRule;
