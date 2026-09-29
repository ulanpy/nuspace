# Internal agent runtime

This is infrastructure for bounded, product-owned workflows. It is not a chat
API, has no router and has no default agent. It does not use Qdrant or provide
knowledge ingestion/retrieval.

During Pages prototyping only, `api.py` exposes unauthenticated
`POST /agent/page-drafts`. It returns a review-only Puck JSON draft and never
persists or publishes it. Move the route into the Pages domain and add its
authorization before release.

The first intended consumer is the Pages flow: a community or personal-space
feature will build a server-trusted `WorkflowCommand`, authorize its owner,
then use a `ScenarioHarness` to produce a draft composed only from the
frontend's supported Puck building blocks. That feature owns the HTTP
contract, a strict page-document validator, preview, publish confirmation and
the final write to `communities.page_content` (or a later unified pages model).

## Integration boundary

1. Implement `ScenarioHarness` in the owning Pages feature. Keep instructions,
   output schema and an allowlist of blocks there.
2. Construct `AgentService` with `RedisRunStore`, a fixed model and a finite
   turn limit in that feature's composition root.
3. Accept only product-specific input. Do not expose raw prompt/model/tool/run
   controls to the browser.
4. Validate the generated page document against the exact Puck block registry
   before showing a preview. Publication must be an explicit authorized action;
   a model must not write a page directly.
5. Tools may read narrow, authorized domain data. Any create, update, send or
   delete operation requires feature-level confirmation and audit logging.

`OPENAI_API_KEY` is only required when a feature executes a run. The runtime
itself does not read or persist user uploads; a feature should use the existing
media module and pass only authorized URLs as `InputPart` values.
