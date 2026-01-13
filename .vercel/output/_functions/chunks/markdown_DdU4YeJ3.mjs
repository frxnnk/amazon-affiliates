import yaml from "js-yaml";
function generateListMarkdown(frontmatter, content = "") {
  const yamlContent = yaml.dump(frontmatter, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
    noRefs: true
  });
  return `---
${yamlContent}---

${content}`;
}
function generateListFilename(listId, lang) {
  return `src/content/lists/${lang}/${listId}.md`;
}
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export {
  generateListFilename as a,
  generateListMarkdown as g,
  slugify as s
};
