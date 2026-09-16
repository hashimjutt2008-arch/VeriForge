# Browser-only privacy and access

VeriForge has no application login, accounts, passwords, sessions, cookies, auth API or access gate. Anyone able to reach the hosted URL can open the application. A private GitHub repository alone does not make the published site private. Use hosting-level access controls if your team needs restricted access; availability depends on the hosting plan. A client-side password check provides no meaningful access control because its code is inspectable.

Your email lists are processed locally in your browser and are not uploaded to VeriForge servers. Workers parse files, clean emails, query results and produce downloads. IndexedDB stores jobs, results, source rows during preparation, and preferences. History belongs to the browser profile and website origin, not a team account. Other people using the same browser profile can view it. Storage is not encrypted by VeriForge.

Keep the processing tab open until the job finishes. Interrupted jobs are marked failed when reopened; completed history remains available. Download important reports: browsers may evict storage, private browsing may discard it, and clearing site data deletes it. A different domain, protocol, browser or device has separate history. Settings provides an explicit local-data deletion control.

The app does not perform DNS, SMTP, analytics or external verification. The host receives ordinary requests for application pages and JavaScript. Local job IDs may appear in page URLs; filenames and email-list contents are never sent in those URLs or request payloads by the app.

Do not embed passwords, API keys or business secrets in JavaScript, committed environment files or deployment archives. The retained Python folders are an unused legacy reference, not a required or deployed backend. Previously exposed legacy credentials should still be rotated wherever reused; deleting a file does not remove it from Git history.
