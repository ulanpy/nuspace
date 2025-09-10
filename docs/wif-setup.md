# Workload Identity Federation (WIF) for GitHub Actions

This repository uses Google Cloud Workload Identity Federation for secure CI/CD authentication without static service account keys.

## What is Workload Identity Federation?

Workload Identity Federation allows external identity providers (like GitHub) to authenticate with Google Cloud using short-lived credentials instead of long-lived service account keys. It's a more secure alternative to downloading and storing service account JSON keys.

## Why use WIF?

- **Security**: Eliminates the need for static service account keys that could be compromised
- **Compliance**: Follows security best practices for cloud-native applications
- **Automation**: Enables secure CI/CD pipelines without manual key management
- **Auditability**: All actions are properly attributed to the CI/CD service account

## Where is WIF used?

### CI/CD Pipeline Authentication
- GitHub Actions workflows authenticate to Google Cloud when deploying to staging/production
- Used in the deployment workflow that runs on pushes to `dev` and `main` branches

### Infrastructure Management
- Ansible playbooks run with WIF-authenticated credentials to manage VMs
- Terraform operations use WIF for provisioning and managing cloud resources

### Service Account Impersonation
- The CI/CD process impersonates the Ansible service account
- This service account has the necessary permissions for deployment and infrastructure management

## How it works

1. **GitHub OIDC Token**: GitHub Actions provides an OpenID Connect token
2. **WIF Exchange**: The token is exchanged for Google Cloud credentials via the WIF provider
3. **Service Account Impersonation**: Short-lived credentials are used to impersonate the Ansible service account
4. **Secure Operations**: All cloud operations are performed with proper authentication and audit trails

## Branch to Environment Mapping

- `dev` → `nuspace-staging` (staging environment)
- `main` → `nuspace2025` (production environment)

## Infrastructure

The WIF setup is automatically provisioned via Terraform (`terraform/iam.tf`) and includes:
- Workload Identity Pool and Provider
- IAM bindings for the Ansible service account
- Required API enablement (`iamcredentials.googleapis.com`, `sts.googleapis.com`)

## Verification

When WIF is working correctly:
- GitHub Actions authentication step succeeds without JSON key material
- `gcloud auth list` shows the impersonated service account
- Cloud Audit Logs attribute actions to the Ansible service account
- No manual authentication overrides are needed in workflows
