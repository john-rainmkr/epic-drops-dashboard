# Epic Drops dashboard

Protected app: https://137-184-135-229.sslip.io/dashboard/epic-drops

`client/` is the deployed frontend source. ATLAS owns data, report ingestion, account-scoped web sessions, and PDF generation. No credentials or business data are embedded in this repository. The public GitHub Pages entry forwards to the protected app.

Views: seven-day last week without comparison columns; Amazon 28-day and Walmart 30-day comparisons; eight weekly observations; marketplace-specific brand share; inventory observations; item stock board ordered by four-week sales descending. Missing source coverage remains unavailable. A 30-day report is never divided into invented weeks. Item identities remain native to each marketplace.

Monday reports are previewed, validated and explicitly confirmed. See the app's Monday reports panel for the required report names. Amazon ads come from ATLAS; Walmart Connect imports use daily Item Performance with 30-day attribution. Uploading is limited to an account grant with upload permission, or an internal administrator. Report download time is separate from upload time.

Client accounts use the ATLAS `client` role and an explicit Epic Drops dashboard grant. The role cannot enter the internal console or issue API keys. Provisioning is an operator action; this release does not create a Janene account or send credentials.

Canonical fonts and logos are stamped from RAINMKR Brand V7. Do not edit the `brand/` output.
