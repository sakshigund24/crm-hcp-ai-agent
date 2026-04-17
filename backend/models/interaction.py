"""
ORM model for the hcp_interactions table.
One row = one logged interaction between a field rep and an HCP.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Date, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
import enum

from database.connection import Base


class InteractionType(str, enum.Enum):
    visit = "Visit"
    call = "Call"
    email = "Email"
    conference = "Conference"
    webinar = "Webinar"


class SentimentType(str, enum.Enum):
    positive = "Positive"
    neutral = "Neutral"
    negative = "Negative"


class HCPInteraction(Base):
    """
    Stores every logged HCP interaction.
    Can be created via structured form OR conversational AI chat.
    """

    __tablename__ = "hcp_interactions"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # HCP profile info
    hcp_name = Column(String(255), nullable=False, index=True)
    specialty = Column(String(255), nullable=True)
    hospital = Column(String(500), nullable=True)

    # Interaction metadata
    interaction_type = Column(
        SAEnum(InteractionType, name="interaction_type_enum"),
        nullable=False,
        default=InteractionType.visit,
    )
    interaction_date = Column(Date, nullable=True)

    # Content fields
    summary = Column(Text, nullable=True)
    topics_discussed = Column(Text, nullable=True)
    products_discussed = Column(Text, nullable=True)
    materials_shared = Column(Text, nullable=True)

    # Sentiment — set by AI or manually
    sentiment = Column(
        SAEnum(SentimentType, name="sentiment_type_enum"),
        nullable=True,
        default=SentimentType.neutral,
    )

    # Follow-up tracking
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)
    follow_up_notes = Column(Text, nullable=True)

    # Outcomes and AI-generated suggestions
    outcomes = Column(Text, nullable=True)
    ai_suggested_actions = Column(Text, nullable=True)  # stored as JSON string

    # Tracks whether logged via "form" or "chat"
    log_source = Column(String(50), default="form")

    # Raw input from chat for audit trail
    raw_chat_input = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True,
    )

    def to_dict(self):
        """Plain-dict representation for API responses."""
        return {
            "id": str(self.id),
            "hcp_name": self.hcp_name,
            "specialty": self.specialty,
            "hospital": self.hospital,
            "interaction_type": self.interaction_type.value if self.interaction_type else None,
            "interaction_date": str(self.interaction_date) if self.interaction_date else None,
            "summary": self.summary,
            "topics_discussed": self.topics_discussed,
            "products_discussed": self.products_discussed,
            "materials_shared": self.materials_shared,
            "sentiment": self.sentiment.value if self.sentiment else None,
            "follow_up_required": self.follow_up_required,
            "follow_up_date": str(self.follow_up_date) if self.follow_up_date else None,
            "follow_up_notes": self.follow_up_notes,
            "outcomes": self.outcomes,
            "ai_suggested_actions": self.ai_suggested_actions,
            "log_source": self.log_source,
            "raw_chat_input": self.raw_chat_input,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
