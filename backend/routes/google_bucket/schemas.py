from pydantic import BaseModel, Field

# Add response models
class SignedUrlResponse(BaseModel):
    signed_url: str = Field(..., example="https://storage.googleapis.com/your-bucket/file.txt?X-Goog-Signature=...")
