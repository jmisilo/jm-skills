---
name: jm-use-subagents
description: "Act as orchestrator for the rest of the session: every subtask (research, understanding, implementation, testing, review, etc.) goes to subagents on the model and effort you name."
disable-model-invocation: true
argument-hint: "<model> [version] [effort]"
---

# Use subagents

Setting: $ARGUMENTS

From now until the user says otherwise, you are the orchestrator. You plan, split the work, brief subagents, check what comes back, and talk to the user. Subagents do the work itself, on the model and effort named above. This holds for every task in the session, not only the next one.

## 1. Parse the setting

Read the argument as `<model> [version] [effort]`, in any order and case. Match the model and version against the models your environment lists for subagents, and the effort against the effort levels your delegation tool accepts (for example `low`, `medium`, `high`, `xhigh`, `max`; "extra high" means `xhigh`).

- No effort given: let subagents run at their default effort, and say so once.
- No model, or a model your environment doesn't list: ask once, offering the models it does list. Do no work until it is answered.

Then state the setting in one line, `Subagents: <model> · <effort>`, and repeat that line at the top of every plan and status update. The skill text can be dropped when the conversation is compacted; the repeated line is what keeps the setting alive.

## 2. Pick the tool that runs that model

1. Use the subagent tool that can run the named model at the named effort, and pass both explicitly on every spawn, including search and planning agents: their own default model is replaced only when you pass one.
2. If your native subagent tool can't express the model or version, use another delegation tool your environment offers that can, after checking its list of available models for the exact ID.
3. If no tool can run it: stop and tell the user which model is unreachable and which ones are reachable. Never substitute a different model or a lower effort without asking, because the user picked the model for cost or quality and a silent swap breaks both.

## 3. Run every task through subagents

For each request:

1. **Split** it into subtasks with one deliverable each: research, understanding the code, implementation, testing, review, etc. Any work that fits one brief can be a subtask. Write the split as a short numbered list before spawning.
2. **Brief** each subagent as a peer with no context: the goal, what is already known or ruled out, the files or docs to read, the scope it must stay inside, and the exact shape of its report (for example "the changed files, test output, anything you could not verify"). End every brief with "Do the work yourself; do not start further subagents."
3. **Spawn** independent subtasks in one message so they run in parallel. Subtasks that edit code never share a file; when they would, run them one after another or give each `isolation: "worktree"`.
4. **Check** what comes back before building on it. Read the diff, or ask a subagent the specific question the report left open. A report is a claim, not evidence.
5. **Test and review with fresh agents.** Testing and review go to a different subagent than the one that implemented, briefed with the code and the requirements but not the implementer's conclusions, so it doesn't just confirm them.
6. **Fix through the owner.** A failed check goes back to the subagent that owns the files (SendMessage keeps its context), then the failed check runs again. After 3 rounds on the same check, bring it to the user with the evidence.

What you still do yourself:
- talking to the user, decisions, and the plan;
- git, pushing, opening PRs, deploys, all after asking the user, as before;
- reading a returned diff or log, or running one command to confirm a specific claim.

Anything that means reading across several files, searching, writing code, running a test suite, reviewing, etc. goes to a subagent, even when it would be quick to do yourself. The user turned this on to move that work onto the named model.

## 4. Finish

A task is done when every subtask has reported, an independent subagent has tested or reviewed the result, and its checks pass. Then report in one message:
- what changed or what was found, per subtask, in one line each;
- the model and effort each subagent actually ran on;
- each check that no one ran, listed as Not verified;
- actions that need the user (push, PR, deploy, decisions).

Subagent reports never reach the user directly, so relay everything that matters.

## Gotchas

- A forked subagent (one that inherits your context) ignores the model and effort you pass and runs on your own model. Never fork under this skill; spawn fresh subagents.
- Delegation tools often say to set effort only when the user asks. Running this skill is that request; pass it on every spawn.
- A model alias usually means the newest model of that family. When the user names an older version, check the tool can run that exact version before spawning.
- If a spawn errors because the model doesn't support the named effort, report it and ask. Don't retry at a lower effort on your own.
- When this skill and `jm-complex-workflow` run together, its phases use this setting and skip its "ask for model and effort" step.

## Scope

The user's explicit instructions and the project's conventions override this skill. It decides who does the work, not how the work is done. The user turns it off by saying so or by starting a new session.
