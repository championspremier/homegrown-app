/**
 * Drill Algorithm Keywords with Synonyms
 * 
 * This file contains all keywords for drill algorithms organized by category:
 * - Tactical: Organized by period (build-out, middle-third, wide-play, final-third) and phase (attacking, defending, transition-d-to-a, transition-a-to-d)
 * - Technical: Organized by skill area
 * - Physical: Organized by physical attribute
 * - Mental: Organized by mental attribute
 * 
 * Each keyword includes synonyms for better search and matching capabilities.
 */

export const DRILL_KEYWORDS = {
  'tactical': {
    'build-out': {
      'attacking': {
        'plus-1': {
          keyword: 'Plus 1',
          synonyms: ['Add one', 'Extra player', 'Additional support'],
          positions: ['Defenders', 'Midfielders']
        },
        'support-angles': {
          keyword: 'Support angles',
          synonyms: ['Supporting positions', 'Passing angles', 'Assist angles'],
          positions: ['Defenders', 'Midfielders']
        },
        'use-gk': {
          keyword: 'Use GK',
          synonyms: ['Utilize goalkeeper', 'Involve keeper', 'Play through goalie'],
          positions: ['GK', 'Defenders']
        },
        'receive-beyond-press': {
          keyword: 'Receive beyond press',
          synonyms: ['Get behind pressure', 'Accept past press', 'Take behind defenders'],
          positions: ['Midfielders', 'Forwards']
        },
        'diagonal-pass': {
          keyword: 'Diagonal pass',
          synonyms: ['Angled pass', 'Slant pass', 'Cross-field pass'],
          positions: ['GK', 'Defenders', 'Midfielders']
        },
        'timing-of-check': {
          keyword: 'Timing of check',
          synonyms: ['Check timing', 'Movement timing', 'Run timing'],
          positions: ['Midfielders', 'Forwards']
        },
        'set-at-45': {
          keyword: 'Set at 45°',
          synonyms: ['Position at angle', 'Angle positioning', 'Angled setup', '45 degrees'],
          positions: ['Defenders', 'Midfielders']
        },
        'play-in-front': {
          keyword: 'Play in front',
          synonyms: ['Pass into space', 'Play ahead', 'Forward pass'],
          positions: ['GK', 'Defenders', 'Midfielders']
        },
        'back-foot-receive': {
          keyword: 'Back-foot receive',
          synonyms: ['Receive on back foot', 'Back foot control', 'Reverse foot receive'],
          positions: ['Defenders', 'Midfielders']
        },
        'deception': {
          keyword: 'Deception',
          synonyms: ['Feint', 'Misdirection', 'Trick'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'recycle-run': {
          keyword: 'Recycle run',
          synonyms: ['Repeat run', 'Support again', 'Run again'],
          positions: ['Midfielders', 'Forwards']
        },
        'base-support-run': {
          keyword: 'Base–support–run',
          synonyms: ['Foundation-support-movement', 'Base-assist-sprint', 'Foundation-help-run'],
          positions: ['Midfielders', 'Forwards']
        },
        'run-towards-free-player': {
          keyword: 'Run towards free player',
          synonyms: ['Move to free player', 'Check to free player', 'Support free player', 'Run to open player'],
          positions: ['Midfielders', 'Forwards']
        },
        'check-when-ball-going-to-passer': {
          keyword: 'Check when ball going to passer',
          synonyms: ['Timing of check', 'Check timing', 'Movement timing', 'Run when ball to passer'],
          positions: ['Midfielders', 'Forwards']
        },
        'rotations-when-mid-marked': {
          keyword: 'Rotations when mid marked',
          synonyms: ['Midfield rotations', 'Mid goes wide', 'Another mid checks central', 'Rotation patterns'],
          positions: ['Midfielders']
        },
        'winger-checks-in-fullback-wide': {
          keyword: 'Winger checks in, fullback wide',
          synonyms: ['Winger inside', 'Fullback wide', 'Width creation', 'Winger support'],
          positions: ['Forwards', 'Defenders']
        },
        'breaking-lines-off-pass': {
          keyword: 'Breaking lines off pass',
          synonyms: ['Line breaking pass', 'Penetrating pass', 'Through pass', 'Breaking pass'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'retaining-possession': {
          keyword: 'Retaining possession',
          synonyms: ['Keep possession', 'Maintain control', 'Secure possession', 'Hold ball'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'diagonal-ball-set-winger': {
          keyword: 'Diagonal ball for set to winger',
          synonyms: ['Diagonal pass to winger', 'Angled pass wide', 'Set winger', 'Diagonal service'],
          positions: ['Defenders', 'Midfielders']
        },
        'receive-past-defensive-line': {
          keyword: 'Receive past defensive line',
          synonyms: ['Receive behind line', 'Get behind defense', 'Past last line', 'Behind defensive line'],
          positions: ['Forwards']
        },
        'run-behind-last-line': {
          keyword: 'Run behind last line',
          synonyms: ['Run in behind', 'Behind defense', 'Past last defender', 'Through run'],
          positions: ['Forwards', 'Midfielders']
        },
        'drop-and-support': {
          keyword: 'Drop and support',
          synonyms: ['Support quickly', 'Drop back', 'Support underneath', 'Come short'],
          positions: ['Midfielders', 'Forwards']
        },
        'cb-drop-create-option': {
          keyword: 'CB drop to create option',
          synonyms: ['Center back drop', 'CB support', 'Defender drop', 'Create passing option'],
          positions: ['Defenders']
        },
        'breaking-lines-off-dribble': {
          keyword: 'Breaking lines off dribble',
          synonyms: ['Dribble past line', 'Break line with dribble', 'Dribble through', 'Penetrate with dribble'],
          positions: ['Forwards', 'Midfielders']
        },
        'straight-dribble-angled-pass': {
          keyword: 'Straight dribble to angled pass',
          synonyms: ['Dribble then pass', 'Against momentum', 'Change direction pass', 'Dribble to pass'],
          positions: ['Midfielders', 'Forwards']
        },
        'play-highest-player': {
          keyword: 'Play highest player available',
          synonyms: ['Play forward', 'Play advanced player', 'Highest option', 'Forward pass'],
          positions: ['GK', 'Defenders', 'Midfielders']
        },
        'take-space-provided': {
          keyword: 'Take space provided',
          synonyms: ['Use space', 'Exploit space', 'Take available space', 'Attack space'],
          positions: ['Midfielders', 'Forwards']
        },
        'play-over': {
          keyword: 'Play over',
          synonyms: ['Long ball', 'Over the top', 'Play long', 'Over defense'],
          positions: ['GK', 'Defenders']
        },
        'play-around': {
          keyword: 'Play around',
          synonyms: ['Bypass', 'Go around', 'Circumvent', 'Play wide'],
          positions: ['GK', 'Defenders', 'Midfielders']
        }
      },
      'defending': {
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'pressing-triggers': {
          keyword: 'Pressing triggers',
          synonyms: ['Moment to press', 'Press trigger', 'When to press', 'Press opportunity', 'Cues to Press', 'Pressing cues', 'ball in the air', 'back facing', 'bad touch', 'backwards ball', 'backwards pass', 'attacker facing own goal', 'head down', 'no vision', 'lost awareness'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'force-to-one-side': {
          keyword: 'Force to one side',
          synonyms: ['Channel wide', 'Force wide', 'Direct to side', 'Push to flank', 'force to weak foot'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking passes',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'press-block-horizontal-vertical': {
          keyword: 'Press to block horizontal and vertical pass',
          synonyms: ['Block passing lanes', 'Cut options', 'Close angles', 'Block passes'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'low-block': {
          keyword: 'Low block',
          synonyms: ['Deep block', 'Defensive block', 'Compact defense', 'Deep line'],
          positions: ['GK', 'Defenders', 'Midfielders']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach'],
          positions: []
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position'],
          positions: [],
          technicalCoachingPoint: true
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness'],
          positions: [],
          technicalCoachingPoint: true
        },
        'slide-tackling': {
          keyword: 'Slide tackling',
          synonyms: ['Slide tackle', 'Tackling', 'Ground tackle', 'Recovery tackle'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'one-v-one-defending': {
          keyword: '1v1 Defending',
          synonyms: ['One versus one', 'Individual defending', 'Isolation defending', 'Man marking'],
          positions: [],
          technicalCoachingPoint: true
        }
      },
      'transition-d-to-a': {
        'own-third': {
          keyword: 'Own Third',
          synonyms: ['Defensive third', 'Our half', 'Defensive zone', 'Back third'],
          positions: []
        },
        'second-player-exploit': {
          keyword: '2nd player in possession has 1-2 touches to exploit',
          synonyms: ['Quick transition', 'Fast break', 'Counter attack', 'Quick exploit'],
          positions: ['Midfielders', 'Forwards']
        },
        'player-head-down-hectic': {
          keyword: 'Player who won ball has head down and hectic',
          synonyms: ['Won ball hectic', 'Recovery moment', 'Transition moment', 'Quick decision'],
          positions: []
        },
        'exploit-space': {
          keyword: 'Exploit space',
          synonyms: ['Use space', 'Attack space', 'Take space', 'Utilize space'],
          positions: ['Midfielders', 'Forwards']
        },
        'support-angled-beneath': {
          keyword: 'Support angled beneath',
          synonyms: ['Support underneath', 'Deep support', 'Behind support', 'Angled support'],
          positions: ['Defenders', 'Midfielders']
        },
        'support-angled-horizontally': {
          keyword: 'Support angled horizontally',
          synonyms: ['Horizontal support', 'Side support', 'Wide support', 'Lateral support'],
          positions: ['Midfielders', 'Forwards']
        },
        'slide-tackle-retain-possession': {
          keyword: 'Slide tackle retaining possession',
          synonyms: ['Winning tackle', 'Clean tackle', 'Possession tackle', 'Controlled tackle'],
          positions: []
        }
      },
      'transition-a-to-d': {
        'team-drops-45-degree': {
          keyword: 'Team drops at 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle'],
          positions: []
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball'],
          positions: []
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall'],
          positions: ['Forwards', 'Midfielders', 'Forwards', 'Defenders']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        }
      }
    },
    'middle-third': {
      'attacking': {
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check'],
          positions: [],
          technicalCoachingPoint: true
        },
        'zig-zag': {
          keyword: 'Zig-zag',
          synonyms: ['Diagonal movement', 'S-shaped run', 'Weaving run'],
          positions: ['Midfielders', 'Forwards']
        },
        'no-straight-balls-wide': {
          keyword: 'No straight balls wide',
          synonyms: ['Avoid direct wide passes', 'No linear wide passes', 'Curved wide passes'],
          positions: ['Defenders', 'Midfielders']
        },
        'between-lines': {
          keyword: 'Between lines',
          synonyms: ['In pockets', 'Between defenders', 'In gaps'],
          positions: ['Midfielders', 'Forwards']
        },
        'rotate-mids': {
          keyword: 'Rotate mids',
          synonyms: ['Midfield rotation', 'Switch midfielders', 'Midfield movement'],
          positions: ['Midfielders']
        },
        'counter-movement': {
          keyword: 'Counter-movement',
          synonyms: ['Opposite movement', 'Reverse run', 'Change direction', 'L run', 'drop of the shoulder'],
          positions: ['Midfielders', 'Forwards']
        },
        'support-far': {
          keyword: 'Support far',
          synonyms: ['Deep support', 'Distant support', 'Far assistance'],
          positions: ['Midfielders', 'Defenders']
        },
        'triangle-diamond-shape': {
          keyword: 'Triangle / diamond shape',
          synonyms: ['Geometric formation', 'Shape positioning', 'Tactical shape'],
          positions: ['Midfielders', 'Defenders', 'Forwards']
        },
        'open-body': {
          keyword: 'Open body',
          synonyms: ['Body positioning', 'Face play', 'Body orientation'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'play-around-vs-play-through': {
          keyword: 'Play around vs play through',
          synonyms: ['Bypass vs penetrate', 'Go around vs go through', 'Circumvent vs direct'],
          positions: ['Midfielders', 'Defenders']
        },
        'secure-possession': {
          keyword: 'Secure possession',
          synonyms: ['Maintain control', 'Keep ball', 'Retain possession'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'change-of-direction-acceleration': {
          keyword: 'Change of direction + acceleration',
          synonyms: ['Direction change + speed', 'Turn + burst', 'Shift + sprint'],
          positions: ['Midfielders', 'Forwards']
        },
        'technical-turns': {
          keyword: 'Technical turns',
          synonyms: ['Turning technique', 'Turn with ball', 'Pivot', 'Direction change'],
          positions: ['Midfielders', 'Forwards']
        },
        'combination-play': {
          keyword: 'Combination play',
          synonyms: ['Combinations', 'One-two', 'Give and go', 'Pass and move'],
          positions: ['Midfielders', 'Forwards']
        },
        'two-man-combo': {
          keyword: '2 man combo (one two)',
          synonyms: ['One-two', 'Give and go', 'Wall pass', 'Two player combo'],
          positions: ['Midfielders', 'Forwards']
        },
        'third-man-combo': {
          keyword: '3rd man combo',
          synonyms: ['Third man run', 'Third player', 'Third man combination', 'Overlap combo'],
          positions: ['Midfielders', 'Forwards']
        },
        'ball-wide-lcb': {
          keyword: 'When ball wide with LCB',
          synonyms: ['Ball with center back', 'Wide defender', 'Fullback wide', 'Wide position'],
          positions: ['Defenders']
        },
        'six-eight-behind-press': {
          keyword: '6 and 8 stay behind pressing player',
          synonyms: ['Midfielders behind', 'Support behind', 'Deep midfield', 'Cover behind'],
          positions: ['Midfielders']
        },
        'strong-side-mid-high-wide': {
          keyword: 'Strong side mid supports high and wide',
          synonyms: ['Midfield support wide', 'High wide support', 'Advanced wide', 'Wide midfield'],
          positions: ['Midfielders']
        },
        'weak-side-mid-central-splitting': {
          keyword: 'Weak side mid supports central, splitting',
          synonyms: ['Central support', 'Splitting defense', 'Central midfield', 'Between lines'],
          positions: ['Midfielders']
        },
        'winger-checks-inside': {
          keyword: 'Winger checks inside to receive',
          synonyms: ['Winger inside', 'Cut inside', 'Winger central', 'Inside movement'],
          positions: ['Forwards']
        },
        'pressure-from-side': {
          keyword: 'Pressure from side instead of back',
          synonyms: ['Side pressure', 'Lateral pressure', 'Not back pressure', 'Angled pressure'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'most-vulnerable-after-combo': {
          keyword: 'Most vulnerable after combinations',
          synonyms: ['Vulnerable moment', 'After combo', 'Post combination', 'After pass'],
          positions: ['Midfielders', 'Defenders']
        },
        'if-pressed-support': {
          keyword: 'If being pressed, support',
          synonyms: ['Support under pressure', 'Support when pressed', 'Come short', 'Support quickly'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'if-space-make-runs': {
          keyword: 'If space, make runs',
          synonyms: ['Run into space', 'Attack space', 'Make forward runs', 'Exploit space'],
          positions: ['Midfielders', 'Forwards']
        },
        'touch-at-angle-not-vertical': {
          keyword: 'Touch at angle NOT vertical',
          synonyms: ['Angled touch', 'Not straight touch', 'Diagonal touch', 'Angle control'],
          positions: ['Midfielders', 'Forwards']
        },
        'pass-across-body': {
          keyword: 'Pass goes across body',
          synonyms: ['Cross body pass', 'Body position', 'Open body', 'Angled pass'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'mid-support-45-degree': {
          keyword: 'Mid support at 45 degree angle',
          synonyms: ['45 degree support', 'Angled support', 'Diagonal support', 'Midfield support'],
          positions: ['Midfielders']
        },
        'sixty-forty-rule-turning': {
          keyword: '60/40 rule when turning',
          synonyms: ['Turning rule', 'Body position turn', 'Weight distribution', 'Turn technique'],
          positions: ['Midfielders', 'Forwards']
        },
        'rotations-mids-negative': {
          keyword: 'Rotations of mids when ball played negative',
          synonyms: ['Midfield rotation', 'Negative ball rotation', 'Backwards ball', 'Rotation patterns'],
          positions: ['Midfielders']
        },
        'receiving-vertical-ball': {
          keyword: 'Receiving vertical ball',
          synonyms: ['Vertical pass receive', 'Forward pass receive', 'Receive forward', 'Vertical reception'],
          positions: ['Midfielders', 'Forwards']
        },
        'touch-negative-if-no-options': {
          keyword: 'Touch negative if no options',
          synonyms: ['Backwards touch', 'Negative touch', 'Safe touch', 'Retain possession'],
          positions: ['Midfielders', 'Defenders']
        },
        'hold-up-play': {
          keyword: 'Hold up play',
          synonyms: ['Hold ball', 'Retain possession', 'Keep ball', 'Maintain control'],
          positions: ['Forwards']
        },
        'support-at-angle': {
          keyword: 'Support at an angle',
          synonyms: ['Angled support', 'Diagonal support', '45 degree support', 'Angle positioning'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        }
      },
      'defending': {
        'defending-with-two': {
          keyword: 'Defending with 2',
          synonyms: ['Double team', 'Two defenders', 'Defensive pair', 'Cover and pressure'],
          positions: ['Defenders', 'Midfielders']
        },
        'pressure-on-ball': {
          keyword: 'Always pressure on ball',
          synonyms: ['Press ball', 'Pressure ball carrier', 'Close down', 'Press'],
          positions: []
        },
        'cover-acute-angle-wide': {
          keyword: 'If wide, cover at acute angle 5-10 yards',
          synonyms: ['Wide cover', 'Acute angle cover', 'Support wide', 'Cover angle'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'cover-vertically-central': {
          keyword: 'If central, cover vertically behind',
          synonyms: ['Central cover', 'Vertical cover', 'Behind support', 'Cover behind'],
          positions: ['Defenders', 'Midfielders']
        },
        'cover-when-beat': {
          keyword: 'One gets beat, cover should be there',
          synonyms: ['Cover for teammate', 'Recovery cover', 'Support when beat', 'Cover defense'],
          positions: ['Defenders', 'Midfielders']
        },
        'moment-to-press': {
          keyword: 'Moment to press',
          synonyms: ['Pressing trigger', 'When to press', 'Press opportunity', 'Press moment'],
          positions: ['Forwards', 'Midfielders'],
          pressingTrigger: true
        },
        'bad-touch-pass': {
          keyword: 'Bad touch/pass',
          synonyms: ['Poor touch', 'Mistake', 'Error', 'Bad control'],
          positions: [],
          pressingTrigger: true
        },
        'backwards-ball': {
          keyword: 'Backwards ball',
          synonyms: ['Negative ball', 'Back pass', 'Retreating ball', 'Backwards pass'],
          positions: [],
          pressingTrigger: true
        },
        'ball-in-air': {
          keyword: 'Ball in air',
          synonyms: ['Aerial ball', 'Loose ball', 'Second ball', 'Ball bounce'],
          positions: [],
          pressingTrigger: true
        },
        'attacker-facing-goal': {
          keyword: 'Attacker facing their goal',
          synonyms: ['Facing own goal', 'Back to goal', 'Facing away', 'Wrong direction'],
          positions: [],
          pressingTrigger: true
        },
        'head-goes-down': {
          keyword: 'Head goes down',
          synonyms: ['Head down', 'Not scanning', 'No vision', 'Lost awareness'],
          positions: [],
          pressingTrigger: true
        },
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside'],
          positions: ['Defenders', 'Midfielders']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass'],
          positions: ['Defenders', 'Midfielders']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break'],
          positions: ['Defenders', 'Midfielders']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking two passing options when pressing',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'press-block-horizontal-vertical': {
          keyword: 'Press to block horizontal and vertical pass',
          synonyms: ['Block passing lanes', 'Cut options', 'Close angles', 'Block passes'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position'],
          positions: ['Defenders', 'Midfielders'],
          technicalCoachingPoint: true
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness'],
          positions: ['Defenders', 'Midfielders', 'Forwards'],
          technicalCoachingPoint: true
        }
      },
      'transition-a-to-d': {
        'team-drops-45-degree': {
          keyword: 'Team drops at 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'never-run-across-vertical-line': {
          keyword: 'Never run across teammates vertical line',
          synonyms: ['Avoid crossing line', 'Stay in lane', 'Maintain position', 'Don\'t cross path'],
          positions: ['Midfielders']
        },
        'keep-possession-transition': {
          keyword: 'Keep possession in transition',
          synonyms: ['Secure ball', 'Retain in transition', 'Maintain control', 'Keep ball'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall'],
          positions: ['Midfielders', 'Forwards', 'Defenders']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'get-to-ball': {
          keyword: 'Get to the ball',
          synonyms: ['Close down', 'Pressure', 'Press ball', 'Attack ball'],
          positions: ['Forwards', 'Midfielders', 'Forwards', 'Defenders']
        }
      },
      'transition-d-to-a': {
        'look-for-counter': {
          keyword: 'Look for counter',
          synonyms: ['Counter attack', 'Fast break', 'Quick attack', 'Transition attack'],
          positions: ['Midfielders', 'Forwards']
        },
        'look-for-secure-possession': {
          keyword: 'Look for secure possession',
          synonyms: ['Secure ball', 'Safe possession', 'Control ball', 'Retain possession'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'final-third': {
          keyword: 'Final Third',
          synonyms: ['Attacking third', 'Final zone', 'Goal area', 'End zone'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'look-for-goal': {
          keyword: 'Look for the goal',
          synonyms: ['Attack goal', 'Goal opportunity', 'Scoring chance', 'Goal chance'],
          positions: ['Forwards', 'Midfielders']
        },
        'runs-attacking-players': {
          keyword: 'Runs of attacking players',
          synonyms: ['Forward runs', 'Attacking runs', 'Movement forward', 'Runs in behind'],
          positions: ['Forwards', 'Midfielders']
        },
        'second-player-exploit': {
          keyword: 'Once ball won, 2nd player has 1-2 touches to exploit',
          synonyms: ['Quick transition', 'Fast break', 'Counter attack', 'Quick exploit'],
          positions: ['Midfielders', 'Forwards']
        },
        'player-head-down-hectic': {
          keyword: 'Player who won ball has head down and hectic',
          synonyms: ['Won ball hectic', 'Recovery moment', 'Transition moment', 'Quick decision'],
          positions: []
        }
      }
    },
    'wide-play': {
      'attacking': {
        'stay-wide': {
          keyword: 'Stay wide',
          synonyms: ['Maintain width', 'Keep wide', 'Sideline positioning', "Heels on the touch line"],
          positions: ['Forwards', 'Defenders']
        },
        'support-underneath': {
          keyword: 'Support underneath',
          synonyms: ['Under support', 'Deep support', 'Behind support'],
          positions: ['Defenders', 'Midfielders']
        },
        'overlap-underlap': {
          keyword: 'Overlap / underlap',
          synonyms: ['Overlapping run', 'Underlapping run', 'Supporting run'],
          positions: ['Defenders', 'Forwards']
        },
        'diagonal-runs': {
          keyword: 'Diagonal runs',
          synonyms: ['Angled runs', 'Slant runs', 'Cutting runs'],
          positions: ['Forwards', 'Defenders']
        },
        'cutback': {
          keyword: 'Cutback',
          synonyms: ['Pull back', 'Back pass', 'Reverse pass'],
          positions: ['Forwards', 'Defenders']
        },
        'back-post-chip': {
          keyword: 'Back-post chip',
          synonyms: ['Far post chip', 'Back post chip', 'Far post chip'],
          positions: ['Forwards']
        },
        'low-hard': {
          keyword: 'Low & hard',
          synonyms: ['Driven cross', 'Hard low cross', 'Powerful low delivery'],
          positions: ['Forwards', 'Defenders']
        },
        'early-service': {
          keyword: 'Early service',
          synonyms: ['Early cross', 'Quick delivery', 'Fast service'],
          positions: ['Forwards', 'Defenders']
        },
        'inswinger-outswinger': {
          keyword: 'Inswinger / outswinger',
          synonyms: ['Curved cross', 'Bent delivery', 'Swerving cross'],
          positions: ['Forwards', 'Defenders']
        },
        'look-up-scan-before-cross': {
          keyword: 'Look up + scan before cross',
          synonyms: ['Check before crossing', 'Survey before delivery', 'Assess before service'],
          positions: ['Forwards', 'Defenders']
        },
        'outside-back-winger-relationship': {
          keyword: 'Outside back relationship to winger',
          synonyms: ['Fullback winger', 'OB winger link', 'Wide partnership', 'Fullback wide'],
          positions: ['Defenders', 'Forwards']
        },
        'same-line-vertically': {
          keyword: 'Same line vertically',
          synonyms: ['Vertical alignment', 'Same level', 'Line up', 'Vertical position'],
          positions: ['Defenders', 'Forwards']
        },
        'vertical-balls-on-run': {
          keyword: 'Vertical balls on run from OB to winger',
          synonyms: ['Through ball wide', 'Vertical pass wide', 'Run and pass', 'Through pass'],
          positions: ['Defenders', 'Forwards']
        },
        'through-ball-diagonal-wide': {
          keyword: 'Diagonal from wide',
          synonyms: ['Diagonal through ball', 'Angled through', 'Wide diagonal', 'Diagonal pass'],
          positions: ['Defenders', 'Forwards', 'Midfielders']
        },
        'receiving-through-ball-before-after': {
          keyword: 'Receiving through ball before or after last line',
          synonyms: ['Through ball receive', 'Receive through', 'Past defense', 'Behind line'],
          positions: ['Forwards']
        },
        'counter-movement': {
          keyword: 'Counter-movement',
          synonyms: ['Opposite movement', 'Reverse run', 'Change direction', 'Counter run'],
          positions: ['Forwards', 'Defenders']
        },
        'supporting-nine': {
          keyword: 'Supporting 9',
          synonyms: ['Striker support', 'Forward support', '9 support', 'Attacking support'],
          positions: ['Forwards']
        },
        'cutting-inside': {
          keyword: 'Cutting inside',
          synonyms: ['Cut inside', 'Infield run', 'Inside movement', 'Central run'],
          positions: ['Forwards']
        },
        'player-dribbling-centrally': {
          keyword: 'When player dribbling centrally',
          synonyms: ['Dribble central', 'Central dribble', 'Through middle', 'Central run'],
          positions: ['Forwards', 'Midfielders']
        },
        'run-away': {
          keyword: 'Run away',
          synonyms: ['Move away', 'Create space', 'Pull away', 'Wide run'],
          positions: ['Forwards']
        },
        'run-through': {
          keyword: 'Run through',
          synonyms: ['Through run', 'Penetrating run', 'Forward run', 'In behind'],
          positions: ['Forwards']
        },
        'run-beside': {
          keyword: 'Run beside',
          synonyms: ['Lateral run', 'Side run', 'Parallel run', 'Support run'],
          positions: ['Forwards', 'Defenders']
        },
        'creating-numbers-wide': {
          keyword: 'Creating numbers using wide players',
          synonyms: ['Wide overload', 'Numerical advantage wide', 'Wide numbers', 'Overload wide'],
          positions: ['Defenders', 'Forwards', 'Midfielders']
        },
        'outside-backs-overloading': {
          keyword: 'Outside backs overloading',
          synonyms: ['Fullback overload', 'OB joining attack', 'Wide overload', 'Fullback forward'],
          positions: ['Defenders', 'Forwards']
        },
        'midfielders-drifting-wide': {
          keyword: 'Midfielders drifting to wide areas',
          synonyms: ['Mid wide', 'Midfield wide', 'Drift wide', 'Wide midfield'],
          positions: ['Midfielders']
        },
        'pass-move-forward': {
          keyword: 'Pass + move forward into space',
          synonyms: ['Pass and go', 'Give and go', 'Pass and run'],
          positions: []
        },
        'switching-play': {
          keyword: 'Switching play',
          synonyms: ['Switch field', 'Change sides', 'Find opposite side'],
          positions: ['GK', 'Defenders', 'Midfielders']
        }
      },
      'defending': {
        'wide-1v1-defending': {
          keyword: 'Wide 1v1 defending',
          synonyms: ['Wide defending', 'Sideline defending', 'Wing defending'],
          positions: ['Defenders', 'Forwards']
        },
        'force-wide': {
          keyword: 'Force wide',
          synonyms: ['Push wide', 'Channel wide', 'Direct wide'],
          positions: ['Forwards', 'Midfielders']
        },
        'farthest-foot-tackle': {
          keyword: 'Farthest-foot tackle',
          synonyms: ['Far foot tackle', 'Extended tackle', 'Reach tackle'],
          positions: ['Defenders', 'Forwards', 'Defenders']
        },
        'delay': {
          keyword: 'Delay',
          synonyms: ['Slow down', 'Hold up', 'Stall'],
          positions: ['Defenders', 'Forwards', 'Midfielders']
        },
        'prevent-playing-around': {
          keyword: 'Prevent playing around',
          synonyms: ['Block wide play', 'Force inside', 'Prevent bypass', 'Channel inside'],
          positions: ['Defenders', 'Midfielders', 'Forwards']
        },
        'prevent-playing-over': {
          keyword: 'Prevent playing over',
          synonyms: ['Block long ball', 'Prevent over top', 'Block through ball', 'Prevent long pass'],
          positions: ['Defenders', 'Midfielders']
        },
        'prevent-playing-through': {
          keyword: 'Prevent playing through',
          synonyms: ['Block through pass', 'Prevent penetration', 'Block central', 'Prevent line break'],
          positions: ['Defenders', 'Midfielders']
        },
        'coral-blocking-passes': {
          keyword: 'Coral by blocking to passing options when pressing',
          synonyms: ['Block passing options', 'Cut passing lanes', 'Block horizontal and vertical', 'Close options'],
          positions: ['Forwards', 'Midfielders', 'Forwards', 'Defenders']
        },
        'angled-approach': {
          keyword: 'Angled approach',
          synonyms: ['Approach angle', 'Angle of approach', 'Angled press', 'Diagonal approach'],
          positions: []
        },
        'wide-stance': {
          keyword: 'Wide stance',
          synonyms: ['Defensive stance', 'Low stance', 'Balanced stance', 'Ready position'],
          positions: [],
          technicalCoachingPoint: true
        },
        'scan': {
          keyword: 'Scan',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness'],
          positions: [],
          technicalCoachingPoint: true
        },
        'moment-to-press': {
          keyword: 'Moment to press',
          synonyms: ['Pressing trigger', 'When to press', 'Press opportunity', 'Press moment'],
          positions: ['Forwards', 'Midfielders', 'Defenders'],
          pressingTrigger: true
        },
        'bad-touch-pass': {
          keyword: 'Bad touch/pass',
          synonyms: ['Poor touch', 'Mistake', 'Error', 'Bad control'],
          positions: [],
          pressingTrigger: true
        },
        'backwards-ball': {
          keyword: 'Backwards ball',
          synonyms: ['Negative ball', 'Back pass', 'Retreating ball', 'Backwards pass'],
          positions: [],
          pressingTrigger: true
        },
        'ball-in-air': {
          keyword: 'Ball in air',
          synonyms: ['Aerial ball', 'Loose ball', 'Second ball', 'Ball bounce'],
          positions: [],
          pressingTrigger: true
        }
      },
      'transition-a-to-d': {
        // Empty based on notes - can add later if needed
      },
      'transition-d-to-a': {
        'look-central-combination': {
          keyword: 'Look central for combination',
          synonyms: ['Central combo', 'Middle combination', 'Central play', 'Inside combination'],
          positions: ['Midfielders', 'Forwards']
        },
        'using-body': {
          keyword: 'Using the body',
          synonyms: ['Body position', 'Body shape', 'Body control', 'Physical play'],
          positions: []
        }
      }
    },
    'final-third': {
      'attacking': {
        'line-breaking-pass': {
          keyword: 'Line-breaking pass',
          synonyms: ['Through pass', 'Penetrating pass', 'Breaking pass'],
          positions: ['Midfielders', 'Forwards']
        },
        'run-timing-cue': {
          keyword: 'Run timing cue',
          synonyms: ['Run timing', 'Movement timing', 'Timing signal'],
          positions: ['Forwards', 'Midfielders']
        },
        'touch-forward-with-space': {
          keyword: 'Touch forward with space',
          synonyms: ['Touch ahead', 'Push forward', 'Advance with space'],
          positions: ['Forwards', 'Midfielders']
        },
        'curve-run-to-stay-onside': {
          keyword: 'Curve run to stay onside',
          synonyms: ['Curved run', 'Bent run', 'Arcing run'],
          positions: ['Forwards']
        },
        'straight-run-from-middle': {
          keyword: 'Straight run (from middle)',
          synonyms: ['Direct run', 'Linear run', 'Forward run'],
          positions: ['Forwards', 'Midfielders']
        },
        'diagonal-run-from-wide': {
          keyword: 'Diagonal run (from wide)',
          synonyms: ['Angled run', 'Slant run', 'Cutting run'],
          positions: ['Forwards']
        },
        'frame-the-box': {
          keyword: 'Frame the box',
          synonyms: ['Box positioning', 'Penalty area shape', 'Goal frame'],
          positions: ['Forwards', 'Midfielders']
        },
        '1st-post': {
          keyword: '1st post',
          synonyms: ['Near post', 'Front post', 'First post'],
          positions: ['Forwards']
        },
        'pk-spot': {
          keyword: 'PK spot',
          synonyms: ['Penalty spot', 'PK mark', 'Penalty point'],
          positions: ['Forwards', 'Midfielders']
        },
        'back-post': {
          keyword: 'Back post',
          synonyms: ['Far post', 'Second post', 'Back pole'],
          positions: ['Forwards']
        },
        'top-of-18': {
          keyword: 'Top of 18',
          synonyms: ['Edge of box', 'Top of area', 'Penalty area edge'],
          positions: ['Forwards', 'Midfielders']
        },
        'finish-first-time': {
          keyword: 'Finish first time',
          synonyms: ['One-touch finish', 'Immediate finish', 'Direct finish'],
          positions: ['Forwards']
        },
        'weak-foot': {
          keyword: 'Weak foot',
          synonyms: ['Non-dominant foot', 'Off foot', 'Secondary foot'],
          positions: []
        },
        'blind-foot': {
          keyword: 'Blind foot',
          synonyms: ['Non-dominant foot', 'Off foot', 'Weaker foot'],
          positions: []
        },
        'one-touch-finishing': {
          keyword: 'One-touch finishing',
          synonyms: ['First-time finishing', 'Direct finishing', 'Immediate finishing'],
          positions: ['Forwards']
        },
        'body-to-strike': {
          keyword: 'Body to strike',
          synonyms: ['Body position', 'Striking position', 'Body alignment'],
          positions: ['Forwards']
        },
        'head-over-ball': {
          keyword: 'Head over ball',
          synonyms: ['Head position', 'Body lean', 'Forward lean'],
          positions: ['Forwards']
        },
        'follow-through': {
          keyword: 'Follow through',
          synonyms: ['Complete motion', 'Full extension', 'Finish motion'],
          positions: ['Forwards']
        },
        'accuracy': {
          keyword: 'Accuracy',
          synonyms: ['Precision', 'Placement', 'Targeting'],
          positions: ['Forwards']
        },
        'everything-towards-goal': {
          keyword: 'Everything towards goal',
          synonyms: ['Attack goal', 'Forward play', 'Goal oriented', 'Attack minded'],
          positions: ['Forwards', 'Midfielders']
        },
        'runs': {
          keyword: 'Runs',
          synonyms: ['Attacking runs', 'Movement', 'Forward runs', 'Runs in behind'],
          positions: ['Forwards', 'Midfielders']
        },
        'finishing-shooting': {
          keyword: 'Finishing (Shooting)',
          synonyms: ['Shooting', 'Goal scoring', 'Finishing technique', 'Striking'],
          positions: ['Forwards']
        },
        'overloads': {
          keyword: 'Overloads',
          synonyms: ['Numerical advantage', 'Creating numbers', 'Overload situations', 'Extra player'],
          positions: []
        },
        'receiving-past-line-defense': {
          keyword: 'Receiving past a line of defense',
          synonyms: ['Receive behind line', 'Past defense', 'Behind defenders', 'Through defense'],
          positions: ['Forwards']
        },
        'crossing': {
          keyword: 'Crossing',
          synonyms: ['Delivery', 'Service', 'Wide service', 'Cross field'],
          positions: ['Forwards', 'Defenders']
        },
        'last-line-breaking-pass': {
          keyword: 'Last line breaking pass (through ball)',
          synonyms: ['Through ball', 'Line breaking pass', 'Penetrating pass', 'Breaking pass'],
          positions: ['Midfielders', 'Forwards']
        },
        'attacking-movement': {
          keyword: 'Attacking movement',
          synonyms: ['Forward movement', 'Attack runs', 'Movement forward', 'Attacking runs'],
          positions: ['Forwards', 'Midfielders']
        },
        'set-pieces': {
          keyword: 'Set Pieces',
          synonyms: ['Set piece', 'Dead ball', 'Restart', 'Free kick'],
          positions: []
        },
        'combinations': {
          keyword: 'Combinations',
          synonyms: ['Combination play', 'One-two', 'Give and go', 'Pass and move'],
          positions: ['Forwards', 'Midfielders']
        },
        'one-v-ones': {
          keyword: '1v1s',
          synonyms: ['One versus one', '1v1', 'Individual duel', 'One on one'],
          positions: ['Forwards']
        },
        'scanning': {
          keyword: 'Scanning',
          synonyms: ['Look around', 'Survey', 'Check', 'Awareness'],
          positions: []
        }
      },
      'defending': {
        'corral': {
          keyword: 'Corral',
          synonyms: ['Channel', 'Direct', 'Force', 'Guide'],
          positions: ['Defenders', 'Midfielders']
        },
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball'],
          positions: []
        },
        'get-to-ball': {
          keyword: 'Get to the ball',
          synonyms: ['Close down', 'Pressure', 'Press ball', 'Attack ball'],
          positions: ['Forwards', 'Midfielders', 'Forwards', 'Defenders']
        },
        'pressing': {
          keyword: 'Pressing',
          synonyms: ['Press', 'Close down', 'Pressure', 'High press'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        }
      },
      'transition-a-to-d': {
        'get-behind-ball': {
          keyword: 'Get behind the ball',
          synonyms: ['Recovery', 'Get back', 'Defensive shape', 'Behind ball'],
          positions: []
        },
        'closest-player-delays': {
          keyword: 'Closest player delays',
          synonyms: ['Delay opponent', 'Slow down attack', 'Hold up', 'Stall'],
          positions: ['Forwards', 'Midfielders', 'Forwards', 'Defenders']
        },
        'make-play-backwards': {
          keyword: 'Make them play backwards',
          synonyms: ['Force backwards', 'Prevent forward', 'Force negative', 'Block forward'],
          positions: ['Forwards', 'Midfielders', 'Forwards']
        },
        'drop-at-45-degree': {
          keyword: 'Drop at a 45 degree angle',
          synonyms: ['Drop at angle', '45 degree drop', 'Angled drop', 'Retreat at angle'],
          positions: []
        },
        'make-contact': {
          keyword: 'Make contact',
          synonyms: ['Physical contact', 'Challenge', 'Tackle', 'Engage'],
          positions: ['Defenders', 'Midfielders']
        },
        'tactical-fouls': {
          keyword: 'Tactical fouls',
          synonyms: ['Professional foul', 'Strategic foul', 'Tactical challenge', 'Smart foul'],
          positions: ['Defenders', 'Midfielders']
        }
      },
      'transition-d-to-a': {
        'final-third': {
          keyword: 'Final Third',
          synonyms: ['Attacking third', 'Final zone', 'Goal area', 'End zone'],
          positions: []
        },
        'look-for-goal': {
          keyword: 'Look for the goal',
          synonyms: ['Attack goal', 'Goal opportunity', 'Scoring chance', 'Goal chance'],
          positions: ['Forwards', 'Midfielders']
        },
        'look-for-secure-possession': {
          keyword: 'Look for secure possession',
          synonyms: ['Secure ball', 'Safe possession', 'Control ball', 'Retain possession'],
          positions: []
        },
        'runs-attacking-players': {
          keyword: 'Runs of attacking players',
          synonyms: ['Forward runs', 'Attacking runs', 'Movement forward', 'Runs in behind'],
          positions: ['Forwards', 'Midfielders']
        },
        'when-opponent-dropping': {
          keyword: 'When opponent is dropping',
          synonyms: ['Opponent retreating', 'Defense dropping', 'Retreating defense', 'Dropping back'],
          positions: ['Forwards', 'Midfielders']
        }
      }
    }
  }
};

/**
 * Get all keywords for a specific category
 * @param {string} category - The category name (tactical, technical, physical, mental)
 * @returns {Object} Object containing keywords organized by subcategory
 */
export function getKeywordsForCategory(category) {
  return DRILL_KEYWORDS[category] || {};
}

/**
 * Get all keywords for a specific period (tactical only)
 * Returns all keywords across all phases for backward compatibility
 * @param {string} period - The period name (build-out, middle-third, wide-play, final-third)
 * @returns {Array} Array of keyword objects with keyword and synonyms
 */
export function getKeywordsForPeriod(period) {
  const tacticalData = DRILL_KEYWORDS.tactical;
  if (!tacticalData || !tacticalData[period]) return [];
  
  const allKeywords = [];
  const periodData = tacticalData[period];
  
  // Iterate through all phases
  for (const phase in periodData) {
    const phaseData = periodData[phase];
    if (typeof phaseData === 'object' && phaseData.keyword) {
      // Old structure (backward compatibility - shouldn't happen with new structure)
      allKeywords.push({
        keyword: phaseData.keyword,
        synonyms: phaseData.synonyms,
        allTerms: [phaseData.keyword, ...phaseData.synonyms],
        phase: phase
      });
    } else if (typeof phaseData === 'object') {
      // New structure with phases
      for (const key in phaseData) {
        const item = phaseData[key];
        if (item && item.keyword) {
          allKeywords.push({
            keyword: item.keyword,
            synonyms: item.synonyms,
            allTerms: [item.keyword, ...item.synonyms],
            phase: phase
          });
        }
      }
    }
  }
  
  return allKeywords;
}

/**
 * Get keywords for a specific period and phase
 * @param {string} period - The period name (build-out, middle-third, wide-play, final-third)
 * @param {string} phase - The phase name (attacking, defending, transition-d-to-a, transition-a-to-d)
 * @returns {Array} Array of keyword objects
 */
export function getKeywordsForPeriodAndPhase(period, phase) {
  const tacticalData = DRILL_KEYWORDS.tactical;
  if (!tacticalData || !tacticalData[period] || !tacticalData[period][phase]) return [];
  
  const phaseData = tacticalData[period][phase];
  const keywords = [];
  
  for (const key in phaseData) {
    const item = phaseData[key];
    if (item && item.keyword) {
      keywords.push({
        keyword: item.keyword,
        synonyms: item.synonyms,
        allTerms: [item.keyword, ...item.synonyms],
        phase: phase
      });
    }
  }
  
  return keywords;
}

/**
 * Get all phases for a period
 * @param {string} period - The period name
 * @returns {Array} Array of phase names
 */
export function getPhasesForPeriod(period) {
  const tacticalData = DRILL_KEYWORDS.tactical;
  if (!tacticalData || !tacticalData[period]) return [];
  return Object.keys(tacticalData[period]);
}

/**
 * Get all keywords for a specific skill/area within a category
 * @param {string} category - The category name (tactical, technical, physical, mental)
 * @param {string} skill - The skill/area name (e.g., 'first-touch', 'speed', 'decision-making')
 * @returns {Object|null} Keyword object or null if not found
 */
export function getKeywordForSkill(category, skill) {
  const categoryData = DRILL_KEYWORDS[category];
  if (!categoryData) return null;
  
  // For tactical, need to search through periods and phases
  if (category === 'tactical') {
    for (const period in categoryData) {
      const periodData = categoryData[period];
      for (const phase in periodData) {
        const phaseData = periodData[phase];
        if (phaseData && phaseData[skill]) {
          return {
            keyword: phaseData[skill].keyword,
            synonyms: phaseData[skill].synonyms,
            allTerms: [phaseData[skill].keyword, ...phaseData[skill].synonyms],
            period: period,
            phase: phase
          };
        }
      }
    }
    return null;
  }
  
  // For other categories, direct lookup
  if (categoryData[skill]) {
    return {
      keyword: categoryData[skill].keyword,
      synonyms: categoryData[skill].synonyms,
      allTerms: [categoryData[skill].keyword, ...categoryData[skill].synonyms]
    };
  }
  
  return null;
}

/**
 * Get all keywords across all categories
 * @returns {Array} Array of all keyword objects with category and subcategory info
 */
export function getAllKeywords() {
  const allKeywords = [];
  
  for (const category in DRILL_KEYWORDS) {
    const categoryData = DRILL_KEYWORDS[category];
    
    if (category === 'tactical') {
      // Tactical keywords are organized by period and phase
      for (const period in categoryData) {
        const periodData = categoryData[period];
        for (const phase in periodData) {
          const phaseData = periodData[phase];
          if (typeof phaseData === 'object' && phaseData.keyword) {
            // Old structure (backward compatibility)
            allKeywords.push({
              category: 'tactical',
              period: period,
              phase: phase,
              key: phase,
              keyword: phaseData.keyword,
              synonyms: phaseData.synonyms,
              allTerms: [phaseData.keyword, ...phaseData.synonyms]
            });
          } else if (typeof phaseData === 'object') {
            // New structure with phases
            for (const key in phaseData) {
              const item = phaseData[key];
              if (item && item.keyword) {
                allKeywords.push({
                  category: 'tactical',
                  period: period,
                  phase: phase,
                  key: key,
                  keyword: item.keyword,
                  synonyms: item.synonyms,
                  allTerms: [item.keyword, ...item.synonyms]
                });
              }
            }
          }
        }
      }
    } else {
      // Other categories are organized by skill/area
      for (const skill in categoryData) {
        allKeywords.push({
          category: category,
          skill: skill,
          keyword: categoryData[skill].keyword,
          synonyms: categoryData[skill].synonyms,
          allTerms: [categoryData[skill].keyword, ...categoryData[skill].synonyms]
        });
      }
    }
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
  
  const categoriesToSearch = category ? [category] : Object.keys(DRILL_KEYWORDS);
  
  for (const cat of categoriesToSearch) {
    const categoryData = DRILL_KEYWORDS[cat];
    if (!categoryData) continue;
    
    if (cat === 'tactical') {
      // Tactical keywords are organized by period and phase
      for (const period in categoryData) {
        const periodData = categoryData[period];
        for (const phase in periodData) {
          const phaseData = periodData[phase];
          if (typeof phaseData === 'object' && phaseData.keyword) {
            // Old structure (backward compatibility)
            const item = phaseData;
            const allTerms = [item.keyword.toLowerCase(), ...item.synonyms.map(s => s.toLowerCase())];
            
            if (allTerms.some(term => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
              matches.push({
                category: 'tactical',
                period: period,
                phase: phase,
                key: phase,
                keyword: item.keyword,
                synonyms: item.synonyms,
                allTerms: [item.keyword, ...item.synonyms]
              });
            }
          } else if (typeof phaseData === 'object') {
            // New structure with phases
            for (const key in phaseData) {
              const item = phaseData[key];
              if (item && item.keyword) {
                const allTerms = [item.keyword.toLowerCase(), ...item.synonyms.map(s => s.toLowerCase())];
                
                if (allTerms.some(term => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
                  matches.push({
                    category: 'tactical',
                    period: period,
                    phase: phase,
                    key: key,
                    keyword: item.keyword,
                    synonyms: item.synonyms,
                    allTerms: [item.keyword, ...item.synonyms]
                  });
                }
              }
            }
          }
        }
      }
    } else {
      // Other categories are organized by skill/area
      for (const skill in categoryData) {
        const item = categoryData[skill];
        const allTerms = [item.keyword.toLowerCase(), ...item.synonyms.map(s => s.toLowerCase())];
        
        if (allTerms.some(term => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
          matches.push({
            category: cat,
            skill: skill,
            keyword: item.keyword,
            synonyms: item.synonyms,
            allTerms: [item.keyword, ...item.synonyms]
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
    const categoryData = DRILL_KEYWORDS[category];
    if (!categoryData) return [];
    
    if (category === 'tactical' && period) {
      // Get keywords for specific period (all phases)
      const periodData = categoryData[period];
      if (periodData) {
        for (const phase in periodData) {
          const phaseData = periodData[phase];
          if (typeof phaseData === 'object' && phaseData.keyword) {
            // Old structure
            flatList.push(phaseData.keyword);
            flatList.push(...phaseData.synonyms);
          } else if (typeof phaseData === 'object') {
            // New structure
            for (const key in phaseData) {
              const item = phaseData[key];
              if (item && item.keyword) {
                flatList.push(item.keyword);
                flatList.push(...item.synonyms);
              }
            }
          }
        }
      }
    } else if (category === 'tactical') {
      // Get all tactical keywords across all periods
      for (const periodKey in categoryData) {
        const periodData = categoryData[periodKey];
        for (const phase in periodData) {
          const phaseData = periodData[phase];
          if (typeof phaseData === 'object' && phaseData.keyword) {
            // Old structure
            flatList.push(phaseData.keyword);
            flatList.push(...phaseData.synonyms);
          } else if (typeof phaseData === 'object') {
            // New structure
            for (const key in phaseData) {
              const item = phaseData[key];
              if (item && item.keyword) {
                flatList.push(item.keyword);
                flatList.push(...item.synonyms);
              }
            }
          }
        }
      }
    } else {
      // Get keywords for other categories
      for (const skill in categoryData) {
        const item = categoryData[skill];
        flatList.push(item.keyword);
        flatList.push(...item.synonyms);
      }
    }
  } else {
    // Get all keywords from all categories
    const allKeywords = getAllKeywords();
    allKeywords.forEach(item => {
      flatList.push(item.keyword);
      flatList.push(...item.synonyms);
    });
  }
  
  return [...new Set(flatList)]; // Remove duplicates
}
