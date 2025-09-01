## Workload Identity Federation (WIF) for GitHub Actions

This repository uses Google Cloud Workload Identity Federation for CI authentication. Static service account keys have been removed.

### What changed
- GitHub Actions authenticates via OIDC (`google-github-actions/auth@v2`).
- A Workload Identity Pool/Provider trusts this repository.
- The Ansible service account is impersonated with short-lived credentials.

### Setup (one-time, already provisioned via Terraform)
- WIF pool/provider and IAM bindings are created in Terraform (`terraform/iam.tf`).
- Required APIs enabled: `iamcredentials.googleapis.com`, `sts.googleapis.com`.

### GitHub secrets/variables
- WIF provider names are now inlined in the workflow; no WIF-related repo variables are required.
- Existing: `DOCKER_USERNAME`, `DOCKER_PASSWORD`.

Tip: After `terraform apply`, obtain provider names from outputs:

```bash
terraform output -raw wif_provider_name
terraform output -raw project_number
```

### Branch to project mapping
- `dev` → `nuspace-staging`
- `main` → `nuspace2025`

### Running the workflow
Push to `dev` or `main`. The workflow will:
1) Exchange GitHub OIDC for a Google access token via the WIF provider.
2) Use gcloud with impersonated credentials to query VM info and run Ansible.

### Verifying authentication
- In job logs, the `Authenticate to Google Cloud via Workload Identity Federation` step should succeed with no JSON key material.
- `gcloud auth list` will show the impersonated service account.
- Cloud Audit Logs (Admin Activity/Data Access) should attribute actions to the Ansible service account.

### Troubleshooting
- `permission denied` during auth: ensure `WIF_PROVIDER_*` values are correct and the Ansible SA has `roles/iam.workloadIdentityUser` for the provider principal.
- `principal not in set`: confirm Terraform `github_repository` matches `owner/repo` and (optionally) that allowed branches include the current ref.
- OS Login SSH failures: verify `roles/compute.osAdminLogin` on the Ansible SA and that the VM has OS Login enabled (`enable-oslogin=TRUE`).
- Long jobs: tokens are short-lived (~1h). The action refreshes them automatically; avoid manual auth overrides in subsequent steps.