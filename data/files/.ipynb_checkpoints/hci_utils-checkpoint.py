"""
hci_utils.py  –  Shared loaders and helpers for HCI Medical App analysis.
Place this file in the same folder as the notebooks (or on sys.path).

Advanced metrics computed here:
  - Drawing smoothness (mean angular direction change)
  - Path efficiency (target length / drawn length)
  - Drawing duration (frame count)
  - Reaction time (spawn→start_drawing from play event log)
  - Per-finger RT and accuracy from mobileMovements
  - Key position map from laptopMovements
"""
import json, os, warnings
import numpy as np
import pandas as pd
from scipy import stats

# ── loaders ──────────────────────────────────────────────────────────────────

def _path_to_array(coords):
    if not coords:
        return np.empty((0, 2))
    return np.array([[p['x'], p['y']] for p in coords], dtype=float)

def _path_length(pts):
    if len(pts) < 2:
        return 0.0
    d = np.diff(pts, axis=0)
    return float(np.sum(np.hypot(d[:, 0], d[:, 1])))

def _smoothness(pts):
    """Mean angular direction change (radians). Lower = smoother."""
    if len(pts) < 3:
        return np.nan
    v1 = np.diff(pts[:-1], axis=0)
    v2 = np.diff(pts[1:],  axis=0)
    dots  = np.sum(v1 * v2, axis=1)
    norms = np.linalg.norm(v1, axis=1) * np.linalg.norm(v2, axis=1) + 1e-12
    angles = np.arccos(np.clip(dots / norms, -1, 1))
    return float(np.mean(angles))


def load_board_tries(data_dir: str) -> pd.DataFrame:
    """
    Load boarddrawingtries.json, clean known issues, compute advanced metrics.
    
    Columns added beyond raw fields:
      accuracy       – hits/total * 100
      path_length    – total Euclidean length of drawn path (normalised canvas units)
      target_length  – total length of target path
      path_efficiency– target_length / path_length (1=perfect, <1=overdrawn, >1=underdrawn)
      smoothness_rad – mean angular change between consecutive drawing vectors (lower=smoother)
      duration_frames– endedAt - startedAt
      n_points       – number of recorded (x,y,t) points
    """
    path = os.path.join(data_dir, 'boarddrawingtries.json')
    raw  = json.load(open(path))
    records = []
    for r in raw:
        if r.get('gameId') == '[object Promise]':
            continue   # broken record — skip
        r['shapeType'] = str(r.get('shapeType', '')).upper()
        r['hand']      = str(r.get('hand', '')).strip().capitalize()

        gc = r.get('gameCoordinates', [])
        bg = r.get('bgCoordinates',   [])
        gc_pts = _path_to_array(gc)
        bg_pts = _path_to_array(bg)

        r['accuracy']        = (r['hits'] / r['total'] * 100) if r.get('total', 0) > 0 else 0.0
        r['n_points']        = len(gc)
        r['path_length']     = _path_length(gc_pts)
        r['target_length']   = _path_length(bg_pts)
        r['path_efficiency'] = (r['target_length'] / r['path_length']
                                 if r['path_length'] > 0 else np.nan)
        r['smoothness_rad']  = _smoothness(gc_pts)
        r['duration_frames'] = (r.get('endedAt', 0) - r.get('startedAt', 0))
        records.append(r)

    df = pd.DataFrame(records)
    for col in ['startedAt', 'endedAt']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df['createdAt'] = pd.to_datetime(df['createdAt'], utc=True, errors='coerce')
    return df.reset_index(drop=True)


def load_bd_sessions(data_dir: str) -> tuple:
    """
    Load boarddrawingsessions.json.
    Also parses the play event log to extract:
      - reaction_times: list of (shape, reaction_frames) per session
      - success_count / fail_count from events
    Returns (valid_df, abandoned_df).
    """
    path = os.path.join(data_dir, 'boarddrawingsessions.json')
    raw  = json.load(open(path))
    records = []
    for s in raw:
        play = s.get('play', [])
        # parse event timeline
        last_spawn = {}
        reactions  = []
        successes  = 0
        fails      = 0
        for ev in play:
            name = ev.get('eventName', '')
            rt   = ev.get('responsetime', 0)
            shape = ev.get('shapeType', '')
            if name == 'spawn_shape' and shape:
                last_spawn[shape] = rt
            elif name == 'start_drawing' and shape in last_spawn:
                reactions.append(rt - last_spawn[shape])
            elif name == 'drawing_success':
                successes += 1
            elif name == 'drawing_fail':
                fails += 1

        rec = dict(s)
        rec['time']            = pd.to_datetime(s.get('time'), utc=True, errors='coerce')
        rec['event_successes'] = successes
        rec['event_fails']     = fails
        rec['avg_reaction_frames'] = float(np.mean(reactions)) if reactions else np.nan
        rec['n_reactions']     = len(reactions)
        records.append(rec)

    df = pd.DataFrame(records).sort_values('time').reset_index(drop=True)
    valid     = df[df['sessionScore'] > 0].copy()
    abandoned = df[df['sessionScore'] == 0].copy()
    return valid, abandoned


def load_piano_sessions(data_dir: str) -> tuple:
    """
    Load pianosessions.json.
    Returns (session_df, keypress_df).
    """
    path = os.path.join(data_dir, 'pianosessions.json')
    raw  = json.load(open(path))
    rows    = []
    kp_rows = []
    for s in raw:
        play     = s.get('play', [])
        hits     = sum(1 for p in play if p['correct'] == 1)
        misses   = sum(1 for p in play if p['correct'] == 0)
        timeouts = sum(1 for p in play if p['correct'] == -1)
        valid_rt = [p['responsetime'] for p in play if p.get('responsetime', 0) > 0]
        total    = len(play)
        rows.append({
            'session_id'   : s['_id'],
            'user'         : s['user'],
            'time'         : pd.to_datetime(s.get('time'), utc=True, errors='coerce'),
            'mode'         : s.get('mode', 'unknown'),
            'gameType'     : s.get('gameType', 'unknown'),
            'gameName'     : s.get('gameName', 'unknown'),
            'sessionScore' : s.get('sessionScore', 0),
            'levelspan'    : s.get('levelspan', np.nan),
            'hits'         : hits,
            'misses'       : misses,
            'timeouts'     : timeouts,
            'total_keys'   : total,
            'hit_rate'     : hits / total if total > 0 else np.nan,
            'avg_rt'       : float(np.mean(valid_rt)) if valid_rt else np.nan,
            'rt_std'       : float(np.std(valid_rt))  if len(valid_rt) > 1 else np.nan,
            'is_valid'     : total >= 3,
        })
        for i, p in enumerate(play):
            kp_rows.append({
                'session_id'   : s['_id'],
                'gameType'     : s.get('gameType', 'unknown'),
                'keypress_idx' : i,
                'responsetime' : p.get('responsetime', 0),
                'correct'      : p.get('correct', 0),
                'mode'         : s.get('mode', 'unknown'),
            })
    session_df  = pd.DataFrame(rows).sort_values('time').reset_index(drop=True)
    keypress_df = pd.DataFrame(kp_rows)
    return session_df, keypress_df


def load_piano_movements(data_dir: str) -> pd.DataFrame:
    """Load laptopMovements — key transitions with dx, dy, distance, fromXY, toXY."""
    path = os.path.join(data_dir, 'pianosessions.json')
    raw  = json.load(open(path))
    rows = []
    for s in raw:
        for m in s.get('laptopMovements', []):
            rows.append({
                'session_id': s['_id'],
                'gameType'  : s.get('gameType', 'unknown'),
                'fromKey'   : m['fromKey'],
                'toKey'     : m['toKey'],
                'distance'  : m['distance'],
                'dx'        : m['dx'],
                'dy'        : m.get('dy', 0),
                'fromX'     : m.get('fromX', np.nan),
                'fromY'     : m.get('fromY', np.nan),
                'toX'       : m.get('toX',   np.nan),
                'toY'       : m.get('toY',   np.nan),
                'direction' : 'left' if m['dx'] < 0 else ('right' if m['dx'] > 0 else 'same'),
            })
    return pd.DataFrame(rows)


def load_finger_movements(data_dir: str) -> pd.DataFrame:
    """Load mobileMovements — per-finger accuracy, RT, correct/wrong finger."""
    path = os.path.join(data_dir, 'pianosessions.json')
    raw  = json.load(open(path))
    rows = []
    for s in raw:
        for m in s.get('mobileMovements', []):
            rows.append({
                'session_id'     : s['_id'],
                'gameType'       : s.get('gameType', 'unknown'),
                'key'            : m.get('key', ''),
                'finger'         : m.get('finger', 'unknown'),
                'expectedFinger' : m.get('expectedFinger', 'unknown'),
                'responsetime'   : m.get('responsetime', 0),
                'correct'        : m.get('correct', 0),
                'correct_finger' : m.get('finger') == m.get('expectedFinger'),
            })
    return pd.DataFrame(rows)


def build_key_position_map(data_dir: str) -> dict:
    """Return dict of key → (x_px, y_px) from laptopMovements."""
    path = os.path.join(data_dir, 'pianosessions.json')
    raw  = json.load(open(path))
    kmap = {}
    for s in raw:
        for m in s.get('laptopMovements', []):
            kmap[m['fromKey']] = (m.get('fromX', np.nan), m.get('fromY', np.nan))
            kmap[m['toKey']]   = (m.get('toX',   np.nan), m.get('toY',   np.nan))
    return kmap


# ── helpers ───────────────────────────────────────────────────────────────────

def compare_groups(a: pd.Series, b: pd.Series, label_a='A', label_b='B') -> dict:
    """Mann-Whitney U test + rank-biserial effect size."""
    a = a.dropna(); b = b.dropna()
    if len(a) < 2 or len(b) < 2:
        warnings.warn('Not enough data for statistical test.')
        return {'p_value': np.nan, 'effect_size': np.nan, 'significant': False,
                'mean_a': float(a.mean()) if len(a) else np.nan,
                'mean_b': float(b.mean()) if len(b) else np.nan,
                'std_a': float(a.std()) if len(a) else np.nan,
                'std_b': float(b.std()) if len(b) else np.nan,
                'n_a': len(a), 'n_b': len(b),
                'label_a': label_a, 'label_b': label_b}
    stat, p = stats.mannwhitneyu(a, b, alternative='two-sided')
    n1, n2  = len(a), len(b)
    r       = 1 - (2 * stat) / (n1 * n2)
    return {
        'label_a': label_a, 'label_b': label_b,
        'mean_a' : float(a.mean()), 'mean_b': float(b.mean()),
        'std_a'  : float(a.std()),  'std_b':  float(b.std()),
        'n_a': n1, 'n_b': n2,
        'p_value': float(p), 'effect_size': float(r),
        'significant': bool(p < 0.05),
    }


def save_fig(fig, filename: str, out_dir: str = 'outputs', dpi: int = 150):
    os.makedirs(out_dir, exist_ok=True)
    fpath = os.path.join(out_dir, filename)
    fig.savefig(fpath, dpi=dpi, bbox_inches='tight')
    print(f'Saved -> {fpath}')
    return fpath


SHAPE_ORDER  = ['CIRCLE','TRIANGLE','ELLIPSE','HEART','HEXAGON','STAR','DIAMOND','SQUARE']
HAND_COLORS  = {'Left': '#2a6e4f', 'Right': '#c84b2f'}
GROUP_COLORS = ['#2c4fa0', '#c84b2f']
