# HCI Medical App — Analysis Pipeline Planning Document

**Purpose:** This document tells you what Python / Jupyter / Colab notebooks to build, what data each one needs, what figures it should produce, and what research questions it answers. It is not a static report — it is a blueprint for a reusable analysis pipeline that you re-run every time new data comes in.

---

## How to think about this pipeline

Every notebook in this plan follows the same pattern:

1. Load JSON files from a folder (you point it at whatever folder has today's data)
2. Clean and validate the data
3. Compute metrics
4. Save figures as `.png` and summary tables as `.csv`
5. Print a short text summary

When you collect data from a new group of users — say, older adults, or a clinical group — you drop their JSON files into a new folder and re-run the same notebooks. The comparison notebooks then take two folders as input and produce side-by-side figures automatically.

---

## Data files and what is inside them

Before building anything, every notebook must understand the schema. Here is what each file contains:

**`boarddrawingtries.json`**
One record per individual drawing attempt. Key fields: `shapeType`, `hand`, `completed`, `percentComplete`, `hits`, `total`, `startedAt`, `endedAt`, `user`, `bgCoordinates` (the target path as x,y points), `gameCoordinates` (the actual drawn path as x,y,timestamp points).

**`boarddrawingsessions.json`**
One record per full board drawing session. Key fields: `sessionScore`, `time`, `user`, `systemMetrics` (device, resolution), `coordinates` (the full drawing trace for the session).

**`boarddrawinggames.json`**
One record per game round. Note: currently all records have `completed: false` and `totalScore: 0` because the write-back is broken in the app. Do not use this file for scoring — use `boarddrawingsessions.json` instead. This file is useful only for `bgCoordinates` (the reference shape path) and `startedAt`.

**`pianosessions.json`**
One record per piano game session. Key fields: `sessionScore`, `mode` (laptop or mobile), `play` (array of `{responsetime, correct}` — correct is 1=hit, 0=miss, -1=timeout), `laptopMovements` (array of `{fromKey, toKey, distance, dx, dy}`), `fingerTimeouts` (per-finger time limit config), `user`.

**`gamesessions.json`**
Currently empty. This will hold Arm Reach / Fruit Fetcher data when that game is used.

---

## Known data quality issues to handle in every notebook

Write a shared `data_loader.py` or a first cell in each notebook that handles these:

- **Zero-score sessions:** `boarddrawingsessions.json` has sessions with `sessionScore: 0`. These are abandoned/incomplete sessions. Filter them out before trend analysis but count them separately as an "abandonment rate" metric.
- **Invalid gameId:** One record in `boarddrawingtries.json` has `gameId: "[object Promise]"` — a bug in the app. Filter this out during load.
- **Undefined user roles:** All users currently have `role: "UNDEFINED"`. The notebooks must accept a manual `group_label` parameter (e.g., "young", "elderly", "patient", "control") passed at runtime, since the app is not yet writing this field.
- **Piano session validity:** Sessions with fewer than 3 keypresses in `play` are likely abandoned. Flag them and exclude from score trend analysis.
- **Mobile vs laptop mode:** All current sessions are `mode: "laptop"`. The mobile finger-action fields are pre-populated but not yet populated by real sessions. Write the notebooks to handle both modes when they exist.

---

## Notebook 01 — Shape Motor Performance

**Filename:** `01_shape_motor_performance.ipynb`

**Research question:** Which shapes are hardest? Does accuracy differ by shape, and does that pattern change over time or between user groups?

**Input:** `boarddrawingtries.json`

**Key computations:**

- Per shape: success rate (completed tries / total tries), average accuracy (mean of hits/total per try × 100), try count
- Per shape: distribution of accuracy scores (not just the mean — show the spread)
- Over time: sort tries by `startedAt`, compute rolling average accuracy per shape (window = 5 tries)

**Figures to produce:**

`fig01a_shape_success_rate.png` — horizontal bar chart, one bar per shape, sorted by success rate. Color: green above 80%, amber 60–80%, red below 60%.

`fig01b_shape_accuracy_distribution.png` — box plot, one box per shape, showing median, IQR, and outliers of accuracy scores.

`fig01c_shape_radar.png` — spider/radar chart with 8 axes (one per shape), plotting success rate and accuracy as two overlapping polygons. Good for a single-page summary of all shapes at once.

`fig01d_shape_accuracy_over_time.png` — line chart with one line per shape, x-axis is try number (chronological), y-axis is rolling average accuracy. Shows whether the user is improving on each shape.

`fig01e_try_count_vs_success.png` — scatter plot where each point is a shape, x = number of tries, y = success rate. Reveals whether users retry harder shapes more.

**Output table:** `shape_summary.csv` with columns: shape, total_tries, success_count, success_rate, avg_accuracy, std_accuracy.

---

## Notebook 02 — Hand Asymmetry Analysis

**Filename:** `02_hand_asymmetry.ipynb`

**Research question:** Is there a significant performance difference between the left and right hand? Which shapes show the biggest asymmetry? Does the gap narrow over time (improvement)?

**Input:** `boarddrawingtries.json`

**Key computations:**

- Per hand: success rate, average accuracy, try count
- Per hand × shape: success rate (creates a 2 × 8 matrix)
- Asymmetry score per shape: left success rate minus right success rate (positive = left is better)
- Over time: split tries by hand, compute rolling accuracy per hand, plot both on same axis

**Figures to produce:**

`fig02a_hand_success_rate.png` — grouped bar chart: two bars per shape (left, right), showing success rate. This is the main clinical figure.

`fig02b_hand_accuracy_boxplot.png` — side-by-side box plots: accuracy distribution for left vs right across all shapes combined.

`fig02c_asymmetry_score_per_shape.png` — diverging bar chart: positive bars = left hand better, negative bars = right hand better. Center line = zero (no asymmetry).

`fig02d_hand_accuracy_over_time.png` — two lines on same plot (left, right), x = try number chronological, y = rolling accuracy. Shows if the gap is closing.

**Clinical note to include in the notebook:** In rehabilitation research, the impaired hand typically shows lower accuracy and more variability (higher standard deviation). If right hand is the impaired limb, the asymmetry score is the primary recovery metric to track longitudinally.

**Output table:** `hand_asymmetry_summary.csv` with columns: shape, left_tries, left_success_rate, left_avg_acc, right_tries, right_success_rate, right_avg_acc, asymmetry_score.

---

## Notebook 03 — Trajectory Visualizer

**Filename:** `03_trajectory_visualizer.ipynb`

**Research question:** Where exactly does the user deviate from the target path? Are errors concentrated at specific parts of a shape (e.g., the bottom curve of a circle)?

**Input:** `boarddrawingtries.json`

**Key computations:**

Each try has `bgCoordinates` (20–30 x,y points defining the target shape) and `gameCoordinates` (the actual drawn x,y,timestamp points). Both are normalized 0–1 relative to canvas size.

To compare them:
- Interpolate the drawn path to the same number of points as the target (use `numpy.interp` or `scipy.interpolate`)
- Compute Euclidean distance between each matched point pair
- Average the per-point distances across all tries of the same shape

**Figures to produce:**

`fig03a_trajectory_overlay_{shape}.png` — one figure per shape. Plot target path in dark gray. Overlay all tries for that shape in light blue (semi-transparent). Shows the "cloud" of actual paths around the target.

`fig03b_checkpoint_deviation_heatmap_{shape}.png` — for each shape, plot the target path as a line, and color each checkpoint by the average deviation at that point (use a colormap: green = close, red = far). Shows exactly where on the shape users struggle.

`fig03c_drawing_speed_{shape}.png` — using the `timestamp` field in `gameCoordinates`, compute distance between consecutive points divided by time delta. Plot speed along the path. Shows where users slow down or rush.

**Implementation note:** The coordinates are already normalized (0 to 1). Scale them to a 500×500 pixel canvas for plotting. Use `matplotlib.patches` or `matplotlib.path` for clean path rendering.

**Output table:** `trajectory_deviation_by_checkpoint.csv` with columns: shape, checkpoint_index, mean_deviation, std_deviation.

---

## Notebook 04 — Piano Reaction Analysis

**Filename:** `04_piano_reaction_analysis.ipynb`

**Research question:** How fast and accurate is the user on the piano game? Does accuracy depend on the distance between keys? Are certain key pairs harder than others?

**Input:** `pianosessions.json`

**Key computations:**

- Per session: hit count, miss count, timeout count, hit rate, average response time (filter `responsetime > 0`)
- Session score trend over time
- Per key transition (fromKey → toKey): frequency, average distance, error rate
- Response time distribution: histogram across all valid keypresses
- Distance vs accuracy: group transitions by distance bucket (0–200, 200–400, 400–600, 600–800, 800+), compute hit rate per bucket

**Figures to produce:**

`fig04a_session_scores.png` — bar chart of session scores over time, colored by hit rate (green = high hit rate, red = low).

`fig04b_hit_miss_timeout_per_session.png` — stacked bar chart: each bar is a session, stacked sections show hits / misses / timeouts. Shows where errors cluster.

`fig04c_response_time_histogram.png` — histogram of all response times (filter > 0), with vertical lines for mean and median. Shows finger reflex speed distribution.

`fig04d_distance_vs_accuracy.png` — bar chart or scatter: x = key transition distance bucket, y = hit rate. Tests whether longer reach = more errors.

`fig04e_key_transition_heatmap.png` — square heatmap matrix where rows = fromKey, columns = toKey, cell color = frequency or error rate. Reveals which key pairs are used most and which are hardest.

`fig04f_score_trend.png` — line chart of session scores over time, with a trend line. Main longitudinal metric for the piano game.

**Output table:** `piano_session_summary.csv` with columns: session_id, score, hits, misses, timeouts, hit_rate, avg_response_time, mode.

---

## Notebook 05 — User Group Comparison

**Filename:** `05_group_comparison.ipynb`

**Research question:** How does performance differ between user groups? This is the core HCI research notebook — you run it when you have data from at least two groups (e.g., young adults vs elderly, patients vs controls, pre-therapy vs post-therapy).

**Input:** Two data folders, each with their own set of JSON files. The notebook takes `group_a_path` and `group_b_path` as parameters, plus `label_a` and `label_b` (e.g., "Young (18–30)" and "Elderly (60+)").

**Key computations:**

For each metric, compute for Group A and Group B separately, then run a statistical test:
- Mann-Whitney U test (non-parametric, good for small samples) for continuous metrics like accuracy, response time
- Chi-squared or Fisher's exact test for categorical metrics like success rate
- Report p-value and effect size (Cohen's d or rank-biserial correlation)

**Figures to produce:**

`fig05a_shape_success_comparison.png` — grouped bar chart: 8 shapes × 2 groups. Primary figure for shape difficulty comparison.

`fig05b_hand_asymmetry_comparison.png` — side-by-side asymmetry score chart for Group A and Group B. Shows if one group has more asymmetry.

`fig05c_accuracy_distribution_comparison.png` — overlapping violin plots or KDE curves: accuracy distribution for Group A vs Group B per hand.

`fig05d_piano_score_comparison.png` — box plots: piano session score distribution for Group A vs Group B.

`fig05e_response_time_comparison.png` — overlapping histograms: response time distribution for Group A vs Group B.

`fig05f_radar_comparison.png` — radar chart with two overlapping polygons (one per group), axes = key metrics (shape accuracy, hand asymmetry, piano hit rate, avg response time, score). Single summary figure.

**Output table:** `group_comparison_stats.csv` with columns: metric, group_a_mean, group_b_mean, group_a_std, group_b_std, p_value, effect_size, significant.

---

## Notebook 06 — Longitudinal Progress Tracker

**Filename:** `06_longitudinal_progress.ipynb`

**Research question:** Is a specific user or group improving over time? This notebook is designed to be re-run as new sessions are collected.

**Input:** All JSON files for one user or one group, across all dates collected.

**Key computations:**

- Per week / per day: average shape accuracy, hand asymmetry score, piano hit rate, piano response time
- Week-over-week change in each metric
- Improvement rate: slope of linear regression on each metric vs session number
- Flag sessions where performance dropped significantly (more than 1.5 standard deviations below the user's own baseline)

**Figures to produce:**

`fig06a_accuracy_over_sessions.png` — line chart: per-session average accuracy, with trend line. One line per hand (left, right).

`fig06b_piano_score_over_sessions.png` — line chart: piano score per session, with trend line and shaded confidence interval.

`fig06c_response_time_over_sessions.png` — line chart: average response time per session. Should decrease as user improves.

`fig06d_hand_gap_over_sessions.png` — line chart: left-minus-right asymmetry score per session. Should approach zero as impaired hand recovers.

`fig06e_weekly_summary_heatmap.png` — heatmap where rows = weeks, columns = metrics (shape accuracy, piano score, response time, hand asymmetry), cell color = normalized value. Good for quick clinical review.

**Output table:** `longitudinal_summary.csv` with columns: session_date, shape_avg_accuracy, hand_asymmetry, piano_score, piano_hit_rate, avg_response_time.

---

## Notebook 07 — Session Quality and Engagement Flags

**Filename:** `07_session_quality.ipynb`

**Research question:** How engaged is the user? Are sessions getting abandoned? Is there a time-of-day or session-length pattern?

**Input:** All JSON files.

**Key computations:**

- Abandonment rate: sessions with score = 0 or fewer than 3 interactions, as a proportion of total sessions
- Session length: for board drawing, estimate duration from first and last `startedAt`/`endedAt` in tries. For piano, count keypresses × average response time.
- Time of day: extract hour from session timestamps, compute average performance per hour bucket
- Session frequency: sessions per day, over all days

**Figures to produce:**

`fig07a_session_score_distribution.png` — histogram of all session scores (board and piano). Shows whether the score distribution is healthy or skewed toward very low scores.

`fig07b_abandonment_rate.png` — pie or bar chart showing valid sessions vs abandoned sessions.

`fig07c_time_of_day_performance.png` — bar chart: average accuracy by hour of day (requires multiple days of data to be meaningful).

`fig07d_sessions_per_day.png` — bar chart: number of sessions per calendar day. Shows engagement consistency.

**Output table:** `session_quality_flags.csv` with columns: session_id, game_type, score, is_abandoned, estimated_duration_s, hour_of_day.

---

## Shared utilities to build once and import everywhere

Create a file called `hci_utils.py` (or a `utils/` folder) that all notebooks import. It should contain:

**`load_board_tries(path)`** — loads `boarddrawingtries.json`, filters the invalid `gameId: "[object Promise]"` record, normalizes `shapeType` to uppercase, returns a pandas DataFrame.

**`load_piano_sessions(path)`** — loads `pianosessions.json`, explodes the `play` array into one row per keypress, adds session-level fields to each row, returns a DataFrame.

**`load_bd_sessions(path)`** — loads `boarddrawingsessions.json`, filters zero-score sessions (flags them separately), returns a DataFrame.

**`compute_accuracy(hits, total)`** — safe division, returns 0 if total is 0.

**`rolling_accuracy(df, group_col, window)`** — computes rolling mean accuracy per group (e.g., per shape, per hand).

**`compare_groups(df, metric_col, group_col)`** — runs Mann-Whitney U test and computes effect size, returns a dict with p_value, effect_size, and significant boolean.

**`save_fig(fig, filename, dpi=150)`** — saves figure to an `outputs/` subfolder, always at consistent DPI.

---

## HCI research angles this data supports

The following comparisons and experiments become possible once you have data from more than one group:

**Young adults vs elderly:** Response time differences on the piano game directly measure age-related motor slowing. Shape accuracy differences reveal which types of movements degrade with age. The trajectory visualizer shows whether older users have more tremor (visible as jagged paths around the target).

**Dominant vs non-dominant hand:** If you ask users to record which hand is dominant during onboarding, the asymmetry notebook becomes a study of non-dominant hand motor control in healthy users — a useful baseline to compare against patients.

**Pre-therapy vs post-therapy:** Run the longitudinal notebook on a patient's data from before they started rehabilitation and after several weeks. The hand asymmetry score and piano response time are the most sensitive metrics for detecting improvement.

**Device type comparison:** The piano sessions have `systemMetrics.resolution` and `userAgent`. Once you have mobile sessions, you can compare laptop-mode vs mobile-mode performance — relevant for understanding whether the app works across devices.

**Difficulty progression:** The `levelspan` field in piano sessions and `gameIndex` in board drawing games indicate which difficulty level was played. As these values increase, you can study whether harder levels produce proportionally worse performance or whether users adapt.

---

## What to add to the app to make future analysis better

These are gaps in the current data that, if fixed, would significantly improve what the notebooks can do:

The user role field is currently always `UNDEFINED`. Add a brief onboarding screen that collects age range, dominant hand, and whether the user has a diagnosed motor condition. This makes the group comparison notebook immediately useful.

The board drawing game-level records (`boarddrawinggames.json`) always show score = 0 because the write-back is broken. Fix the `await` bug and ensure aggregated game scores are written at session end.

Add a session timestamp to `boarddrawingtries.json` at the millisecond level. Currently `startedAt` and `endedAt` are integer frame counts, not real timestamps. This makes drawing speed analysis approximate rather than precise.

The `fingerTimeouts` configuration in piano sessions varies between sessions (some have `leftPinky: 10`, others have `leftPinky: 9`). Standardize the timeout configuration or log it consistently so that difficulty level can be controlled in analysis.

Add a unique participant ID that is stable across sessions. Currently the `user` field is a database object ID that could change. A stable anonymous participant code (e.g., P001, P002) makes longitudinal tracking cleaner.

---

*This document should be updated each time a new game or data field is added to the app. The notebooks built from this plan should be version-controlled alongside the app code.*
