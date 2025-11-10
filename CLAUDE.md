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
@GAME=hockey_version_25oct.html
@SRC=src/

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
  build_systems <- GAME_IS_PURE_HTML_CSS_JS
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
      deployment/      <- Environment setup
      git/            <- Worktree safety, branch management

CATEGORIES:
  development=code_first|verification|validation
  testing=fake_passing|test_quality|assertions
  quality=dense_format|no_docs|token_efficiency
  deployment=static_hosting|environment
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

# RULE R3: ROOT_FOLDER_MANAGEMENT

```
ROOT_CLEAN=#CRIT:
  keep_root_minimal=1
  !temp_files
  !build_artifacts
  !random_scripts

ESSENTIAL_ROOT_FILES:
  CLAUDE.md           <- PROJECT_DOCUMENTATION (NEVER DELETE)
  .gitignore          <- GIT_CONFIG (NEVER DELETE)
  hockey_version_25oct.html <- GAME_ENTRY_POINT (NEVER DELETE)
  README.md           <- IF_EXISTS_KEEP (user may want it)
  package.json        <- IF_EXISTS_KEEP (future use)

ALLOWED_ROOT_DIRS:
  src/                <- SOURCE_CODE
  dist/               <- BUILD_OUTPUT (if needed)
  .claude/            <- CLAUDE_CONFIG
  .git/               <- GIT_REPO
  archive/            <- OLD_FILES

BANNED_IN_ROOT:
  *.py <- !python_scripts
  *.txt <- !notes
  *.png|*.jpg <- !images
  *test*.* <- move_to_appropriate_dir
  setup-*.* <- !setup_scripts
  fetch*.* <- !fetch_scripts
  extract*.* <- !extract_scripts
  scraped*.* <- !scraped_data
  *db*.* <- !database_files
  *.html <- IF_NOT_MAIN_GAME_FILE

CLEAN_ROOT_PATTERN:
  &RD(root_dir) -> identify_unnecessary -> ask_user_before_delete
  essential_files? -> KEEP
  temp|test|old? -> MOVE_TO_ARCHIVE || DELETE
  !assume_safe_to_delete

VIOLATIONS=#CRIT:
  delete_CLAUDE.md
  delete_.gitignore
  delete_main_game_file
  !ask_before_root_cleanup
  assume_file_unnecessary
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

  # BUILD SYSTEM BLOAT = BANNED
  vite|webpack|parcel <- GAME_IS_PURE_HTML_CSS_JS
  npm_run_dev <- !NO_BUILD_SYSTEM
  jest|playwright <- !FOR_NOW
  terser|minify <- !OPTIMIZE_LATER

  # COLOR PALETTE VIOLATIONS = BANNED
  yellow|orange|green|purple <- !HOCKEY_GAME
  colors_outside[cyan|blue|slate] <- VIOLATION=#CRIT
  use_yellow_for_league_diff <- USE[borders|opacity|font_weight]

  # FAKE VALIDATION = BANNED
  scripts[print_OK <- !real_check]
  scripts[return_0 <- !test_pass]
  scripts[claim_validation <- !subprocess.run]
  scripts[unicode_output <- windows]
  scripts[tickets_fixed <- !verify]

  # DOCUMENTATION FILES = BANNED
  ANY_DOC_FILE[.md|.txt|.doc|.rst] <- !explicit_user_request
  README* <- !explicit_request
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

  GOOD: "src/game.js:321, HockeyGame class, monolithic, needs refactor"
  BAD:  "The game is currently implemented as a monolithic class.\n  - Located in src/game.js\n  - 321 lines long\n  - Needs refactoring"

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

# GAME_ARCHITECTURE

```
TECH_STACK:
  HTML5 + CSS3 + Vanilla_JS_ES6
  !frameworks
  !build_systems
  !transpilers
  pure_browser_execution=1

CURRENT_STATE:
  @GAME: 2.8KB, single_page_app
  @SRC/game.js: 10KB, 321_lines, HockeyGame_class, MONOLITH
  @SRC/styles.css: 6.8KB, gradient_design
  @SRC/data.js: 38KB, 5_players, loaded_upfront

LAYOUT=#CRIT:
  grid: 15%_left_sidebar + 1fr_center_table + 20%_right_sidebar
  team_column: max-width_150px, padding_8px, nowrap, <10%_margin
  compact: tight_spacing, no_waste, hockeydb-style

MULTIPLAYER_COMPONENTS=#HIGH:
  right_sidebar: room_info + leaderboard + game_status + chat
  room_code: centered, 18px, letter-spacing_2px
  leaderboard: live_rankings, current_user_highlighted, round_progress
  chat: scrollable_messages, input+send, 10-11px_font
  status: mode|time_limit|turn_indicator

COLOR_PALETTE=#CRIT:
  ONLY: cyan(#06b6d4|#0891b2|#0e7490) + blue(#dbeafe|#bfdbfe|#e0f2fe|#bae6fd|#a5f3fc|#67e8f9|#cffafe) + slate(#f1f5f9|#e2e8f0|#cbd5e1|#94a3b8|#64748b|#334155)
  BANNED: yellow|green|orange|red <- EXCEPT_error_states
  DIFFERENTIATION: borders(solid_vs_dashed) + gradient_intensity
  ROW_COORDINATION=#CRIT: ALL columns in row follow SAME color_family + border_style
  SMART_DESIGN: NHL_rows=cyan_theme, junior_rows=slate_theme, NO_mixing
  NEVER_change_palette

TARGET_STATE:
  @GAME: entry_point
  @SRC/config.js: constants[scores|hints|timing]
  @SRC/models/GameState.js: centralized_state, validation
  @SRC/logic/GameLogic.js: pure_functions[scoring|validation]
  @SRC/ui/[ScoreDisplay|HintTooltip|WinModal|TableRenderer].js: reusable_components
  @SRC/services/PlayerService.js: data[loading|selection]
  @SRC/utils/EventBus.js: DOM_Logic_decoupling
  @SRC/data/: manifest.json + players/*.json (lazy_load, 2KB_per_player)

CONSTRAINTS:
  max_file_size: 150_lines
  !global_state <- outside_GameState
  all_mutations: validated_setters
  !duplicate_code
  game_logic: testable_without_DOM
```

# GAME_MECHANICS

```
INITIAL_STATE:
  regular_season_stats: visible[Season|GP|G|A|Pts|PIM|+/-]
  team_column: HIDDEN
  playoff_columns: HIDDEN
  score: 100
  hints_available: 3

HINT_SYSTEM:
  hint_1: -20pts, reveal_playoff_stats
  hint_2: -20pts, reveal_team_names
  hint_3: -20pts, show_4_player_names (multiple_choice)

SCORING:
  correct_guess: +50
  each_hint: -20
  best_score: 150 (no_hints + correct)
  with_all_hints: 90 (3_hints + correct)

WIN_CONDITION:
  player_name_guessed: case_insensitive
  all_columns: revealed
  game_ends: show_celebration

CONFIG_CONSTANTS:
  INITIAL_SCORE: 100
  HINT_PENALTY: 20
  CORRECT_BONUS: 50
  MAX_HINTS: 3
  MULTIPLE_CHOICE_COUNT: 4
  MESSAGE_TIMEOUT: 4000
  SHAKE_DURATION: 600
```

# SECURITY

```
XSS_PREVENTION:
  !innerHTML <- user_data
  textContent: MANDATORY <- dynamic_content
  sanitize: all_player_name_inputs

INPUT_VALIDATION:
  max_length: 100_chars
  allowed_chars: [a-z|spaces|hyphens|apostrophes]
  rate_limit: 10_guesses_per_second

CSP_HEADERS:
  default-src: 'self'
  script-src: 'self'
  style-src: 'self' 'unsafe-inline'
  img-src: 'self' data:
  connect-src: 'self'
```

# PERFORMANCE_TARGETS

```
METRICS:
  initial_load: <1s (lazy_data_loading)
  time_to_interactive: <2s
  lighthouse: >90
  bundle_size: <100KB
  first_contentful_paint: <1s

OPTIMIZATIONS:
  lazy_load: player_data (2KB_vs_38KB)
  dom_updates: DocumentFragment (batch)
  !minification <- later
  !compression <- later
```

# ACCESSIBILITY

```
WCAG_2.1_AA:
  contrast_ratio: 4.5:1_min
  focus_indicators: visible_all_interactive
  keyboard_nav: full_game_playable_no_mouse
  screen_reader: ARIA_labels_all_controls
  touch_targets: 44x44px_min

KEYBOARD_SHORTCUTS:
  Space: Get_Hint
  Enter: Submit_Guess
  Escape: Close_modals
  Tab: Navigate_controls
```

# DATA_SCHEMA

```
PLAYER_OBJECT:
{
  name: string,
  position: string,
  birth_date: string,
  birth_place: string,
  height: string,
  weight: string,
  shoots: string,
  draft_info: string | null,
  seasons: [
    {
      season: string,        // "2003-04"
      team: string,          // "Detroit Red Wings"
      league: string,        // "NHL"
      gp: number,            // Games Played
      g: number,             // Goals
      a: number,             // Assists
      pts: number,           // Points
      pim: number,           // Penalty Minutes
      plus_minus: string | null,
      playoff_gp: number,
      playoff_g: number,
      playoff_a: number,
      playoff_pts: number,
      playoff_pim: number
    }
  ]
}

CURRENT_PLAYERS: 5
  holmstrom, redmond, oreilly, mailloux, kadri
```

# DEVELOPMENT_PRIORITIES

```
PRIORITY_ORDER:
#CRIT:
  remove_console.log: src/game.js:53,54,100,230
  input_sanitization: XSS_prevention
  CSP_headers: security
  extract_magic_numbers: src/config.js

#HIGH:
  lazy_data_loading: 38KB->2KB
  error_boundaries: try/catch
  new_game_button: no_refresh
  keyboard_shortcuts: Space|Enter|Escape

#MED:
  animated_score_changes: +50/-20_floating_text
  hint_tooltips: show_cost_before_click
  win_modal: confetti + instant_replay
  progress_indicators: hints_used|score_bar

#LOW:
  modular_refactor: 150_lines_max_per_file
  mobile_responsive: 480px|1024px_breakpoints
  lighthouse_optimization: >90_score
```

# TROUBLESHOOTING

```
PLAYER_DATA_NOT_LOADING:
  check: data.js_path_in_HTML_script_tag
  check: PLAYERS_DATA_defined_before_game.js
  check: browser_console_errors

HINTS_NOT_REVEALING:
  check: .hidden_class_CSS (display:none!important)
  check: reveal-animation_class_applied
  check: hintsUsed_state_incrementing

MULTIPLE_CHOICE_NOT_SHOWING:
  check: Hint_3_triggered (hintsUsed===3)
  check: text-input-group_.hidden_class
  check: player-choices_container_not_hidden
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

GAME_AGENTS:
  frontend-developer: code_implementation
  ui-designer: visual_design
  ux-designer: user_experience
  security-auditor: security_review
  test-automator: testing
  performance-engineer: optimization

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

  pure_HTML_CSS_JS=1
  !build_systems
  !frameworks
  !transpilers
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
