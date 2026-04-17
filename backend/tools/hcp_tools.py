"""
LangGraph Tool Definitions — HCP CRM Agent

Six tools:
  1. log_interaction_tool         — extract entities via LLM, store new interaction
  2. edit_interaction_tool        — modify existing record via natural language
  3. get_interaction_history_tool — fetch past interactions with filters
  4. suggest_next_action_tool     — AI-powered follow-up strategy
  5. generate_summary_tool        — weekly/monthly interaction summary
  6. search_hcp_tool              — search HCPs by name/specialty (bonus)

KEY FIX: API key is read from the `settings` singleton (pydantic-settings),
which loads the .env file at import time — eliminates "GROQ_API_KEY not set" errors.
"""

import json
import re
from collections import Counter
from datetime import datetime, timedelta, date
from typing import Optional
from uuid import UUID

from langchain_core.tools import tool
from sqlalchemy import select, func, or_

# ── IMPORTANT: import settings FIRST — triggers .env load before anything else ──
from core.settings import settings


# ── Groq helper ────────────────────────────────────────────────────────────────

async def _call_groq(prompt: str, system: str = "") -> str:
    """
    Calls Groq API with the key from the settings singleton.
    Raises a clear, actionable error if the key is empty.
    """
    import httpx

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. "
            "Add it to backend/.env as:  GROQ_API_KEY=gsk_xxxx\n"
            "Then restart the server."
        )

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",  # FIX: was "gemma2-9b-it" (deprecated/removed from Groq)
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 1024,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()


def _safe_json(text: str) -> dict:
    """Extract a JSON object from LLM output, stripping markdown fences."""
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except Exception:
                pass
    return {}


def _safe_date(val):
    """Parse YYYY-MM-DD string to date, returning None on failure."""
    if not val:
        return None
    try:
        return datetime.strptime(str(val), "%Y-%m-%d").date()
    except Exception:
        return None


# ── Tool 1: Log Interaction ────────────────────────────────────────────────────

@tool
async def log_interaction_tool(raw_text: str) -> str:
    """
    Tool 1 — Log Interaction

    Accepts free-text description of an HCP interaction.
    Uses Groq llama-3.3-70b-versatile to extract structured data, then stores in DB.

    Args:
        raw_text: Natural language interaction description from the field rep.
    Returns:
        JSON with the saved record and AI suggestions.
    """
    system_prompt = (
        "You are an AI assistant helping life science field representatives log "
        "Healthcare Professional (HCP) interactions in a CRM system.\n\n"
        "Extract the following entities and return ONLY valid JSON — no explanation, no preamble.\n\n"
        "JSON schema:\n"
        "{\n"
        '  "hcp_name": "string or null",\n'
        '  "specialty": "string or null (e.g. Oncology, Cardiology)",\n'
        '  "hospital": "string or null",\n'
        '  "interaction_type": "Visit|Call|Email|Conference|Webinar",\n'
        '  "interaction_date": "YYYY-MM-DD or null",\n'
        '  "summary": "2-3 sentence professional summary",\n'
        '  "topics_discussed": "comma-separated key topics",\n'
        '  "products_discussed": "comma-separated product names",\n'
        '  "sentiment": "Positive|Neutral|Negative",\n'
        '  "follow_up_required": true|false,\n'
        '  "follow_up_date": "YYYY-MM-DD or null",\n'
        '  "follow_up_notes": "string or null",\n'
        '  "outcomes": "string or null",\n'
        '  "ai_suggested_actions": ["action1", "action2", "action3"]\n'
        "}\n\n"
        f"For relative dates like 'next week', compute from today: {date.today()}"
    )

    extracted = _safe_json(await _call_groq(raw_text, system=system_prompt))

    if not extracted.get("hcp_name"):
        return json.dumps({
            "success": False,
            "message": "Could not extract HCP name. Please mention the doctor's name.",
            "tool_used": "log_interaction_tool",
        })

    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction, InteractionType, SentimentType

    type_map = {
        "visit": InteractionType.visit, "call": InteractionType.call,
        "email": InteractionType.email, "conference": InteractionType.conference,
        "webinar": InteractionType.webinar,
    }
    sentiment_map = {
        "positive": SentimentType.positive,
        "neutral":  SentimentType.neutral,
        "negative": SentimentType.negative,
    }

    interaction = HCPInteraction(
        hcp_name=extracted.get("hcp_name", "Unknown HCP"),
        specialty=extracted.get("specialty"),
        hospital=extracted.get("hospital"),
        interaction_type=type_map.get(
            str(extracted.get("interaction_type", "Visit")).lower(), InteractionType.visit),
        interaction_date=_safe_date(extracted.get("interaction_date")) or date.today(),
        summary=extracted.get("summary"),
        topics_discussed=extracted.get("topics_discussed"),
        products_discussed=extracted.get("products_discussed"),
        sentiment=sentiment_map.get(
            str(extracted.get("sentiment", "Neutral")).lower(), SentimentType.neutral),
        follow_up_required=bool(extracted.get("follow_up_required", False)),
        follow_up_date=_safe_date(extracted.get("follow_up_date")),
        follow_up_notes=extracted.get("follow_up_notes"),
        outcomes=extracted.get("outcomes"),
        ai_suggested_actions=json.dumps(extracted.get("ai_suggested_actions", [])),
        log_source="chat",
        raw_chat_input=raw_text,
    )

    async with AsyncSessionLocal() as session:
        session.add(interaction)
        await session.commit()
        await session.refresh(interaction)
        result = interaction.to_dict()

    return json.dumps({
        "success": True,
        "message": f"Interaction with {interaction.hcp_name} logged successfully.",
        "tool_used": "log_interaction_tool",
        "data": result,
        "ai_suggestions": extracted.get("ai_suggested_actions", []),
    })


# ── Tool 2: Edit Interaction ───────────────────────────────────────────────────

@tool
async def edit_interaction_tool(interaction_id: str, instruction: str) -> str:
    """
    Tool 2 — Edit Interaction

    Modifies an existing interaction via a natural language instruction.
    Only changed fields are patched; everything else stays the same.

    Args:
        interaction_id: UUID of the interaction to edit.
        instruction:    e.g. "Change follow-up to next Monday, sentiment to Positive"
    """
    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction, InteractionType, SentimentType

    # Fetch existing record to give the LLM context
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(HCPInteraction).where(HCPInteraction.id == UUID(interaction_id))
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            return json.dumps({
                "success": False,
                "message": f"No interaction found with ID {interaction_id}",
                "tool_used": "edit_interaction_tool",
            })
        existing = interaction.to_dict()

    system_prompt = (
        f"You are updating an HCP interaction record in a CRM.\n\n"
        f"Current record:\n{json.dumps(existing, indent=2)}\n\n"
        f"User instruction: {instruction}\n\n"
        "Return ONLY a JSON object containing the fields that should change.\n"
        "Valid fields: hcp_name, specialty, hospital, "
        "interaction_type (Visit/Call/Email/Conference/Webinar), "
        "interaction_date (YYYY-MM-DD), summary, topics_discussed, products_discussed, "
        "sentiment (Positive/Neutral/Negative), follow_up_required (bool), "
        "follow_up_date (YYYY-MM-DD), follow_up_notes, outcomes.\n"
        f"Return only changed fields. No explanation. Today is {date.today()}."
    )

    patch = _safe_json(await _call_groq(instruction, system=system_prompt))
    if not patch:
        return json.dumps({
            "success": False,
            "message": "Could not interpret the edit instruction. Please be more specific.",
            "tool_used": "edit_interaction_tool",
        })

    type_map = {
        "visit": InteractionType.visit, "call": InteractionType.call,
        "email": InteractionType.email, "conference": InteractionType.conference,
        "webinar": InteractionType.webinar,
    }
    sentiment_map = {
        "positive": SentimentType.positive,
        "neutral":  SentimentType.neutral,
        "negative": SentimentType.negative,
    }

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(HCPInteraction).where(HCPInteraction.id == UUID(interaction_id))
        )
        interaction = result.scalar_one_or_none()

        simple_fields = ["hcp_name", "specialty", "hospital", "summary",
                         "topics_discussed", "products_discussed", "follow_up_notes", "outcomes"]
        for f in simple_fields:
            if f in patch:
                setattr(interaction, f, patch[f])

        if "interaction_type" in patch:
            interaction.interaction_type = type_map.get(
                str(patch["interaction_type"]).lower(), interaction.interaction_type)
        if "sentiment" in patch:
            interaction.sentiment = sentiment_map.get(
                str(patch["sentiment"]).lower(), interaction.sentiment)
        if "interaction_date" in patch:
            interaction.interaction_date = _safe_date(patch["interaction_date"])
        if "follow_up_required" in patch:
            interaction.follow_up_required = bool(patch["follow_up_required"])
        if "follow_up_date" in patch:
            interaction.follow_up_date = _safe_date(patch["follow_up_date"])

        interaction.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(interaction)
        updated = interaction.to_dict()

    return json.dumps({
        "success": True,
        "message": f"Interaction with {updated['hcp_name']} updated successfully.",
        "tool_used": "edit_interaction_tool",
        "data": updated,
        "fields_updated": list(patch.keys()),
    })


# ── Tool 3: Get Interaction History ───────────────────────────────────────────

@tool
async def get_interaction_history_tool(
    hcp_name: Optional[str] = None,
    days_back: int = 30,
    limit: int = 10,
) -> str:
    """
    Tool 3 — Get Interaction History

    Retrieves past interactions, optionally filtered by HCP name and time window.

    Args:
        hcp_name:  Optional partial HCP name filter.
        days_back: How many days back to look (default 30, max 365).
        limit:     Max records to return (default 10, max 50).
    """
    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction

    cutoff = datetime.utcnow() - timedelta(days=min(days_back, 365))
    limit  = min(limit, 50)

    async with AsyncSessionLocal() as session:
        query = select(HCPInteraction).where(HCPInteraction.created_at >= cutoff)
        if hcp_name:
            query = query.where(HCPInteraction.hcp_name.ilike(f"%{hcp_name}%"))
        query = query.order_by(HCPInteraction.created_at.desc()).limit(limit)
        result = await session.execute(query)
        interactions = result.scalars().all()

    if not interactions:
        return json.dumps({
            "success": True,
            "message": "No interactions found for the given criteria.",
            "tool_used": "get_interaction_history_tool",
            "data": {"interactions": [], "count": 0},
        })

    records = [i.to_dict() for i in interactions]
    narrative = await _call_groq(
        f"Given these {len(records)} HCP interaction records, write a 2-3 sentence "
        "narrative summary highlighting patterns and pending follow-ups.\n\n"
        f"Records: {json.dumps(records[:5], default=str)}"
    )

    return json.dumps({
        "success": True,
        "message": f"Found {len(records)} interaction(s).",
        "tool_used": "get_interaction_history_tool",
        "data": {"interactions": records, "count": len(records), "narrative": narrative},
    })


# ── Tool 4: Suggest Next Action ────────────────────────────────────────────────

@tool
async def suggest_next_action_tool(
    hcp_name: str,
    context: Optional[str] = None,
) -> str:
    """
    Tool 4 — Suggest Next Action

    Analyses recent interactions with an HCP and generates AI follow-up recommendations.

    Args:
        hcp_name: Name of the HCP to generate suggestions for.
        context:  Optional additional context from the rep.
    """
    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(HCPInteraction)
            .where(HCPInteraction.hcp_name.ilike(f"%{hcp_name}%"))
            .order_by(HCPInteraction.created_at.desc())
            .limit(5)
        )
        interactions = result.scalars().all()

    history_text = (
        json.dumps([i.to_dict() for i in interactions], default=str)
        if interactions else "No previous interaction history available."
    )

    prompt = (
        "You are a life science sales strategy AI.\n\n"
        f"HCP Name: {hcp_name}\n"
        f"Recent interaction history: {history_text}\n"
        f"Additional context: {context or 'None'}\n\n"
        "Generate a prioritised list of 4-6 specific, actionable next steps.\n"
        "Mention products, timelines, and tactics relevant to life science sales.\n\n"
        "Return ONLY valid JSON:\n"
        "{\n"
        f'  "hcp_name": "{hcp_name}",\n'
        '  "priority_actions": [\n'
        '    {"action": "...", "reason": "...", "timeline": "...", "priority": "High|Medium|Low"},\n'
        "    ...\n"
        "  ],\n"
        '  "engagement_score": 1-10,\n'
        '  "overall_strategy": "2-3 sentence summary"\n'
        "}"
    )

    suggestions = _safe_json(await _call_groq(prompt))
    if not suggestions:
        suggestions = {
            "hcp_name": hcp_name,
            "priority_actions": [{"action": "Schedule a follow-up meeting",
                                   "reason": "Maintain engagement", "timeline": "1 week",
                                   "priority": "High"}],
            "overall_strategy": "Maintain consistent engagement with regular check-ins.",
        }

    return json.dumps({
        "success": True,
        "message": f"Next action suggestions generated for {hcp_name}.",
        "tool_used": "suggest_next_action_tool",
        "data": suggestions,
        "ai_suggestions": [a["action"] for a in suggestions.get("priority_actions", [])],
    })


# ── Tool 5: Generate Summary ───────────────────────────────────────────────────

@tool
async def generate_summary_tool(
    period: str = "weekly",
    rep_name: Optional[str] = None,
) -> str:
    """
    Tool 5 — Generate Summary

    Produces a structured weekly or monthly summary report.

    Args:
        period:   "weekly" (7 days) or "monthly" (30 days).
        rep_name: Optional rep name for personalisation.
    """
    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction

    days   = 7 if period == "weekly" else 30
    cutoff = datetime.utcnow() - timedelta(days=days)

    async with AsyncSessionLocal() as session:
        total_r = await session.execute(
            select(func.count(HCPInteraction.id)).where(HCPInteraction.created_at >= cutoff)
        )
        total = total_r.scalar()

        all_r = await session.execute(
            select(HCPInteraction).where(HCPInteraction.created_at >= cutoff)
            .order_by(HCPInteraction.created_at.desc())
        )
        interactions = all_r.scalars().all()

    if not interactions:
        return json.dumps({
            "success": True,
            "message": f"No interactions in the last {days} days.",
            "tool_used": "generate_summary_tool",
            "data": {"period": period, "total_interactions": 0,
                     "summary": "No activity recorded in this period."},
        })

    sentiment_counts  = {"Positive": 0, "Neutral": 0, "Negative": 0}
    unique_hcps       = set()
    pending_followups = 0
    all_products      = []

    for i in interactions:
        unique_hcps.add(i.hcp_name)
        if i.sentiment:
            sentiment_counts[i.sentiment.value] = sentiment_counts.get(i.sentiment.value, 0) + 1
        if i.follow_up_required:
            pending_followups += 1
        if i.products_discussed:
            all_products.extend([p.strip() for p in i.products_discussed.split(",")])

    top_products = [p for p, _ in Counter(all_products).most_common(5)]

    narrative = await _call_groq(
        f"Write a professional {period} CRM activity summary for a life science field rep.\n\n"
        f"Stats: total={total}, unique HCPs={len(unique_hcps)}, "
        f"sentiment={json.dumps(sentiment_counts)}, pending follow-ups={pending_followups}, "
        f"top products={', '.join(top_products) or 'N/A'}\n\n"
        f"Sample: {json.dumps([i.to_dict() for i in interactions[:5]], default=str)}\n\n"
        "Write a concise 3-4 sentence executive summary with wins, concerns, and priorities."
    )

    return json.dumps({
        "success": True,
        "message": f"{period.capitalize()} summary generated.",
        "tool_used": "generate_summary_tool",
        "data": {
            "period": period,
            "generated_at": datetime.utcnow().isoformat(),
            "rep_name": rep_name or "Field Representative",
            "total_interactions": total,
            "unique_hcps": len(unique_hcps),
            "hcp_list": list(unique_hcps),
            "sentiment_breakdown": sentiment_counts,
            "pending_follow_ups": pending_followups,
            "top_products_discussed": top_products,
            "executive_summary": narrative,
        },
    })


# ── Tool 6: Search HCP (Bonus) ─────────────────────────────────────────────────

@tool
async def search_hcp_tool(
    query: str,
    specialty: Optional[str] = None,
) -> str:
    """
    Tool 6 (Bonus) — Search HCP

    Searches for HCPs by name or specialty, with interaction counts.

    Args:
        query:     Partial HCP name.
        specialty: Optional specialty filter.
    """
    from database.connection import AsyncSessionLocal
    from models.interaction import HCPInteraction

    async with AsyncSessionLocal() as session:
        base_query = select(
            HCPInteraction.hcp_name, HCPInteraction.specialty, HCPInteraction.hospital,
            func.count(HCPInteraction.id).label("interaction_count"),
            func.max(HCPInteraction.created_at).label("last_interaction"),
        ).group_by(HCPInteraction.hcp_name, HCPInteraction.specialty, HCPInteraction.hospital)

        conditions = []
        if query:
            conditions.append(HCPInteraction.hcp_name.ilike(f"%{query}%"))
        if specialty:
            conditions.append(HCPInteraction.specialty.ilike(f"%{specialty}%"))
        if conditions:
            base_query = base_query.where(or_(*conditions))

        base_query = base_query.order_by(func.count(HCPInteraction.id).desc()).limit(20)
        result = await session.execute(base_query)
        rows = result.all()

    hcps = [
        {"hcp_name": r.hcp_name, "specialty": r.specialty, "hospital": r.hospital,
         "interaction_count": r.interaction_count,
         "last_interaction": str(r.last_interaction) if r.last_interaction else None}
        for r in rows
    ]

    return json.dumps({
        "success": True,
        "message": f"Found {len(hcps)} HCP(s).",
        "tool_used": "search_hcp_tool",
        "data": {"hcps": hcps, "count": len(hcps)},
    })


# ── Export ─────────────────────────────────────────────────────────────────────

ALL_TOOLS = [
    log_interaction_tool,
    edit_interaction_tool,
    get_interaction_history_tool,
    suggest_next_action_tool,
    generate_summary_tool,
    search_hcp_tool,
]