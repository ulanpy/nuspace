"""Database models package."""

__all__ = [
    "Base",
    "Community",
    "Event",
    "EventTag",
    "EventStatus",
    "EventScope",
    "EventType",
    "RegistrationPolicy",
    "CommunityMember",
    "CommunityRecruitmentStatus",
    "CommunityType",
    "CommunityCategory",
    "CommunityAchievements",
    "CommunityPhotoAlbum",
    "CommunityPhotoAlbumType",
    "Media",
    "User",
    "UserRole",
    "UserScope",
    "GradeReport",
    "EventCollaborator",
    "Notification",
    "Course",
    "CourseItem",
    "Ticket",
    "Conversation",
    "Message",
    "MessageReadStatus",
    "DegreeAuditResult",
    "Opportunity",
    "OpportunityType",
    "OpportunityEligibility",
    "EducationLevel",
    "OpportunityMajor",
    "OpportunityMajorMap",
    "RejectionBoard",
    "RejectionOpportunityType",
    "is_accepted",
    "still_trying",
]
from .base import Base
from .community import (
    Community,
    CommunityAchievements,
    CommunityCategory,
    CommunityMember,
    CommunityPhotoAlbum,
    CommunityPhotoAlbumType,
    CommunityRecruitmentStatus,
    CommunityType,
)
from .events import (
    Event,
    EventCollaborator,
    EventScope,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from .grade_report import Course, CourseItem, GradeReport
from .media import Media
from .notification import Notification
from .user import User, UserRole, UserScope
from .sgotinish import Ticket, Conversation, Message, MessageReadStatus
from .degree_audit import DegreeAuditResult
from .opportunities import (
    Opportunity,
    OpportunityEligibility,
    OpportunityType,
    EducationLevel,
    OpportunityMajor,
    OpportunityMajorMap,
)
from .rejection_board import RejectionBoard, RejectionOpportunityType, is_accepted, still_trying
