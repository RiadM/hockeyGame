# SYMBOLIC DICT

```
# State
!OK=1
!FL=0
!BL=-1

# Ops
&RD=Read
&WR=Write
&ED=Edit
&VF=Verify
&EX=Exec
&KL=Kill
&DLG=Delegate
&ORG=Organize

# Paths
@REQ=.claude/requirements
@DOC=.claude/docs
@SOP=.claude/docs/sop
@SCR=.claude/scripts
@HK=.claude/hooks
@AGENTS=.claude/agents

# Constraints
#CRIT=0
#HIGH=1
#MED=2
#LOW=3

# Logic
&&=AND
||=OR
!=NOT
->=THEN
<-=IF
==EQUALS
>=GTE
<=LTE
```

# RULE R0: VALUE_FIRST

```
PRE_EXEC_CHECK:
  works? -> !FL -> ABORT
  solves_current? -> !FL -> ABORT
  verify_before? -> !FL -> CREATE_VERIFY_FIRST
  simplest? -> !FL -> SIMPLIFY

BANNED:
  optimize <- !works
  cache <- basic_broken
  latest_ver <- USE_STABLE_LTS
  rewrite_N_times <- VERIFY_FIRST_WRITE_ONCE
```

# RULE R1: PRE_FLIGHT

```
HOOK: @HK/pre-task-check.sh
TRIGGERS: [&WR, &ED, TodoWrite]
ON_FIRE: STOP && &RD(hook_output) && COMPLY

SEQ_MANDATORY:
1. &RD(CLAUDE.md)
2. &RD(@REQ/*)
3. &RD(@SOP/*/*.md) <- IF_EXIST
4. CHECK(align_requirements)
5. PROCEED

VIOLATIONS=#CRIT:
  !pre_flight
  !read_requirements
  ignore_hook
  assume_knowledge
```

# NOTE: RULE R1.5 (REQUIREMENTS_SOURCE_TRUTH) removed - project-specific
# Adapt to your project's requirements structure

# RULE R1.6: SOP_ORGANIZATION

```
STRUCTURE:
@SOP/<category>/SOP-*.md -> ORGANIZED_BY_CATEGORY

REQUIRED_STRUCTURE:
.claude/
  docs/
    sop/
      development/     <- Code-first, verification, validation
      testing/         <- Testing standards, fake-passing prevention
      quality/         <- Dense format, documentation rules
      deployment/      <- Venv usage, environment setup
      git/            <- Worktree safety, branch management

CATEGORIES:
  development=code_first|verification|validation
  testing=fake_passing|test_quality|assertions
  quality=dense_format|no_docs|token_efficiency
  deployment=venv|docker|environment
  git=worktree|branching|merge_rules

SOP_LOOKUP:
1. Identify task category (testing, deployment, etc.)
2. &RD(@SOP/<category>/SOP-*.md)
3. Apply relevant SOPs

VIOLATIONS=#CRIT:
  sop_files_in_@DOC_root
  !category_organization
  mixed_categories_one_file
  create_sop_without_category
```

# RULE R2: SHELL_LIMIT

```
MAX_SHELLS=1
ACCEPTABLE_SHELLS=2 <- IF(server && test)

PRE_BACKGROUND:
1. /bashes -> COUNT
2. COUNT==0 -> OK_START_1
3. COUNT==1 -> STOP_ASK_WHY
4. COUNT>=2 -> VIOLATION=#CRIT

IF_OLD_SHELL:
  errored? -> &KL FIRST
  running? -> !START_NEW
  done? -> &KL FIRST

POST_TASK: &KL(ALL) && VERIFY(/bashes==0)
```

# RULE R3: WORKTREE_SAFETY

```
SOP: @SOP/git/SOP-WORKTREE-SAFETY.md
SCRIPT: @SCR/verify_worktree_safe_to_delete.sh

PRE_DELETE_MANDATORY:
1. git worktree list -> IDENTIFY_ALL
2. FOR_EACH worktree:
   - @SCR/verify_worktree_safe_to_delete.sh <path>
   - CHECK_EXIT_CODE
3. exit_code==1 -> ACTIVE -> ABORT
4. exit_code==2 -> ASK_USER -> WAIT_CONFIRM
5. user_confirms? -> PROCEED

CLASSIFICATION:
  ACTIVE: commits<7d || uncommitted_changes>0
  MERGED: branch_merged && no_new_commits
  UNCLEAR: !ACTIVE && !MERGED

VIOLATIONS=#CRIT:
  delete_without_verify
  delete_by_name_pattern
  assume_temporary_based_on_name
  !check_recent_commits
  !check_uncommitted_changes
  !ask_user <- IF_UNCLEAR

RECOVERY:
  branch_exists? -> git worktree add <path> <branch>
  !branch_exists? -> LOST

NEVER:
  git worktree remove ../worktree_* (pattern)
  assume("option_" == temporary)
  delete_all_except_main
```

# BANNED_BEHAVIORS

```
VIOLATIONS=#CRIT:
  !pre_flight_check
  tests_in_main -> USE_SUBAGENT
  servers_in_main -> USE_SUBAGENT
  bg_shell_without_/bashes
  shells>=3
  !cleanup_errored_shells
  assumptions -> USE_VERIFY_SCRIPTS
  emojis -> USE_TEXT[DONE|FAILED|TARGET]

  # FAKE VALIDATION = BANNED
  scripts[print_OK <- !pytest_run]
  scripts[return_0 <- !test_pass]
  scripts[claim_validation <- !subprocess.run]
  scripts[unicode_output <- windows]
  scripts[tickets_fixed <- !verify]

  # DOCUMENTATION FILES = BANNED
  ANY_DOC_FILE[.md|.txt|.doc|.rst] <- !explicit_user_request
  README*
  VERIFICATION*
  BUILD_STATUS*
  DEPLOY*
  STATUS*
  CHANGELOG*
  HISTORY*
  TODO.txt
  NOTES*
  merge_report*
  migration_plan*

  pleasantries[let_me|help_you]
  paragraphs -> CONCISE
  intro|overview|explore_sections
  prose_docs -> DENSE_MACHINE
  explanatory_text -> CODE+LOC_REF
  time_estimates
  phase_numbers -> USE_PRIORITY[CRIT|HIGH|MED|LOW]
  duration|timeline|schedule
  merge_failing_builds
  commit_without_tests
  change_api_contract <- !version_increment
  solve_complex_yourself -> DELEGATE_SUBAGENT
  latest_tech -> USE_STABLE_LTS
  verbose_3words_per_line -> DENSE_FORMAT
  vertical_spacing_waste -> COMPACT
  bullet_point_explosion -> SINGLE_LINE_ITEMS
```

# TOKEN_EFFICIENCY

```
RULES:
  human_text=0 <- !explicit_request
  symbolic_notation=MANDATORY
  compression>50%
  context<80k
  cache_patterns=1
  hash_ids=1
  binary_flags=1
  epoch_time=1
  !verbosity

RESPONSE_FORMAT:
  dense_compact=MANDATORY
  multi_info_per_line=REQUIRED
  !3_words_per_line
  !vertical_spacing_waste
  !bullet_point_per_trivial_item

  GOOD: "Local: docker-compose up, CPU backend, hot reload, port 8000"
  BAD:  "Local Development:\n  - Use docker-compose\n  - CPU backend\n  - Hot reload enabled\n  - Port 8000"

DOC_FORMAT:
  dense=1
  bullets=1
  !paragraphs
  code+structure > explanations
  !helpful_prose
  machine_parse_priority=1

BANNED <- !explicit_human_request:
  README.md
  intro_sections
  overview_paragraphs
  getting_started
  examples>1
  this_doc_describes
  lets_explore
  heres_how

EXAMPLE_COMPRESSION:
  BAD(68tok): prose_intro+explanation
  GOOD(12tok): bullets+loc_refs
  SAVINGS: 82%
```

# DOC_RULES

```
UPDATE_MERGE:
  !modification_reports
  !merge_docs
  !history_files
  update_existing || delete_obsolete

FORMAT:
  bullets > paragraphs
  examples<=1 <- IF_complex
  present_tense > future

STRUCTURE:
  diagram_nodes>10 -> split_doc+link

PLACEMENT:
@DOC/00-INDEX.md -> UPDATE_ON_ADD
@DOC/[folders]/ -> group_related
!@DOC/flat_files
!project_root/README.md
!temp_merge_plan.md
```

# FILE_OUTPUT

```
CODE_STATE:
  semantic_analysis > prose
  structure+loc_refs
  !explanations

FORMAT:
Component: Name
State: [initialized|ready|error]
Dependencies: [list]
Location: file.py:start-end
```

# RULE R4: VERIFY_BEFORE_WRITE

```
PATTERN_BANNED:
  &WR -> test -> fail -> rewrite (LOOP) = 5000tok

PATTERN_REQUIRED:
  create_verify -> run -> fix -> &WR_ONCE = 500tok

VERIFY_SCRIPTS @SCR/:
  verify-imports.py
  verify-packages.sh
  verify-versions.sh
  verify-config.sh
  verify-endpoints.sh
  verify-before-test.sh
```

# RULE R5: SCRIPT_VALIDATION

```
SOP: @SOP/quality/SOP-SCRIPT-VALIDATION.md

BANNED_PATTERN:
  script_writes_files -> print("OK") -> return 0 (FAKE)

REQUIRED_PATTERN:
  script_writes_files -> subprocess.run(pytest) -> check_exit_code -> return real_status

FAKE_VALIDATION_DETECTION:
  print("OK") <- !subprocess.run = FAKE
  return 0 <- !test_execution = FAKE
  print("DONE") <- !import_check = FAKE
  tickets_fixed.append() <- !verify = FAKE

SCRIPT_REQUIREMENTS:
  subprocess.run[pytest]=MANDATORY
  exit_code_check=MANDATORY
  import_verification=MANDATORY
  syntax_check[py_compile]=MANDATORY
  ascii_output_only=MANDATORY <- windows
  return 1 <- ANY_FAIL
  return 0 <- ALL_PASS_ONLY

VIOLATIONS=#CRIT:
  print_based_status <- !real_check
  always_return_0
  no_pytest_execution
  no_import_verification
  unicode_output <- windows_fail
  claim_success <- !validate

ENFORCEMENT:
  script_with_validation? -> MUST_RUN_REAL_TESTS
  script_returns_0? -> VERIFY_TESTS_ACTUALLY_PASSED
  script_prints_OK? -> VERIFY_NOT_FAKE
```

# VALIDATION_CHECKS

```
PRE_TASK:
  &RD(CLAUDE.md)=1
  &RD(@REQ/*)=1
  &RD(@SOP/*/*.md) <- IF_EXIST
  align_requirements=1
  hook_enforce=1

PRE_RESPONSE:
  !emojis
  !new_docs_for_updates
  !history_files
  code=semantic
  mermaid <- complex_structure
  machine_format=1 <- !explicit_human
  !README <- !explicit
  !intro|overview|explore
  !prose_waste
  !&WR(@REQ/*)

PRE_COMMIT:
  pass[linter|typecheck|formatter]=1
  pass[unit|integration|e2e]=1
  tests_for_new=1
  tests_run_before_commit=MANDATORY
  all_tests_passing=100%
  no_threshold_adjustments_to_hide_failures=1
  commit_msg=why
  !failing_builds
  api_contract[unchanged || version++]

TESTING_STANDARD:
  run_all_tests_first=1
  fix_failures_before_commit=1
  99%_perfection_minimum=1
  no_fake_passing=1
  no_commit_until_verified=1

TEST_QUALITY=#CRIT:
  assert_statements=MANDATORY
  pytest.raises=REQUIRED <- exception_tests
  !print_statements <- use_assert
  !manual_verification <- automate
  !should_work_comments <- make_it_work

FAKE_TESTS=BANNED:
  print("Test passed") -> USE: assert actual == expected
  print(f"Got {result}") -> USE: assert result == expected_value
  # TODO: verify manually -> USE: assert condition
  if result: print("OK") -> USE: assert result

TEST_PATTERN_REQUIRED:
  # WRONG: Fake test
  def test_function():
      result = function()
      print(f"Result: {result}")  # NO ASSERTION

  # RIGHT: Real test
  def test_function():
      result = function()
      assert result == expected_value
      assert isinstance(result, ExpectedType)

  # WRONG: Print-based validation
  def test_error():
      try:
          function()
          print("No error raised")  # FAKE
      except ValueError:
          print("ValueError raised")  # FAKE

  # RIGHT: Assert-based validation
  def test_error():
      with pytest.raises(ValueError):
          function()

PRE_BG_SHELL:
  /bashes=CHECKED
  shell_count<=1 (max=2)
  !need_another?
  cleanup_old_if_done|errored
  &KL(ALL) <- POST_TASK
```

# DEV_STANDARDS

```
PHILOSOPHY:
  iterative > massive_release
  understand > code
  pragmatism > ideology
  readable > clever
  stable > latest

COMMIT_QUALITY:
  linter=PASS
  typecheck=PASS
  formatter=PASS
  tests[unit|integration|e2e]=PASS
  tests_new_logic=1
  msg=why_not_what

ARCHITECTURE:
  composition > inheritance
  interfaces > direct_calls
  explicit_flow=1
  tdd=1

ERROR_HANDLE:
  fail_fast=1
  descriptive_msg=1
  correlation_ids=1
  handle_right_layer=1
  !silent_catch

DECISION_PRIORITY:
1. testability
2. readability
3. consistency
4. simplicity
5. reversibility

QUALITY_GATES:
  tests=PASS_ALL
  !console_errors
  !console_warnings
  !failing_builds_merge
  api_contract=immutable <- !version++
```

# SUBAGENT_DELEGATION

```
AGENT_REGISTRY: @DOC/AGENT_REGISTRY.md
AGENT_DIR: .claude/agents/

MANDATORY <- DELEGATE:
  code[gen|refactor|debug]
  analysis|explain|understand
  features|tests
  docs|strategy|planning
  multi_domain
  specialized_expertise

ORGANIZER_PROTOCOL:
1. complex_task -> LAUNCH(agent-organizer)
2. agent-organizer -> analyze+recommend_team+plan
3. main -> execute_delegation

AVAILABLE_AGENTS: 38
  development: 13 (frontend|backend|lang|dx)
  infrastructure: 5 (cloud|ops)
  quality: 5 (review|test)
  data_ai: 8 (data|ai)
  security: 1
  business: 1
  specialized: 2 (docs|api)
  organizer: 1

TEAM_SIZE:
  simple -> 3_agents
  complex_multi_domain -> 5-7_agents

FOLLOWUP_TREE:
  simple_clarify -> HANDLE_DIRECT
  build_existing -> USE_PREV_AGENTS(max=3)
  new_domain|major_scope -> RERUN_AGENT_ORGANIZER

NEVER:
  solve_complex_yourself
  interfere_subagent
  modify_subagent_output
  skip_organizer <- multi_domain
```

# GENERAL

```
RULES:
  concise=MAX
  !fluff
  !multiple_docs

  subagent <- [audit|research|parallel_tasks]
  subagent <- [tests|servers|deploy|monitor]

  !tests_in_main
  !servers_in_main
  !bg_process_in_main <- !(/bashes_check)

  verify_scripts > assumptions
```

# EXECUTION_FLOW

```
STARTUP:
1. &RD(CLAUDE.md)
2. &RD(@REQ/*)
3. &RD(@SOP/*/*.md) <- IF_EXIST
4. EXTRACT(rules+constraints)
5. APPLY(current_task)

ON_HOOK_FIRE:
1. STOP
2. &RD(hook_output)
3. CHECK(compliance)
4. PROCEED <- IF_COMPLIANT

ON_UNCERTAINTY:
1. &RD(@REQ/*)
2. !assume
3. align? -> PROCEED
4. !align? -> ABORT

ON_COMPLEX_TASK:
1. CHECK(delegation_criteria)
2. matches? -> LAUNCH(agent-organizer)
3. agent-organizer -> returns[team+plan]
4. execute_delegation <- team_plan
5. !matches? -> HANDLE_DIRECT

DELEGATION_CRITERIA:
  code[gen|refactor|debug]=1
  analysis|explain|understand=1
  features|tests=1
  docs|strategy|planning=1
  multi_domain=1
  specialized_expertise=1
```