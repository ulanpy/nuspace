# ADR 0001: Workload Identity Federation for GitHub Actions

## Status

Accepted

## Context

GitHub Actions workflows need to authenticate to Google Cloud for CI/CD deployments and infrastructure management. Static service account keys are a security risk — they can be leaked, are long-lived, and require manual rotation.

## Decision

Use Google Cloud Workload Identity Federation (WIF) for all GitHub Actions authentication. GitHub's OIDC token is exchanged for short-lived GCP credentials via a WIF provider. The CI/CD process impersonates the Ansible service account.

## Consequences

- **Security**: No static service account keys in GitHub Secrets.
- **Short-lived credentials**: Tokens are valid for a single workflow run.
- **Auditability**: All cloud actions are attributed to the Ansible service account in Cloud Audit Logs.
- **Branch-to-environment mapping**: `dev` → `nuspace-staging` (staging), `main` → `nuspace2025` (production).
- **Infrastructure**: WIF is provisioned via Terraform (`terraform/iam.tf`) — workload identity pool, provider, IAM bindings, and required API enablement (`iamcredentials.googleapis.com`, `sts.googleapis.com`).

## Related

- SSH access for CI/CD uses IAP TCP forwarding (see ADR-0002).
