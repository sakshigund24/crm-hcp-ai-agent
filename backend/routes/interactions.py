"""
API Routes for HCP Interaction Management

Endpoints:
  POST   /api/interactions/form        — log interaction via structured form
  POST   /api/interactions/chat        — log/query via AI chat (LangGraph)
  GET    /api/interactions             — list interactions with pagination + filters
  GET    /api/interactions/{id}        — get single interaction
  PUT    /api/interactions/{id}        — update interaction
  DELETE /api/interactions/{id}        — delete interaction
  GET    /api/interactions/stats       — dashboard stats
  POST   /api/agent/chat               — direct agent chat endpoint
"""

from datetime import datetime, date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from database.connection import get_db
from models.interaction import HCPInteraction, InteractionType, SentimentType
from schemas.interaction import (
    InteractionCreateSchema,
    InteractionUpdateSchema,
    InteractionResponseSchema,
    AgentResponseSchema,
    ChatMessageSchema,
    InteractionListResponseSchema,
)
from agents.hcp_agent import run_agent

router = APIRouter(prefix="/api", tags=["HCP Interactions"])


# ── Form-based logging ──────────────────────────────────────────────────────────

@router.post("/interactions/form", response_model=AgentResponseSchema)
async def log_interaction_form(
    payload: InteractionCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Log a new HCP interaction submitted via the structured form.
    Data is validated, saved directly to DB, and a quick AI summary is generated.
    """
    try:
        # Map string enum values to ORM enums
        type_map = {
            "Visit": InteractionType.visit,
            "Call": InteractionType.call,
            "Email": InteractionType.email,
            "Conference": InteractionType.conference,
            "Webinar": InteractionType.webinar,
        }
        sentiment_map = {
            "Positive": SentimentType.positive,
            "Neutral": SentimentType.neutral,
            "Negative": SentimentType.negative,
        }

        interaction = HCPInteraction(
            hcp_name=payload.hcp_name,
            specialty=payload.specialty,
            hospital=payload.hospital,
            interaction_type=type_map.get(payload.interaction_type.value, InteractionType.visit),
            interaction_date=payload.interaction_date or date.today(),
            summary=payload.summary,
            topics_discussed=payload.topics_discussed,
            products_discussed=payload.products_discussed,
            materials_shared=payload.materials_shared,
            sentiment=sentiment_map.get(
                payload.sentiment.value if payload.sentiment else "Neutral",
                SentimentType.neutral,
            ),
            follow_up_required=payload.follow_up_required,
            follow_up_date=payload.follow_up_date,
            follow_up_notes=payload.follow_up_notes,
            outcomes=payload.outcomes,
            log_source="form",
        )

        db.add(interaction)
        await db.commit()
        await db.refresh(interaction)

        return AgentResponseSchema(
            success=True,
            message=f"Interaction with {interaction.hcp_name} logged successfully.",
            data=interaction.to_dict(),
            tool_used="form_submission",
            ai_suggestions=[
                "Consider scheduling a follow-up within 5 business days.",
                "Share relevant product literature at the next meeting.",
            ],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log interaction: {str(e)}")


# ── Chat-based logging (LangGraph) ──────────────────────────────────────────────

@router.post("/interactions/chat", response_model=AgentResponseSchema)
async def log_interaction_chat(payload: ChatMessageSchema):
    """
    Log or query interactions via natural language.
    Routes the message through the LangGraph agent which decides the correct tool.
    """
    try:
        result = await run_agent(
            user_message=payload.message,
            session_id=payload.session_id,
        )
        return AgentResponseSchema(
            success=result.get("success", False),
            message=result.get("message", "Agent response received."),
            data=result.get("data"),
            tool_used=result.get("tool_used"),
            ai_suggestions=result.get("ai_suggestions", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


# ── List interactions ────────────────────────────────────────────────────────────

@router.get("/interactions", response_model=InteractionListResponseSchema)
async def list_interactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    hcp_name: Optional[str] = Query(None),
    interaction_type: Optional[str] = Query(None),
    sentiment: Optional[str] = Query(None),
    follow_up_required: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Paginated list of all interactions with optional filters.
    Returns interactions sorted by most recent first.
    """
    conditions = []

    if hcp_name:
        conditions.append(HCPInteraction.hcp_name.ilike(f"%{hcp_name}%"))
    if interaction_type:
        type_map = {
            "visit": InteractionType.visit,
            "call": InteractionType.call,
            "email": InteractionType.email,
            "conference": InteractionType.conference,
            "webinar": InteractionType.webinar,
        }
        mapped = type_map.get(interaction_type.lower())
        if mapped:
            conditions.append(HCPInteraction.interaction_type == mapped)
    if sentiment:
        sent_map = {
            "positive": SentimentType.positive,
            "neutral": SentimentType.neutral,
            "negative": SentimentType.negative,
        }
        mapped_s = sent_map.get(sentiment.lower())
        if mapped_s:
            conditions.append(HCPInteraction.sentiment == mapped_s)
    if follow_up_required is not None:
        conditions.append(HCPInteraction.follow_up_required == follow_up_required)

    # Count total matching records
    count_query = select(func.count(HCPInteraction.id))
    if conditions:
        count_query = count_query.where(and_(*conditions))
    count_result = await db.execute(count_query)
    total = count_result.scalar()

    # Paginated fetch
    offset = (page - 1) * per_page
    data_query = select(HCPInteraction).order_by(HCPInteraction.created_at.desc())
    if conditions:
        data_query = data_query.where(and_(*conditions))
    data_query = data_query.offset(offset).limit(per_page)
    result = await db.execute(data_query)
    interactions = result.scalars().all()

    return InteractionListResponseSchema(
        interactions=[InteractionResponseSchema(**i.to_dict()) for i in interactions],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Get single interaction ────────────────────────────────────────────────────────

@router.get("/interactions/{interaction_id}", response_model=AgentResponseSchema)
async def get_interaction(
    interaction_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single interaction record by its UUID."""
    try:
        result = await db.execute(
            select(HCPInteraction).where(HCPInteraction.id == UUID(interaction_id))
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            raise HTTPException(status_code=404, detail="Interaction not found")
        return AgentResponseSchema(
            success=True,
            message="Interaction retrieved.",
            data=interaction.to_dict(),
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid interaction ID format")


# ── Update interaction ────────────────────────────────────────────────────────────

@router.put("/interactions/{interaction_id}", response_model=AgentResponseSchema)
async def update_interaction(
    interaction_id: str,
    payload: InteractionUpdateSchema,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing interaction. Only sends changed fields."""
    try:
        result = await db.execute(
            select(HCPInteraction).where(HCPInteraction.id == UUID(interaction_id))
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            raise HTTPException(status_code=404, detail="Interaction not found")

        # Apply only fields that were explicitly set in the payload
        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(interaction, field) and value is not None:
                setattr(interaction, field, value)

        interaction.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(interaction)

        return AgentResponseSchema(
            success=True,
            message=f"Interaction updated successfully.",
            data=interaction.to_dict(),
            tool_used="direct_update",
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid interaction ID format")


# ── Delete interaction ────────────────────────────────────────────────────────────

@router.delete("/interactions/{interaction_id}", response_model=AgentResponseSchema)
async def delete_interaction(
    interaction_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — actually removes the record from DB for this implementation."""
    try:
        result = await db.execute(
            select(HCPInteraction).where(HCPInteraction.id == UUID(interaction_id))
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            raise HTTPException(status_code=404, detail="Interaction not found")

        hcp_name = interaction.hcp_name
        await db.delete(interaction)
        await db.commit()

        return AgentResponseSchema(
            success=True,
            message=f"Interaction with {hcp_name} deleted.",
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid interaction ID format")


# ── Dashboard stats ───────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Returns aggregate stats for the CRM dashboard:
    - Total interactions
    - Interactions this week
    - Pending follow-ups
    - Sentiment breakdown
    - Recent interactions (last 5)
    """
    from datetime import timedelta
    from sqlalchemy import case

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Total
    total_result = await db.execute(select(func.count(HCPInteraction.id)))
    total = total_result.scalar()

    # This week
    week_result = await db.execute(
        select(func.count(HCPInteraction.id)).where(HCPInteraction.created_at >= week_ago)
    )
    this_week = week_result.scalar()

    # Pending follow-ups
    fu_result = await db.execute(
        select(func.count(HCPInteraction.id)).where(
            HCPInteraction.follow_up_required == True
        )
    )
    pending_followups = fu_result.scalar()

    # Unique HCPs
    hcp_result = await db.execute(
        select(func.count(func.distinct(HCPInteraction.hcp_name)))
    )
    unique_hcps = hcp_result.scalar()

    # Sentiment breakdown
    sentiment_result = await db.execute(
        select(
            HCPInteraction.sentiment,
            func.count(HCPInteraction.id).label("count"),
        ).group_by(HCPInteraction.sentiment)
    )
    sentiments = {row.sentiment.value if row.sentiment else "Unknown": row.count
                  for row in sentiment_result.all()}

    # Recent 5
    recent_result = await db.execute(
        select(HCPInteraction).order_by(HCPInteraction.created_at.desc()).limit(5)
    )
    recent = [i.to_dict() for i in recent_result.scalars().all()]

    return {
        "total_interactions": total,
        "interactions_this_week": this_week,
        "pending_follow_ups": pending_followups,
        "unique_hcps": unique_hcps,
        "sentiment_breakdown": sentiments,
        "recent_interactions": recent,
    }


# ── Direct agent endpoint ──────────────────────────────────────────────────────────

@router.post("/agent/chat", response_model=AgentResponseSchema)
async def agent_chat(payload: ChatMessageSchema):
    """
    Direct access to the LangGraph agent.
    Same as /interactions/chat but explicitly labeled for agent-only calls.
    """
    try:
        result = await run_agent(
            user_message=payload.message,
            session_id=payload.session_id,
        )
        return AgentResponseSchema(
            success=result.get("success", False),
            message=result.get("message", ""),
            data=result.get("data"),
            tool_used=result.get("tool_used"),
            ai_suggestions=result.get("ai_suggestions", []),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
