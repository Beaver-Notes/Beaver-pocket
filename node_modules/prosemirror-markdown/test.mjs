import MarkdownIt from "markdown-it"
let defaultTokenizer = MarkdownIt("commonmark", {html: false})
//defaultTokenizer.block.ruler.disable("html_block")
//defaultTokenizer.inline.ruler.disable("html_inline")
console.log(defaultTokenizer.parse("<p>woo</p>\n\nOne <img src=xxx> two").map(e => e.children))
