// Some security/password-manager extensions inject bookkeeping attributes into
// the server-rendered DOM before React starts. Remove only the known extension
// markers so React receives the original application markup during hydration.
const extensionAttributeNames = new Set([
  "bis_skin_checked",
  "bis_register",
  "data-titans-quick-view-extension-id",
]);

for (const element of document.querySelectorAll("*")) {
  for (const attribute of Array.from(element.attributes)) {
    const isProcessedMarker = /^__processed_[0-9a-f-]+__$/.test(attribute.name);

    if (extensionAttributeNames.has(attribute.name) || isProcessedMarker) {
      element.removeAttribute(attribute.name);
    }
  }
}
