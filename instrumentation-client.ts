// Some security/password-manager extensions inject bookkeeping attributes into
// the server-rendered DOM before React starts. Remove only the known extension
// markers so React receives the original application markup during hydration.
const extensionAttributeNames = new Set([
  "bis_skin_checked",
  "bis_register",
  "bis_use",
  "data-dynamic-id",
  "data-titans-quick-view-extension-id",
]);

function isExtensionAttribute(name: string) {
  return extensionAttributeNames.has(name) || /^__processed_[0-9a-f-]+__$/.test(name);
}

function removeExtensionAttributes(root: Element) {
  if (root instanceof HTMLScriptElement && root.src.startsWith("chrome-extension://")) {
    root.remove();
    return;
  }
  const elements = [root, ...root.querySelectorAll("*")];
  for (const element of elements) {
    if (element instanceof HTMLScriptElement && element.src.startsWith("chrome-extension://")) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (isExtensionAttribute(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
}

const extensionObserver = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === "attributes" && record.attributeName && isExtensionAttribute(record.attributeName)) {
      (record.target as Element).removeAttribute(record.attributeName);
    }
    for (const node of record.addedNodes) {
      if (node instanceof Element) removeExtensionAttributes(node);
    }
  }
});

extensionObserver.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
removeExtensionAttributes(document.documentElement);

window.setTimeout(() => extensionObserver.disconnect(), 5000);
