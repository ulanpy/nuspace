# GCP Authentication Migration Guide

This guide explains the changes made to eliminate hardcoded Google service account JSON keys and the steps needed to deploy these changes.

## Problem Summary

Your application was encountering two main issues after trying to remove hardcoded service account keys:

1. **CORS Policy Permission Error**: `storage.buckets.update` access denied
2. **Signed URL Generation Error**: `AttributeError: you need a private key to sign credentials`

## Solution Overview

The solution implements **service account impersonation** to generate signed URLs without requiring hardcoded private keys, while ensuring proper IAM permissions are in place.

## Changes Made

### 1. Terraform IAM Updates (`terraform/iam.tf`)

Added two new IAM bindings to allow the VM service account to impersonate itself:

```hcl
# Allow the VM service account to impersonate itself for signed URL generation
resource "google_service_account_iam_member" "vm_sa_token_creator" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.vm_service_account.email}"
}

# Allow the VM service account to use itself for impersonation
resource "google_service_account_iam_member" "vm_sa_user" {
  service_account_id = google_service_account.vm_service_account.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.vm_service_account.email}"
}
```

### 2. New Authentication Utility (`backend/core/utils/gcp_auth.py`)

Created a new module that provides service account impersonation functionality:

- `get_impersonated_credentials()`: Creates impersonated credentials using compute engine metadata
- `get_signing_credentials()`: Convenience function for signing operations

### 3. Configuration Update (`backend/core/configs/config.py`)

Added a new required environment variable:

```python
VM_SERVICE_ACCOUNT_EMAIL: str
```

### 4. Google Bucket Route Update (`backend/routes/google_bucket/google_bucket.py`)

Modified the signed URL generation to use impersonated credentials:

```python
# Generate signed URL using impersonated credentials to avoid private key requirement
from backend.core.utils.gcp_auth import get_signing_credentials

# Use the same service account that's attached to the VM for impersonation
impersonated_credentials = get_signing_credentials(config.VM_SERVICE_ACCOUNT_EMAIL)

signed_url = blob.generate_signed_url(
    version="v4",
    expiration=timedelta(minutes=15),
    method="PUT",
    headers=required_headers,
    credentials=impersonated_credentials,
)
```

## Deployment Steps

### Step 1: Update Google Secret Manager

Add the VM service account email to your `nuspace-env` secret in Google Secret Manager:

```bash
# Get current secret
gcloud secrets versions access latest --secret="nuspace-env" --project="nuspace-staging" > current.env

# Add the VM service account email
echo "VM_SERVICE_ACCOUNT_EMAIL=nuspace-vm-sa@nuspace-staging.iam.gserviceaccount.com" >> current.env

# Update the secret
gcloud secrets versions add nuspace-env --data-file=current.env --project="nuspace-staging"

# Clean up
rm current.env
```

### Step 2: Apply Terraform Changes

```bash
cd terraform
terraform plan
terraform apply
```

This will add the necessary IAM permissions for service account impersonation.

### Step 3: Deploy Application Changes

Deploy your application using your existing CI/CD pipeline. The new code will:

1. Use the impersonated credentials for signed URL generation
2. Automatically handle the authentication without hardcoded keys

### Step 4: Verify the Fix

After deployment, check that:

1. **CORS Setup Works**: Look for the success message in logs:
   ```
   ✅ Set CORS policies for bucket [bucket-name]
   ```

2. **Pub/Sub Setup Works**: Look for the success message:
   ```
   ✅ Updated push endpoint to: [your-endpoint]
   ```

3. **Signed URL Generation Works**: Test the `/upload-url` endpoint to ensure it returns valid signed URLs.

## Technical Details

### Why This Works

1. **Service Account Impersonation**: Instead of using a private key file, the application now uses the compute engine's metadata server to obtain temporary credentials that can sign URLs.

2. **Self-Impersonation**: The VM service account impersonates itself to get credentials with signing capabilities. This is a secure pattern that doesn't require storing private keys.

3. **Proper IAM Permissions**: The terraform changes ensure the service account has the necessary permissions to perform impersonation operations.

### Security Benefits

- ✅ No hardcoded private keys in code or environment variables
- ✅ Uses Google Cloud's built-in metadata server authentication
- ✅ Temporary credentials with automatic rotation
- ✅ Principle of least privilege (service account only has necessary permissions)

## Troubleshooting

### If CORS Setup Still Fails

Check that the VM service account has the `roles/storage.admin` role:

```bash
gcloud projects get-iam-policy nuspace-staging --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:nuspace-vm-sa@nuspace-staging.iam.gserviceaccount.com"
```

### If Signed URL Generation Still Fails

1. Verify the VM_SERVICE_ACCOUNT_EMAIL environment variable is set correctly
2. Check that the impersonation IAM permissions were applied:

```bash
gcloud iam service-accounts get-iam-policy nuspace-vm-sa@nuspace-staging.iam.gserviceaccount.com --project=nuspace-staging
```

### If Pub/Sub Setup Fails

Ensure the Pub/Sub topic exists and the service account has the necessary Pub/Sub permissions (already configured in your terraform).

## Rollback Plan

If issues occur, you can temporarily rollback by:

1. Reverting the application code changes
2. Re-adding the service account key to your environment (not recommended for long-term)

However, the new approach is more secure and should be the preferred solution.
