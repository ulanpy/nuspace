from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.common.schemas import ShortUserResponse
from backend.core.database.models.sgotinish import PermissionType
from backend.core.database.models.user import UserRole


class DepartmentResponseDTO(BaseModel):
    """DTO for department information."""

    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class SGUserResponse(BaseModel):
    """DTO for SG user information."""

    user: ShortUserResponse
    department_name: str
    role: UserRole


SG_MEMBER_ROLES = {UserRole.boss, UserRole.capo, UserRole.soldier}


class SGMemberSearchResponseDTO(BaseModel):
    """User option for SG membership management."""

    user: ShortUserResponse
    email: str
    role: UserRole
    department: DepartmentResponseDTO | None = None


class SGMemberResponseDTO(BaseModel):
    """Detailed SG member response for management UI."""

    user: ShortUserResponse
    email: str
    role: UserRole
    department: DepartmentResponseDTO | None = None
    sg_assigned_at: datetime | None = None
    sg_assigned_by: ShortUserResponse | None = None


class SGMemberUpsertPayload(BaseModel):
    """Create/update SG membership for a Nuspace user."""

    target_user_sub: str = Field(..., description="Target user sub to add/update in SG")
    role: UserRole = Field(..., description="SG role to assign")
    department_id: int = Field(..., description="Department to assign the user to")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: UserRole) -> UserRole:
        if value not in SG_MEMBER_ROLES:
            raise ValueError("role must be one of: boss, capo, soldier")
        return value


class SGMemberActionResult(BaseModel):
    """Simple status response for SG membership actions."""

    detail: str


class DelegateAccessPayload(BaseModel):
    """Schema for delegating ticket access."""

    target_user_sub: str = Field(..., description="The user sub to grant access to")
    permission: PermissionType = Field(..., description="The permission level to grant")
