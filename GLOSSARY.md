# Glossary

Domain terms for Nuspace. When naming concepts in code, issues, or specs, use these terms.

| Term | Definition |
|------|------------|
| **NU** | Nazarbayev University. The institution this app serves. |
| **Nuspace** | The NU student superapp — campus services, announcements, and student essentials in one platform. |
| **Page** | A route's top-level UI component, rendered inside the app shell. Lives in `components/routes/<route>/`. |
| **Lib module** | A bounded capability in `src/lib/<module>/` — constants, functions, types, tests. The unit of business logic. |
| **Route mirror** | The `components/routes/<route>/` folder holding a Page and its subcomponents. UI only, no logic. |
| **DataTable** | The reusable table box (`shared/data-table/`), configured by `useDataTable`. Server-side pagination and sorting. |
| **WIF** | Workload Identity Federation. GitHub Actions authenticates to GCP via OIDC, no static keys. |
| **IAP** | Identity-Aware Proxy. GCP's TCP tunneling for private VM access (SSH, RDP) without public exposure. |
| **Presigned upload** | The three-step media flow: client requests a signed URL from the API, uploads directly to GCS, confirms. Bytes never pass through our API. |
| **Shadcn/ui** | Vendor-owned UI primitives in `components/ui/`. Consume, don't extend with project-specific props. |
