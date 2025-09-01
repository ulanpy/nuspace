
# Project Setup with Terraform and Google Cloud

<div align="center">
  <img src="https://lh5.googleusercontent.com/KMZupO9bRik3N9G_M1u1zSuAwlu2H41gm8oh3fixa6QSMUCTQRFlO41KzYRzrxtqjRjqKsNPyalUiLQ-1Caj0KEE4FUt8v_kFhHkvGOUBQvi4cji29htbCjNPW0M0p_UokAtjwGe" alt="Terraform" width="80%" />
</div>

For developers setting up Nuspace infrastructure on Google Cloud using Terraform, this guide provides a step-by-step walkthrough for creating your project and deploying infrastructure. It explains how to enable the essential Google Cloud APIs required for Terraform to manage resources, ensuring a smooth setup process even if you are new to GCP or Terraform.

## Terraform Configuration Structure

The Terraform configuration is organized into separate files for better maintainability:

- **`providers.tf`**: Google Cloud provider configuration
- **`apis.tf`**: Google Cloud API service enablements (Compute Engine, Cloud Resource Manager, Service Usage, and Storage APIs)
- **`iam.tf`**: IAM resources (service account for VM with bucket access permissions)
- **`compute.tf`**: Compute Engine resources (VM instance, disk, and static IP address)
- **`storage.tf`**: Cloud Storage resources (media bucket)
- **`pubsub.tf`**: Pub/Sub resources (topic and bucket notification)
- **`outputs.tf`**: Output values for easy access to resource information
- **`variables.tf`**: Input variables for configuring project-specific values like project ID, region, and environment settings
- **`envs/`**: Directory containing environment-specific variable files:
  - `staging.tfvars`: Configuration for staging environment
  - `production.tfvars`: Configuration for production environment
- **`creds/`**: Directory containing service account JSON key files (you need to create these):
  - `staging.json`: Service account key for staging environment
  - `production.json`: Service account key for production environment
  - Note: These credential files should never be committed to version control


Terraform automatically loads all `.tf` files in the directory, so no explicit imports are needed.

## Service Account for VM Authentication

This configuration creates a dedicated service account (`nuspace-vm-sa`) that is automatically attached to the VM instance. This service account provides:

- **Automatic Authentication**: The VM can access Google Cloud services without hardcoded credentials
- **Bucket Access**: Full CRUD operations on the media bucket
- **CORS Management**: Ability to modify bucket CORS policies
- **Pub/Sub Access**: Manage GCS notifications and subscriptions

The service account uses Google Cloud's metadata server for authentication, which is more secure than storing credentials in your application code.

## 1. Prerequisites: Install Google Cloud CLI

<div align="center">
  <img src="https://cloud.google.com/_static/cloud/images/social-icon-google-cloud-1200-630.png" alt="Google Cloud Platform" width="500" style="max-width: 100%; height: auto;" />
</div>

The `gcloud` command-line tool is essential for authenticating with Google Cloud and performing initial setup tasks.

### Installation by Platform

**For Linux:**
```bash
curl https://sdk.cloud.google.com | bash
```

**For macOS:**
```bash
brew install --cask google-cloud-sdk
```

**For Windows:**
Download and run the installer from the [official Google Cloud SDK page](https://cloud.google.com/sdk/docs/install).

### Initialize and Authenticate

After installation, run the following command to initialize the SDK and log in to your Google Account:

```bash
gcloud init
```

Follow the prompts to select your account and configure the CLI.

## 2. Terraform bootstrapping

<div align="center">
  <img src="tfscheme.png" alt="Terraform and Google Cloud Integration" width="420" style="max-width: 100%; height: auto;" />
</div>

When using Terraform to manage APIs, you run into a unique situation: Terraform itself needs certain APIs to be enabled before it can enable other APIs. The `google_project_service` resource, which is used to enable APIs, depends on the Cloud Resource Manager API and the Service Usage API to function. This means you have to manually enable them once for a new project.

Here's how to resolve this:

### Step 2.1: Programmatically Create the Project (Optional)

If you haven't already, you can create a new Google Cloud project from the command line:

```bash
gcloud projects create nuspace-staging --name="Nuspace Staging"
```

### Step 2.2: Manually Enable the Required APIs

Before running any Terraform code, enable the two core "boss" APIs that allow Terraform to manage services in your project:

```bash
gcloud services enable cloudresourcemanager.googleapis.com serviceusage.googleapis.com --project=nuspace-staging
```

> **Note:** This is a one-time step per project. Once these APIs are enabled, Terraform will be able to manage all other APIs for you, including the Compute Engine API.

## 3. Service Account Creation (i.e. for staging env)

This section details the commands you used to create the service account for Terraform. A service account is a special type of Google Account that applications (like Terraform) can use to make authorized API calls.

### Create the Service Account

```bash
gcloud iam service-accounts create terraform-admin \
    --description="Service account for managing infra" \
    --display-name="Terraform Admin"
```

This command creates the service account but doesn't give it any permissions yet.

### Assign IAM Roles

```bash
# Grant the editor role for general resource management
gcloud projects add-iam-policy-binding nuspace-staging \
    --member="serviceAccount:terraform-admin@nuspace-staging.iam.gserviceaccount.com" \
    --role="roles/editor"

# Grant IAM Security Admin role for managing service accounts and IAM policies
gcloud projects add-iam-policy-binding nuspace-staging \
    --member="serviceAccount:terraform-admin@nuspace-staging.iam.gserviceaccount.com" \
    --role="roles/iam.securityAdmin"

# Grant Project IAM Admin role for managing project-level IAM policies
gcloud projects add-iam-policy-binding nuspace-staging \
    --member="serviceAccount:terraform-admin@nuspace-staging.iam.gserviceaccount.com" \
    --role="roles/resourcemanager.projectIamAdmin"

# Grant Workload Identity Pool Admin role for creating WIF pools and providers (required for GitHub Actions)
gcloud projects add-iam-policy-binding nuspace-staging \
    --member="serviceAccount:terraform-admin@nuspace-staging.iam.gserviceaccount.com" \
    --role="roles/iam.workloadIdentityPoolAdmin"
```

These commands grant the necessary permissions to the Terraform service account:
- **Editor role**: Broad permissions for creating and managing most resources
- **IAM Security Admin**: Ability to create and manage service accounts
- **Project IAM Admin**: Ability to manage project-level IAM policies (required for granting roles to other service accounts)
- **Workload Identity Pool Admin**: Ability to create and manage Workload Identity Federation pools and providers (required for GitHub Actions authentication)

### Create and Download the Key

```bash
gcloud iam service-accounts keys create ./envs/staging.json \
    --iam-account="terraform-admin@nuspace-staging.iam.gserviceaccount.com"
```

This command generates a JSON key file for the service account, which Terraform will use to authenticate with Google Cloud. **It's crucial to keep this file secure!!!**

## 4. Running Terraform

<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg" alt="Terraform Workflow" width="200" style="max-width: 100%; height: auto;" />
</div>

Now that the foundational APIs are enabled and the service account is set up, you can use Terraform to deploy your infrastructure.

### Initialize Terraform

```bash
terraform init
```

This command downloads the necessary provider plugins and prepares your working directory for use with Terraform. You only need to run this command once per project.

### Review the Plan

```bash
terraform plan -var-file=./envs/staging.json
```

This command generates an execution plan, showing you exactly what resources Terraform will create, modify, or destroy. This is a crucial step to verify your code before making any changes to your cloud environment.

### Apply the Changes

```bash
terraform apply -var-file=./envs/staging.json
```

This command executes the planned actions. It will prompt you to confirm the changes before proceeding.

---

## Environments

Use per-environment tfvars files under `envs/`.

Examples:

```
terraform apply -var-file=envs/staging.tfvars
terraform apply -var-file=envs/production.tfvars
```

The provider reads credentials from `var.credentials_file`.

## Security Notes

- Keep your service account key file (`staging.json/production.json`) secure and never commit it to version control. It is so easy to forget about this. always double check
- Consider using environment variables or Google Cloud's default credentials for production environments
- Regularly rotate your service account keys
- Follow the principle of least privilege when assigning IAM roles
