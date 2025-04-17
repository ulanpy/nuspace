from fastapi import Request, Depends, HTTPException, status
from typing import Annotated
from backend.common.dependencies import check_token
from datetime import timedelta
from google.cloud.exceptions import NotFound
from google.pubsub_v1.types import Subscription, PushConfig
from google.api_core.exceptions import AlreadyExists

async def generate_download_url(
    request: Request,
    filename: str,
):
    """
    Generates a signed download URL with:
    - 15 minute expiration
    - GET access only
    - Requires valid JWT
    """
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="GET",
    )
    return {"signed_url": signed_url}

async def delete_bucket_object(
    request: Request,
    filename: str,
):
    blob = request.app.state.storage_client.bucket(request.app.state.config.bucket_name).blob(filename)
    try:
        blob.delete()
    except:
        pass



from google.cloud import pubsub_v1
from backend.core.configs.config import config


def update_bucket_push_endpoint():
    client = pubsub_v1.SubscriberClient(credentials=config.BUCKET_CREDENTIALS)
    topic_path = client.topic_path(config.GCP_PROJECT_ID, config.GCP_TOPIC_ID)
    subscription_path = client.subscription_path(
        project=config.GCP_PROJECT_ID,
        subscription=f"gcs-object-created-sub-{config.ROUTING_PREFIX}")
    try:
        subscription = client.create_subscription(
            name=subscription_path,
            topic=topic_path,
        )
        print(f"Subscription created: {subscription.name}")
    except AlreadyExists:
        print(f"Subscription already exists: {subscription_path}")

    push_config = pubsub_v1.types.PushConfig(push_endpoint=f"https://{config.ROUTING_PREFIX}/api/bucket/gcs-hook")
    update_mask = {"paths": ["push_config"]}

    response = client.update_subscription(
        request={
            "subscription": {
                "name": subscription_path,
                "push_config": push_config,
            },
            "update_mask": update_mask,
        }
    )
    print(f"✅ Updated push endpoint to: {response.push_config.push_endpoint}")
