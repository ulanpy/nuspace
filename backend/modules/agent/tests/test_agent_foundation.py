import pytest
from backend.modules.agent.api import router
from backend.modules.agent.page_draft import (
    PageDraftHarness,
    PageDraftRequest,
    PuckPageData,
    with_puck_block_ids,
)
from backend.modules.agent.schemas import InputPart, WorkflowCommand
from backend.modules.agent.service import AgentService
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError


def test_sdk_input_supports_text_image_and_file_urls() -> None:
    command = WorkflowCommand(
        objective="Create a draft page",
        inputs=[
            InputPart(kind="text", value="Use an accessible, concise layout"),
            InputPart(kind="image_url", value="https://example.test/hero.png"),
            InputPart(kind="file_url", value="https://example.test/brief.pdf"),
        ],
    )

    content = AgentService._sdk_input(command)[0]["content"]

    assert [part["type"] for part in content] == [
        "input_text",
        "input_text",
        "input_image",
        "input_file",
    ]
    assert content[2]["image_url"] == "https://example.test/hero.png"
    assert content[3]["file_url"] == "https://example.test/brief.pdf"


def test_agent_input_is_not_a_chat_contract() -> None:
    command = WorkflowCommand(objective="Create a page draft")

    assert "message" not in command.model_dump()


def test_page_draft_harness_has_a_closed_puck_output_schema() -> None:
    agent = PageDraftHarness(model="test-model").build_agent()

    assert agent.model == "test-model"
    assert agent.output_type is PuckPageData


def test_page_draft_request_and_output_reject_unknown_properties() -> None:
    with pytest.raises(ValidationError):
        PageDraftRequest.model_validate(
            {"brief": "Create a detailed club landing page", "model": "x"}
        )


def test_page_draft_adds_unique_server_owned_puck_ids() -> None:
    document = PuckPageData.model_validate(
        {
            "root": {
                "props": {
                    "backgroundColor": "#ffffff",
                    "textColor": "",
                    "accentColor": "#1d4ed8",
                    "fontFamily": "Inter",
                    "borderRadius": "12px",
                }
            },
            "content": [
                {
                    "type": "Hero",
                    "props": {
                        "title": "Welcome",
                        "description": "Build together.",
                        "buttons": [
                            {
                                "label": "Website",
                                "href": "https://nuspace.kz/",
                                "variant": "primary",
                                "size": "large",
                                "icon": "none",
                                "iconPosition": "left",
                                "iconOnly": False,
                            }
                        ],
                        "align": "left",
                        "verticalAlign": "center",
                        "fontSize": 20,
                        "verticalGap": "24px",
                        "horizontalGap": "24px",
                        "layout": {"paddingX": "16px", "padding": "64px"},
                    },
                },
                {
                    "type": "Heading",
                    "props": {
                        "text": "Hello",
                        "level": "1",
                        "size": 20,
                        "align": "left",
                        "layout": {
                            "spanCol": 1,
                            "spanRow": 1,
                            "paddingX": "16px",
                            "padding": "8px",
                            "grow": False,
                        },
                    },
                },
                {
                    "type": "Text",
                    "props": {
                        "text": "Welcome",
                        "size": 20,
                        "align": "left",
                        "maxWidth": "",
                        "layout": {
                            "spanCol": 1,
                            "spanRow": 1,
                            "paddingX": "16px",
                            "padding": "0px",
                            "grow": False,
                        },
                    },
                },
                {
                    "type": "Space",
                    "props": {"direction": "", "size": "24px"},
                },
                {
                    "type": "Heading",
                    "props": {
                        "text": "Resources",
                        "level": "1",
                        "size": 20,
                        "align": "left",
                        "layout": {
                            "spanCol": 1,
                            "spanRow": 1,
                            "paddingX": "16px",
                            "padding": "8px",
                            "grow": False,
                        },
                    },
                },
                {
                    "type": "LinkTree",
                    "props": {
                        "buttons": [
                            {
                                "label": "Website",
                                "description": "Project home",
                                "href": "https://nuspace.kz/",
                                "variant": "primary",
                                "size": "large",
                                "icon": "none",
                                "iconPosition": "left",
                                "iconOnly": False,
                            },
                            {
                                "label": "GitHub",
                                "description": "Source code",
                                "href": "https://github.com/ulanpy/nuspace",
                                "variant": "secondary",
                                "size": "large",
                                "icon": "none",
                                "iconPosition": "left",
                                "iconOnly": False,
                            },
                        ],
                        "verticalGap": "16px",
                        "layout": {"paddingX": "16px", "padding": "24px"},
                    },
                },
                {
                    "type": "Space",
                    "props": {"direction": "", "size": "24px"},
                },
                {
                    "type": "Text",
                    "props": {
                        "text": "Choose a starting point and join in.",
                        "size": 20,
                        "align": "left",
                        "maxWidth": "",
                        "layout": {
                            "spanCol": 1,
                            "spanRow": 1,
                            "paddingX": "16px",
                            "padding": "0px",
                            "grow": False,
                        },
                    },
                },
            ],
        }
    )

    result = with_puck_block_ids(document)

    assert [block.props.id for block in result.content] == [
        "agent-hero-1",
        "agent-heading-2",
        "agent-text-3",
        "agent-space-4",
        "agent-heading-5",
        "agent-linktree-6",
        "agent-space-7",
        "agent-text-8",
    ]


def test_page_draft_endpoint_is_unauthed_but_requires_server_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = FastAPI()
    app.include_router(router)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = TestClient(app).post(
        "/agent/page-drafts",
        json={"brief": "Create a welcoming landing page for the Robotics Club."},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Page draft generation is not configured"

    with pytest.raises(ValidationError):
        PuckPageData.model_validate(
            {
                "root": {
                    "props": {
                        "backgroundColor": "#ffffff",
                        "textColor": "#000000",
                        "accentColor": "#1d4ed8",
                        "fontFamily": "Inter",
                        "borderRadius": "12px",
                    }
                },
                "content": [
                    {
                        "type": "Heading",
                        "props": {
                            "text": "Hello",
                            "level": "1",
                            "size": 32,
                            "align": "center",
                        },
                    },
                    {
                        "type": "Text",
                        "props": {
                            "text": "Welcome",
                            "size": 16,
                            "align": "center",
                            "maxWidth": "640px",
                            "unexpected": True,
                        },
                    },
                ],
            }
        )
