import { pangu } from "pangu/browser";
import { visit } from "unist-util-visit";

/**
 * Plugin to add proper spacing between Chinese and English/numbers using pangu.js
 * @returns {import('unified').Transformer}
 */
export function rehypePangu() {
	return (tree) => {
		visit(tree, "text", (node) => {
			// Skip if the text doesn't contain any Chinese characters
			if (!/[\u4e00-\u9fff]/.test(node.value)) {
				return;
			}

			// Process the text with pangu
			node.value = pangu.spacingText(node.value);
		});

		// Also process code blocks with language-zh or language-cn class
		visit(tree, "element", (node) => {
			if (
				node.tagName === "code" &&
				node.properties.className?.some((cls) =>
					["language-zh", "language-cn", "language-chinese"].includes(cls),
				)
			) {
				const textNode = node.children?.[0];
				if (textNode && textNode.type === "text") {
					textNode.value = pangu.spacingText(textNode.value);
				}
			}
		});
	};
}
