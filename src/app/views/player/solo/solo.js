// Solo Sessions Page Scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { mapKeywordToCurriculum, getSkillsForPeriodAndCategory, getSubSkillsForSkill } from '../../../utils/curriculum-backbone.js';
import { getCurrentFocus } from '../home/curriculum-focus.js';
import { getCurrentQuarter } from '../../../utils/points.js';

let supabase;
let supabaseReady = false;
let currentTab = 'start-here';
let currentVideos = [];
let currentVideoIndex = 0;
let videoElements = [];
let selectedCategory = null;
let selectedSkill = null;
let selectedSubSkill = null;
let currentPeriod = null;
let allPhysicalSessions = []; // Store all physical sessions for filtering

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    setupEventListeners();
    loadVideosForTab(currentTab);
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  const tabs = document.querySelectorAll('.solo-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Back to tabs button - removed, using tab switching instead

  // Video feed scroll handling
  const videoFeed = document.getElementById('soloVideoFeed');
  if (videoFeed) {
    videoFeed.addEventListener('scroll', handleVideoScroll);
  }
}

// Get current period from curriculum focus
async function getCurrentPeriod() {
  try {
    const focus = await getCurrentFocus();
    if (!focus || !focus.focus) return null;
    
    // Map focus text to period key
    const focusToPeriod = {
      'BUILD-OUT': 'build-out',
      'FINAL THIRD': 'final-third',
      'MIDDLE THIRD': 'middle-third',
      'WIDE PLAY': 'wide-play'
    };
    
    const period = focusToPeriod[focus.focus.toUpperCase()];
    return period || null;
  } catch (error) {
    console.error('Error getting current period:', error);
    return null;
  }
}

// Switch between tabs
async function switchTab(tabName) {
  if (currentTab === tabName) return;

  // Update active tab
  document.querySelectorAll('.solo-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    }
  });

  currentTab = tabName;
  currentVideoIndex = 0;
  selectedSkill = null;
  selectedSubSkill = null;

  const videoFeed = document.getElementById('soloVideoFeed');
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  const drillsContainer = document.getElementById('drillsContainer');
  const sessionDetailContainer = document.getElementById('sessionDetailContainer');

  // Hide drills container and session detail containers when switching tabs
  if (drillsContainer) {
    drillsContainer.style.display = 'none';
    drillsContainer.innerHTML = ''; // Clear content
  }
  
  // Remove any session detail containers
  if (sessionDetailContainer) {
    sessionDetailContainer.remove();
  }

  // If it's start-here, show videos and hide skill selection
  if (tabName === 'start-here') {
    if (skillSelectionContainer) {
      skillSelectionContainer.style.display = 'none';
    }
    if (videoFeed) {
      videoFeed.style.display = 'flex';
    }
    await loadVideosForTab(tabName);
  } else if (tabName === 'tactical') {
    // Tactical: Show videos directly in feed (like Start Here)
    selectedCategory = 'tactical';
    currentPeriod = await getCurrentPeriod();
    if (skillSelectionContainer) {
      skillSelectionContainer.style.display = 'none';
    }
    if (videoFeed) {
      videoFeed.style.display = 'flex';
    }
    await loadVideosForTab(tabName);
  } else {
    // Other category tabs - show skill selection, hide videos
    selectedCategory = tabName;
    currentPeriod = await getCurrentPeriod();
    if (videoFeed) {
      videoFeed.style.display = 'none';
    }
    if (skillSelectionContainer) {
      skillSelectionContainer.style.display = 'block';
    }
    showSkillSelection(tabName);
  }
}

// Show skill selection UI
async function showSkillSelection(category) {
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  const skillSelectionTitle = document.getElementById('skillSelectionTitle');
  const skillSelectionGrid = document.getElementById('skillSelectionGrid');
  
  if (!skillSelectionContainer || !skillSelectionTitle || !skillSelectionGrid) return;

  // Show skill selection container
  skillSelectionContainer.style.display = 'block';

  // Handle Physical category differently - show season selection first
  if (category === 'physical') {
    showSeasonSelection(category);
    return;
  }

  // Set title
  skillSelectionTitle.textContent = `Select ${category.charAt(0).toUpperCase() + category.slice(1)} Skill`;

  // Get current period (async)
  currentPeriod = await getCurrentPeriod();
  if (!currentPeriod) {
    skillSelectionGrid.innerHTML = '<p>Unable to determine current curriculum period.</p>';
    skillSelectionContainer.style.display = 'block';
    return;
  }

  // Always show skills for the current period only
  // The "All" period option only affects session queries, not skill selection
  let skills = getSkillsForPeriodAndCategory(currentPeriod, category);
  
  // For Technical category, only show the "big four" skills
  // Filter out juggling, passing, and finishing (they're included in sessions)
  if (category === 'technical') {
    const bigFourSkills = ['first-touch', 'escape-moves', 'turning', 'ball-mastery'];
    skills = skills.filter(skill => bigFourSkills.includes(skill));
  }
  
  await renderSkillCards(skills, skillSelectionGrid, skillSelectionContainer);
}

// Fetch skill thumbnails from database
async function fetchSkillThumbnails(skills, category, period) {
  if (!supabaseReady || !supabase || !skills || skills.length === 0) {
    return [];
  }

  try {
    // Build query - try to match by category, skill, and period
    // Also try "all" period and null period as fallbacks
    const { data: thumbnails, error } = await supabase
      .from('skill_thumbnails')
      .select('*')
      .eq('category', category)
      .in('skill', skills)
      .or(`period.eq.${period},period.eq.all,period.is.null`);

    if (error) {
      console.warn('Error fetching skill thumbnails:', error);
      return [];
    }

    return thumbnails || [];
  } catch (error) {
    console.warn('Error fetching skill thumbnails:', error);
    return [];
  }
}

// Render skill cards
async function renderSkillCards(skills, skillSelectionGrid, skillSelectionContainer) {
  if (!skills || skills.length === 0) {
    skillSelectionGrid.innerHTML = '<p>No skills available for this period and category.</p>';
    skillSelectionContainer.style.display = 'block';
    return;
  }

  // Render skill cards
  skillSelectionGrid.innerHTML = '';
  
  // Fetch thumbnails for all skills
  const thumbnails = await fetchSkillThumbnails(skills, selectedCategory, currentPeriod);
  
  skills.forEach(skill => {
    const skillCard = document.createElement('div');
    skillCard.className = 'skill-card';
    skillCard.dataset.skill = skill;
    
    // Format skill name for display
    const displayName = skill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Get thumbnail for this skill
    const thumbnail = thumbnails.find(t => t.skill === skill);
    const thumbnailUrl = thumbnail && supabase
      ? supabase.storage.from('solo-session-videos').getPublicUrl(thumbnail.thumbnail_url).data.publicUrl
      : null;
    
    // Check if thumbnail is a video (MP4) or image
    const isVideo = thumbnailUrl && thumbnailUrl.toLowerCase().endsWith('.mp4');
    
    // Set background style if thumbnail exists
    if (thumbnailUrl) {
      if (isVideo) {
        // For videos, we'll use a video element as background
        skillCard.innerHTML = `
          <video class="skill-card-background" autoplay muted loop playsinline>
            <source src="${thumbnailUrl}" type="video/mp4">
          </video>
          <div class="skill-card-overlay"></div>
          <div class="skill-card-content">
            <div class="skill-card-name">${displayName}</div>
            <div class="skill-card-subtitle">Click to view sessions</div>
          </div>
        `;
      } else {
        // For images, use CSS background-image
        skillCard.style.backgroundImage = `url(${thumbnailUrl})`;
        skillCard.style.backgroundSize = 'cover';
        skillCard.style.backgroundPosition = 'center';
        skillCard.innerHTML = `
          <div class="skill-card-overlay"></div>
          <div class="skill-card-content">
            <div class="skill-card-name">${displayName}</div>
            <div class="skill-card-subtitle">Click to view sessions</div>
          </div>
        `;
      }
    } else {
      skillCard.innerHTML = `
        <div class="skill-card-content">
          <div class="skill-card-name">${displayName}</div>
          <div class="skill-card-subtitle">Click to view sessions</div>
        </div>
      `;
    }
    
    skillCard.addEventListener('click', () => {
      selectSkill(skill);
    });
    
    skillSelectionGrid.appendChild(skillCard);
  });

  skillSelectionContainer.style.display = 'block';
}

// Show season selection for Physical category
async function showSeasonSelection(category) {
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  const skillSelectionTitle = document.getElementById('skillSelectionTitle');
  const skillSelectionGrid = document.getElementById('skillSelectionGrid');
  
  if (!skillSelectionContainer || !skillSelectionTitle || !skillSelectionGrid) return;

  skillSelectionContainer.style.display = 'block';
  skillSelectionTitle.textContent = 'Select Season';

  // Show season selection cards
  skillSelectionGrid.innerHTML = '';
  
  const seasons = [
    { value: 'in-season', label: 'In-Season' },
    { value: 'off-season', label: 'Off-Season' }
  ];

  // Fetch season-level thumbnails (where skill is null)
  // Also check for any physical thumbnails with in-season/off-season period
  let seasonThumbnails = [];
  if (supabaseReady && supabase) {
    try {
      // First try to get thumbnails with null skill (season-level)
      const { data: nullSkillThumbnails, error: nullSkillError } = await supabase
        .from('skill_thumbnails')
        .select('*')
        .eq('category', 'physical')
        .is('skill', null)
        .in('period', ['in-season', 'off-season']);
      
      if (nullSkillError) {
        console.warn('Error fetching season thumbnails (null skill):', nullSkillError);
      } else {
        console.log('Fetched season thumbnails (null skill):', nullSkillThumbnails);
        if (nullSkillThumbnails && nullSkillThumbnails.length > 0) {
          seasonThumbnails = nullSkillThumbnails;
        }
      }
      
      // If no results, also check for any physical thumbnails with these periods
      // (in case migration wasn't run and skill has a value)
      if (seasonThumbnails.length === 0) {
        const { data: allPhysicalThumbnails, error: allError } = await supabase
          .from('skill_thumbnails')
          .select('*')
          .eq('category', 'physical')
          .in('period', ['in-season', 'off-season']);
        
        if (allError) {
          console.warn('Error fetching all physical thumbnails:', allError);
        } else {
          console.log('Fetched all physical thumbnails for seasons:', allPhysicalThumbnails);
          // Filter to only include those that look like season-level (no skill or empty skill)
          const seasonLevel = (allPhysicalThumbnails || []).filter(t => 
            !t.skill || t.skill === '' || t.skill === null
          );
          if (seasonLevel.length > 0) {
            seasonThumbnails = seasonLevel;
            console.log('Using season-level thumbnails from all results:', seasonThumbnails);
          } else {
            // Debug: Check what physical thumbnails exist
            const { data: allPhysical, error: debugError } = await supabase
              .from('skill_thumbnails')
              .select('*')
              .eq('category', 'physical');
            console.log('All physical thumbnails in database:', allPhysical);
            if (debugError) {
              console.warn('Error fetching all physical thumbnails for debug:', debugError);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching season thumbnails:', error);
    }
  }

  seasons.forEach(season => {
    const seasonCard = document.createElement('div');
    seasonCard.className = 'skill-card';
    seasonCard.dataset.season = season.value;
    
    // Get thumbnail for this season
    const thumbnail = seasonThumbnails.find(t => t.period === season.value);
    console.log(`Thumbnail for ${season.value}:`, thumbnail);
    const thumbnailUrl = thumbnail && supabase
      ? supabase.storage.from('solo-session-videos').getPublicUrl(thumbnail.thumbnail_url).data.publicUrl
      : null;
    console.log(`Thumbnail URL for ${season.value}:`, thumbnailUrl);
    
    // Check if thumbnail is a video (MP4) or image
    const isVideo = thumbnailUrl && thumbnailUrl.toLowerCase().endsWith('.mp4');
    
    // Set background style if thumbnail exists
    if (thumbnailUrl) {
      if (isVideo) {
        // For videos, use a video element as background
        seasonCard.innerHTML = `
          <video class="skill-card-background" autoplay muted loop playsinline>
            <source src="${thumbnailUrl}" type="video/mp4">
          </video>
          <div class="skill-card-overlay"></div>
          <div class="skill-card-content">
            <div class="skill-card-name">${season.label}</div>
            <div class="skill-card-subtitle">Click to view sessions</div>
          </div>
        `;
      } else {
        // For images, use CSS background-image
        seasonCard.style.backgroundImage = `url(${thumbnailUrl})`;
        seasonCard.style.backgroundSize = 'cover';
        seasonCard.style.backgroundPosition = 'center';
        seasonCard.innerHTML = `
          <div class="skill-card-overlay"></div>
          <div class="skill-card-content">
            <div class="skill-card-name">${season.label}</div>
            <div class="skill-card-subtitle">Click to view sessions</div>
          </div>
        `;
      }
    } else {
      seasonCard.innerHTML = `
        <div class="skill-card-content">
          <div class="skill-card-name">${season.label}</div>
          <div class="skill-card-subtitle">Click to view sessions</div>
        </div>
      `;
    }
    
    seasonCard.addEventListener('click', async () => {
      // Set period before loading sessions
      currentPeriod = season.value;
      // Hide skill selection and load all sessions for this season
      hideSkillSelection();
      // Pass period directly to avoid getCurrentPeriod() override
      await loadSessionsForSkill('physical', null, null, season.value);
    });
    
    skillSelectionGrid.appendChild(seasonCard);
  });
}

// Show skill selection for Physical after season is selected
async function showPhysicalSkillSelection() {
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  const skillSelectionTitle = document.getElementById('skillSelectionTitle');
  const skillSelectionGrid = document.getElementById('skillSelectionGrid');
  
  if (!skillSelectionContainer || !skillSelectionTitle || !skillSelectionGrid) return;

  skillSelectionTitle.textContent = 'Select Physical Skill';

  // Get physical skills (same across all periods)
  const skills = getSkillsForPeriodAndCategory('build-out', 'physical');
  
  await renderSkillCards(skills, skillSelectionGrid, skillSelectionContainer);
}

// Hide skill selection UI
function hideSkillSelection() {
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  const videoFeed = document.getElementById('soloVideoFeed');
  
  if (skillSelectionContainer) {
    skillSelectionContainer.style.display = 'none';
  }
  
  if (videoFeed) {
    videoFeed.style.display = 'flex';
  }
  
  selectedSkill = null;
  selectedSubSkill = null;
}

// Select a skill and load sessions
async function selectSkill(skill) {
  selectedSkill = skill;
  
  // Hide skill selection and video feed, show drills container
  const skillSelectionContainer = document.getElementById('skillSelectionContainer');
  if (skillSelectionContainer) {
    skillSelectionContainer.style.display = 'none';
  }
  const videoFeed = document.getElementById('soloVideoFeed');
  if (videoFeed) {
    videoFeed.style.display = 'none';
  }
  
  // Load sessions directly (will be grouped by sub-skill in renderSessionHeroes)
  await loadSessionsForSkill(selectedCategory, skill);
}

// Show sub-skill selection
function showSubSkillSelection(skill, subSkills) {
  const skillSelectionTitle = document.getElementById('skillSelectionTitle');
  const skillSelectionGrid = document.getElementById('skillSelectionGrid');
  
  if (!skillSelectionTitle || !skillSelectionGrid) return;

  // Update title
  const skillDisplayName = skill.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  skillSelectionTitle.textContent = `Select ${skillDisplayName} Sub-Skill`;

  // Render sub-skill cards
  skillSelectionGrid.innerHTML = '';
  
  subSkills.forEach(subSkill => {
    const subSkillCard = document.createElement('div');
    subSkillCard.className = 'skill-card';
    subSkillCard.dataset.subSkill = subSkill;
    
    // Format sub-skill name for display
    const displayName = subSkill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    subSkillCard.innerHTML = `
      <div class="skill-card-content">
        <div class="skill-card-name">${displayName}</div>
        <div class="skill-card-subtitle">Click to view sessions</div>
      </div>
    `;
    
    subSkillCard.addEventListener('click', async () => {
      selectedSubSkill = subSkill;
      const skillSelectionContainer = document.getElementById('skillSelectionContainer');
      if (skillSelectionContainer) {
        skillSelectionContainer.style.display = 'none';
      }
      const videoFeed = document.getElementById('soloVideoFeed');
      if (videoFeed) {
        videoFeed.style.display = 'none';
      }
      await loadSessionsForSkill(selectedCategory, skill, subSkill);
    });
    
    skillSelectionGrid.appendChild(subSkillCard);
  });
}

// Load videos based on selected tab
async function loadVideosForTab(tabName) {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready');
    return;
  }

  const videoFeed = document.getElementById('soloVideoFeed');
  if (!videoFeed) return;

  // Clear existing videos
  videoFeed.innerHTML = '';
  videoElements = [];
  currentVideos = [];

  try {
    let query = supabase
      .from('solo_session_videos')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    // Filter based on tab
    if (tabName === 'start-here') {
      // Start Here: Show curated/featured videos (exclude tactical videos)
      // Tactical videos should only appear in the Tactical tab
      query = query.neq('category', 'tactical').limit(10);
    } else if (tabName === 'tactical') {
      // Tactical: Show videos from current period with category 'tactical'
      // Only show videos where skill is null (tactical videos, not drill videos)
      currentPeriod = await getCurrentPeriod();
      query = query.eq('category', 'tactical').is('skill', null);
      if (currentPeriod && currentPeriod !== 'all') {
        query = query.or(`period.eq.${currentPeriod},period.eq.all`);
      } else {
        query = query.eq('period', 'all');
      }
    } else {
      // Technical, Physical, Mental: Filter by category
      query = query.eq('category', tabName);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('Error loading videos:', error);
      showPlaceholder(videoFeed, 'Error loading videos');
      return;
    }

    if (!videos || videos.length === 0) {
      showPlaceholder(videoFeed, 'No videos available yet');
      return;
    }

    currentVideos = videos;
    if (videoFeed) {
      videoFeed.style.display = 'flex';
    }
    renderVideos(videos, videoFeed);

  } catch (error) {
    console.error('Error loading videos:', error);
    showPlaceholder(videoFeed, 'Error loading videos');
  }
}

// Load sessions for a specific skill
async function loadSessionsForSkill(category, skill, subSkill = null, overridePeriod = null) {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready');
    return;
  }

  const videoFeed = document.getElementById('soloVideoFeed');
  const drillsContainer = document.getElementById('drillsContainer');
  
  if (!drillsContainer) {
    console.error('Drills container not found');
    return;
  }

  // Hide video feed, show drills container
  if (videoFeed) {
    videoFeed.style.display = 'none';
  }
  drillsContainer.style.display = 'block';

  // Clear existing content
  // Clear container completely before loading new content
  if (drillsContainer) {
    drillsContainer.innerHTML = '';
    drillsContainer.style.display = 'block';
  }
  videoElements = [];
  currentVideos = [];

  try {
    // Use overridePeriod if provided (for physical season selection), otherwise get current period
    if (overridePeriod) {
      currentPeriod = overridePeriod;
    } else {
      currentPeriod = await getCurrentPeriod();
    }
    
    if (!currentPeriod) {
      drillsContainer.innerHTML = '<p>Unable to determine current curriculum period</p>';
      return;
    }

    // Load solo_sessions for this skill
    // First try with skill filter, then fallback to period-only if no results
    let query = supabase
      .from('solo_sessions')
      .select(`
        *,
        warm_up_video:solo_session_videos!warm_up_video_id(*),
        finishing_video:solo_session_videos!finishing_or_passing_video_id(*)
      `)
      .eq('category', category)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Handle period filtering
    if (category === 'tactical' || category === 'technical' || category === 'mental') {
      // For tactical, technical, and mental, allow "all" period or match current period
      if (currentPeriod) {
        query = query.or(`period.eq.all,period.eq.${currentPeriod}`);
      }
    } else if (category === 'physical') {
      // For physical, period is in-season/off-season (handled by currentPeriod)
      if (currentPeriod && (currentPeriod === 'in-season' || currentPeriod === 'off-season')) {
        query = query.eq('period', currentPeriod);
      }
    } else {
      // For technical/mental, filter by period
      if (currentPeriod) {
        query = query.eq('period', currentPeriod);
      }
    }

    // Try to filter by skill first
    if (skill) {
      query = query.eq('skill', skill);
    }

    if (subSkill) {
      query = query.eq('sub_skill', subSkill);
    }

    let { data: sessions, error } = await query;

    if (error) {
      console.error('Error loading sessions:', error);
      console.error('Query details:', { category, skill, subSkill, currentPeriod });
      drillsContainer.innerHTML = '<p>Error loading sessions</p>';
      return;
    }

    console.log('Sessions query result (with skill filter):', { 
      category, 
      skill, 
      subSkill, 
      currentPeriod, 
      sessionsCount: sessions?.length || 0,
      sessions: sessions 
    });

    // If no sessions found and we filtered by skill, try fallback:
    // Check sessions without skill filter and match by video skills
    if ((!sessions || sessions.length === 0) && skill) {
      console.log('No sessions found with skill filter, trying fallback query...');
      
      // Build fallback query without skill filter
      let fallbackQuery = supabase
        .from('solo_sessions')
        .select(`
          *,
          warm_up_video:solo_session_videos!warm_up_video_id(*),
          finishing_video:solo_session_videos!finishing_or_passing_video_id(*)
        `)
        .eq('category', category)
        .eq('is_active', true)
        .is('skill', null) // Sessions without skill field (created before fix)
        .order('created_at', { ascending: false });

      // Apply period filter
      if (category === 'tactical' || category === 'technical' || category === 'mental') {
        if (currentPeriod) {
          fallbackQuery = fallbackQuery.or(`period.eq.all,period.eq.${currentPeriod}`);
        }
      } else if (category === 'physical') {
        if (currentPeriod && (currentPeriod === 'in-season' || currentPeriod === 'off-season')) {
          fallbackQuery = fallbackQuery.eq('period', currentPeriod);
        }
      } else {
        if (currentPeriod) {
          fallbackQuery = fallbackQuery.eq('period', currentPeriod);
        }
      }

      const { data: fallbackSessions, error: fallbackError } = await fallbackQuery;
      
      if (!fallbackError && fallbackSessions && fallbackSessions.length > 0) {
        console.log('Found sessions without skill field:', fallbackSessions.length);
        
        // Filter by checking if main exercise videos match the skill
        const matchingSessions = [];
        for (const session of fallbackSessions) {
          if (session.main_exercises && Array.isArray(session.main_exercises) && session.main_exercises.length > 0) {
            const videoIds = session.main_exercises.map(ex => ex.video_id).filter(Boolean);
            if (videoIds.length > 0) {
              const { data: videos } = await supabase
                .from('solo_session_videos')
                .select('skill')
                .in('id', videoIds);
              
              // Check if any main exercise video matches the skill
              const hasMatchingSkill = videos?.some(video => video.skill === skill);
              if (hasMatchingSkill) {
                matchingSessions.push(session);
              }
            }
          }
        }
        
        if (matchingSessions.length > 0) {
          console.log('Found matching sessions by checking video skills:', matchingSessions.length);
          sessions = matchingSessions;
        }
      }
    }

    if (!sessions || sessions.length === 0) {
      const skillDisplayName = skill ? skill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') : 'Physical';
      drillsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <i class="bx bx-football" style="font-size: 48px; color: var(--muted); margin-bottom: 16px;"></i>
          <h3 style="color: var(--text); margin-bottom: 8px;">No Sessions Available</h3>
          <p style="color: var(--muted);">No ${skillDisplayName}${subSkill ? ` - ${subSkill.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}` : ''} sessions have been created yet.</p>
          <p style="color: var(--muted); font-size: 14px; margin-top: 8px;">Coaches can create sessions in the Solo Create section.</p>
        </div>
      `;
      return;
    }

    // If subSkill is specified, filter to only that sub-skill
    // Otherwise, show all sessions (grouped by sub_skill)
    let filteredSessions = sessions;
    if (subSkill) {
      filteredSessions = sessions.filter(s => s.sub_skill === subSkill);
    }

    // For physical sessions without skill filter, store all sessions for filtering
    if (category === 'physical' && !skill) {
      allPhysicalSessions = filteredSessions; // Store all sessions for filtering
    } else {
      allPhysicalSessions = []; // Clear if not physical or skill is selected
    }

    if (filteredSessions.length === 0) {
      const skillDisplayName = skill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      const subSkillDisplayName = subSkill 
        ? subSkill.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        : '';
      drillsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <i class="bx bx-football" style="font-size: 48px; color: var(--muted); margin-bottom: 16px;"></i>
          <h3 style="color: var(--text); margin-bottom: 8px;">No Sessions Available</h3>
          <p style="color: var(--muted);">No ${skillDisplayName}${subSkillDisplayName ? ` - ${subSkillDisplayName}` : ''} sessions have been created yet.</p>
          <p style="color: var(--muted); font-size: 14px; margin-top: 8px;">Coaches can create sessions in the Solo Create section.</p>
        </div>
      `;
      return;
    }

    // Group sessions by sub_skill for display
    // If session doesn't have sub_skill, try to determine it from main exercise videos
    const sessionsBySubSkill = {};
    for (const session of filteredSessions) {
      let sessionSubSkill = session.sub_skill;
      
      // If session doesn't have sub_skill, try to get it from main exercise videos
      if (!sessionSubSkill && session.main_exercises && session.main_exercises.length > 0) {
        const firstVideoId = session.main_exercises[0].video_id;
        if (firstVideoId) {
          const { data: video } = await supabase
            .from('solo_session_videos')
            .select('sub_skill, title, keywords, video_url')
            .eq('id', firstVideoId)
            .single();
          
          if (video) {
            // First try the video's sub_skill field
            if (video.sub_skill) {
              sessionSubSkill = video.sub_skill;
              console.log('Determined sub-skill from video field:', sessionSubSkill);
            } else {
              // Try to determine from title/keywords/video_url
              const searchText = `${video.title || ''} ${video.keywords?.join(' ') || ''} ${video.video_url || ''}`.toLowerCase();
              
              // Check for escape-moves sub-skills
              if (searchText.includes('fake-shot') || searchText.includes('fake-shots')) {
                sessionSubSkill = 'fake-shots';
                console.log('Determined sub-skill from title/keywords: fake-shots');
              } else if (searchText.includes('escaping-side-pressure') || searchText.includes('side-pressure') || 
                         searchText.includes('roll-cut') || searchText.includes('roll-chop') ||
                         searchText.includes('sole-of-foot')) {
                sessionSubSkill = 'escaping-side-pressure';
                console.log('Determined sub-skill from title/keywords: escaping-side-pressure');
              } else if (searchText.includes('fancy-escape') || searchText.includes('fancy')) {
                sessionSubSkill = 'fancy-escape';
                console.log('Determined sub-skill from title/keywords: fancy-escape');
              }
            }
          }
        }
      }
      
      // Fallback to 'general' if still no sub-skill
      sessionSubSkill = sessionSubSkill || 'general';
      
      console.log('Grouping session:', {
        sessionId: session.id,
        sessionSubSkill: session.sub_skill,
        determinedSubSkill: sessionSubSkill,
        groupedAs: sessionSubSkill
      });
      
      if (!sessionsBySubSkill[sessionSubSkill]) {
        sessionsBySubSkill[sessionSubSkill] = [];
      }
      sessionsBySubSkill[sessionSubSkill].push(session);
    }
    
    console.log('Sessions grouped by sub-skill:', Object.keys(sessionsBySubSkill));

    // If sub-skill specified, show all sessions for that sub-skill
    // Otherwise, show one hero per sub-skill group (one hero per sub-skill)
    if (subSkill) {
      // Show all sessions for the selected sub-skill
      await renderSessionHeroes(sessionsBySubSkill, skill, drillsContainer, subSkill);
    } else {
      // Show one hero per sub-skill group
      const heroesToShow = [];
      for (const [subSkillKey, subSkillSessions] of Object.entries(sessionsBySubSkill)) {
        if (subSkillSessions.length > 0) {
          heroesToShow.push({ subSkillKey, sessions: subSkillSessions });
        }
      }
      await renderSessionHeroesBySubSkill(heroesToShow, skill, drillsContainer);
    }

  } catch (error) {
    console.error('Error loading sessions:', error);
    drillsContainer.innerHTML = '<p>Error loading sessions</p>';
  }
}

// Calculate total session duration
function calculateSessionDuration(session) {
  let totalMinutes = 0;
  
  // Warm-up duration (default 5 minutes)
  totalMinutes += 5;
  
  // Main exercises duration (estimated based on reps: 2-5 seconds per rep, average 3.5 seconds)
  // Formula: (reps * 3.5 seconds) * sets + rest_time * (sets - 1) for each exercise
  if (session.main_exercises && Array.isArray(session.main_exercises)) {
    session.main_exercises.forEach(ex => {
      const reps = ex.reps || 10; // Default 10 reps if not specified
      const sets = ex.sets || 1;
      const restTime = ex.rest_time || 1; // Rest time in minutes
      
      // Each rep takes 2-5 seconds (average 3.5 seconds)
      const secondsPerRep = 3.5;
      // Time for one set = reps * 3.5 seconds (convert to minutes)
      const timePerSetMinutes = (reps * secondsPerRep) / 60;
      // Total exercise time = time per set * number of sets
      const totalExerciseTime = timePerSetMinutes * sets;
      // Rest time = rest_time * (sets - 1) since no rest after last set
      const totalRestTime = restTime * (sets - 1);
      
      // Add exercise time and rest time
      totalMinutes += totalExerciseTime + totalRestTime;
    });
  }
  
  // Finishing/Passing duration (default 5 minutes)
  totalMinutes += 5;
  
  return Math.ceil(totalMinutes); // Return in minutes
}

// Render session heroes grouped by sub_skill (one hero per sub-skill)
async function renderSessionHeroesBySubSkill(subSkillGroups, skill, container) {
  const skillDisplayName = skill ? skill.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : 'Physical';
  
  // Add filter dropdown for physical sessions without skill filter
  if (!skill && allPhysicalSessions.length > 0) {
    addPhysicalSkillFilter(container);
  }
  
  const heroesHTML = [];
  
  // Show one hero per sub-skill group
  for (const { subSkillKey, sessions } of subSkillGroups) {
    const session = sessions[0]; // Use first session for preview
    // Ensure we have full session data with videos
    const fullSession = await getFullSessionData(session.id);
    if (fullSession) {
      // Debug: Log the sub-skill values
      console.log('Creating hero for session:', {
        sessionId: fullSession.id,
        sessionSubSkill: fullSession.sub_skill,
        groupedSubSkillKey: subSkillKey,
        willUse: subSkillKey !== 'general' ? subSkillKey : (fullSession.sub_skill || subSkillKey)
      });
      
      // Use the grouped subSkillKey as the primary source (it's the key from the curriculum backbone)
      // This ensures we show the correct sub-skill name even if the session's sub_skill field is null
      const heroHTML = await createSessionHeroHTML(fullSession, subSkillKey, skillDisplayName);
      heroesHTML.push(heroHTML);
    }
  }
  
  container.innerHTML = heroesHTML.join('');
  
  // Add filter dropdown AFTER setting innerHTML (for physical sessions without skill filter)
  if (!skill && allPhysicalSessions.length > 0) {
    addPhysicalSkillFilter(container);
  }
  
  // Setup click handlers for session heroes
  const heroElements = container.querySelectorAll('.session-hero');
  heroElements.forEach(hero => {
    hero.addEventListener('click', async () => {
      const sessionId = hero.dataset.sessionId;
      await expandSessionHero(sessionId, container);
    });
  });
}

// Render session heroes grouped by sub_skill (for when a specific sub-skill is selected)
async function renderSessionHeroes(sessionsBySubSkill, skill, container, selectedSubSkill = null) {
  const skillDisplayName = skill ? skill.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ') : 'Physical';
  
  // Clear container first to prevent duplicates
  if (container) {
    container.innerHTML = '';
  }
  
  // Add filter dropdown for physical sessions without skill filter
  if (!skill && allPhysicalSessions.length > 0) {
    addPhysicalSkillFilter(container);
  }
  
  const heroesHTML = [];
  
  // Show all sessions for the selected sub-skill
  const subSkillSessions = sessionsBySubSkill[selectedSubSkill] || [];
  for (const session of subSkillSessions) {
    // Ensure we have full session data with videos
    const fullSession = await getFullSessionData(session.id);
    if (fullSession) {
      const heroHTML = await createSessionHeroHTML(fullSession, selectedSubSkill, skillDisplayName);
      heroesHTML.push(heroHTML);
    }
  }
  
  // Set innerHTML once with all heroes
  if (container) {
    container.innerHTML = heroesHTML.join('');
    
    // Add filter dropdown AFTER setting innerHTML (for physical sessions without skill filter)
    if (!skill && allPhysicalSessions.length > 0) {
      addPhysicalSkillFilter(container);
    }
  }
  
  // Setup click handlers for session heroes
  const heroElements = container.querySelectorAll('.session-hero');
  heroElements.forEach(hero => {
    hero.addEventListener('click', async () => {
      const sessionId = hero.dataset.sessionId;
      await expandSessionHero(sessionId, container);
    });
  });
}

// Get full session data with video relationships
async function getFullSessionData(sessionId) {
  const { data: session, error } = await supabase
    .from('solo_sessions')
    .select(`
      *,
      warm_up_video:solo_session_videos!warm_up_video_id(*),
      finishing_video:solo_session_videos!finishing_or_passing_video_id(*)
    `)
    .eq('id', sessionId)
    .single();
  
  if (error || !session) {
    console.error('Error loading full session data:', error);
    return null;
  }
  
  return session;
}

// Create HTML for a single session hero
async function createSessionHeroHTML(session, subSkillKey, skillDisplayName) {
  // Get preview video (first main exercise video or warm-up video)
  let previewVideo = null;
  if (session.main_exercises && session.main_exercises.length > 0) {
    const firstVideoId = session.main_exercises[0].video_id;
    if (firstVideoId) {
      const { data: video } = await supabase
        .from('solo_session_videos')
        .select('*')
        .eq('id', firstVideoId)
        .single();
      if (video) previewVideo = video;
    }
  }
  
  // Fallback to warm-up video if no main exercise video
  if (!previewVideo && session.warm_up_video) {
    previewVideo = session.warm_up_video;
  }
  
  // Debug: Log what we're working with
  console.log('createSessionHeroHTML called with:', {
    sessionId: session.id,
    sessionSkill: session.skill,
    sessionSubSkill: session.sub_skill,
    subSkillKey: subSkillKey,
    skillDisplayName: skillDisplayName
  });
  
  // Use the session's skill field if available, otherwise fall back to passed skillDisplayName
  const actualSkill = session.skill || null;
  const actualSkillDisplayName = actualSkill 
    ? actualSkill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    : skillDisplayName;
  
  // Use the provided subSkillKey (from grouping) as the primary source
  // This ensures we show the correct sub-skill name even if the session's sub_skill field is null
  // Only fall back to session.sub_skill if subSkillKey is 'general' or invalid
  const actualSubSkill = (subSkillKey && subSkillKey !== 'general' && subSkillKey !== null) 
    ? subSkillKey 
    : (session.sub_skill && session.sub_skill !== 'general' && session.sub_skill !== null)
      ? session.sub_skill
      : null;
  
  // Format sub-skill name for display
  // Only show skill name if we truly don't have a sub-skill
  let subSkillDisplayName;
  if (actualSubSkill && actualSubSkill !== 'general' && actualSubSkill !== 'null' && actualSubSkill !== null) {
    // We have a valid sub-skill, format it
    subSkillDisplayName = actualSubSkill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    console.log('Using sub-skill name:', subSkillDisplayName);
  } else {
    // Fallback to skill name only if we truly don't have a sub-skill
    subSkillDisplayName = actualSkillDisplayName;
    console.log('Falling back to skill name:', subSkillDisplayName);
  }
  
  // Get preview image/video URL
  let previewImageUrl = null;
  let previewVideoUrl = null;
  if (previewVideo) {
    if (previewVideo.thumbnail_url) {
      // Check if thumbnail_url is a full path or just filename
      const thumbnailPath = previewVideo.thumbnail_url.startsWith('thumbnails/') 
        ? previewVideo.thumbnail_url 
        : `thumbnails/${previewVideo.thumbnail_url}`;
      previewImageUrl = supabase.storage.from('solo-session-videos').getPublicUrl(thumbnailPath).data.publicUrl;
    } else {
      // No thumbnail, use video as poster
      previewVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(previewVideo.video_url).data.publicUrl;
    }
  }
  
  return `
    <div class="session-hero" data-session-id="${session.id}" data-sub-skill="${subSkillKey}">
      ${previewImageUrl ? `
        <img class="session-hero-image" src="${previewImageUrl}" alt="Session preview">
      ` : previewVideoUrl ? `
        <video class="session-hero-video-poster" muted playsinline preload="metadata">
          <source src="${previewVideoUrl}" type="video/mp4">
        </video>
      ` : ''}
      <div class="session-hero-overlay"></div>
      <div class="session-hero-content">
        <div class="session-hero-top">
          <span class="session-hero-badge">Get Started</span>
          <span class="session-hero-subskill">${subSkillDisplayName}</span>
        </div>
        <div class="session-hero-bottom">
          <span class="session-hero-level">${(session.difficulty_level || 'beginner').charAt(0).toUpperCase() + (session.difficulty_level || 'beginner').slice(1)}</span>
          <span class="session-hero-duration">${calculateSessionDuration(session)} min</span>
        </div>
      </div>
    </div>
  `;
}

// Expand session hero to show full session
async function expandSessionHero(sessionId, container) {
  // Fetch full session data
  const { data: session, error } = await supabase
    .from('solo_sessions')
    .select(`
      *,
      warm_up_video:solo_session_videos!warm_up_video_id(*),
      finishing_video:solo_session_videos!finishing_or_passing_video_id(*)
    `)
    .eq('id', sessionId)
    .single();
  
  if (error || !session) {
    console.error('Error loading session:', error);
    return;
  }
  
  // Hide the drills container and show session detail view
  container.style.display = 'none';
  await renderSessionDetailPage(session, container);
}

// Render session detail page with draggable bottom sheet
async function renderSessionDetailPage(session, parentContainer) {
  // Create session detail container
  const detailContainer = document.createElement('div');
  detailContainer.id = 'sessionDetailContainer';
  detailContainer.className = 'session-detail-container';
  
  // Insert after parent container
  parentContainer.parentNode.insertBefore(detailContainer, parentContainer.nextSibling);
  // Get main exercises videos
  const mainExerciseVideoIds = session.main_exercises || [];
  const mainExerciseVideos = [];
  const exerciseDataMap = new Map(); // Map video_id to exercise data (including set_number)
  
  if (mainExerciseVideoIds.length > 0) {
    const videoIds = mainExerciseVideoIds.map(ex => ex.video_id).filter(Boolean);
    if (videoIds.length > 0) {
      const { data: videos } = await supabase
        .from('solo_session_videos')
        .select('*')
        .in('id', videoIds);
      
      if (videos) {
        // Store exercise data (including set_number) for each video
        mainExerciseVideoIds.forEach(ex => {
          if (ex.video_id) {
            exerciseDataMap.set(ex.video_id, ex);
          }
        });
        
        // Sort by order from main_exercises array
        const orderMap = new Map();
        mainExerciseVideoIds.forEach((ex, index) => {
          orderMap.set(ex.video_id, ex.order || index + 1);
        });
        videos.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
        mainExerciseVideos.push(...videos);
      }
    }
  }

  // Format skill name for display
  const skillDisplayName = (session.skill || '').split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Category description (will be provided in future)
  const categoryDescriptions = {
    'technical': 'Technical training focuses on improving your ball control, first touch, and technical skills.',
    'physical': 'Physical training enhances your strength, speed, and conditioning.',
    'mental': 'Mental training develops focus, confidence, and game awareness.'
  };

  // Get preview image/video for top section (first main exercise or warm-up)
  let previewVideo = null;
  let previewImageUrl = null;
  let previewVideoUrl = null;
  if (mainExerciseVideos.length > 0) {
    previewVideo = mainExerciseVideos[0];
  } else if (session.warm_up_video) {
    previewVideo = session.warm_up_video;
  }
  
  if (previewVideo) {
    // Use thumbnail if available, otherwise use video element
    if (previewVideo.thumbnail_url) {
      // Check if thumbnail_url is a full path or just filename
      const thumbnailPath = previewVideo.thumbnail_url.startsWith('thumbnails/') 
        ? previewVideo.thumbnail_url 
        : `thumbnails/${previewVideo.thumbnail_url}`;
      previewImageUrl = supabase.storage.from('solo-session-videos').getPublicUrl(thumbnailPath).data.publicUrl;
    } else {
      // No thumbnail, will use video element with preload to show first frame
      previewVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(previewVideo.video_url).data.publicUrl;
    }
  }
  
  // Format sub-skill name for display
  const subSkillDisplayName = session.sub_skill 
    ? session.sub_skill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    : skillDisplayName;

  // Render session detail page with draggable bottom sheet
  const sessionHTML = `
    <!-- Session Detail Page -->
    <div class="session-detail-page">
      <!-- Back Button -->
      <button class="session-detail-back" type="button" aria-label="Back">
        <i class="bx bx-arrow-back"></i>
      </button>
      
      <!-- Video/Image Background -->
      <div class="session-video-background">
        ${previewImageUrl ? `
          <img class="session-background-image" id="sessionMainImage" src="${previewImageUrl}" alt="Session background" style="display: block;">
          <video class="session-background-video" id="sessionMainVideo" style="display: none;" muted playsinline>
          </video>
        ` : previewVideoUrl ? `
          <video class="session-background-video" id="sessionMainVideo" muted playsinline preload="metadata" style="display: block;">
            <source src="${previewVideoUrl}" type="video/mp4">
          </video>
          <img class="session-background-image" id="sessionMainImage" style="display: none;" alt="Session background">
        ` : ''}
        <!-- Add to Schedule Button -->
        <button class="session-add-to-schedule-btn" id="sessionAddToScheduleBtn" type="button" aria-label="Add to Schedule">
          <i class="bx bx-plus"></i>
          <span class="session-add-tooltip" id="sessionAddTooltip">Add this session to your schedule</span>
        </button>
        <!-- Glass Play Button Overlay -->
        <button class="session-glass-play-btn" id="sessionGlassPlayBtn" type="button" aria-label="Start Session">
          <i class="bx bx-play"></i>
        </button>
        <!-- Warm-up Video Player (hidden initially) -->
        <div class="session-warmup-video-container" id="sessionWarmupVideoContainer" style="display: none;">
          <video class="session-warmup-video" id="sessionWarmupVideo" muted playsinline>
          </video>
          <button class="session-warmup-play-pause-btn" id="sessionWarmupPlayPauseBtn" type="button" aria-label="Play/Pause">
            <i class="bx bx-play"></i>
          </button>
        </div>
        <button class="session-video-play-pause-btn" id="sessionVideoPlayPauseBtn" type="button" aria-label="Play/Pause" style="display: none;">
          <i class="bx bx-play"></i>
        </button>
      </div>
      
      <!-- Draggable Bottom Sheet -->
      <div class="session-bottom-sheet" id="sessionBottomSheet">
        <div class="session-bottom-sheet-handle"></div>
        <button class="session-close-btn" type="button" aria-label="Close to minimal view" id="sessionCloseBtn">
          <i class="bx bx-x"></i>
        </button>
        <div class="session-bottom-sheet-content">
          <!-- Minimal View: Just meta in oval (Level 1) -->
          <div class="session-meta-oval">
            <div class="session-bottom-sheet-handle"></div>
            <div class="session-meta-item">
              <div class="session-meta">
                <i class="bx bx-bar-chart"></i>
                <span>${(session.difficulty_level || 'beginner').charAt(0).toUpperCase() + (session.difficulty_level || 'beginner').slice(1)}</span>
              </div>
              <div class="session-meta">
                <i class="bx bx-time"></i>
                <span>${calculateSessionDuration(session)} min</span>
              </div>
            </div>
          </div>
          
          <!-- Full Content View (Level 2 & 3) -->
          <div class="session-full-content" style="display: none;">
            <div class="session-category-badge">${(session.category || 'TECHNICAL').toUpperCase()}</div>
            <h1 class="session-title">${subSkillDisplayName}</h1>
            <div class="session-meta">
              <div class="session-meta-item">
                <i class="bx bx-bar-chart"></i>
                <span>${(session.difficulty_level || 'beginner').charAt(0).toUpperCase() + (session.difficulty_level || 'beginner').slice(1)}</span>
              </div>
              <div class="session-meta-item">
                <i class="bx bx-time"></i>
                <span>${calculateSessionDuration(session)} min</span>
              </div>
            </div>

        ${session.category === 'physical' 
          ? (() => {
              // Group exercises by set_number for physical sessions
              const setsMap = new Map();
              
              mainExerciseVideos.forEach(video => {
                const exerciseData = exerciseDataMap.get(video.id);
                const setNumber = exerciseData?.set_number || 1;
                
                if (!setsMap.has(setNumber)) {
                  setsMap.set(setNumber, []);
                }
                setsMap.get(setNumber).push({ video, exerciseData });
              });
              
              // Sort sets by set_number
              const sortedSets = Array.from(setsMap.entries()).sort((a, b) => a[0] - b[0]);
              
              return sortedSets.map(([setNumber, exercises]) => `
                <div class="drill-section" data-section="set-${setNumber}">
                  <div class="drill-section-header" data-expandable="true">
                    <div class="drill-section-title">
                      <i class="bx bx-chevron-down expand-icon"></i>
                      <span>Set ${setNumber}</span>
                    </div>
                  </div>
                  <div class="drill-section-content" style="display: none;">
                    ${exercises.length > 0
                      ? exercises.map(({ video, exerciseData }) => renderDrillItem(video, 'main', exerciseData)).join('')
                      : '<p class="no-drills">No drills available</p>'}
                  </div>
                </div>
              `).join('');
            })()
          : `
        <!-- Warm-Up Section -->
    <div class="drill-section" data-section="warm-up">
      <div class="drill-section-header" data-expandable="true">
        <div class="drill-section-title">
          <i class="bx bx-chevron-down expand-icon"></i>
          <span>Warm-Ups</span>
        </div>
      </div>
      <div class="drill-section-content" style="display: none;">
        ${session.warm_up_video ? renderDrillItem(session.warm_up_video, 'warm-up') : '<p class="no-drills">No warm-up drill available</p>'}
      </div>
    </div>

    <!-- Main Exercises Section -->
    <div class="drill-section" data-section="main-exercises">
      <div class="drill-section-header" data-expandable="true">
        <div class="drill-section-title">
          <i class="bx bx-chevron-down expand-icon"></i>
          <span>Main Drills</span>
        </div>
      </div>
      <div class="drill-section-content" style="display: none;">
        ${mainExerciseVideos.length > 0 
          ? mainExerciseVideos.map((video, index) => {
              // Find corresponding exercise data from main_exercises array
              const exerciseData = exerciseDataMap.get(video.id);
              return renderDrillItem(video, 'main', exerciseData);
            }).join('')
          : '<p class="no-drills">No main drills available</p>'}
      </div>
    </div>

        <!-- Finishing/Passing Section -->
        <div class="drill-section" data-section="finishing-passing">
          <div class="drill-section-header" data-expandable="true">
            <div class="drill-section-title">
              <i class="bx bx-chevron-down expand-icon"></i>
              <span>${session.finishing_video ? 'Finishing' : 'Passing'}</span>
            </div>
          </div>
          <div class="drill-section-content" style="display: none;">
            ${session.finishing_video 
              ? renderDrillItem(session.finishing_video, 'finishing') 
              : '<p class="no-drills">No finishing/passing drill available</p>'}
          </div>
        </div>
          `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Clear and set content
  detailContainer.innerHTML = sessionHTML;
  
  // Setup session detail page functionality
  setupSessionDetailPage(detailContainer, previewImageUrl, mainExerciseVideos, session, parentContainer, session.warm_up_video);
  
  // Setup expand/collapse functionality
  setTimeout(() => {
    setupDrillSections();
  }, 100);
}

// Setup session detail page with draggable bottom sheet
function setupSessionDetailPage(container, initialImageUrl, allVideos, session, parentContainer, warmUpVideo) {
  const backBtn = container.querySelector('.session-detail-back');
  const bottomSheet = container.querySelector('#sessionBottomSheet');
  const mainImage = container.querySelector('#sessionMainImage');
  const mainVideo = container.querySelector('#sessionMainVideo');
  const playPauseBtn = container.querySelector('#sessionVideoPlayPauseBtn');
  const glassPlayBtn = container.querySelector('#sessionGlassPlayBtn');
  const addToScheduleBtn = container.querySelector('#sessionAddToScheduleBtn');
  const addTooltip = container.querySelector('#sessionAddTooltip');
  const warmupVideoContainer = container.querySelector('#sessionWarmupVideoContainer');
  const warmupVideo = container.querySelector('#sessionWarmupVideo');
  const warmupPlayPauseBtn = container.querySelector('#sessionWarmupPlayPauseBtn');
  const handle = container.querySelector('.session-bottom-sheet-handle');
  const closeBtn = container.querySelector('#sessionCloseBtn');
  const sheetContent = container.querySelector('.session-bottom-sheet-content');
  
  // Show tooltip for 5 seconds on page load
  if (addTooltip) {
    addTooltip.style.opacity = '1';
    setTimeout(() => {
      if (addTooltip) {
        addTooltip.style.opacity = '0';
      }
    }, 5000);
  }
  
  // Add to schedule button
  if (addToScheduleBtn) {
    addToScheduleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showScheduleSoloSessionModal(session);
    });
  }
  
  // Back button - return to drills container
  backBtn.addEventListener('click', () => {
    container.remove();
    parentContainer.style.display = 'block';
  });
  
  // Close button functionality - collapse back to Level 1 (oval)
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      snapToLevel(1);
    });
  }

  // Glass play button - show warm-up video
  if (glassPlayBtn) {
    // Only show glass button if there's a background video/image AND a warm-up video
    if (warmUpVideo && (mainVideo || mainImage)) {
      glassPlayBtn.style.display = 'flex';
      
      glassPlayBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Hide glass play button
        glassPlayBtn.style.display = 'none';
        
        // Hide background video/image
        if (mainVideo) mainVideo.style.display = 'none';
        if (mainImage) mainImage.style.display = 'none';
        
        // Show warm-up video container
        if (warmupVideoContainer) {
          warmupVideoContainer.style.display = 'block';
          
          // Get warm-up video URL
          let warmupVideoUrl = null;
          if (warmUpVideo.video_url) {
            warmupVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(warmUpVideo.video_url).data.publicUrl;
          }
          
          if (warmupVideoUrl && warmupVideo) {
            warmupVideo.src = warmupVideoUrl;
            warmupVideo.load();
            
            // Auto-play warm-up video
            warmupVideo.play().catch(err => {
              console.error('Error auto-playing warm-up video:', err);
            });
          }
        }
      });
    } else {
      // No warm-up video available, hide glass button
      glassPlayBtn.style.display = 'none';
    }
  }

  // Warm-up video play/pause button
  if (warmupPlayPauseBtn && warmupVideo) {
    const updateWarmupPlayPauseButton = () => {
      const icon = warmupPlayPauseBtn.querySelector('i');
      if (warmupVideo.paused) {
        icon.className = 'bx bx-play';
      } else {
        icon.className = 'bx bx-pause';
      }
    };
    
    warmupVideo.addEventListener('play', updateWarmupPlayPauseButton);
    warmupVideo.addEventListener('pause', updateWarmupPlayPauseButton);
    
    warmupPlayPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (warmupVideo.paused) {
        warmupVideo.play().catch(err => {
          console.error('Error playing warm-up video:', err);
        });
      } else {
        warmupVideo.pause();
      }
    });
  }
  
  // Play/Pause button for background video
  if (playPauseBtn && mainVideo) {
    // Function to update button visibility and icon
    const updatePlayPauseButton = () => {
      if (mainVideo.style.display !== 'none' && mainVideo.src) {
        playPauseBtn.style.display = 'flex';
        const icon = playPauseBtn.querySelector('i');
        if (mainVideo.paused) {
          icon.className = 'bx bx-play';
        } else {
          icon.className = 'bx bx-pause';
        }
      } else {
        playPauseBtn.style.display = 'none';
      }
    };
    
    // Update button on video state changes
    mainVideo.addEventListener('play', updatePlayPauseButton);
    mainVideo.addEventListener('pause', updatePlayPauseButton);
    mainVideo.addEventListener('loadeddata', updatePlayPauseButton);
    
    // Toggle play/pause on button click
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mainVideo.paused) {
        mainVideo.play().catch(err => {
          console.error('Error playing video:', err);
        });
      } else {
        mainVideo.pause();
      }
    });
    
    // Initial state check
    setTimeout(updatePlayPauseButton, 100);
  }
  
  // Three-level bottom sheet system
  // Level 1: Minimal (just meta in oval) - ~100px
  // Level 2: Medium (meta + title + description) - ~40% of viewport
  // Level 3: Full (all content) - ~90% of viewport
  const LEVELS = {
    MINIMAL: 100, // pixels
    MEDIUM: Math.floor(window.innerHeight * 0.4), // 40% of viewport
    FULL: Math.floor(window.innerHeight * 0.9) // 90% of viewport
  };
  
  let currentLevel = 1; // Start at minimal
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;
  
  // Set initial height to minimal
  bottomSheet.style.height = `${LEVELS.MINIMAL}px`;
  bottomSheet.dataset.level = '1';
  
  // Function to snap to a specific level
  function snapToLevel(level) {
    currentLevel = level;
    const targetHeight = level === 1 ? LEVELS.MINIMAL : level === 2 ? LEVELS.MEDIUM : LEVELS.FULL;
    bottomSheet.style.height = `${targetHeight}px`;
    bottomSheet.dataset.level = level.toString();
    
    // Update content visibility based on level
    if (sheetContent) {
      const metaOval = sheetContent.querySelector('.session-meta-oval');
      const fullContent = sheetContent.querySelector('.session-full-content');
      
      if (level === 1) {
        // Level 1: Show only meta in oval
        if (metaOval) metaOval.style.display = 'flex';
        if (fullContent) fullContent.style.display = 'none';
      } else {
        // Level 2 & 3: Show full content
        if (metaOval) metaOval.style.display = 'none';
        if (fullContent) fullContent.style.display = 'block';
      }
    }
  }
  
  // Initialize visibility
  snapToLevel(1);
  
  // Function to determine which level to snap to based on current height
  function getSnapLevel(currentHeight) {
    const midPoint1 = (LEVELS.MINIMAL + LEVELS.MEDIUM) / 2;
    const midPoint2 = (LEVELS.MEDIUM + LEVELS.FULL) / 2;
    
    // Add some threshold to prevent flickering
    const threshold = 20;
    
    if (currentHeight < (midPoint1 - threshold)) {
      return 1;
    } else if (currentHeight < (midPoint2 - threshold)) {
      return 2;
    } else {
      return 3;
    }
  }
  
  // Track if we just dragged (to prevent click after drag)
  let hasDragged = false;
  
  // Click on bottom sheet to cycle through levels (only if not dragging)
  bottomSheet.addEventListener('click', (e) => {
    // Don't cycle if clicking on interactive elements
    if (e.target.closest('button') || 
        e.target.closest('.drill-section-header') || 
        e.target.closest('.drill-coaching-points-btn') ||
        e.target.closest('.drill-thumbnail-image') ||
        e.target.closest('.drill-thumbnail-video-poster') ||
        e.target.closest('.drill-thumbnail-overlay') ||
        e.target.closest('.session-bottom-sheet-handle')) {
      return;
    }
    
    // Don't cycle if we just finished dragging
    if (hasDragged) {
      hasDragged = false;
      return;
    }
    
    // Cycle to next level
    const nextLevel = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
    snapToLevel(nextLevel);
  });
  
  // Make oval clickable on mobile (especially iPhone)
  const metaOval = sheetContent.querySelector('.session-meta-oval');
  if (metaOval) {
    metaOval.style.cursor = 'pointer';
    metaOval.addEventListener('click', (e) => {
      // Don't trigger if clicking on the handle (handle has its own drag functionality)
      if (e.target.closest('.session-bottom-sheet-handle')) {
        return;
      }
      
      // Don't cycle if we just finished dragging
      if (hasDragged) {
        hasDragged = false;
        return;
      }
      
      // Expand to next level
      const nextLevel = currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1;
      snapToLevel(nextLevel);
      e.stopPropagation();
    });
    
    // Add visual feedback on touch
    metaOval.addEventListener('touchstart', (e) => {
      metaOval.style.opacity = '0.8';
    }, { passive: true });
    
    metaOval.addEventListener('touchend', (e) => {
      setTimeout(() => {
        metaOval.style.opacity = '1';
      }, 150);
    }, { passive: true });
  }
  
  // Draggable bottom sheet functionality
  // Get all handles (one in oval for Level 1, one outside for Level 2/3)
  const handles = container.querySelectorAll('.session-bottom-sheet-handle');
  
  // Touch events for mobile
  handles.forEach(handleEl => {
    handleEl.addEventListener('touchstart', (e) => {
      // Only prevent default if the event is cancelable
      if (e.cancelable) {
        e.preventDefault();
      }
      isDragging = true;
      startY = e.touches[0].clientY;
      startHeight = bottomSheet.offsetHeight;
      e.stopPropagation();
    }, { passive: false });
  
    handleEl.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      hasDragged = true;
      const deltaY = e.touches[0].clientY - startY;
      const newHeight = Math.max(LEVELS.MINIMAL, Math.min(LEVELS.FULL, startHeight - deltaY));
      bottomSheet.style.height = `${newHeight}px`;
      // Only prevent default if the event is cancelable
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
  
    handleEl.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const finalHeight = bottomSheet.offsetHeight;
      const snapLevel = getSnapLevel(finalHeight);
      snapToLevel(snapLevel);
      // Reset hasDragged after a short delay
      setTimeout(() => {
        hasDragged = false;
      }, 100);
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
  
    // Mouse events for desktop
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      hasDragged = true;
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(LEVELS.MINIMAL, Math.min(LEVELS.FULL, startHeight - deltaY));
      bottomSheet.style.height = `${newHeight}px`;
    };
  
    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const finalHeight = bottomSheet.offsetHeight;
      const snapLevel = getSnapLevel(finalHeight);
      snapToLevel(snapLevel);
      // Reset hasDragged after a short delay
      setTimeout(() => {
        hasDragged = false;
      }, 100);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  
    handleEl.addEventListener('mousedown', (e) => {
      isDragging = true;
      hasDragged = false;
      startY = e.clientY;
      startHeight = bottomSheet.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  });
  
  // Click drill thumbnails to play video (works for both images and video posters)
  const drillThumbnails = container.querySelectorAll('.drill-thumbnail-image, .drill-thumbnail-video-poster');
  drillThumbnails.forEach(thumbnailElement => {
    thumbnailElement.style.cursor = 'pointer';
    thumbnailElement.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      
      // Get the video URL from the drill item row's data attribute
      const drillRow = thumbnailElement.closest('.drill-item-row');
      const videoId = drillRow?.getAttribute('data-video-id');
      
      if (!videoId) return;
      
      // Fetch the video URL from the database
      supabase
        .from('solo_session_videos')
        .select('video_url')
        .eq('id', videoId)
        .single()
        .then(({ data: video }) => {
          if (video && video.video_url) {
            const videoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(video.video_url).data.publicUrl;
            
            // Check if warm-up video is currently showing
            const isWarmupShowing = warmupVideoContainer && warmupVideoContainer.style.display !== 'none';
            
            if (isWarmupShowing && warmupVideo) {
              // Update warm-up video
              warmupVideo.src = videoUrl;
              warmupVideo.load();
              warmupVideo.play().catch(err => {
                console.error('Error playing video:', err);
              });
            } else if (mainVideo && mainImage) {
              // Update background video
              mainImage.style.display = 'none';
              mainVideo.style.display = 'block';
              mainVideo.src = videoUrl;
              mainVideo.load();
              mainVideo.play().catch(err => {
                console.error('Error playing video:', err);
              });
              
              // Show play/pause button
              if (playPauseBtn) {
                playPauseBtn.style.display = 'flex';
              }
            }
          }
        });
    });
    
    // Make drill thumbnails look clickable
    thumbnailElement.addEventListener('mouseenter', () => {
      thumbnailElement.style.opacity = '0.8';
    });
    thumbnailElement.addEventListener('mouseleave', () => {
      thumbnailElement.style.opacity = '1';
    });
  });
  
  // Also make the overlay clickable
  const drillOverlays = container.querySelectorAll('.drill-thumbnail-overlay');
  drillOverlays.forEach(overlay => {
    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'pointer';
    overlay.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event from bubbling up
      
      const drillRow = overlay.closest('.drill-item-row');
      const videoId = drillRow?.getAttribute('data-video-id');
      
      if (!videoId) return;
      
      supabase
        .from('solo_session_videos')
        .select('video_url')
        .eq('id', videoId)
        .single()
        .then(({ data: video }) => {
          if (video && video.video_url) {
            const videoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(video.video_url).data.publicUrl;
            
            // Check if warm-up video is currently showing
            const isWarmupShowing = warmupVideoContainer && warmupVideoContainer.style.display !== 'none';
            
            if (isWarmupShowing && warmupVideo) {
              // Update warm-up video
              warmupVideo.src = videoUrl;
              warmupVideo.load();
              warmupVideo.play().catch(err => {
                console.error('Error playing video:', err);
              });
            } else if (mainVideo && mainImage) {
              // Update background video
              mainImage.style.display = 'none';
              mainVideo.style.display = 'block';
              mainVideo.src = videoUrl;
              mainVideo.load();
              mainVideo.play().catch(err => {
                console.error('Error playing video:', err);
              });
              
              // Show play/pause button
              if (playPauseBtn) {
                playPauseBtn.style.display = 'flex';
              }
            }
          }
        });
    });
  });
}

// Show modal to schedule solo session
async function showScheduleSoloSessionModal(session) {
  if (!supabaseReady || !supabase) {
    alert('System not ready. Please try again.');
    return;
  }

  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (!authSession || !authSession.user) {
    alert('Please log in to schedule a session.');
    return;
  }

    // Get account context for parent/player
    const { getAccountContext } = await import('../../../utils/account-context.js');
  const context = await getAccountContext();
  if (!context) {
    alert('Could not load account information.');
    return;
  }

  const playerId = context.getPlayerIdForAction();
  const parentId = context.effectiveParentId || (context.isParent ? authSession.user.id : null);

  // Create modal HTML
  const modalHTML = `
    <div class="solo-schedule-modal-overlay" id="soloScheduleModal">
      <div class="solo-schedule-modal">
        <button class="solo-schedule-modal-close" type="button" aria-label="Close">
          <i class="bx bx-x"></i>
        </button>
        <h2>Schedule Solo Session</h2>
        <p class="solo-schedule-session-title">${session.title || 'Solo Session'}</p>
        <form id="soloScheduleForm">
          <div class="form-group">
            <label for="soloScheduleDate">Date</label>
            <input type="date" id="soloScheduleDate" name="date" required min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="soloScheduleTime">Time</label>
            <input type="time" id="soloScheduleTime" name="time" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="soloScheduleCancel">Cancel</button>
            <button type="submit" class="btn-primary">Add to Schedule</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const modal = document.getElementById('soloScheduleModal');
  const form = document.getElementById('soloScheduleForm');
  const closeBtn = modal.querySelector('.solo-schedule-modal-close');
  const cancelBtn = document.getElementById('soloScheduleCancel');

  // Set default time to current time + 1 hour
  const defaultTime = new Date();
  defaultTime.setHours(defaultTime.getHours() + 1);
  const timeInput = document.getElementById('soloScheduleTime');
  timeInput.value = `${String(defaultTime.getHours()).padStart(2, '0')}:${String(defaultTime.getMinutes()).padStart(2, '0')}`;

  // Close handlers
  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dateInput = document.getElementById('soloScheduleDate');
    const timeInput = document.getElementById('soloScheduleTime');
    
    if (!dateInput.value || !timeInput.value) {
      alert('Please select both date and time.');
      return;
    }

    try {
      // Rate limiting: Check if player has already scheduled/completed a session for the same skill/sub-skill today
      // Only applies to Technical, Physical, and Mental categories (not Tactical)
      if (session.category && ['technical', 'physical', 'mental'].includes(session.category)) {
        const selectedDate = dateInput.value;
        
        // Check for existing bookings on the selected date
        const { data: existingBookings, error: checkError } = await supabase
          .from('player_solo_session_bookings')
          .select(`
            id,
            solo_session:solo_sessions(
              id,
              category,
              skill,
              sub_skill
            )
          `)
          .eq('player_id', playerId)
          .eq('scheduled_date', selectedDate)
          .in('status', ['scheduled', 'completed', 'pending_review', 'checked-in']);
        
        if (checkError) {
          console.error('Error checking existing bookings:', checkError);
        } else if (existingBookings && existingBookings.length > 0) {
          // Filter to only bookings in the same category, then check for same skill/sub-skill
          const sameCategoryBookings = existingBookings.filter(booking => {
            const existingSession = booking.solo_session;
            return existingSession && existingSession.category === session.category;
          });
          
          // Check if any existing booking has the same skill/sub-skill
          const hasSameSkill = sameCategoryBookings.some(booking => {
            const existingSession = booking.solo_session;
            if (!existingSession) return false;
            
            // Compare skill and sub_skill (both can be null)
            const sameSkill = (existingSession.skill || null) === (session.skill || null);
            const sameSubSkill = (existingSession.sub_skill || null) === (session.sub_skill || null);
            
            return sameSkill && sameSubSkill;
          });
          
          if (hasSameSkill) {
            const categoryName = session.category.charAt(0).toUpperCase() + session.category.slice(1);
            const skillName = session.skill 
              ? session.skill.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
              : 'this skill';
            alert(`You can only schedule one ${categoryName} session per skill per day. You already have a session scheduled for ${skillName} on ${selectedDate}.`);
            return;
          }
        }
      }
      
      const { error } = await supabase
        .from('player_solo_session_bookings')
        .insert({
          player_id: playerId,
          parent_id: parentId,
          solo_session_id: session.id,
          scheduled_date: dateInput.value,
          scheduled_time: timeInput.value,
          status: 'scheduled'
        });

      if (error) throw error;

      alert('Session added to your schedule!');
      closeModal();
      
      // Optionally refresh the home page if it's loaded
      const homePage = document.querySelector('.home-container');
      if (homePage) {
        const { loadReservations } = await import('../home/home.js');
        if (loadReservations) {
          loadReservations();
        }
      }
    } catch (error) {
      console.error('Error scheduling solo session:', error);
      alert(`Error: ${error.message}`);
    }
  });
}

// Setup session modal functionality (old - keeping for reference)
function setupSessionModal(modal, initialVideoUrl, allVideos, session) {
  const closeBtn = modal.querySelector('.session-modal-close');
  const fullscreenBtn = modal.querySelector('.session-modal-fullscreen');
  const mainVideo = modal.querySelector('#sessionMainVideo');
  const thumbnail = modal.querySelector('#sessionVideoThumbnail');
  const playBtn = modal.querySelector('.session-video-play-btn');
  
  // Close modal
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    if (mainVideo) {
      if (mainVideo.requestFullscreen) {
        mainVideo.requestFullscreen();
      } else if (mainVideo.webkitRequestFullscreen) {
        mainVideo.webkitRequestFullscreen();
      } else if (mainVideo.msRequestFullscreen) {
        mainVideo.msRequestFullscreen();
      }
    }
  });
  
  // Play button on thumbnail
  if (playBtn && thumbnail && mainVideo) {
    playBtn.addEventListener('click', () => {
      thumbnail.style.display = 'none';
      mainVideo.play();
    });
  }
  
  // Click drill thumbnails to update main video
  const drillThumbnails = modal.querySelectorAll('.drill-thumbnail-video');
  drillThumbnails.forEach(thumbnailVideo => {
    thumbnailVideo.addEventListener('click', () => {
      const videoSource = thumbnailVideo.querySelector('source');
      if (videoSource && mainVideo) {
        const newVideoUrl = videoSource.src;
        mainVideo.src = newVideoUrl;
        mainVideo.load();
        mainVideo.play();
        
        // Hide thumbnail if visible
        if (thumbnail) {
          thumbnail.style.display = 'none';
        }
      }
    });
  });
}

// Render individual drill item
function renderDrillItem(video, sectionType, exerciseData = null) {
  // Get public URL for video
  const { data: { publicUrl } } = supabase.storage
    .from('solo-session-videos')
    .getPublicUrl(video.video_url);

  // Get thumbnail URL if available
  let thumbnailUrl = null;
  let videoUrlForPoster = null;
  if (video.thumbnail_url) {
    // Check if thumbnail_url is a full path or just filename
    const thumbnailPath = video.thumbnail_url.startsWith('thumbnails/') 
      ? video.thumbnail_url 
      : `thumbnails/${video.thumbnail_url}`;
    thumbnailUrl = supabase.storage.from('solo-session-videos').getPublicUrl(thumbnailPath).data.publicUrl;
  } else {
    // No thumbnail, will use video as poster
    videoUrlForPoster = publicUrl;
  }

  // Get duration, rest time, reps, sets from exerciseData (for main exercises)
  const duration = exerciseData?.duration || null; // Duration in minutes
  const restTime = exerciseData?.rest_time || null; // Rest time in minutes
  const reps = exerciseData?.reps || null;
  const sets = exerciseData?.sets || null;

  return `
    <div class="drill-item-row" data-video-id="${video.id}">
      <div class="drill-thumbnail">
        ${thumbnailUrl ? `
          <img class="drill-thumbnail-image" src="${thumbnailUrl}" alt="${video.title || 'Drill thumbnail'}" style="cursor: pointer;">
        ` : videoUrlForPoster ? `
          <video class="drill-thumbnail-video-poster" muted playsinline preload="metadata" style="cursor: pointer;">
            <source src="${videoUrlForPoster}" type="video/mp4">
          </video>
        ` : `
          <div class="drill-thumbnail-placeholder" style="display: flex;">
            <i class="bx bx-video"></i>
          </div>
        `}
        <div class="drill-thumbnail-overlay">
          <span class="drill-thumbnail-text">Click Here to View</span>
        </div>
        <div class="drill-thumbnail-placeholder" style="display: none;">
          <i class="bx bx-video"></i>
        </div>
      </div>
      <div class="drill-info">
        <div class="drill-title">
          <h4>${video.title || 'Untitled Drill'}</h4>
          ${duration || restTime || reps || sets ? `
            <div class="drill-meta">
              ${duration ? `<span class="drill-meta-item"><i class="bx bx-time"></i> ${duration} min</span>` : ''}
              ${restTime ? `<span class="drill-meta-item"><i class="bx bx-pause-circle"></i> ${restTime} min rest</span>` : ''}
              ${reps ? `<span class="drill-meta-item"><i class="bx bx-repeat"></i> ${reps} reps</span>` : ''}
              ${sets ? `<span class="drill-meta-item"><i class="bx bx-layer"></i> ${sets} sets</span>` : ''}
            </div>
          ` : ''}
        </div>
        <button class="drill-coaching-points-btn" type="button" data-video-id="${video.id}" data-coaching-points="${escapeHtml(video.description || '')}">
          <i class="bx bx-note"></i>
          <span>Coaching Points</span>
        </button>
      </div>
    </div>
  `;
}

// Helper to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup drill section expand/collapse
function setupDrillSections() {
  const sectionHeaders = document.querySelectorAll('.drill-section-header[data-expandable="true"]');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.drill-section');
      const content = section.querySelector('.drill-section-content');
      const icon = header.querySelector('.expand-icon');
      
      if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.remove('bx-chevron-down');
        icon.classList.add('bx-chevron-up');
      } else {
        content.style.display = 'none';
        icon.classList.remove('bx-chevron-up');
        icon.classList.add('bx-chevron-down');
      }
    });
  });

  // Setup coaching points buttons
  const coachingPointsBtns = document.querySelectorAll('.drill-coaching-points-btn');
  coachingPointsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const coachingPoints = btn.dataset.coachingPoints;
      showCoachingPointsModal(coachingPoints);
    });
  });
}

// Show coaching points modal
function showCoachingPointsModal(coachingPoints) {
  // Remove existing modal if any
  const existingModal = document.getElementById('coachingPointsModal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'coachingPointsModal';
  modal.className = 'coaching-points-modal-overlay';
  modal.innerHTML = `
    <div class="coaching-points-modal">
      <div class="coaching-points-modal-header">
        <h3>Coaching Points</h3>
        <button class="close-coaching-modal" type="button" aria-label="Close">
          <i class="bx bx-x"></i>
        </button>
      </div>
      <div class="coaching-points-modal-content">
        <p>${coachingPoints || 'No coaching points available for this drill.'}</p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Close on button click
  const closeBtn = modal.querySelector('.close-coaching-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
  }
}

// Render videos in the feed
function renderVideos(videos, container) {
  const template = document.getElementById('soloVideoTemplate');
  if (!template) {
    console.error('Video template not found');
    return;
  }

  videos.forEach((video, index) => {
    const videoItem = template.content.cloneNode(true);
    const videoElement = videoItem.querySelector('.solo-video-item');
    const videoPlayer = videoItem.querySelector('.solo-video-player');
    const playPauseBtn = videoItem.querySelector('.solo-play-pause');
    const captionText = videoItem.querySelector('.solo-caption-text');
    const username = videoItem.querySelector('.solo-username');

    // Set video source
    if (videoPlayer && video.video_url) {
      // Get public URL from Supabase Storage path
      if (supabase && supabaseReady) {
        const { data: { publicUrl } } = supabase.storage
          .from('solo-session-videos')
          .getPublicUrl(video.video_url);
        
        videoPlayer.src = publicUrl;
        videoPlayer.poster = video.thumbnail_url || '';
        
        // Detect vertical video (1080x1920 aspect ratio ~0.5625) or horizontal (1920x1080)
        videoPlayer.addEventListener('loadedmetadata', () => {
          const aspectRatio = videoPlayer.videoWidth / videoPlayer.videoHeight;
          const duration = videoPlayer.duration;
          
          // Update duration display
          const durationText = videoElement.querySelector('.solo-duration-text');
          if (durationText && !isNaN(duration)) {
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            durationText.textContent = `0:00 / ${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
          
          // If aspect ratio is less than 0.6 (vertical video), add vertical-video class
          if (aspectRatio < 0.6) {
            videoPlayer.classList.add('vertical-video');
            videoPlayer.classList.remove('landscape-video');
            // Hide landscape rotation button for vertical videos
            const rotateBtn = videoElement.querySelector('.solo-rotate-landscape');
            if (rotateBtn) rotateBtn.style.display = 'none';
          } else {
            videoPlayer.classList.remove('vertical-video');
            videoPlayer.classList.add('landscape-video');
            // Show landscape rotation button for horizontal videos on mobile
            const rotateBtn = videoElement.querySelector('.solo-rotate-landscape');
            if (rotateBtn && window.innerWidth < 768) {
              rotateBtn.style.display = 'flex';
            }
          }
          
          // Setup thumbnail preview if available
          if (video.thumbnail_url) {
            const thumbnailPreview = videoElement.querySelector('.solo-thumbnail-preview');
            const thumbnailImg = videoElement.querySelector('.solo-thumbnail-img');
            if (thumbnailPreview && thumbnailImg) {
              const { data: { publicUrl: thumbnailUrl } } = supabase.storage
                .from('solo-session-videos')
                .getPublicUrl(video.thumbnail_url);
              thumbnailImg.src = thumbnailUrl;
              
              // Show thumbnail on hover/click at bottom
              let hoverTimeout;
              let clickTimeout;
              
              const showThumbnail = () => {
                thumbnailPreview.style.display = 'block';
                thumbnailPreview.style.opacity = '1';
              };
              
              const hideThumbnail = () => {
                thumbnailPreview.style.opacity = '0';
                setTimeout(() => {
                  thumbnailPreview.style.display = 'none';
                }, 300);
              };
              
              videoPlayer.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(showThumbnail, 300);
              });
              
              videoPlayer.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                hideThumbnail();
              });
              
              videoPlayer.addEventListener('touchstart', () => {
                showThumbnail();
                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(hideThumbnail, 2000);
              });
              
              videoPlayer.addEventListener('click', (e) => {
                if (e.target === videoPlayer || e.target.closest('.solo-video-player')) {
                  // Toggle thumbnail on click
                  if (thumbnailPreview.style.display === 'none' || thumbnailPreview.style.opacity === '0') {
                    showThumbnail();
                    clearTimeout(clickTimeout);
                    clickTimeout = setTimeout(hideThumbnail, 2000);
                  } else {
                    hideThumbnail();
                  }
                }
              });
            }
          }
        });
        
        // Handle video load errors
        videoPlayer.addEventListener('error', (e) => {
          console.error('Video load error:', e, 'URL:', publicUrl);
          const errorMsg = document.createElement('div');
          errorMsg.className = 'video-error';
          errorMsg.textContent = 'Failed to load video';
          errorMsg.style.cssText = 'position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); color: #fff; z-index: 20;';
          videoPlayer.parentElement.appendChild(errorMsg);
        });
      } else {
        console.error('Supabase not ready for video URL');
      }
    }

    // Set caption - for tactical videos, show coaching points
    if (captionText) {
      // For tactical videos, show coaching points (description) if available
      if (video.category === 'tactical' && video.description) {
        captionText.textContent = video.description;
      } else {
        captionText.textContent = video.description || video.title || '';
      }
    }

    // Set username (can be customized)
    if (username) {
      username.textContent = 'Homegrown';
    }
    
    // Store video data on element for tracking
    if (videoElement) {
      videoElement.dataset.videoId = video.id;
      videoElement.dataset.videoCategory = video.category;
    }

    // Setup play/pause
    if (playPauseBtn && videoPlayer) {
      playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlayPause(videoPlayer, playPauseBtn);
      });

      videoPlayer.addEventListener('click', () => {
        togglePlayPause(videoPlayer, playPauseBtn);
      });

      videoPlayer.addEventListener('play', () => {
        playPauseBtn.classList.add('playing');
        playPauseBtn.querySelector('i').classList.remove('bx-play');
        playPauseBtn.querySelector('i').classList.add('bx-pause');
      });

      videoPlayer.addEventListener('pause', () => {
        playPauseBtn.classList.remove('playing');
        playPauseBtn.querySelector('i').classList.remove('bx-pause');
        playPauseBtn.querySelector('i').classList.add('bx-play');
      });
      
      // Update duration display as video plays
      videoPlayer.addEventListener('timeupdate', () => {
        const durationText = videoElement.querySelector('.solo-duration-text');
        if (durationText) {
          const currentTime = videoPlayer.currentTime;
          const duration = videoPlayer.duration;
          if (!isNaN(duration) && !isNaN(currentTime)) {
            const currentMinutes = Math.floor(currentTime / 60);
            const currentSeconds = Math.floor(currentTime % 60);
            const totalMinutes = Math.floor(duration / 60);
            const totalSeconds = Math.floor(duration % 60);
            durationText.textContent = `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
          }
        }
      });
      
      // For tactical videos, track full watch for points
      if (video.category === 'tactical') {
        let pointsAwarded = false; // Flag to prevent duplicate awards
        
        videoPlayer.addEventListener('ended', async () => {
          if (pointsAwarded) {
            console.log('⚠️ Points already awarded, skipping ended event');
            return;
          }
          console.log('🎬 Video ended event fired for tactical video:', video.id);
          pointsAwarded = true;
          await handleTacticalVideoComplete(video.id, videoPlayer);
        });
        
        // Also track timeupdate to ensure we catch completion even if ended event doesn't fire
        let lastProgress = 0;
        videoPlayer.addEventListener('timeupdate', () => {
          if (pointsAwarded) return;
          
          const progress = videoPlayer.currentTime / videoPlayer.duration;
          // If we're at 95% or more, consider it complete
          if (progress >= 0.95 && lastProgress < 0.95 && !videoPlayer.paused) {
            console.log('🎬 Video reached 95% completion');
            // Only trigger once
            lastProgress = progress;
            pointsAwarded = true;
            handleTacticalVideoComplete(video.id, videoPlayer).catch(err => {
              console.error('Error in handleTacticalVideoComplete:', err);
              pointsAwarded = false; // Reset on error so it can retry
            });
          }
        });
      }
    }
    
    // Setup like button for tactical videos
    if (video.category === 'tactical') {
      const likeBtn = videoItem.querySelector('.solo-action-btn');
      if (likeBtn) {
        let isLiked = false;
        likeBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          isLiked = !isLiked;
          const icon = likeBtn.querySelector('i');
          const countSpan = likeBtn.querySelector('.solo-action-count');
          
          if (isLiked) {
            icon.classList.remove('bx-heart');
            icon.classList.add('bxs-heart');
            icon.style.color = '#ff3040';
            if (countSpan) {
              countSpan.textContent = parseInt(countSpan.textContent || '0') + 1;
            }
          } else {
            icon.classList.remove('bxs-heart');
            icon.classList.add('bx-heart');
            icon.style.color = '';
            if (countSpan) {
              countSpan.textContent = Math.max(0, parseInt(countSpan.textContent || '0') - 1);
            }
          }
        });
      }
    }
    
    // Setup landscape rotation button
    const rotateBtn = videoItem.querySelector('.solo-rotate-landscape');
    if (rotateBtn) {
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Request fullscreen in landscape orientation
        if (videoPlayer.requestFullscreen) {
          videoPlayer.requestFullscreen().then(() => {
            // Lock orientation to landscape (if supported)
            if (screen.orientation && screen.orientation.lock) {
              screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock not supported:', err);
              });
            }
          }).catch(err => {
            console.log('Fullscreen not supported:', err);
            alert('Please rotate your device to landscape mode for the best viewing experience.');
          });
        } else if (videoPlayer.webkitRequestFullscreen) {
          videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.mozRequestFullScreen) {
          videoPlayer.mozRequestFullScreen();
        } else {
          alert('Please rotate your device to landscape mode for the best viewing experience.');
        }
      });
    }

    // Setup intersection observer for auto-play
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          // Video is in view - can auto-play if desired
          // For now, we'll let user manually play
        }
      });
    }, {
      threshold: 0.5
    });

    if (videoElement) {
      observer.observe(videoElement);
      videoElements.push({
        element: videoElement,
        video: videoPlayer,
        observer: observer
      });
    }

    container.appendChild(videoItem);
  });
}

// Toggle play/pause
function togglePlayPause(video, playPauseBtn) {
  if (!video || !video.src) {
    console.error('Video has no source');
    return;
  }
  
  // Check if video is ready
  if (video.readyState < 2) {
    // Video not ready yet, wait for it
    video.addEventListener('loadeddata', () => {
      if (video.paused) {
        video.play().catch(err => {
          console.error('Error playing video:', err);
        });
      } else {
        video.pause();
      }
    }, { once: true });
    return;
  }
  
  if (video.paused) {
    video.play().catch(err => {
      console.error('Error playing video:', err);
      alert('Unable to play video. Please check if the video file exists and is accessible.');
    });
  } else {
    video.pause();
  }
}

// Handle video scroll
function handleVideoScroll() {
  // Pause videos that are out of view
  videoElements.forEach(({ element, video }) => {
    const rect = element.getBoundingClientRect();
    const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    
    if (!isInView && !video.paused) {
      video.pause();
    }
  });
}

// Show placeholder message
function showPlaceholder(container, message) {
  if (!container) return;
  container.style.display = 'flex';
  container.innerHTML = `
    <div class="solo-video-placeholder">
      <p>${message}</p>
      <p class="solo-placeholder-subtitle">Videos will appear here based on your selected category</p>
    </div>
  `;
}

// Load videos based on objectives (for future integration)
export async function loadVideosForObjectives(objectives) {
  if (!supabaseReady || !supabase) return [];

  const matchedVideos = [];
  
  // Extract keywords from objectives
  const keywords = extractKeywordsFromObjectives(objectives);
  
  // Map keywords to curriculum structure
  for (const keyword of keywords) {
    const matches = mapKeywordToCurriculum(keyword);
    
    // For each match, find videos
    for (const match of matches) {
      let query = supabase
        .from('solo_session_videos')
        .select('*')
        .eq('period', match.period)
        .eq('category', match.category);
      
      if (match.skill) {
        query = query.eq('skill', match.skill);
      }
      
      if (match.subSkill) {
        query = query.eq('sub_skill', match.subSkill);
      }
      
      const { data: videos } = await query;
      if (videos && videos.length > 0) {
        matchedVideos.push(...videos);
      }
    }
  }
  
  // Remove duplicates
  const uniqueVideos = Array.from(
    new Map(matchedVideos.map(v => [v.id, v])).values()
  );
  
  return uniqueVideos;
}

// Extract keywords from objectives text
function extractKeywordsFromObjectives(objectives) {
  if (!objectives || typeof objectives !== 'string') return [];
  
  // Simple keyword extraction (can be enhanced)
  const commonKeywords = [
    'turning', 'first touch', 'passing', 'finishing', 'ball mastery',
    'escape moves', 'on ground', 'half volley', 'full volley',
    'weak foot', 'deception', 'backspin', 'curl', 'trivela'
  ];
  
  const normalized = objectives.toLowerCase();
  const foundKeywords = [];
  
  for (const keyword of commonKeywords) {
    if (normalized.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }
  
  return foundKeywords;
}

// Handle tactical video completion and award points
async function handleTacticalVideoComplete(videoId, videoPlayer) {
  console.log('🎬 Tactical video completed, videoId:', videoId);
  
  if (!supabaseReady || !supabase) {
    console.error('❌ Supabase not ready');
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.error('❌ No session or user');
      return;
    }
    // Use effective player ID (parent viewing as player uses selected child's ID)
    let playerId = session.user.id;
    try {
      const { getAccountContext } = await import('../../../utils/account-context.js');
      const context = await getAccountContext();
      if (context && context.getPlayerIdForAction) {
        playerId = context.getPlayerIdForAction();
      }
    } catch (_) { /* fallback to session.user.id */ }
    console.log('✅ Player ID:', playerId);
    
    // Get current quarter for checking points
    const { year, quarter } = getCurrentQuarter();
    
    // Check if video was already watched for points
    // Use .select() instead of .maybeSingle() to handle multiple records
    const { data: existingProgressList, error: checkError } = await supabase
      .from('player_curriculum_progress')
      .select('id, points_earned, completed_at')
      .eq('player_id', playerId)
      .eq('video_id', videoId)
      .eq('category', 'tactical')
      .order('completed_at', { ascending: false });
    
    if (checkError) {
      console.error('Error checking video progress:', checkError);
      // Don't return, continue to try inserting (might be first time)
    }
    
    // If progress records exist, check if points were already awarded
    if (existingProgressList && existingProgressList.length > 0) {
      console.log('📋 Found existing progress records:', existingProgressList.length);
      
      // Check if ANY progress record has points_earned > 0
      const hasPointsAwarded = existingProgressList.some(progress => 
        progress.points_earned > 0
      );
      
      if (hasPointsAwarded) {
        console.log('✅ Points already awarded (found progress with points_earned > 0), skipping');
        return;
      }
      
      // If all progress records have points_earned = 0 or null, delete them and retry
      // This handles the case where progress was created but points transaction failed
      console.log('⚠️ Progress exists but no points awarded, deleting all progress records to retry');
      const progressIds = existingProgressList.map(p => p.id);
      const { error: deleteError } = await supabase
        .from('player_curriculum_progress')
        .delete()
        .in('id', progressIds);
      
      if (deleteError) {
        console.error('Error deleting old progress:', deleteError);
        // Continue anyway to try inserting
      } else {
        console.log('✅ Deleted old progress records, will retry awarding points');
      }
    }
    
    console.log('✅ Proceeding to award points');
    
    // Get video details to get period
    const { data: video, error: videoError } = await supabase
      .from('solo_session_videos')
      .select('period, category')
      .eq('id', videoId)
      .single();
    
    if (videoError || !video) {
      console.error('Error fetching video:', videoError);
      return;
    }
    
    // Use current curriculum period if video period is 'all'
    let period = video.period || 'all';
    if (period === 'all') {
      const currentPeriod = await getCurrentPeriod();
      if (currentPeriod) {
        period = currentPeriod; // getCurrentPeriod() already returns the correct format
      } else {
        period = 'build-out'; // Default fallback
      }
    }
    
    // Award 0.3 points for tactical reel (leaderboard only; spider uses count from progress)
    const points = 0.3;
    // year and quarter already declared at the top of the function
    
    // Record in player_curriculum_progress (spider counts 1 per tactical reel from here)
    const completedAt = new Date().toISOString();
    console.log('📝 Recording progress with period:', period);
    const { error: progressError, data: progressData } = await supabase
      .from('player_curriculum_progress')
      .insert({
        player_id: playerId,
        period: period,
        category: 'tactical',
        session_type: 'solo',
        video_id: videoId,
        points_earned: points,
        completed_at: completedAt
      })
      .select();
    
    if (progressError) {
      console.error('❌ Error recording progress:', progressError);
      alert(`Error recording progress: ${progressError.message}`);
      return;
    }
    
    console.log('✅ Progress recorded:', progressData);
    
    // Award points via points_transactions
    console.log('💰 Awarding points:', points, 'for quarter:', year, quarter);
    const checkedInAt = new Date().toISOString();
    const { error: pointsError, data: pointsData } = await supabase
      .from('points_transactions')
      .insert({
        player_id: playerId,
        points: points,
        session_type: 'HG_TACTICAL_REEL',
        quarter_year: year,
        quarter_number: quarter,
        status: 'active',
        checked_in_at: checkedInAt
      })
      .select();
    
    if (pointsError) {
      console.error('❌ Error awarding points:', pointsError);
      alert(`Error awarding points: ${pointsError.message}. Progress was recorded but points may not have been awarded.`);
      // Don't fail if points transaction fails, progress is already recorded
    } else {
      console.log('✅ Points awarded successfully:', pointsData);
    }
    
    // Show success message (optional)
    const successMsg = document.createElement('div');
    successMsg.textContent = `+${points} points earned!`;
    successMsg.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,255,0,0.8); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000; font-weight: bold;';
    if (videoPlayer && videoPlayer.parentElement) {
      videoPlayer.parentElement.appendChild(successMsg);
      setTimeout(() => {
        successMsg.remove();
      }, 3000);
    }
    
  } catch (error) {
    console.error('Error handling tactical video completion:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Add physical skill filter dropdown
function addPhysicalSkillFilter(container) {
  // Check if filter already exists
  if (container.querySelector('.physical-skill-filter')) {
    return;
  }
  
  // Ensure container has relative positioning
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }
  
  const filterContainer = document.createElement('div');
  filterContainer.className = 'physical-skill-filter';
  filterContainer.style.cssText = 'position: absolute; top: 60px; right: 16px; z-index: 10;';
  
  const skills = [
    { value: '', label: 'All Skills' },
    { value: 'conditioning', label: 'Conditioning' },
    { value: 'lower-body', label: 'Lower Body' },
    { value: 'upper-body', label: 'Upper Body' },
    { value: 'core', label: 'Core' },
    { value: 'speed', label: 'Speed' },
    { value: 'plyometrics', label: 'Plyometrics' },
    { value: 'whole-body', label: 'Whole Body' }
  ];
  
  const select = document.createElement('select');
  select.className = 'physical-skill-filter-select';
  select.style.cssText = 'padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 0.9rem; cursor: pointer;';
  
  skills.forEach(skill => {
    const option = document.createElement('option');
    option.value = skill.value;
    option.textContent = skill.label;
    select.appendChild(option);
  });
  
  select.addEventListener('change', async (e) => {
    const selectedSkill = e.target.value;
    await filterPhysicalSessions(selectedSkill, container);
  });
  
  filterContainer.appendChild(select);
  container.appendChild(filterContainer);
}

// Filter physical sessions by skill
async function filterPhysicalSessions(skill, container) {
  if (!skill) {
    // Show all sessions
    const filteredSessions = allPhysicalSessions;
    await renderFilteredPhysicalSessions(filteredSessions, container);
  } else {
    // Filter by skill
    const filteredSessions = allPhysicalSessions.filter(session => session.skill === skill);
    await renderFilteredPhysicalSessions(filteredSessions, container);
  }
}

// Render filtered physical sessions
async function renderFilteredPhysicalSessions(sessions, container) {
  // Remove existing session heroes and empty states but keep the filter
  const filter = container.querySelector('.physical-skill-filter');
  const existingHeroes = container.querySelectorAll('.session-hero');
  const emptyStates = container.querySelectorAll('div[style*="text-align: center"]');
  existingHeroes.forEach(hero => hero.remove());
  emptyStates.forEach(state => state.remove());
  
  if (sessions.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = 'text-align: center; padding: 40px 20px; margin-top: 60px;';
    emptyState.innerHTML = `
      <i class="bx bx-football" style="font-size: 48px; color: var(--muted); margin-bottom: 16px;"></i>
      <h3 style="color: var(--text); margin-bottom: 8px;">No Sessions Available</h3>
      <p style="color: var(--muted);">No sessions found for the selected filter.</p>
    `;
    container.appendChild(emptyState);
    return;
  }
  
  // Group sessions by sub_skill (or use 'general' if no sub_skill)
  const sessionsBySubSkill = {};
  for (const session of sessions) {
    let sessionSubSkill = session.sub_skill;
    
    // If session doesn't have sub_skill, try to get it from main exercise videos
    if (!sessionSubSkill && session.main_exercises && session.main_exercises.length > 0) {
      const firstVideoId = session.main_exercises[0].video_id;
      if (firstVideoId) {
        const { data: video } = await supabase
          .from('solo_session_videos')
          .select('sub_skill')
          .eq('id', firstVideoId)
          .single();
        
        if (video && video.sub_skill) {
          sessionSubSkill = video.sub_skill;
        }
      }
    }
    
    sessionSubSkill = sessionSubSkill || 'general';
    if (!sessionsBySubSkill[sessionSubSkill]) {
      sessionsBySubSkill[sessionSubSkill] = [];
    }
    sessionsBySubSkill[sessionSubSkill].push(session);
  }
  
  // Render heroes
  const heroesToShow = [];
  for (const [subSkillKey, subSkillSessions] of Object.entries(sessionsBySubSkill)) {
    if (subSkillSessions.length > 0) {
      heroesToShow.push({ subSkillKey, sessions: subSkillSessions });
    }
  }
  
  // Create a temporary container for heroes to avoid clearing the filter
  const heroesContainer = document.createElement('div');
  heroesContainer.className = 'session-heroes-container';
  container.appendChild(heroesContainer);
  
  // Render heroes into the temporary container
  const heroesHTML = [];
  for (const { subSkillKey, sessions } of heroesToShow) {
    const session = sessions[0]; // Use first session for preview
    const fullSession = await getFullSessionData(session.id);
    if (fullSession) {
      const heroHTML = await createSessionHeroHTML(fullSession, subSkillKey, 'Physical');
      heroesHTML.push(heroHTML);
    }
  }
  
  heroesContainer.innerHTML = heroesHTML.join('');
  
  // Setup click handlers for session heroes
  const heroElements = heroesContainer.querySelectorAll('.session-hero');
  heroElements.forEach(hero => {
    hero.addEventListener('click', async () => {
      const sessionId = hero.dataset.sessionId;
      await expandSessionHero(sessionId, container);
    });
  });
}

// Export for use in other files
export { loadVideosForTab, switchTab };
