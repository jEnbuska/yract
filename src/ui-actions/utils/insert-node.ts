export function insertNode(parentDom: Node, node: Node, beforeNode: Node | null) {
  parentDom.insertBefore(node, beforeNode);
}
