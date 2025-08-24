# Project Setup with Terraform and Google Cloud

This guide provides a step-by-step walkthrough for setting up your Google Cloud project and deploying infrastructure using Terraform. It specifically addresses the common "chicken and egg" problem where you need to enable an API for Terraform to work, but Terraform is the tool you want to use to enable the APIs.

## Terraform Configuration Structure

The Terraform configuration is organized into separate files for better maintainability:

- **`providers.tf`**: Google Cloud provider configuration
- **`apis.tf`**: Google Cloud API service enablements (Compute Engine, Cloud Resource Manager, Service Usage, and Storage APIs)
- **`iam.tf`**: IAM resources (service account for VM with bucket access permissions)
- **`compute.tf`**: Compute Engine resources (VM instance and static IP address)
- **`storage.tf`**: Cloud Storage resources (media bucket)
- **`pubsub.tf`**: Pub/Sub resources (topic and bucket notification)
- **`outputs.tf`**: Output values for easy access to resource information

Terraform automatically loads all `.tf` files in the directory, so no explicit imports are needed.

## Service Account for VM Authentication

This configuration creates a dedicated service account (`nuspace-vm-sa`) that is automatically attached to the VM instance. This service account provides:

- **Automatic Authentication**: The VM can access Google Cloud services without hardcoded credentials
- **Bucket Access**: Full CRUD operations on the media bucket
- **CORS Management**: Ability to modify bucket CORS policies
- **Pub/Sub Access**: Manage GCS notifications and subscriptions

The service account uses Google Cloud's metadata server for authentication, which is more secure than storing credentials in your application code.

## 1. Prerequisites: Install Google Cloud CLI

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

## 2. The "Chicken and Egg" Problem & Its Solution

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

## 3. Service Account Creation

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
```

These commands grant the necessary permissions to the Terraform service account:
- **Editor role**: Broad permissions for creating and managing most resources
- **IAM Security Admin**: Ability to create and manage service accounts
- **Project IAM Admin**: Ability to manage project-level IAM policies (required for granting roles to other service accounts)

### Create and Download the Key

```bash
gcloud iam service-accounts keys create ./terraform.json \
    --iam-account="terraform-admin@nuspace-staging.iam.gserviceaccount.com"
```

This command generates a JSON key file for the service account, which Terraform will use to authenticate with Google Cloud. **It's crucial to keep this file secure.**

## 4. Running Terraform

Now that the foundational APIs are enabled and the service account is set up, you can use Terraform to deploy your infrastructure.

### Initialize Terraform

```bash
terraform init
```

This command downloads the necessary provider plugins and prepares your working directory for use with Terraform. You only need to run this command once per project.

### Review the Plan

```bash
terraform plan
```

This command generates an execution plan, showing you exactly what resources Terraform will create, modify, or destroy. This is a crucial step to verify your code before making any changes to your cloud environment.

### Apply the Changes

```bash
terraform apply
```

This command executes the planned actions. It will prompt you to confirm the changes before proceeding.

---

## Security Notes

- Keep your service account key file (`terraform.json`) secure and never commit it to version control
- Consider using environment variables or Google Cloud's default credentials for production environments
- Regularly rotate your service account keys
- Follow the principle of least privilege when assigning IAM roles

## Next Steps

After successful deployment, you can:
- Review your infrastructure in the Google Cloud Console
- Set up monitoring and logging
- Configure additional security measures
- Plan your CI/CD pipeline integration