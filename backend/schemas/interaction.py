"""
Pydantic schemas for request validation and response serialization.
Kept separate from ORM models to decouple API layer from DB layer.
"""

from __future__ import annotations
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class InteractionTypeEnum(str, Enum):
    visit = "Visit"
    call = "Call"
    email = "Email"
    conference = "Conference"
    webinar = "Webinar"


class SentimentEnum(str, Enum):
    positive = "Positive"
    neutral = "Neutral"
    negative = "Negative"


# ── Request Schemas ────────────────────────────────────────────────────────────

class InteractionCreateSchema(BaseModel):
    """Payload for creating a new HCP interaction via the structured form."""

    hcp_name: str = Field(..., min_length=2, max_length=255, description="Full name of the HCP")
    specialty: Optional[str] = Field(None, description="Medical specialty, e.g. Oncology")
    hospital: Optional[str] = Field(None, description="Hospital or clinic name")
    interaction_type: InteractionTypeEnum = InteractionTypeEnum.visit
    interaction_date: Optional[date] = None
    summary: Optional[str] = Field(None, description="Free-text discussion summary")
    topics_discussed: Optional[str] = None
    products_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    sentiment: Optional[SentimentEnum] = SentimentEnum.neutral
    follow_up_required: bool = False
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    outcomes: Optional[str] = None
    log_source: str = "form"
    raw_chat_input: Optional[str] = None


class InteractionUpdateSchema(BaseModel):
    """Partial update — only send fields you want to change."""

    hcp_name: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    interaction_type: Optional[InteractionTypeEnum] = None
    interaction_date: Optional[date] = None
    summary: Optional[str] = None
    topics_discussed: Optional[str] = None
    products_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    sentiment: Optional[SentimentEnum] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    outcomes: Optional[str] = None
    ai_suggested_actions: Optional[str] = None


class ChatMessageSchema(BaseModel):
    """Payload for a conversational AI log or command."""

    message: str = Field(..., min_length=5, description="Free-text from field rep")
    session_id: Optional[str] = Field(None, description="Optional session ID for multi-turn chat")


class EditInteractionChatSchema(BaseModel):
    """Edit a logged interaction using a natural language instruction."""

    interaction_id: str = Field(..., description="UUID of the interaction to edit")
    instruction: str = Field(..., description="e.g. 'Change follow-up date to next Friday'")


# ── Response Schemas ────────────────────────────────────────────────────────────

class InteractionResponseSchema(BaseModel):
    """Full interaction object returned to the client."""

    id: UUID
    hcp_name: str
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    interaction_type: Optional[str] = None
    interaction_date: Optional[date] = None
    summary: Optional[str] = None
    topics_discussed: Optional[str] = None
    products_discussed: Optional[str] = None
    materials_shared: Optional[str] = None
    sentiment: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    outcomes: Optional[str] = None
    ai_suggested_actions: Optional[str] = None
    log_source: str = "form"
    raw_chat_input: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentResponseSchema(BaseModel):
    """Generic wrapper for all LangGraph agent responses."""

    success: bool
    message: str
    data: Optional[dict] = None
    tool_used: Optional[str] = None
    ai_suggestions: Optional[List[str]] = None


class InteractionListResponseSchema(BaseModel):
    interactions: List[InteractionResponseSchema]
    total: int
    page: int
    per_page: int
