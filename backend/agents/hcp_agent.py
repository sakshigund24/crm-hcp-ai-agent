"""
LangGraph HCP CRM Agent

Graph topology:
  START → classify_intent → execute_tool → format_response → END

The classify_intent node uses Groq gemma2-9b-it to decide which tool to call.
The execute_tool node invokes the tool asynchronously.
The format_response node shapes the output for the API layer.

KEY FIX: API key comes from settings singleton, not raw os.getenv().
"""

import json
import re
from typing import TypedDict, Optional, Annotated, List

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

# ── Import settings FIRST ── triggers .env load before any os.getenv() calls ──
from core.settings import settings

from tools.hcp_tools import (
    log_interaction_tool,
    edit_interaction_tool,
    get_interaction_history_tool,
    suggest_next_action_tool,
    generate_summary_tool,
    search_hcp_tool,
)


# ── Agent State ────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages:       Annotated[List[BaseMessage], add_messages]
    intent:         Optional[str]
    tool_name:      Optional[str]
    tool_args:      Optional[dict]
    tool_result:    Optional[str]
    final_response: Optional[dict]
    error:          Optional[str]


# ── Groq helper (agent-local, uses settings) ───────────────────────────────────

async def _call_groq_agent(prompt: str, system: str = "") -> str:
    import httpx

    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set. "
            "Add it to backend/.env:  GROQ_API_KEY=gsk_xxxx"
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
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.15,
                "max_tokens": 512,
            },
        )
        if resp.status_code != 200:
            print("GROQ ERROR:", resp.text)
            raise Exception(resp.text)

        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


# ── Node 1: Classify Intent ────────────────────────────────────────────────────

async def classify_intent_node(state: AgentState) -> AgentState:
    """
    Reads the latest user message and decides which tool to call + what args to pass.
    Falls back to log_interaction_tool if classification fails.
    """
    last_message = state["messages"][-1].content if state["messages"] else ""

    system = (
        "You are the routing brain of an HCP CRM AI assistant for life science field reps.\n\n"
        "Available tools and when to use them:\n"
        "1. log_interaction_tool         — rep describes a new meeting, call, visit, or email\n"
        "2. edit_interaction_tool        — rep wants to change/update an existing interaction\n"
        "3. get_interaction_history_tool — rep asks to see past interactions or history\n"
        "4. suggest_next_action_tool     — rep asks for advice or follow-up strategy\n"
        "5. generate_summary_tool        — rep asks for a weekly or monthly report\n"
        "6. search_hcp_tool              — rep searches for a specific doctor or HCP\n\n"
        "Based on the user message, respond with ONLY valid JSON:\n"
        "{\n"
        '  "tool_name": "<one of the 6 tool names above>",\n'
        '  "args": {\n'
        "    // log_interaction_tool:         {\"raw_text\": \"<full message>\"}\n"
        "    // edit_interaction_tool:        {\"interaction_id\": \"<uuid>\", \"instruction\": \"<what to change>\"}\n"
        "    // get_interaction_history_tool: {\"hcp_name\": \"<name or null>\", \"days_back\": 30, \"limit\": 10}\n"
        "    // suggest_next_action_tool:     {\"hcp_name\": \"<name>\", \"context\": \"<extra context or null>\"}\n"
        "    // generate_summary_tool:        {\"period\": \"weekly|monthly\"}\n"
        "    // search_hcp_tool:              {\"query\": \"<search term>\", \"specialty\": \"<or null>\"}\n"
        "  },\n"
        '  "intent_label": "<short label>"\n'
        "}"
    )

    try:
        raw     = await _call_groq_agent(last_message, system=system)
        cleaned = re.sub(r"```(?:json)?", "", raw).replace("```", "").strip()
        parsed  = json.loads(cleaned)
        return {
            **state,
            "intent":    parsed.get("intent_label", "unknown"),
            "tool_name": parsed.get("tool_name"),
            "tool_args": parsed.get("args", {}),
        }
    except Exception as e:
        # Safe fallback — try to log the interaction
        return {
            **state,
            "intent":    "log_interaction",
            "tool_name": "log_interaction_tool",
            "tool_args": {"raw_text": last_message},
            "error":     f"Intent classification fallback triggered: {str(e)}",
        }


# ── Node 2: Execute Tool ───────────────────────────────────────────────────────

async def execute_tool_node(state: AgentState) -> AgentState:
    """Calls the appropriate tool with classified arguments."""
    tool_name = state.get("tool_name")
    tool_args = state.get("tool_args", {})

    tool_map = {
        "log_interaction_tool":         log_interaction_tool,
        "edit_interaction_tool":        edit_interaction_tool,
        "get_interaction_history_tool": get_interaction_history_tool,
        "suggest_next_action_tool":     suggest_next_action_tool,
        "generate_summary_tool":        generate_summary_tool,
        "search_hcp_tool":              search_hcp_tool,
    }

    tool_fn = tool_map.get(tool_name)
    if not tool_fn:
        return {
            **state,
            "tool_result": json.dumps({
                "success": False,
                "message": f"Unknown tool requested: {tool_name}",
            }),
        }

    try:
        result = await tool_fn.ainvoke(tool_args)
        return {**state, "tool_result": result}
    except Exception as e:
        return {
            **state,
            "tool_result": json.dumps({
                "success": False,
                "message": f"Tool execution error: {str(e)}",
                "tool_used": tool_name,
            }),
            "error": str(e),
        }


# ── Node 3: Format Response ────────────────────────────────────────────────────

async def format_response_node(state: AgentState) -> AgentState:
    """Parses the raw tool result and shapes it into a clean API response."""
    raw_result = state.get("tool_result", "{}")

    try:
        result_dict = json.loads(raw_result) if isinstance(raw_result, str) else raw_result
    except Exception:
        result_dict = {"success": False, "message": "Failed to parse tool result"}

    final = {
        "success":        result_dict.get("success", False),
        "message":        result_dict.get("message", "Action completed."),
        "tool_used":      result_dict.get("tool_used", state.get("tool_name")),
        "intent":         state.get("intent"),
        "data":           result_dict.get("data"),
        "ai_suggestions": result_dict.get("ai_suggestions", []),
    }

    return {
        **state,
        "final_response": final,
        "messages":       [AIMessage(content=final["message"])],
    }


# ── Build & compile the graph ──────────────────────────────────────────────────

def build_agent_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("classify_intent",  classify_intent_node)
    graph.add_node("execute_tool",     execute_tool_node)
    graph.add_node("format_response",  format_response_node)
    graph.add_edge(START,              "classify_intent")
    graph.add_edge("classify_intent",  "execute_tool")
    graph.add_edge("execute_tool",     "format_response")
    graph.add_edge("format_response",  END)
    return graph.compile()


_agent_graph = None


def get_agent():
    global _agent_graph
    if _agent_graph is None:
        _agent_graph = build_agent_graph()
    return _agent_graph


async def run_agent(user_message: str, session_id: Optional[str] = None) -> dict:
    """
    Main entry point.
    Args:
        user_message: Natural language message from the field rep.
        session_id:   Optional session tracking ID.
    Returns:
        Final response dict with success, message, data, and suggestions.
    """
    agent = get_agent()
    initial_state: AgentState = {
        "messages":       [HumanMessage(content=user_message)],
        "intent":         None,
        "tool_name":      None,
        "tool_args":      None,
        "tool_result":    None,
        "final_response": None,
        "error":          None,
    }
    final_state = await agent.ainvoke(initial_state)
    return final_state.get("final_response", {
        "success": False,
        "message": "Agent did not produce a response.",
    })
