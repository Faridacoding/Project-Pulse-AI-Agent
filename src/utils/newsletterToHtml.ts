import type { Newsletter, ArchivedNewsletter } from "../../types";

export function newsletterToHtml(nl: Newsletter | ArchivedNewsletter): string {
  const sections = nl.sections.map((s) =>
    `<h2>${s.heading}</h2><ul>${s.items.map((item) => `<li>${item}</li>`).join("")}</ul>`
  ).join("");
  return `<!DOCTYPE html><html><body>
<h1>${nl.subject}</h1>
<p>${nl.introduction}</p>
${sections}
<p>${nl.conclusion}</p>
</body></html>`;
}
