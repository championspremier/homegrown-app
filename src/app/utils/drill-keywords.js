/**
 * Drill Algorithm Keywords with Synonyms
 * 
 * Tactical: from drill-keywords-restructured (sourced into curriculum-backbone).
 * Technical/Physical/Mental: derived from curriculum-backbone (skills/sub-skills as keywords).
 */
import { DRILL_KEYWORDS as DRILL_KEYWORDS_RESTRUCTURED } from './drill-keywords-restructured.js';
import {
  getPhasesForPeriod as getPhasesForPeriodFromBackbone,
  getTacticalKeywordsForPeriodAndPhase as getTacticalKeywordsFromBackbone,
  getKeywordForBackboneSkill,
  getKeywordsForCategoryFromBackbone,
  getTacticalKeywordByKey
} from './curriculum-backbone.js';

export const DRILL_KEYWORDS = DRILL_KEYWORDS_RESTRUCTURED;

// (Technical/physical/mental keywords are derived from curriculum-backbone in getKeywordsForCategory, getKeywordForSkill, etc.)

/**
          keyword: 'Support angles',
          synonyms: ['Supporting positions', 'Passing angles', 'Assist angles']
        },
        'use-gk': {
          keyword: 'Use GK',
          synonyms: ['Utilize goalkeeper', 'Involve keeper', 'Play through goalie']
        },
        'receive-beyond-press': {
          keyword: 'Receive beyond press',
          synonyms: ['Get behind pressure', 'Accept past press', 'Take behind defenders']
        },
        'diagonal-pass': {
          keyword: 'Diagonal pass',
          synonyms: ['Angled pass', 'Slant pass', 'Cross-field pass']
        },
        'timing-of-check': {
          keyword: 'Timing of check',
          synonyms: ['Check timing', 'Movement timing', 'Run timing']
        },
        'set-at-45': {
          keyword: 'Set at 45°',
          synonyms: ['Position at angle', 'Angle positioning', 'Angled setup', '45 degrees']
        },
        'play-in-front': {
          keyword: 'Play in front',
          synonyms: ['Pass into space', 'Play ahead', 'Forward pass']
        },
        'back-foot-receive': {
          keyword: 'Back-foot receive',
          synonyms: ['Receive on back foot', 'Back foot control', 'Reverse foot receive']
        },
        'deception': {
          keyword: 'Deception',
          synonyms: ['Feint', 'Misdirection', 'Trick']
        },
        'recycle-run': {
          keyword: 'Recycle run',
          synonyms: ['Repeat run', 'Support again', 'Run again']
        },
        'base-support-run': {
          keyword: 'Base–support–run',
          synonyms: ['Foundation-support-movement', 'Base-assist-sprint', 'Foundation-help-run']
        },
        'run-towards-free-player': {
          keyword: 'Run towards free player',
          synonyms: ['Move to free player', 'Check to free player', 'Support free player', 'Run to open player']
        },
        'check-when-ball-going-to-passer': {
          keyword: 'Check when ball going to passer',
          synonyms: ['Timing of check', 'Check timing', 'Movement timing', 'Run when ball to passer']
        },
        'rotations-when-mid-marked': {
          keyword: 'Rotations when mid marked',
          synonyms: ['Midfield rotations', 'Mid goes wide', 'Another mid checks central', 'Rotation patterns']
        },
        'winger-checks-in-fullback-wide': {
          keyword: 'Winger checks in, fullback wide',
          synonyms: ['Winger inside', 'Fullback wide', 'Width creation', 'Winger support']
        },
        'breaking-lines-off-pass': {
          keyword: 'Breaking lines off pass',
          synonyms: ['Line breaking pass', 'Penetrating pass', 'Through pass', 'Breaking pass']
        },
        'retaining-possession': {
          keyword: 'Retaining possession',
          synonyms: ['Keep possession', 'Maintain control', 'Secure possession', 'Hold ball']
        },
        'diagonal-ball-set-winger': {
          keyword: 'Diagonal ball for set to winger',
          synonyms: ['Diagonal pass to winger', 'Angled pass wide', 'Set winger', 'Diagonal service']
        },
        'receive-past-defensive-line': {
          keyword: 'Receive past defensive line',
          synonyms: ['Receive behind line', 'Get behind defense', 'Past last line', 'Behind defensive line']
        },
        'run-behind-last-line': {
          keyword: 'Run behind last line',
          synonyms: ['Run in behind', 'Behind defense', 'Past last defender', 'Through run']
        },
        'drop-and-support': {
          keyword: 'Drop and support',
          synonyms: ['Support quickly', 'Drop back', 'Support underneath', 'Come short']
        },
        'cb-drop-create-option': {
          keyword: 'CB drop to create option',
          synonyms: ['Center back drop', 'CB support', 'Defender drop', 'Create passing option']
        },
        'breaking-lines-off-dribble': {
          keyword: 'Breaking lines off dribble',
          synonyms: ['Dribble past line', 'Break line with dribble', 'Dribble through', 'Penetrate with dribble']
        },
        'straight-dribble-angled-pass': {
          keyword: 'Straight dribble to angled pass',
          synonyms: ['Dribble then pass', 'Against momentum', 'Change direction pass', 'Dribble to pass']
        },
        'play-highest-player': {
          keyword: 'Play highest player available',
          synonyms: ['Play forward', 'Play advanced player', 'Highest option', 'Forward pass']
        },
        'take-space-provided': {
          keyword: 'Take space provided',
          synonyms: ['Use space', 'Exploit space', 'Take available space', 'Attack space']
        },
        'play-over': {
          keyword: 'Play over',
          synonyms: ['Long ball', 'Over the top', 'Play long', 'Over defense']
        },
        'play-around': {
          keyword: 'Play around',
          synonyms: ['Bypass', 'Go around', 'Circumvent', 'Play wide']
        }
      },
      'defending': {
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break']
        },
        'pressing-triggers': {
          keyword: 'Pressing triggers',
          synonyms: ['Moment to press', 'Press trigger', 'When to press', 'Press opportunity']
        },
        'force-to-one-side': {
          keyword: 'Force to one side',
          synonyms: ['Channel wide', 'Force wide', 'Direct to side', 'Push to flank']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking passes',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options']
        },
        'press-block-horizontal-vertical': {
          keyword: 'Press to block horizontal and vertical pass',
          synonyms: ['Block passing lanes', 'Cut options', 'Close angles', 'Block passes']
        },
        'low-block': {
          keyword: 'Low block',
          synonyms: ['Deep block', 'Defensive block', 'Compact defense', 'Deep line']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach']
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position']
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness']
        },
        'slide-tackling': {
          keyword: 'Slide tackling',
          synonyms: ['Slide tackle', 'Tackling', 'Ground tackle', 'Recovery tackle']
        },
        'one-v-one-defending': {
          keyword: '1v1 Defending',
          synonyms: ['One versus one', 'Individual defending', 'Isolation defending', 'Man marking']
        }
      },
      'transition-d-to-a': {
        'own-third': {
          keyword: 'Own Third',
          synonyms: ['Defensive third', 'Our half', 'Defensive zone', 'Back third']
        },
        'second-player-exploit': {
          keyword: '2nd player in possession has 1-2 touches to exploit',
          synonyms: ['Quick transition', 'Fast break', 'Counter attack', 'Quick exploit']
        },
        'player-head-down-hectic': {
          keyword: 'Player who won ball has head down and hectic',
          synonyms: ['Won ball hectic', 'Recovery moment', 'Transition moment', 'Quick decision']
        },
        'exploit-space': {
          keyword: 'Exploit space',
          synonyms: ['Use space', 'Attack space', 'Take space', 'Utilize space']
        },
        'support-angled-beneath': {
          keyword: 'Support angled beneath',
          synonyms: ['Support underneath', 'Deep support', 'Behind support', 'Angled support']
        },
        'support-angled-horizontally': {
          keyword: 'Support angled horizontally',
          synonyms: ['Horizontal support', 'Side support', 'Wide support', 'Lateral support']
        },
        'slide-tackle-retain-possession': {
          keyword: 'Slide tackle retaining possession',
          synonyms: ['Winning tackle', 'Clean tackle', 'Possession tackle', 'Controlled tackle']
        }
      },
      'transition-a-to-d': {
        'team-drops-45-degree': {
          keyword: 'Team drops at 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle']
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball']
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward']
        }
      }
    },
    'middle-third': {
      'attacking': {
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check']
        },
        'zig-zag': {
          keyword: 'Zig-zag',
          synonyms: ['Diagonal movement', 'S-shaped run', 'Weaving run']
        },
        'no-straight-balls-wide': {
          keyword: 'No straight balls wide',
          synonyms: ['Avoid direct wide passes', 'No linear wide passes', 'Curved wide passes']
        },
        'between-lines': {
          keyword: 'Between lines',
          synonyms: ['In pockets', 'Between defenders', 'In gaps']
        },
        'rotate-mids': {
          keyword: 'Rotate mids',
          synonyms: ['Midfield rotation', 'Switch midfielders', 'Midfield movement']
        },
        'counter-movement': {
          keyword: 'Counter-movement',
          synonyms: ['Opposite movement', 'Reverse run', 'Change direction']
        },
        'support-far': {
          keyword: 'Support far',
          synonyms: ['Deep support', 'Distant support', 'Far assistance']
        },
        'triangle-diamond-shape': {
          keyword: 'Triangle / diamond shape',
          synonyms: ['Geometric formation', 'Shape positioning', 'Tactical shape']
        },
        'open-body': {
          keyword: 'Open body',
          synonyms: ['Body positioning', 'Face play', 'Body orientation']
        },
        'play-around-vs-play-through': {
          keyword: 'Play around vs play through',
          synonyms: ['Bypass vs penetrate', 'Go around vs go through', 'Circumvent vs direct']
        },
        'secure-possession': {
          keyword: 'Secure possession',
          synonyms: ['Maintain control', 'Keep ball', 'Retain possession']
        },
        'change-of-direction-acceleration': {
          keyword: 'Change of direction + acceleration',
          synonyms: ['Direction change + speed', 'Turn + burst', 'Shift + sprint']
        },
        'technical-turns': {
          keyword: 'Technical turns',
          synonyms: ['Turning technique', 'Turn with ball', 'Pivot', 'Direction change']
        },
        'combination-play': {
          keyword: 'Combination play',
          synonyms: ['Combinations', 'One-two', 'Give and go', 'Pass and move']
        },
        'two-man-combo': {
          keyword: '2 man combo (one two)',
          synonyms: ['One-two', 'Give and go', 'Wall pass', 'Two player combo']
        },
        'third-man-combo': {
          keyword: '3rd man combo',
          synonyms: ['Third man run', 'Third player', 'Third man combination', 'Overlap combo']
        },
        'ball-wide-lcb': {
          keyword: 'When ball wide with LCB',
          synonyms: ['Ball with center back', 'Wide defender', 'Fullback wide', 'Wide position']
        },
        'six-eight-behind-press': {
          keyword: '6 and 8 stay behind pressing player',
          synonyms: ['Midfielders behind', 'Support behind', 'Deep midfield', 'Cover behind']
        },
        'strong-side-mid-high-wide': {
          keyword: 'Strong side mid supports high and wide',
          synonyms: ['Midfield support wide', 'High wide support', 'Advanced wide', 'Wide midfield']
        },
        'weak-side-mid-central-splitting': {
          keyword: 'Weak side mid supports central, splitting',
          synonyms: ['Central support', 'Splitting defense', 'Central midfield', 'Between lines']
        },
        'winger-checks-inside': {
          keyword: 'Winger checks inside to receive',
          synonyms: ['Winger inside', 'Cut inside', 'Winger central', 'Inside movement']
        },
        'pressure-from-side': {
          keyword: 'Pressure from side instead of back',
          synonyms: ['Side pressure', 'Lateral pressure', 'Not back pressure', 'Angled pressure']
        },
        'most-vulnerable-after-combo': {
          keyword: 'Most vulnerable after combinations',
          synonyms: ['Vulnerable moment', 'After combo', 'Post combination', 'After pass']
        },
        'if-pressed-support': {
          keyword: 'If being pressed, support',
          synonyms: ['Support under pressure', 'Support when pressed', 'Come short', 'Support quickly']
        },
        'if-space-make-runs': {
          keyword: 'If space, make runs',
          synonyms: ['Run into space', 'Attack space', 'Make forward runs', 'Exploit space']
        },
        'touch-at-angle-not-vertical': {
          keyword: 'Touch at angle NOT vertical',
          synonyms: ['Angled touch', 'Not straight touch', 'Diagonal touch', 'Angle control']
        },
        'pass-across-body': {
          keyword: 'Pass goes across body',
          synonyms: ['Cross body pass', 'Body position', 'Open body', 'Angled pass']
        },
        'mid-support-45-degree': {
          keyword: 'Mid support at 45 degree angle',
          synonyms: ['45 degree support', 'Angled support', 'Diagonal support', 'Midfield support']
        },
        'sixty-forty-rule-turning': {
          keyword: '60/40 rule when turning',
          synonyms: ['Turning rule', 'Body position turn', 'Weight distribution', 'Turn technique']
        },
        'rotations-mids-negative': {
          keyword: 'Rotations of mids when ball played negative',
          synonyms: ['Midfield rotation', 'Negative ball rotation', 'Backwards ball', 'Rotation patterns']
        },
        'receiving-vertical-ball': {
          keyword: 'Receiving vertical ball',
          synonyms: ['Vertical pass receive', 'Forward pass receive', 'Receive forward', 'Vertical reception']
        },
        'touch-negative-if-no-options': {
          keyword: 'Touch negative if no options',
          synonyms: ['Backwards touch', 'Negative touch', 'Safe touch', 'Retain possession']
        },
        'hold-up-play': {
          keyword: 'Hold up play',
          synonyms: ['Hold ball', 'Retain possession', 'Keep ball', 'Maintain control']
        },
        'support-at-angle': {
          keyword: 'Support at an angle',
          synonyms: ['Angled support', 'Diagonal support', '45 degree support', 'Angle positioning']
        }
      },
      'defending': {
        'defending-with-two': {
          keyword: 'Defending with 2',
          synonyms: ['Double team', 'Two defenders', 'Defensive pair', 'Cover and pressure']
        },
        'pressure-on-ball': {
          keyword: 'Always pressure on ball',
          synonyms: ['Press ball', 'Pressure ball carrier', 'Close down', 'Press']
        },
        'cover-acute-angle-wide': {
          keyword: 'If wide, cover at acute angle 5-10 yards',
          synonyms: ['Wide cover', 'Acute angle cover', 'Support wide', 'Cover angle']
        },
        'cover-vertically-central': {
          keyword: 'If central, cover vertically behind',
          synonyms: ['Central cover', 'Vertical cover', 'Behind support', 'Cover behind']
        },
        'cover-when-beat': {
          keyword: 'One gets beat, cover should be there',
          synonyms: ['Cover for teammate', 'Recovery cover', 'Support when beat', 'Cover defense']
        },
        'moment-to-press': {
          keyword: 'Moment to press',
          synonyms: ['Pressing trigger', 'When to press', 'Press opportunity', 'Press moment']
        },
        'bad-touch-pass': {
          keyword: 'Bad touch/pass',
          synonyms: ['Poor touch', 'Mistake', 'Error', 'Bad control']
        },
        'backwards-ball': {
          keyword: 'Backwards ball',
          synonyms: ['Negative ball', 'Back pass', 'Retreating ball', 'Backwards pass']
        },
        'ball-in-air': {
          keyword: 'Ball in air',
          synonyms: ['Aerial ball', 'Loose ball', 'Second ball', 'Ball bounce']
        },
        'attacker-facing-goal': {
          keyword: 'Attacker facing their goal',
          synonyms: ['Facing own goal', 'Back to goal', 'Facing away', 'Wrong direction']
        },
        'head-goes-down': {
          keyword: 'Head goes down',
          synonyms: ['Head down', 'Not scanning', 'No vision', 'Lost awareness']
        },
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking two passing options when pressing',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options']
        },
        'press-block-horizontal-vertical': {
          keyword: 'Press to block horizontal and vertical pass',
          synonyms: ['Block passing lanes', 'Cut options', 'Close angles', 'Block passes']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach']
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position']
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness']
        }
      },
      'transition-a-to-d': {
        'team-drops-45-degree': {
          keyword: 'Team drops at 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle']
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball']
        },
        'never-run-across-vertical-line': {
          keyword: 'Never run across teammates vertical line',
          synonyms: ['Avoid crossing line', 'Stay in lane', 'Maintain position', 'Don\'t cross path']
        },
        'keep-possession-transition': {
          keyword: 'Keep possession in transition',
          synonyms: ['Secure ball', 'Retain in transition', 'Maintain control', 'Keep ball']
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward']
        },
        'get-to-ball': {
          keyword: 'Get to the ball',
          synonyms: ['Close down', 'Pressure', 'Press ball', 'Attack ball']
        }
      },
      'transition-d-to-a': {
        'look-for-counter': {
          keyword: 'Look for counter',
          synonyms: ['Counter attack', 'Fast break', 'Quick attack', 'Transition attack']
        },
        'look-for-secure-possession': {
          keyword: 'Look for secure possession',
          synonyms: ['Secure ball', 'Safe possession', 'Control ball', 'Retain possession']
        },
        'final-third': {
          keyword: 'Final Third',
          synonyms: ['Attacking third', 'Final zone', 'Goal area', 'End zone']
        },
        'look-for-goal': {
          keyword: 'Look for the goal',
          synonyms: ['Attack goal', 'Goal opportunity', 'Scoring chance', 'Goal chance']
        },
        'runs-attacking-players': {
          keyword: 'Runs of attacking players',
          synonyms: ['Forward runs', 'Attacking runs', 'Movement forward', 'Runs in behind']
        },
        'second-player-exploit': {
          keyword: 'Once ball won, 2nd player has 1-2 touches to exploit',
          synonyms: ['Quick transition', 'Fast break', 'Counter attack', 'Quick exploit']
        },
        'player-head-down-hectic': {
          keyword: 'Player who won ball has head down and hectic',
          synonyms: ['Won ball hectic', 'Recovery moment', 'Transition moment', 'Quick decision']
        }
      }
    },
    'wide-play': {
      'attacking': {
        'stay-wide': {
          keyword: 'Stay wide',
          synonyms: ['Maintain width', 'Keep wide', 'Sideline positioning']
        },
        'support-underneath': {
          keyword: 'Support underneath',
          synonyms: ['Under support', 'Deep support', 'Behind support']
        },
        'overlap-underlap': {
          keyword: 'Overlap / underlap',
          synonyms: ['Overlapping run', 'Underlapping run', 'Supporting run']
        },
        'diagonal-runs': {
          keyword: 'Diagonal runs',
          synonyms: ['Angled runs', 'Slant runs', 'Cutting runs']
        },
        'cutback': {
          keyword: 'Cutback',
          synonyms: ['Pull back', 'Back pass', 'Reverse pass']
        },
        'back-post-clip': {
          keyword: 'Back-post clip',
          synonyms: ['Far post cross', 'Back post delivery', 'Far post service']
        },
        'low-hard': {
          keyword: 'Low & hard',
          synonyms: ['Driven cross', 'Hard low cross', 'Powerful low delivery']
        },
        'early-service': {
          keyword: 'Early service',
          synonyms: ['Early cross', 'Quick delivery', 'Fast service']
        },
        'inswinger-outswinger': {
          keyword: 'Inswinger / outswinger',
          synonyms: ['Curved cross', 'Bent delivery', 'Swerving cross']
        },
        'look-up-scan-before-cross': {
          keyword: 'Look up + scan before cross',
          synonyms: ['Check before crossing', 'Survey before delivery', 'Assess before service']
        },
        'outside-back-winger-relationship': {
          keyword: 'Outside back relationship to winger',
          synonyms: ['Fullback winger', 'OB winger link', 'Wide partnership', 'Fullback wide']
        },
        'same-line-vertically': {
          keyword: 'Same line vertically',
          synonyms: ['Vertical alignment', 'Same level', 'Line up', 'Vertical position']
        },
        'vertical-balls-on-run': {
          keyword: 'Vertical balls on run from OB to winger',
          synonyms: ['Through ball wide', 'Vertical pass wide', 'Run and pass', 'Through pass']
        },
        'through-ball-diagonal-wide': {
          keyword: 'Diagonal from wide',
          synonyms: ['Diagonal through ball', 'Angled through', 'Wide diagonal', 'Diagonal pass']
        },
        'receiving-through-ball-before-after': {
          keyword: 'Receiving through ball before or after last line',
          synonyms: ['Through ball receive', 'Receive through', 'Past defense', 'Behind line']
        },
        'counter-movement': {
          keyword: 'Counter-movement',
          synonyms: ['Opposite movement', 'Reverse run', 'Change direction', 'Counter run']
        },
        'supporting-nine': {
          keyword: 'Supporting 9',
          synonyms: ['Striker support', 'Forward support', '9 support', 'Attacking support']
        },
        'cutting-inside': {
          keyword: 'Cutting inside',
          synonyms: ['Cut inside', 'Infield run', 'Inside movement', 'Central run']
        },
        'player-dribbling-centrally': {
          keyword: 'When player dribbling centrally',
          synonyms: ['Dribble central', 'Central dribble', 'Through middle', 'Central run']
        },
        'run-away': {
          keyword: 'Run away',
          synonyms: ['Move away', 'Create space', 'Pull away', 'Wide run']
        },
        'run-through': {
          keyword: 'Run through',
          synonyms: ['Through run', 'Penetrating run', 'Forward run', 'In behind']
        },
        'run-beside': {
          keyword: 'Run beside',
          synonyms: ['Lateral run', 'Side run', 'Parallel run', 'Support run']
        },
        'creating-numbers-wide': {
          keyword: 'Creating numbers using wide players',
          synonyms: ['Wide overload', 'Numerical advantage wide', 'Wide numbers', 'Overload wide']
        },
        'outside-backs-overloading': {
          keyword: 'Outside backs overloading',
          synonyms: ['Fullback overload', 'OB joining attack', 'Wide overload', 'Fullback forward']
        },
        'midfielders-drifting-wide': {
          keyword: 'Midfielders drifting to wide areas',
          synonyms: ['Mid wide', 'Midfield wide', 'Drift wide', 'Wide midfield']
        },
        'pass-move-forward': {
          keyword: 'Pass + move forward into space',
          synonyms: ['Pass and go', 'Give and go', 'Pass and run']
        },
        'switching-play': {
          keyword: 'Switching play',
          synonyms: ['Switch field', 'Change sides', 'Find opposite side']
        }
      },
      'defending': {
        'wide-1v1-defending': {
          keyword: 'Wide 1v1 defending',
          synonyms: ['Wide defending', 'Sideline defending', 'Wing defending']
        },
        'force-wide': {
          keyword: 'Force wide',
          synonyms: ['Push wide', 'Channel wide', 'Direct wide']
        },
        'farthest-foot-tackle': {
          keyword: 'Farthest-foot tackle',
          synonyms: ['Far foot tackle', 'Extended tackle', 'Reach tackle']
        },
        'delay': {
          keyword: 'Delay',
          synonyms: ['Slow down', 'Hold up', 'Stall']
        },
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking to passing options when pressing',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach']
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position']
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness']
        },
        'moment-to-press': {
          keyword: 'Moment to press',
          synonyms: ['Pressing trigger', 'When to press', 'Press opportunity', 'Press moment']
        },
        'bad-touch-pass': {
          keyword: 'Bad touch/pass',
          synonyms: ['Poor touch', 'Mistake', 'Error', 'Bad control']
        },
        'backwards-ball': {
          keyword: 'Backwards ball',
          synonyms: ['Negative ball', 'Back pass', 'Retreating ball', 'Backwards pass']
        },
        'ball-in-air': {
          keyword: 'Ball in air',
          synonyms: ['Aerial ball', 'Loose ball', 'Second ball', 'Ball bounce']
        }
      },
      'transition-a-to-d': {
        // Empty based on notes - can add later if needed
      },
      'transition-d-to-a': {
        'look-central-combination': {
          keyword: 'Look central for combination',
          synonyms: ['Central combo', 'Middle combination', 'Central play', 'Inside combination']
        },
        'using-body': {
          keyword: 'Using the body',
          synonyms: ['Body position', 'Body shape', 'Body control', 'Physical play']
        }
      }
    },
    'final-third': {
      'attacking': {
        'line-breaking-pass': {
          keyword: 'Line-breaking pass',
          synonyms: ['Through pass', 'Penetrating pass', 'Breaking pass']
        },
        'run-timing-cue': {
          keyword: 'Run timing cue',
          synonyms: ['Run timing', 'Movement timing', 'Timing signal']
        },
        'touch-forward-with-space': {
          keyword: 'Touch forward with space',
          synonyms: ['Touch ahead', 'Push forward', 'Advance with space']
        },
        'curve-run-to-stay-onside': {
          keyword: 'Curve run to stay onside',
          synonyms: ['Curved run', 'Bent run', 'Arcing run']
        },
        'straight-run-from-middle': {
          keyword: 'Straight run (from middle)',
          synonyms: ['Direct run', 'Linear run', 'Forward run']
        },
        'diagonal-run-from-wide': {
          keyword: 'Diagonal run (from wide)',
          synonyms: ['Angled run', 'Slant run', 'Cutting run']
        },
        'frame-the-box': {
          keyword: 'Frame the box',
          synonyms: ['Box positioning', 'Penalty area shape', 'Goal frame']
        },
        '1st-post': {
          keyword: '1st post',
          synonyms: ['Near post', 'Front post', 'First post']
        },
        'pk-spot': {
          keyword: 'PK spot',
          synonyms: ['Penalty spot', 'PK mark', 'Penalty point']
        },
        'back-post': {
          keyword: 'Back post',
          synonyms: ['Far post', 'Second post', 'Back pole']
        },
        'top-of-18': {
          keyword: 'Top of 18',
          synonyms: ['Edge of box', 'Top of area', 'Penalty area edge']
        },
        'finish-first-time': {
          keyword: 'Finish first time',
          synonyms: ['One-touch finish', 'Immediate finish', 'Direct finish']
        },
        'weak-foot': {
          keyword: 'Weak foot',
          synonyms: ['Non-dominant foot', 'Off foot', 'Secondary foot']
        },
        'blind-foot': {
          keyword: 'Blind foot',
          synonyms: ['Non-dominant foot', 'Off foot', 'Weaker foot']
        },
        'one-touch-finishing': {
          keyword: 'One-touch finishing',
          synonyms: ['First-time finishing', 'Direct finishing', 'Immediate finishing']
        },
        'body-to-strike': {
          keyword: 'Body to strike',
          synonyms: ['Body position', 'Striking position', 'Body alignment']
        },
        'head-over-ball': {
          keyword: 'Head over ball',
          synonyms: ['Head position', 'Body lean', 'Forward lean']
        },
        'follow-through': {
          keyword: 'Follow through',
          synonyms: ['Complete motion', 'Full extension', 'Finish motion']
        },
        'accuracy': {
          keyword: 'Accuracy',
          synonyms: ['Precision', 'Placement', 'Targeting']
        },
        'everything-towards-goal': {
          keyword: 'Everything towards goal',
          synonyms: ['Attack goal', 'Forward play', 'Goal oriented', 'Attack minded']
        },
        'runs': {
          keyword: 'Runs',
          synonyms: ['Attacking runs', 'Movement', 'Forward runs', 'Runs in behind']
        },
        'finishing-shooting': {
          keyword: 'Finishing (Shooting)',
          synonyms: ['Shooting', 'Goal scoring', 'Finishing technique', 'Striking']
        },
        'overloads': {
          keyword: 'Overloads',
          synonyms: ['Numerical advantage', 'Creating numbers', 'Overload situations', 'Extra player']
        },
        'receiving-past-line-defense': {
          keyword: 'Receiving past a line of defense',
          synonyms: ['Receive behind line', 'Past defense', 'Behind defenders', 'Through defense']
        },
        'crossing': {
          keyword: 'Crossing',
          synonyms: ['Delivery', 'Service', 'Wide service', 'Cross field']
        },
        'last-line-breaking-pass': {
          keyword: 'Last line breaking pass (through ball)',
          synonyms: ['Through ball', 'Line breaking pass', 'Penetrating pass', 'Breaking pass']
        },
        'attacking-movement': {
          keyword: 'Attacking movement',
          synonyms: ['Forward movement', 'Attack runs', 'Movement forward', 'Attacking runs']
        },
        'set-pieces': {
          keyword: 'Set Pieces',
          synonyms: ['Set piece', 'Dead ball', 'Restart', 'Free kick']
        },
        'combinations': {
          keyword: 'Combinations',
          synonyms: ['Combination play', 'One-two', 'Give and go', 'Pass and move']
        },
        'one-v-ones': {
          keyword: '1v1s',
          synonyms: ['One versus one', '1v1', 'Individual duel', 'One on one']
        },
        'scanning': {
          keyword: 'Scanning',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness']
        }
      },
      'defending': {
        'corral': {
          keyword: 'Corral',
          synonyms: ['Channel', 'Direct', 'Force', 'Guide']
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball']
        },
        'get-to-ball': {
          keyword: 'Get to the ball',
          synonyms: ['Close down', 'Pressure', 'Press ball', 'Attack ball']
        },
        'pressing': {
          keyword: 'Pressing',
          synonyms: ['Press', 'Close down', 'Pressure', 'High press']
        }
      },
      'transition-a-to-d': {
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball']
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward']
        },
        'drop-at-45-degree': {
          keyword: 'Drop at a 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle']
        },
        'make-contact': {
          keyword: 'Make contact',
          synonyms: ['Physical contact', 'Challenge', 'Tackle', 'Engage']
        },
        'tactical-fouls': {
          keyword: 'Tactical fouls',
          synonyms: ['Professional foul', 'Strategic foul', 'Tactical challenge', 'Smart foul']
        }
      },
      'transition-d-to-a': {
        'final-third': {
          keyword: 'Final Third',
          synonyms: ['Attacking third', 'Final zone', 'Goal area', 'End zone']
        },
        'look-for-goal': {
          keyword: 'Look for the goal',
          synonyms: ['Attack goal', 'Goal opportunity', 'Scoring chance', 'Goal chance']
        },
        'look-for-secure-possession': {
          keyword: 'Look for secure possession',
          synonyms: ['Secure ball', 'Safe possession', 'Control ball', 'Retain possession']
        },
        'runs-attacking-players': {
          keyword: 'Runs of attacking players',
          synonyms: ['Forward runs', 'Attacking runs', 'Movement forward', 'Runs in behind']
        },
        'when-opponent-dropping': {
          keyword: 'When opponent is dropping',
          synonyms: ['Opponent retreating', 'Defense dropping', 'Retreating defense', 'Dropping back']
        }
      }
    },
  'technical': {
    'first-touch': {
      keyword: 'First Touch',
      synonyms: ['Ball control', 'Touch', 'Reception', 'First contact']
    },
    'passing': {
      keyword: 'Passing',
      synonyms: ['Distribution', 'Ball movement', 'Playmaking', 'Ball delivery']
    },
    'dribbling': {
      keyword: 'Dribbling',
      synonyms: ['Ball carrying', 'Running with ball', 'Ball control on move']
    },
    'shooting': {
      keyword: 'Shooting',
      synonyms: ['Finishing', 'Striking', 'Goal scoring', 'Shot technique']
    },
    'crossing': {
      keyword: 'Crossing',
      synonyms: ['Delivery', 'Service', 'Wide service', 'Cross field']
    },
    'juggling': {
      keyword: 'Juggling',
      synonyms: ['Keepy uppy', 'Ball mastery', 'Touch control', 'Aerial control']
    },
    'turning': {
      keyword: 'Turning',
      synonyms: ['Change direction', 'Pivot', 'Turn with ball', 'Direction change']
    },
    'escape-moves': {
      keyword: 'Escape Moves',
      synonyms: ['Moves', 'Skills', 'Tricks', 'Feints', 'Dribble moves']
    },
    'ball-mastery': {
      keyword: 'Ball Mastery',
      synonyms: ['Ball control', 'Touch', 'Close control', 'Ball manipulation']
    },
    'weak-foot': {
      keyword: 'Weak Foot',
      synonyms: ['Non-dominant foot', 'Off foot', 'Secondary foot', 'Left foot', 'Right foot']
    },
    'volley': {
      keyword: 'Volley',
      synonyms: ['Half volley', 'Full volley', 'Aerial strike', 'Air ball']
    },
    'heading': {
      keyword: 'Heading',
      synonyms: ['Aerial challenge', 'Header', 'Head ball', 'Aerial play']
    },
    'long-ball': {
      keyword: 'Long Ball',
      synonyms: ['Long pass', 'Long range pass', 'Switch', 'Long distribution']
    },
    'short-pass': {
      keyword: 'Short Pass',
      synonyms: ['Quick pass', 'Short distribution', 'Close pass', 'One-two']
    },
    'through-ball': {
      keyword: 'Through Ball',
      synonyms: ['Through pass', 'Splitting pass', 'Penetrating pass', 'Line breaking pass']
    },
    'trivela': {
      keyword: 'Trivela',
      synonyms: ['Outside foot', 'Outside of boot', 'Curved pass', 'Bent pass']
    },
    'backspin': {
      keyword: 'Backspin',
      synonyms: ['Spin', 'Ball spin', 'Back spin', 'Ball control']
    },
    'curl': {
      keyword: 'Curl',
      synonyms: ['Bend', 'Curve', 'Swerve', 'Bent ball']
    },
    'on-ground': {
      keyword: 'On Ground',
      synonyms: ['Ground pass', 'Rolling ball', 'Low pass', 'Ground technique']
    },
    'half-volley': {
      keyword: 'Half Volley',
      synonyms: ['Bounce', 'Bouncing ball', 'Half volley technique']
    },
    'full-volley': {
      keyword: 'Full Volley',
      synonyms: ['Air ball', 'Volley strike', 'Aerial technique']
    }
  },
  'physical': {
    'speed': {
      keyword: 'Speed',
      synonyms: ['Pace', 'Quickness', 'Velocity', 'Sprint speed']
    },
    'acceleration': {
      keyword: 'Acceleration',
      synonyms: ['Explosiveness', 'Quick burst', 'Speed off mark', 'Initial speed']
    },
    'agility': {
      keyword: 'Agility',
      synonyms: ['Change of direction', 'Quick feet', 'Mobility', 'Nimbleness']
    },
    'strength': {
      keyword: 'Strength',
      synonyms: ['Power', 'Force', 'Physical power', 'Muscle strength']
    },
    'endurance': {
      keyword: 'Endurance',
      synonyms: ['Stamina', 'Fitness', 'Cardio', 'Aerobic capacity']
    },
    'balance': {
      keyword: 'Balance',
      synonyms: ['Stability', 'Body control', 'Equilibrium', 'Coordination']
    },
    'flexibility': {
      keyword: 'Flexibility',
      synonyms: ['Mobility', 'Range of motion', 'Suppleness', 'Stretching']
    },
    'coordination': {
      keyword: 'Coordination',
      synonyms: ['Motor skills', 'Body control', 'Movement control', 'Motor coordination']
    },
    'jump': {
      keyword: 'Jump',
      synonyms: ['Vertical jump', 'Jumping', 'Leap', 'Aerial ability']
    },
    'reaction-time': {
      keyword: 'Reaction Time',
      synonyms: ['Quick reaction', 'Response time', 'Reflexes', 'Reaction speed']
    },
    'explosiveness': {
      keyword: 'Explosiveness',
      synonyms: ['Power', 'Burst', 'Explosive power', 'Quick burst']
    },
    'core-strength': {
      keyword: 'Core Strength',
      synonyms: ['Core', 'Abdominal strength', 'Trunk strength', 'Core stability']
    },
    'upper-body': {
      keyword: 'Upper Body',
      synonyms: ['Upper body strength', 'Arms', 'Shoulders', 'Upper strength']
    },
    'lower-body': {
      keyword: 'Lower Body',
      synonyms: ['Leg strength', 'Lower body power', 'Legs', 'Lower strength']
    }
  },
  'mental': {
    'decision-making': {
      keyword: 'Decision Making',
      synonyms: ['Choices', 'Game IQ', 'Awareness', 'Tactical awareness']
    },
    'confidence': {
      keyword: 'Confidence',
      synonyms: ['Self-belief', 'Assurance', 'Mental strength', 'Self-confidence']
    },
    'focus': {
      keyword: 'Focus',
      synonyms: ['Concentration', 'Attention', 'Mental focus', 'Mindfulness']
    },
    'resilience': {
      keyword: 'Resilience',
      synonyms: ['Mental toughness', 'Grit', 'Perseverance', 'Mental strength']
    },
    'composure': {
      keyword: 'Composure',
      synonyms: ['Calmness', 'Poise', 'Control', 'Mental calm']
    },
    'vision': {
      keyword: 'Vision',
      synonyms: ['Awareness', 'Field vision', 'Peripheral vision', 'Spatial awareness']
    },
    'anticipation': {
      keyword: 'Anticipation',
      synonyms: ['Reading play', 'Predicting', 'Game reading', 'Tactical reading']
    },
    'leadership': {
      keyword: 'Leadership',
      synonyms: ['Communication', 'Team leadership', 'On-field leadership', 'Captaincy']
    },
    'pressure-handling': {
      keyword: 'Pressure Handling',
      synonyms: ['Dealing with pressure', 'Pressure situations', 'Clutch performance', 'Stress management']
    },
    'game-awareness': {
      keyword: 'Game Awareness',
      synonyms: ['Tactical awareness', 'Situation awareness', 'Game IQ', 'Football intelligence']
    },
    'creativity': {
      keyword: 'Creativity',
      synonyms: ['Innovation', 'Imagination', 'Creative play', 'Flair']
    },
    'work-rate': {
      keyword: 'Work Rate',
      synonyms: ['Effort', 'Hustle', 'Work ethic', 'Energy']
    },
    'communication': {
      keyword: 'Communication',
      synonyms: ['Talking', 'Verbal communication', 'On-field communication', 'Team talk']
    }
  }
};

/**
 * Get all keywords for a specific category
 * Tactical: from DRILL_KEYWORDS. Technical/Physical/Mental: from backbone (skills/sub-skills as keys).
 * @param {string} category - The category name (tactical, technical, physical, mental)
 * @returns {Object} Object containing keywords organized by subcategory (tactical: period/phase; others: skill -> { keyword, synonyms })
 */
export function getKeywordsForCategory(category) {
  if (category === 'tactical') return DRILL_KEYWORDS.tactical || {};
  const items = getKeywordsForCategoryFromBackbone(category);
  const out = {};
  items.forEach(item => { out[item.skill] = { keyword: item.keyword, synonyms: item.synonyms || [] }; });
  return out;
}

/**
 * Get all keywords for a specific period (tactical only), across all phases.
 * Tactical data is sourced from curriculum-backbone.
 * @param {string} period - The period name (build-out, middle-third, wide-play, final-third)
 * @returns {Array} Array of keyword objects with keyword, synonyms, allTerms, phase
 */
export function getKeywordsForPeriod(period) {
  const phases = getPhasesForPeriodFromBackbone(period);
  const allKeywords = [];
  for (const phase of phases) {
    const items = getTacticalKeywordsFromBackbone(period, phase, null);
    for (const item of items) {
      allKeywords.push({
        keyword: item.keyword,
        synonyms: item.synonyms || [],
        allTerms: [item.keyword, ...(item.synonyms || [])],
        phase: item.phase || phase
      });
    }
  }
  return allKeywords;
}

/**
 * Get keywords for a specific period and phase, optionally filtered by position.
 * Tactical data is sourced from curriculum-backbone (supports position metadata).
 * @param {string} period - The period name (build-out, middle-third, wide-play, final-third)
 * @param {string} phase - The phase name (attacking, defending, transition-d-to-a, transition-a-to-d)
 * @param {string|null} positionFilter - Optional: single position (e.g. 'Full-Back') or group key (e.g. 'defense'). Null = all keywords.
 * @returns {Array} Array of keyword objects { keyword, synonyms, allTerms, phase }
 */
export function getKeywordsForPeriodAndPhase(period, phase, positionFilter = null) {
  const items = getTacticalKeywordsFromBackbone(period, phase, positionFilter);
  return items.map(item => ({
    keyword: item.keyword,
    synonyms: item.synonyms || [],
    allTerms: [item.keyword, ...(item.synonyms || [])],
    phase: item.phase || phase
  }));
}

/**
 * Get all phases for a period. Tactical data is sourced from curriculum-backbone.
 * @param {string} period - The period name
 * @returns {Array} Array of phase names
 */
export function getPhasesForPeriod(period) {
  return getPhasesForPeriodFromBackbone(period);
}

/**
 * Get all keywords for a specific skill/area within a category
 * Tactical: from DRILL_KEYWORDS. Technical/Physical/Mental: from backbone.
 * @param {string} category - The category name (tactical, technical, physical, mental)
 * @param {string} skill - The skill/area name (e.g., 'first-touch', 'speed', 'plus-1' for tactical)
 * @returns {Object|null} Keyword object { keyword, synonyms, allTerms?, period?, phase? } or null
 */
export function getKeywordForSkill(category, skill) {
  if (category === 'tactical') {
    const found = getTacticalKeywordByKey(skill);
    if (found) {
      return {
        keyword: found.keyword,
        synonyms: found.synonyms || [],
        allTerms: found.allTerms || [found.keyword, ...(found.synonyms || [])],
        period: found.period,
        phase: found.phase
      };
    }
    return null;
  }
  const found = getKeywordForBackboneSkill(category, skill);
  if (!found) return null;
  return {
    keyword: found.keyword,
    synonyms: found.synonyms || [],
    allTerms: [found.keyword, ...(found.synonyms || [])]
  };
}

/**
 * Get all keywords across all categories
 * Tactical from DRILL_KEYWORDS; technical/physical/mental from backbone.
 */
export function getAllKeywords() {
  const allKeywords = [];
  const categoryData = DRILL_KEYWORDS.tactical;
  if (categoryData) {
    for (const period in categoryData) {
      const periodData = categoryData[period];
      for (const phase in periodData) {
        const phaseData = periodData[phase];
        if (typeof phaseData === 'object') {
          for (const key in phaseData) {
            const item = phaseData[key];
            if (item && item.keyword) {
              allKeywords.push({
                category: 'tactical',
                period,
                phase,
                key,
                keyword: item.keyword,
                synonyms: item.synonyms || [],
                allTerms: [item.keyword, ...(item.synonyms || [])]
              });
            }
          }
        }
      }
    }
  }
  for (const cat of ['technical', 'physical', 'mental']) {
    const items = getKeywordsForCategoryFromBackbone(cat);
    items.forEach(item => {
      allKeywords.push({
        category: cat,
        skill: item.skill,
        keyword: item.keyword,
        synonyms: item.synonyms || [],
        allTerms: [item.keyword, ...(item.synonyms || [])]
      });
    });
  }
  return allKeywords;
}

/**
 * Search for keywords by term (searches keyword and synonyms across all categories)
 * @param {string} searchTerm - The term to search for
 * @param {string} category - Optional category filter (tactical, technical, physical, mental)
 * @returns {Array} Array of matching keyword objects
 */
export function searchKeywords(searchTerm, category = null) {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const matches = [];
  const categoriesToSearch = category ? [category] : ['tactical', 'technical', 'physical', 'mental'];

  for (const cat of categoriesToSearch) {
    if (cat === 'tactical') {
      const categoryData = DRILL_KEYWORDS.tactical;
      if (!categoryData) continue;
      for (const period in categoryData) {
        const periodData = categoryData[period];
        for (const phase in periodData) {
          const phaseData = periodData[phase];
          if (typeof phaseData === 'object') {
            for (const key in phaseData) {
              const item = phaseData[key];
              if (item && item.keyword) {
                const allTerms = [item.keyword.toLowerCase(), ...(item.synonyms || []).map(s => s.toLowerCase())];
                if (allTerms.some(term => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
                  matches.push({
                    category: 'tactical',
                    period,
                    phase,
                    key,
                    keyword: item.keyword,
                    synonyms: item.synonyms || [],
                    allTerms: [item.keyword, ...(item.synonyms || [])]
                  });
                }
              }
            }
          }
        }
      }
    } else {
      const items = getKeywordsForCategoryFromBackbone(cat);
      for (const item of items) {
        const allTerms = [item.keyword.toLowerCase(), ...(item.synonyms || []).map(s => s.toLowerCase())];
        if (allTerms.some(term => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
          matches.push({
            category: cat,
            skill: item.skill,
            keyword: item.keyword,
            synonyms: item.synonyms || [],
            allTerms: [item.keyword, ...(item.synonyms || [])]
          });
        }
      }
    }
  }
  return matches;
}

/**
 * Get keywords as a flat array for use in keyword selection UI
 * @param {string} category - Optional category filter
 * @param {string} period - Optional period filter (for tactical only)
 * @returns {Array} Array of keyword strings (keyword + synonyms combined)
 */
export function getKeywordsForSelection(category = null, period = null) {
  const flatList = [];
  if (category) {
    if (category === 'tactical') {
      const categoryData = DRILL_KEYWORDS.tactical;
      if (categoryData) {
        const periods = period ? [period] : Object.keys(categoryData);
        for (const periodKey of periods) {
          const periodData = categoryData[periodKey];
          if (!periodData) continue;
          for (const phase in periodData) {
            const phaseData = periodData[phase];
            if (typeof phaseData === 'object') {
              for (const key in phaseData) {
                const item = phaseData[key];
                if (item && item.keyword) {
                  flatList.push(item.keyword);
                  flatList.push(...(item.synonyms || []));
                }
              }
            }
          }
        }
      }
    } else {
      const items = getKeywordsForCategoryFromBackbone(category);
      items.forEach(item => {
        flatList.push(item.keyword);
        flatList.push(...(item.synonyms || []));
      });
    }
  } else {
    const allKeywords = getAllKeywords();
    allKeywords.forEach(item => {
      flatList.push(item.keyword);
      flatList.push(...(item.synonyms || []));
    });
  }
  return [...new Set(flatList)];
}
