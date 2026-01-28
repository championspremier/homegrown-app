// Coach Solo Create Page Scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getCurrentFocus } from '../../player/home/curriculum-focus.js';
import { 
  CURRICULUM_BACKBONE, 
  getSkillsForPeriodAndCategory,
  getSubSkillsForSkill 
} from '../../../utils/curriculum-backbone.js';
import { 
  getKeywordsForPeriod,
  getKeywordsForCategory,
  getKeywordForSkill,
  getKeywordsForPeriodAndPhase,
  getPhasesForPeriod
} from '../../../utils/drill-keywords.js';
import { 
  showLoader, 
  hideLoader, 
  showLoaderOverlay, 
  hideLoaderOverlay,
  withLoader,
  withLoaderOverlay
} from '../../../utils/loader.js';

let supabase;
let supabaseReady = false;
let currentCategory = null;
let currentPeriod = null;
let selectedFiles = [];
let currentSection = null;
let currentPhysicalTab = 'nutrition'; // nutrition, rehab, or sleep
let physicalSets = {
  nutrition: { 'in-season': [], 'off-season': [] },
  rehab: { 'in-season': [], 'off-season': [] },
  sleep: { 'in-season': [], 'off-season': [] }
};
let currentDrillData = null;
let currentPhysicalSkill = null; // Track selected skill for physical sessions

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    
    // Get current curriculum period and set as default
    try {
      const currentFocus = await getCurrentFocus();
      if (currentFocus && currentFocus.focus) {
        // Map focus text to period value
        const periodMap = {
          'BUILD-OUT': 'build-out',
          'MIDDLE THIRD': 'middle-third',
          'FINAL THIRD': 'final-third',
          'WIDE PLAY': 'wide-play'
        };
        const periodValue = periodMap[currentFocus.focus] || 'build-out';
        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
          periodSelect.value = periodValue;
          currentPeriod = periodValue;
        }
      }
    } catch (error) {
      console.warn('Could not get current curriculum focus:', error);
      // Default to build-out if we can't determine current period
      const periodSelect = document.getElementById('periodSelect');
      if (periodSelect) {
        periodSelect.value = 'build-out';
        currentPeriod = 'build-out';
      }
    }
    
    setupEventListeners();
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Category selection
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      selectCategory(category);
    });
  });

  // Back to categories
  const backBtn = document.getElementById('backToCategories');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      showCategorySelection();
    });
  }

  // Period change
  const periodSelect = document.getElementById('periodSelect');
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      currentPeriod = e.target.value;
      // Update skill dropdowns in main form (if any exist)
      updateSkillDropdowns();
    });
  }

  // Season change (for Physical)
  const seasonSelect = document.getElementById('seasonSelect');
  if (seasonSelect) {
    seasonSelect.addEventListener('change', (e) => {
      // For physical, use season as period value
      currentPeriod = e.target.value;
      // Update skill dropdowns in main form (if any exist)
      updateSkillDropdowns();
    });
  }

  // Add drill buttons
  document.querySelectorAll('.add-drill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      openUploadModal(section);
    });
  });

  // Cancel session
  const cancelBtn = document.getElementById('cancelSession');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        showCategorySelection();
      }
    });
  }

  // Save session
  const saveBtn = document.getElementById('saveSession');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveSession();
    });
  }

  // Skill thumbnail management
  const manageThumbnailsBtn = document.getElementById('manageThumbnailsBtn');
  if (manageThumbnailsBtn) {
    manageThumbnailsBtn.addEventListener('click', () => {
      showThumbnailManagement();
    });
  }

  // Edit sessions
  const editSessionsBtn = document.getElementById('editSessionsBtn');
  if (editSessionsBtn) {
    editSessionsBtn.addEventListener('click', () => {
      showEditSessionsView();
    });
  }

  const backFromEditSessionsBtn = document.getElementById('backFromEditSessions');
  if (backFromEditSessionsBtn) {
    backFromEditSessionsBtn.addEventListener('click', () => {
      hideEditSessionsView();
    });
  }

  // Setup edit sessions filters
  setupEditSessionsFilters();

  const backFromThumbnailsBtn = document.getElementById('backFromThumbnails');
  if (backFromThumbnailsBtn) {
    backFromThumbnailsBtn.addEventListener('click', () => {
      hideThumbnailManagement();
    });
  }

  // Thumbnail form event listeners
  setupThumbnailFormListeners();
}

// Select category and show appropriate form
function selectCategory(category) {
  currentCategory = category;
  
  const categorySelection = document.getElementById('categorySelection');
  const sessionForm = document.getElementById('sessionForm');
  const formTitle = document.getElementById('formTitle');
  const technicalForm = document.getElementById('technicalForm');
  const physicalForm = document.getElementById('physicalForm');
  const simpleForm = document.getElementById('simpleForm');

  if (!categorySelection || !sessionForm || !formTitle) return;

  // Clear form if not editing (creating new session)
  if (!isEditingSession) {
    clearAllForms();
    
    // Clear physical form state
    if (category === 'physical') {
      // Reset physicalSets to initial structure
      // Dynamic keys like "in-season-upper-body" will be created fresh when needed
      physicalSets = {
        nutrition: { 'in-season': [], 'off-season': [] },
        rehab: { 'in-season': [], 'off-season': [] },
        sleep: { 'in-season': [], 'off-season': [] }
      };
      
      const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
      const physicalTabContent = document.getElementById('physicalTabContent');
      
      if (physicalSeasonSelect) physicalSeasonSelect.value = '';
      if (physicalTabContent) physicalTabContent.innerHTML = '';
      
      currentPeriod = null;
      currentPhysicalTab = null;
      currentPhysicalSkill = null;
    }
  }

  // Hide category selection, show form
  categorySelection.style.display = 'none';
  sessionForm.style.display = 'block';

  // Update form title (only if not editing)
  if (!isEditingSession) {
    const categoryNames = {
      'technical': 'Technical',
      'physical': 'Physical',
      'mental': 'Mental',
      'tactical': 'Tactical'
    };
    formTitle.textContent = `Create ${categoryNames[category]} Session`;
  }

  // Show appropriate form
  if (category === 'technical') {
    technicalForm.style.display = 'block';
    physicalForm.style.display = 'none';
    simpleForm.style.display = 'none';
  } else if (category === 'physical') {
    technicalForm.style.display = 'none';
    physicalForm.style.display = 'block';
    simpleForm.style.display = 'none';
    setupPhysicalTabs();
  } else {
    technicalForm.style.display = 'none';
    physicalForm.style.display = 'none';
    simpleForm.style.display = 'block';
  }

  // Update section title and hint for tactical
  const videosSectionTitle = document.getElementById('videosSectionTitle');
  const addDrillBtnText = document.getElementById('addDrillBtnText');
  const videosSectionHint = document.getElementById('videosSectionHint');
  
  if (category === 'tactical') {
    if (videosSectionTitle) videosSectionTitle.textContent = 'Videos';
    if (addDrillBtnText) addDrillBtnText.textContent = 'Add Video';
    if (videosSectionHint) videosSectionHint.style.display = 'block';
  } else {
    if (videosSectionTitle) videosSectionTitle.textContent = 'Drills';
    if (addDrillBtnText) addDrillBtnText.textContent = 'Add Drill';
    if (videosSectionHint) videosSectionHint.style.display = 'none';
  }

  // Show/hide period vs season selection
  const periodSection = document.getElementById('periodSection');
  const seasonSection = document.getElementById('seasonSection');
  const allPeriodOption = document.getElementById('allPeriodOption');
  const periodSelect = document.getElementById('periodSelect');
  const seasonSelect = document.getElementById('seasonSelect');

  if (category === 'physical') {
    // Physical: Hide period section (season is handled within physical form)
    if (periodSection) periodSection.style.display = 'none';
    if (seasonSection) seasonSection.style.display = 'none';
    if (periodSelect) periodSelect.value = '';
    currentPeriod = null;
  } else {
    // Other categories: Show period selection, hide season
    if (periodSection) periodSection.style.display = 'block';
    if (seasonSection) seasonSection.style.display = 'none';
    if (seasonSelect) seasonSelect.value = '';
    
    // Show "All" option for tactical, technical, and mental
    if (allPeriodOption) {
      allPeriodOption.style.display = (category === 'tactical' || category === 'technical' || category === 'mental') ? 'block' : 'none';
    }
  }

  // Update skill dropdowns based on current period
  updateSkillDropdowns();
}

// Setup Physical tabs (Nutrition, Rehab, Sleep)
function setupPhysicalTabs() {
  const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
  const physicalTabContent = document.getElementById('physicalTabContent');
  
  if (!physicalSeasonSelect || !physicalTabContent) return;
  
  // Track selections
  let selectedSeason = null;
  let selectedCategory = null;
  
  // Setup combined season/category selection handler
  if (physicalSeasonSelect) {
    physicalSeasonSelect.addEventListener('change', (e) => {
      const selectedValue = e.target.value;
      
      if (!selectedValue) {
        physicalTabContent.innerHTML = '';
        selectedSeason = null;
        selectedCategory = null;
        currentPhysicalSkill = null;
        currentPhysicalTab = null;
        currentPeriod = null;
        return;
      }
      
      // Determine if it's a season or category
      const isSeason = selectedValue === 'in-season' || selectedValue === 'off-season';
      const isCategory = selectedValue === 'nutrition' || selectedValue === 'sleep' || selectedValue === 'rehab';
      
      if (isSeason) {
        selectedSeason = selectedValue;
        currentPeriod = selectedValue;
        currentPhysicalSkill = null;
        // Show filter buttons directly when season is selected
        renderPhysicalContentWithFilters(selectedSeason, null);
      } else if (isCategory) {
        selectedCategory = selectedValue;
        currentPhysicalTab = selectedValue;
        currentPhysicalSkill = null;
        physicalTabContent.innerHTML = '';
      }
    });
  }
}

// Render Physical content with filter buttons and sets
function renderPhysicalContentWithFilters(season, skill) {
  const physicalTabContent = document.getElementById('physicalTabContent');
  if (!physicalTabContent) return;
  
  // Before clearing, collect current values from all drill inputs if skill was selected
  if (skill) {
    collectCurrentDrillValues(season, skill);
  }
  
  // Clear content
  physicalTabContent.innerHTML = '';
  
  // If no skill selected yet, just show filter buttons
  if (!skill) {
    // Create filter buttons container
    const filterContainer = document.createElement('div');
    filterContainer.className = 'physical-filter-buttons';
    filterContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;';
    
    // All available skills for filtering
    const allSkills = ['conditioning', 'lower-body', 'upper-body', 'core', 'speed', 'plyometrics', 'whole-body'];
    
    allSkills.forEach(skillOption => {
      const filterBtn = document.createElement('button');
      filterBtn.className = 'physical-filter-btn';
      filterBtn.type = 'button';
      filterBtn.textContent = skillOption.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      filterBtn.dataset.skill = skillOption;
      filterBtn.style.cssText = 'padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.2s;';
      
      filterBtn.addEventListener('click', () => {
        // Re-render with selected skill
        renderPhysicalContentWithFilters(season, skillOption);
      });
      
      filterContainer.appendChild(filterBtn);
    });
    
    physicalTabContent.appendChild(filterContainer);
    return;
  }
  
  // Create filter buttons container
  const filterContainer = document.createElement('div');
  filterContainer.className = 'physical-filter-buttons';
  filterContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;';
  
  // All available skills for filtering
  const allSkills = ['conditioning', 'lower-body', 'upper-body', 'core', 'speed', 'plyometrics', 'whole-body'];
  
  allSkills.forEach(skillOption => {
    const filterBtn = document.createElement('button');
    filterBtn.className = `physical-filter-btn ${skillOption === skill ? 'active' : ''}`;
    filterBtn.type = 'button';
    filterBtn.textContent = skillOption.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    filterBtn.dataset.skill = skillOption;
    filterBtn.style.cssText = 'padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.2s;';
    
    if (skillOption === skill) {
      filterBtn.style.background = 'var(--accent)';
      filterBtn.style.color = 'white';
      filterBtn.style.borderColor = 'var(--accent)';
    }
    
    filterBtn.addEventListener('click', () => {
      // Update tracked skill
      currentPhysicalSkill = skillOption;
      // Re-render with new skill
      renderPhysicalContentWithFilters(season, skillOption);
    });
    
    filterContainer.appendChild(filterBtn);
  });
  
  physicalTabContent.appendChild(filterContainer);
  
  // Initialize storage for this season/skill combination
  const storageKey = `${season}-${skill}`;
  if (!physicalSets[storageKey]) {
    physicalSets[storageKey] = [];
  }
  
  // Get sets for this season/skill combination
  const sets = physicalSets[storageKey];
  
  // If no sets exist, create one default set
  if (sets.length === 0) {
    sets.push({ id: Date.now(), drills: [] });
  }
  
  // Render each set
  sets.forEach((set, setIndex) => {
    const setSection = createPhysicalSetSectionForSkill(season, skill, setIndex, set.id);
    physicalTabContent.appendChild(setSection);
  });
  
  // Add "Add Set" button at the bottom
  const addSetBtn = document.createElement('button');
  addSetBtn.className = 'btn-secondary add-set-btn';
  addSetBtn.type = 'button';
  addSetBtn.innerHTML = '<i class="bx bx-plus"></i> Add Set';
  addSetBtn.addEventListener('click', () => {
    addPhysicalSetForSkill(season, skill);
  });
  physicalTabContent.appendChild(addSetBtn);
}

// Create a physical set section for season/skill combination
function createPhysicalSetSectionForSkill(season, skill, setIndex, setId) {
  const setSection = document.createElement('div');
  setSection.className = 'session-section physical-set-section';
  setSection.dataset.setId = setId;
  
  const setNumber = setIndex + 1;
  
  // Get set name from storage if it exists
  const storageKey = `${season}-${skill}`;
  const set = physicalSets[storageKey]?.find(s => s.id === setId);
  const setName = set?.name || `Set ${setNumber}`;
  
  setSection.innerHTML = `
    <div class="section-header">
      <input type="text" class="set-name-input" value="${setName}" placeholder="Set ${setNumber}" data-set-id="${setId}" style="font-size: 1.25rem; font-weight: 600; border: none; background: transparent; color: var(--text); padding: 0; margin: 0; width: auto; min-width: 100px; border-bottom: 2px solid transparent; transition: border-color 0.2s;">
      <button class="add-drill-btn" data-section="physical-drill" data-set-id="${setId}" data-season="${season}" data-skill="${skill}" type="button">
        <i class="bx bx-plus"></i>
        <span>Add Drill</span>
      </button>
      ${setIndex > 0 ? `<button class="remove-set-btn" data-set-id="${setId}" type="button">
        <i class="bx bx-trash"></i>
        <span>Remove Set</span>
      </button>` : ''}
    </div>
    <div class="drills-container" data-set-id="${setId}"></div>
  `;
  
  // Setup set name input handler
  const setNameInput = setSection.querySelector('.set-name-input');
  if (setNameInput) {
    setNameInput.addEventListener('focus', (e) => {
      e.target.style.borderBottomColor = 'var(--accent)';
    });
    setNameInput.addEventListener('blur', (e) => {
      e.target.style.borderBottomColor = 'transparent';
      // Save set name to storage
      const storageKey = `${season}-${skill}`;
      if (physicalSets[storageKey]) {
        const set = physicalSets[storageKey].find(s => s.id === setId);
        if (set) {
          set.name = e.target.value || `Set ${setNumber}`;
        }
      }
    });
  }
  
  // Setup drill button handler
  const addDrillBtn = setSection.querySelector('.add-drill-btn');
  if (addDrillBtn) {
    addDrillBtn.addEventListener('click', () => {
      currentSection = 'physical-drill';
      currentPeriod = season;
      // Store skill and setId for upload
      currentDrillData = currentDrillData || {};
      currentDrillData.skill = skill;
      currentDrillData.setId = setId;
      openUploadModal('physical-drill', setId);
    });
  }
  
  // Setup remove set button handler
  const removeSetBtn = setSection.querySelector('.remove-set-btn');
  if (removeSetBtn) {
    removeSetBtn.addEventListener('click', () => {
      removePhysicalSetForSkill(season, skill, setId);
    });
  }
  
  // Render existing drills for this set
  // Reuse storageKey and set that were already declared above
  if (set && set.drills) {
    const drillsContainer = setSection.querySelector('.drills-container');
    set.drills.forEach(drill => {
      const drillElement = createDrillElementForPhysical(drill, 'physical-drill', setId, season, skill);
      if (drillElement) drillsContainer.appendChild(drillElement);
    });
  }
  
  return setSection;
}

// Create drill element for physical drills with proper data persistence
function createDrillElementForPhysical(drill, section, setId, season, skill) {
  const template = document.getElementById('drillItemTemplate');
  if (!template) return null;

  const drillItem = template.content.cloneNode(true);
  const drillElement = drillItem.querySelector('.drill-item');
  const drillName = drillElement.querySelector('.drill-name');
  const drillPath = drillElement.querySelector('.drill-path');
  const removeBtn = drillElement.querySelector('.drill-remove');
  const editBtn = drillElement.querySelector('.drill-edit');
  const restInput = drillItem.querySelector('.drill-rest-input');
  const repsInput = drillItem.querySelector('.drill-reps-input');
  const setsInput = drillItem.querySelector('.drill-sets-input');

  drillName.textContent = drill.name;
  drillPath.textContent = drill.path;
  
  // Store drill data
  drillElement.dataset.drillId = drill.id;
  drillElement.dataset.drillPath = drill.path;
  
  // Populate parameters if they exist in drill data
  if (restInput) {
    restInput.value = drill.restTime || '';
    // Update drill data when rest time changes
    restInput.addEventListener('input', (e) => {
      const storageKey = `${season}-${skill}`;
      const set = physicalSets[storageKey]?.find(s => s.id === setId);
      if (set) {
        const drillItem = set.drills.find(d => d.id === drill.id);
        if (drillItem) {
          drillItem.restTime = e.target.value ? parseFloat(e.target.value) : null;
        }
      }
    });
  }
  
  if (repsInput) {
    repsInput.value = drill.reps || '';
    // Update drill data when reps changes
    repsInput.addEventListener('input', (e) => {
      const storageKey = `${season}-${skill}`;
      const set = physicalSets[storageKey]?.find(s => s.id === setId);
      if (set) {
        const drillItem = set.drills.find(d => d.id === drill.id);
        if (drillItem) {
          drillItem.reps = e.target.value ? parseInt(e.target.value) : null;
        }
      }
    });
  }
  
  if (setsInput) {
    setsInput.value = drill.sets || '';
    // Update drill data when sets changes
    setsInput.addEventListener('input', (e) => {
      const storageKey = `${season}-${skill}`;
      const set = physicalSets[storageKey]?.find(s => s.id === setId);
      if (set) {
        const drillItem = set.drills.find(d => d.id === drill.id);
        if (drillItem) {
          drillItem.sets = e.target.value ? parseInt(e.target.value) : null;
        }
      }
    });
  }

  // Edit button - open modal with drill data
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      await editDrillInSession(drill.id, 'physical-drill', drill, setId, season, skill);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      // Remove from physicalSets data structure
      const storageKey = `${season}-${skill}`;
      if (physicalSets[storageKey]) {
        const set = physicalSets[storageKey].find(s => s.id === setId);
        if (set) {
          const drillIndex = set.drills.findIndex(d => d.id === drill.id);
          if (drillIndex > -1) {
            set.drills.splice(drillIndex, 1);
            renderPhysicalContentWithFilters(season, skill);
          }
        }
      }
    });
  }

  return drillItem;
}

// Add a new physical set for season/skill combination
function addPhysicalSetForSkill(season, skill) {
  const newSetId = Date.now();
  const newSet = { id: newSetId, drills: [] };
  
  const storageKey = `${season}-${skill}`;
  if (!physicalSets[storageKey]) {
    physicalSets[storageKey] = [];
  }
  
  physicalSets[storageKey].push(newSet);
  renderPhysicalContentWithFilters(season, skill);
}

// Remove a physical set for season/skill combination
function removePhysicalSetForSkill(season, skill, setId) {
  const storageKey = `${season}-${skill}`;
  if (!physicalSets[storageKey]) return;
  
  const setIndex = physicalSets[storageKey].findIndex(s => s.id === setId);
  if (setIndex > -1) {
    physicalSets[storageKey].splice(setIndex, 1);
    // Ensure at least one set exists
    if (physicalSets[storageKey].length === 0) {
      physicalSets[storageKey].push({ id: Date.now(), drills: [] });
    }
    renderPhysicalContentWithFilters(season, skill);
  }
}

// Render Physical tab content based on selected tab and season
function renderPhysicalTabContent(tab, season) {
  const physicalTabContent = document.getElementById('physicalTabContent');
  if (!physicalTabContent) return;
  
  // Initialize sets for this tab/season if not exists
  if (!physicalSets[tab]) {
    physicalSets[tab] = {};
  }
  if (!physicalSets[tab][season]) {
    physicalSets[tab][season] = [];
  }
  
  // Clear content
  physicalTabContent.innerHTML = '';
  
  // Get sets for this tab/season
  const sets = physicalSets[tab][season];
  
  // If no sets exist, create one default set
  if (sets.length === 0) {
    sets.push({ id: Date.now(), drills: [] });
  }
  
  // Render each set
  sets.forEach((set, setIndex) => {
    const setSection = createPhysicalSetSection(tab, season, setIndex, set.id);
    physicalTabContent.appendChild(setSection);
  });
  
  // Add "Add Set" button at the bottom
  const addSetBtn = document.createElement('button');
  addSetBtn.className = 'btn-secondary add-set-btn';
  addSetBtn.type = 'button';
  addSetBtn.innerHTML = '<i class="bx bx-plus"></i> Add Set';
  addSetBtn.addEventListener('click', () => {
    addPhysicalSet(tab, season);
  });
  physicalTabContent.appendChild(addSetBtn);
}

// Create a physical set section
function createPhysicalSetSection(tab, season, setIndex, setId) {
  const setSection = document.createElement('div');
  setSection.className = 'session-section physical-set-section';
  setSection.dataset.setId = setId;
  
  const setNumber = setIndex + 1;
  const tabName = tab.charAt(0).toUpperCase() + tab.slice(1);
  
  setSection.innerHTML = `
    <div class="section-header">
      <h3>Set ${setNumber}</h3>
      <button class="add-drill-btn" data-section="physical-set" data-set-id="${setId}" type="button">
        <i class="bx bx-plus"></i>
        <span>Add Drill</span>
      </button>
      ${setIndex > 0 ? `<button class="remove-set-btn" data-set-id="${setId}" type="button">
        <i class="bx bx-trash"></i>
        <span>Remove Set</span>
      </button>` : ''}
    </div>
    <div class="drills-container" data-set-id="${setId}"></div>
  `;
  
  // Setup drill button handler
  const addDrillBtn = setSection.querySelector('.add-drill-btn');
  if (addDrillBtn) {
    addDrillBtn.addEventListener('click', () => {
      currentSection = 'physical-set';
      openUploadModal('physical-set', setId);
    });
  }
  
  // Setup remove set button handler
  const removeSetBtn = setSection.querySelector('.remove-set-btn');
  if (removeSetBtn) {
    removeSetBtn.addEventListener('click', () => {
      removePhysicalSet(tab, season, setId);
    });
  }
  
  // Render existing drills for this set
  const set = physicalSets[tab][season].find(s => s.id === setId);
  if (set && set.drills) {
    const drillsContainer = setSection.querySelector('.drills-container');
    set.drills.forEach(drill => {
      const drillElement = createDrillElement(drill, 'physical-set', setId);
      drillsContainer.appendChild(drillElement);
    });
  }
  
  return setSection;
}

// Add a new physical set
function addPhysicalSet(tab, season) {
  const newSetId = Date.now();
  const newSet = { id: newSetId, drills: [] };
  
  if (!physicalSets[tab]) {
    physicalSets[tab] = {};
  }
  if (!physicalSets[tab][season]) {
    physicalSets[tab][season] = [];
  }
  
  physicalSets[tab][season].push(newSet);
  renderPhysicalTabContent(tab, season);
}

// Remove a physical set
function removePhysicalSet(tab, season, setId) {
  if (!physicalSets[tab] || !physicalSets[tab][season]) return;
  
  const setIndex = physicalSets[tab][season].findIndex(s => s.id === setId);
  if (setIndex > -1) {
    physicalSets[tab][season].splice(setIndex, 1);
    // Ensure at least one set exists
    if (physicalSets[tab][season].length === 0) {
      physicalSets[tab][season].push({ id: Date.now(), drills: [] });
    }
    renderPhysicalTabContent(tab, season);
  }
}

// Show category selection
function showCategorySelection() {
  const categorySelection = document.getElementById('categorySelection');
  const sessionForm = document.getElementById('sessionForm');
  const editSessionsView = document.getElementById('editSessionsView');
  const thumbnailManagement = document.getElementById('thumbnailManagement');

  if (categorySelection && sessionForm) {
    categorySelection.style.display = 'block';
    sessionForm.style.display = 'none';
    if (editSessionsView) editSessionsView.style.display = 'none';
    if (thumbnailManagement) thumbnailManagement.style.display = 'none';
    
    // Reset editing state
    isEditingSession = false;
    currentEditingSessionId = null;
    
    // Reset save button text
    const saveBtn = document.getElementById('saveSession');
    if (saveBtn) {
      saveBtn.textContent = 'Save Session';
    }
    
    // Reset form title
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
      formTitle.textContent = 'Create Technical Session';
    }
    
    currentCategory = null;
    currentPeriod = null;
    selectedFiles = [];
    
    // Clear all forms
    clearAllForms();
  }
}

// Update skill dropdowns based on period and category
function updateSkillDropdowns() {
  if (!currentCategory) return;
  
  // For physical, we don't need period for skill selection
  // Physical skills are the same regardless of season
  if (currentCategory === 'physical') {
    if (!currentPeriod) return; // Wait for season selection
    const skillSelect = document.getElementById('skillSelect');
    if (!skillSelect) return;
    updateSkillDropdownForPhysical(skillSelect);
    return;
  }
  
  // For other categories, need period
  if (!currentPeriod) return;

  const skillSelect = document.getElementById('skillSelect');
  if (!skillSelect) return;

  updateSkillDropdown(skillSelect);
}

// Update skill dropdown for Physical (uses all periods' physical skills)
function updateSkillDropdownForPhysical(skillSelect) {
  if (!currentCategory || currentCategory !== 'physical') return;

  // Get physical skills from any period (they're the same across periods)
  const physicalSkills = getSkillsForPeriodAndCategory('build-out', 'physical');
  
  // Clear and populate skill dropdown
  skillSelect.innerHTML = '<option value="">Select Skill</option>';
  physicalSkills.forEach(skill => {
    const option = document.createElement('option');
    option.value = skill;
    option.textContent = skill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    skillSelect.appendChild(option);
  });
}

// Update skill dropdown in modal
async function updateSkillDropdownsInModal(modalElement) {
  if (!currentCategory) return;
  
  // For physical, skills are selected in the main form, not in modal
  if (currentCategory === 'physical') {
    return;
  }
  
  // For other categories, need period
  if (!currentPeriod) return;

  const skillFilterButtons = modalElement.querySelector('#skillFilterButtons');
  if (!skillFilterButtons) return;

  await updateSkillFilterButtons(skillFilterButtons, modalElement);
}

// Update skill filter buttons (replaces dropdown)
async function updateSkillFilterButtons(container, modalElement) {
  if (!currentPeriod || !currentCategory) return;

  let skills = [];
  
  // If period is "all", get skills from all periods + sessions with period="all"
  if (currentPeriod === 'all') {
    // Get all periods
    const allPeriods = ['build-out', 'middle-third', 'final-third', 'wide-play'];
    const allSkillsSet = new Set();
    
    // Get skills from all periods
    allPeriods.forEach(period => {
      const periodSkills = getSkillsForPeriodAndCategory(period, currentCategory);
      periodSkills.forEach(skill => allSkillsSet.add(skill));
    });
    
    // Also get skills from sessions with period="all"
    if (supabaseReady && supabase) {
      try {
        const { data: sessions } = await supabase
          .from('solo_sessions')
          .select('skill')
          .eq('category', currentCategory)
          .eq('period', 'all')
          .not('skill', 'is', null);
        
        if (sessions) {
          sessions.forEach(session => {
            if (session.skill) {
              allSkillsSet.add(session.skill);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching skills from all-period sessions:', error);
      }
    }
    
    skills = Array.from(allSkillsSet).sort();
  } else {
    // Get skills for specific period
    skills = getSkillsForPeriodAndCategory(currentPeriod, currentCategory);
  }
  
  // Clear and populate filter buttons
  container.innerHTML = '';
  
  // For physical sessions, check if skill is already selected
  const preSelectedSkill = (currentCategory === 'physical' && currentPhysicalSkill) ? currentPhysicalSkill : null;
  
  skills.forEach(skill => {
    const filterBtn = document.createElement('button');
    filterBtn.className = 'skill-filter-btn';
    filterBtn.type = 'button';
    filterBtn.textContent = skill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    filterBtn.dataset.skill = skill;
    
    // If this is the pre-selected skill for physical, make it active
    const isPreSelected = preSelectedSkill && skill === preSelectedSkill;
    if (isPreSelected) {
      filterBtn.style.cssText = 'padding: 8px 16px; border: 1px solid var(--accent); border-radius: 6px; background: var(--accent); color: white; cursor: pointer; transition: all 0.2s;';
      // Set skill in currentDrillData
      if (currentDrillData) {
        currentDrillData.skill = skill;
      }
    } else {
      filterBtn.style.cssText = 'padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; transition: all 0.2s;';
    }
    
      filterBtn.addEventListener('click', () => {
      // Update current drill data
      currentDrillData.skill = skill;
      
      // Clear coaching points when skill changes
      clearCoachingPointsInModal(modalElement);
      
      // Update button states
      container.querySelectorAll('.skill-filter-btn').forEach(btn => {
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text)';
        btn.style.borderColor = 'var(--border)';
      });
      filterBtn.style.background = 'var(--accent)';
      filterBtn.style.color = 'white';
      filterBtn.style.borderColor = 'var(--accent)';
      
      // Update sub-skill dropdown
      updateSubSkillDropdownInModal(skill, modalElement);
      
      // Auto-populate keywords based on selected skill
      if (currentCategory === 'technical' || currentCategory === 'physical' || currentCategory === 'mental') {
        autoPopulateKeywordsFromSkill(modalElement, skill);
      }
      
      // Reload existing drills with new skill filter
      loadExistingDrills(modalElement);
      
      // Update confirm button
      updateConfirmButton(modalElement);
    });
    
    container.appendChild(filterBtn);
  });
}

// Update a specific skill dropdown
async function updateSkillDropdown(skillSelect) {
  if (!currentPeriod || !currentCategory) return;

  let skills = [];
  
  // If period is "all", get skills from all periods + sessions with period="all"
  if (currentPeriod === 'all') {
    // Get all periods
    const allPeriods = ['build-out', 'middle-third', 'final-third', 'wide-play'];
    const allSkillsSet = new Set();
    
    // Get skills from all periods
    allPeriods.forEach(period => {
      const periodSkills = getSkillsForPeriodAndCategory(period, currentCategory);
      periodSkills.forEach(skill => allSkillsSet.add(skill));
    });
    
    // Also get skills from sessions with period="all"
    if (supabaseReady && supabase) {
      try {
        const { data: sessions } = await supabase
          .from('solo_sessions')
          .select('skill')
          .eq('category', currentCategory)
          .eq('period', 'all')
          .not('skill', 'is', null);
        
        if (sessions) {
          sessions.forEach(session => {
            if (session.skill) {
              allSkillsSet.add(session.skill);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching skills from all-period sessions:', error);
      }
    }
    
    skills = Array.from(allSkillsSet).sort();
  } else {
    // Get skills for specific period
    skills = getSkillsForPeriodAndCategory(currentPeriod, currentCategory);
  }
  
  // Clear and populate skill dropdown
  skillSelect.innerHTML = '<option value="">Select Skill</option>';
  skills.forEach(skill => {
    const option = document.createElement('option');
    option.value = skill;
    option.textContent = skill.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    skillSelect.appendChild(option);
  });
}

// Update sub-skill dropdown
function updateSubSkillDropdown(skill) {
  const subSkillSelect = document.getElementById('subSkillSelect');
  const subSkillField = document.getElementById('subSkillField');
  if (subSkillSelect && subSkillField) {
    updateSubSkillDropdownElement(skill, subSkillSelect, subSkillField);
  }
}

// Clear coaching points in modal when skill changes
function clearCoachingPointsInModal(modalElement) {
  const coachingPointsInput = modalElement.querySelector('#coachingPointsInput');
  if (coachingPointsInput) {
    coachingPointsInput.value = '';
    currentDrillData.coachingPoints = '';
  }
}

// Update sub-skill dropdown in modal
function updateSubSkillDropdownInModal(skill, modalElement) {
  const subSkillSelect = modalElement.querySelector('#subSkillSelect');
  const subSkillField = modalElement.querySelector('#subSkillField');
  if (subSkillSelect && subSkillField) {
    updateSubSkillDropdownElement(skill, subSkillSelect, subSkillField);
  }
}

// Update sub-skill dropdown element
function updateSubSkillDropdownElement(skill, subSkillSelect, subSkillField) {
  if (!currentCategory || !skill) {
    subSkillField.style.display = 'none';
    subSkillSelect.value = '';
    return;
  }
  
  // For physical, we can still use a period (season) for sub-skills
  // For other categories, need period
  if (currentCategory !== 'physical' && !currentPeriod) {
    subSkillField.style.display = 'none';
    subSkillSelect.value = '';
    return;
  }
  
  // Use build-out period for physical (skills are same across periods)
  const periodForSubSkills = currentCategory === 'physical' ? 'build-out' : currentPeriod;

  const subSkills = getSubSkillsForSkill(periodForSubSkills, currentCategory, skill);
  
  if (subSkills.length > 0) {
    subSkillField.style.display = 'block';
    subSkillSelect.innerHTML = '<option value="">Select Sub-Skill (Optional)</option>';
    subSkills.forEach(subSkill => {
      const option = document.createElement('option');
      option.value = subSkill;
      option.textContent = subSkill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      subSkillSelect.appendChild(option);
    });
  } else {
    subSkillField.style.display = 'none';
    subSkillSelect.value = '';
  }
}

// Edit drill in session - opens modal with drill data pre-filled
async function editDrillInSession(drillId, section, drillData = null, setId = null, season = null, skill = null) {
  if (!supabaseReady || !supabase) return;
  
  // Always fetch the latest drill data from database to ensure we have up-to-date keywords
  const { data: video, error } = await supabase
    .from('solo_session_videos')
    .select('*')
    .eq('id', drillId)
    .single();
  
  if (error || !video) {
    alert('Error loading drill data');
    return;
  }
  
  // Merge database data with provided drillData (drillData may have local changes like restTime, reps, sets)
  drillData = {
    ...drillData, // Keep local changes (restTime, reps, sets, etc.)
    id: video.id,
    name: video.title,
    path: video.video_url,
    keywords: video.keywords || [], // Always use latest keywords from database
    coachingPoints: video.description || drillData?.coachingPoints || '',
    skill: video.skill || drillData?.skill || '',
    subSkill: video.sub_skill || drillData?.subSkill || ''
  };
  
  // Open modal with drill data
  await openUploadModal(section, setId, drillData);
}

// Open upload modal
async function openUploadModal(section, setId = null, prefillData = null) {
  // For physical drills, check if season and skill are selected
  if (currentCategory === 'physical' && section === 'physical-drill') {
    const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
    if (!physicalSeasonSelect || !physicalSeasonSelect.value) {
      alert('Please select a season first');
      return;
    }
    if (!currentPhysicalSkill) {
      alert('Please select a skill first');
      return;
    }
    currentPeriod = physicalSeasonSelect.value;
  }
  
  // For physical sets, check if season is selected
  if (currentCategory === 'physical' && section === 'physical-set') {
    const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
    if (!physicalSeasonSelect || !physicalSeasonSelect.value) {
      alert('Please select a season first');
      return;
    }
    if (!setId) {
      alert('Set ID is required for physical sets');
      return;
    }
    currentPeriod = physicalSeasonSelect.value;
  }
  
  // For tactical, period can be "all" or a specific period
  if (currentCategory !== 'tactical' && currentCategory !== 'physical' && !currentPeriod) {
    alert('Please select a period first');
    return;
  }
  
  // For tactical, set period to "all" if not selected
  if (currentCategory === 'tactical' && !currentPeriod) {
    currentPeriod = 'all';
  }

  currentSection = section;
  
  // Get skill for physical drills
  let skill = '';
  if (currentCategory === 'physical' && section === 'physical-drill') {
    skill = currentPhysicalSkill || '';
  }
  
  // If prefillData is provided (editing existing drill), use it
  if (prefillData) {
    currentDrillData = {
      section: section,
      setId: setId,
      file: null,
      thumbnailFile: null,
      period: currentPeriod,
      category: currentCategory,
      skill: prefillData.skill || skill,
      subSkill: prefillData.subSkill || '',
      customName: prefillData.name || '',
      coachingPoints: prefillData.coachingPoints || '',
      keywords: prefillData.keywords || [],
      existingVideoId: prefillData.id || null // Mark as existing drill
    };
  } else {
    currentDrillData = {
      section: section,
      setId: setId,
      file: null,
      thumbnailFile: null,
      period: currentPeriod,
      category: currentCategory,
      skill: skill,
      subSkill: '',
      customName: '',
      coachingPoints: '',
      keywords: [],
      existingVideoId: null // Track if using existing drill
    };
  }

  // Create modal from template
  const template = document.getElementById('videoUploadModal');
  if (!template) {
    console.error('Upload modal template not found');
    return;
  }

  const modal = template.content.cloneNode(true);
  const modalElement = modal.querySelector('.upload-modal-overlay');
  document.body.appendChild(modalElement);

  // Setup modal event listeners
  setupUploadModalListeners(modalElement);
  
  // Update skill filter buttons (replaces dropdown)
  await updateSkillDropdownsInModal(modalElement);
  
  // For physical sessions, if skill is already selected, set it in modal and auto-populate keywords
  if (currentCategory === 'physical' && currentPhysicalSkill) {
    currentDrillData.skill = currentPhysicalSkill;
    
    // Find and activate the skill button in the modal
    const skillFilterButtons = modalElement.querySelector('#skillFilterButtons');
    if (skillFilterButtons) {
      const skillBtn = skillFilterButtons.querySelector(`[data-skill="${currentPhysicalSkill}"]`);
      if (skillBtn) {
        // Update button states
        skillFilterButtons.querySelectorAll('.skill-filter-btn').forEach(btn => {
          btn.style.background = 'var(--surface)';
          btn.style.color = 'var(--text)';
          btn.style.borderColor = 'var(--border)';
        });
        skillBtn.style.background = 'var(--accent)';
        skillBtn.style.color = 'white';
        skillBtn.style.borderColor = 'var(--accent)';
      }
    }
    
    // Auto-populate keywords based on the already-selected skill
    if (!prefillData || !prefillData.keywords || prefillData.keywords.length === 0) {
      autoPopulateKeywordsFromSkill(modalElement, currentPhysicalSkill);
    }
  }
  
  // If prefillData is provided, populate the form fields
  if (prefillData) {
    const customNameInput = modalElement.querySelector('#customNameInput');
    const coachingPointsInput = modalElement.querySelector('#coachingPointsInput');
    const skillFilterButtons = modalElement.querySelector('#skillFilterButtons');
    const subSkillSelect = modalElement.querySelector('#subSkillSelect');
    
    if (customNameInput) customNameInput.value = prefillData.name || '';
    if (coachingPointsInput) coachingPointsInput.value = prefillData.coachingPoints || '';
    
    // Update skill filter button if skill exists
    if (skillFilterButtons && prefillData.skill) {
      const skillBtn = skillFilterButtons.querySelector(`[data-skill="${prefillData.skill}"]`);
      if (skillBtn) {
        skillFilterButtons.querySelectorAll('.skill-filter-btn').forEach(btn => {
          btn.style.background = 'var(--surface)';
          btn.style.color = 'var(--text)';
          btn.style.borderColor = 'var(--border)';
        });
        skillBtn.style.background = 'var(--accent)';
        skillBtn.style.color = 'white';
        skillBtn.style.borderColor = 'var(--accent)';
        updateSubSkillDropdownInModal(prefillData.skill, modalElement);
      }
    }
    
    if (subSkillSelect && prefillData.subSkill) {
      setTimeout(() => {
        if (subSkillSelect) subSkillSelect.value = prefillData.subSkill;
      }, 200);
    }
  }
  
  // Update button text based on whether we're editing or creating
  const confirmBtn = modalElement.querySelector('#confirmUpload');
  if (confirmBtn) {
    if (prefillData && prefillData.id) {
      // Editing existing drill
      confirmBtn.textContent = 'Save Changes';
    } else {
      // Creating new drill
      confirmBtn.textContent = 'Add Drill';
    }
  }
  
  // Load keywords for all categories (both new and existing drills)
  if (prefillData && prefillData.keywords && prefillData.keywords.length > 0) {
    // Editing existing drill - show keywords as editable tags
    if (currentCategory === 'tactical') {
      loadTacticalKeywords(modalElement, prefillData.keywords);
    } else {
      // For physical/technical/mental, show keywords as editable tags when editing
      displayKeywordsAsTags(modalElement, prefillData.keywords);
    }
  } else {
    // Creating new drill - initialize empty keywords container
    if (currentCategory === 'tactical') {
      loadTacticalKeywords(modalElement);
    } else if (currentCategory === 'technical' || currentCategory === 'physical' || currentCategory === 'mental') {
      // Initialize empty keywords container (will auto-populate when skill is selected)
      loadCategoryKeywords(modalElement);
    }
  }
  
  // Load existing drills
  await loadExistingDrills(modalElement);
}

// Load existing drills for the current category/period/skill
async function loadExistingDrills(modalElement) {
  if (!supabaseReady || !supabase || !currentCategory) return;
  
  // For technical/mental/tactical, we need a period (can be "all")
  if (currentCategory !== 'physical' && !currentPeriod) return;
  
  const existingDrillsSection = modalElement.querySelector('#existingDrillsSection');
  const existingDrillsList = modalElement.querySelector('#existingDrillsList');
  
  if (!existingDrillsSection || !existingDrillsList) return;
  
  // Show loading indicator
  showLoader(existingDrillsList, 'Loading existing drills...');
  
  try {
    // Build query based on category and period
    let query = supabase
      .from('solo_session_videos')
      .select('id, title, description, skill, sub_skill, video_url, thumbnail_url')
      .eq('category', currentCategory);
    
    // For physical, also filter by skill if available
    if (currentCategory === 'physical') {
      const skill = currentPhysicalSkill;
      if (skill) {
        query = query.eq('skill', skill);
      }
    } else {
      // For technical/mental/tactical, filter by skill if selected
      const skill = currentDrillData?.skill;
      if (skill) {
        query = query.eq('skill', skill);
      }
    }
    
    // Filter by period - handle "all" period
    if (currentPeriod === 'all') {
      // For "all" period, include videos from all periods OR period="all"
      query = query.or(`period.eq.all,period.in.(build-out,middle-third,final-third,wide-play)`);
    } else {
      query = query.eq('period', currentPeriod);
    }
    
    // Exclude tactical videos that have skill (those are regular drills)
    if (currentCategory === 'tactical') {
      query = query.is('skill', null);
    } else {
      query = query.not('skill', 'is', null);
    }
    
    const { data: videos, error } = await query.order('created_at', { ascending: false }).limit(20);
    
    if (error) {
      console.error('Error loading existing drills:', error);
      existingDrillsSection.style.display = 'none';
      return;
    }
    
    if (!videos || videos.length === 0) {
      hideLoader(existingDrillsList);
      existingDrillsSection.style.display = 'none';
      return;
    }
    
    // Hide loading indicator
    hideLoader(existingDrillsList);
    
    // Show the section and populate list
    existingDrillsSection.style.display = 'block';
    existingDrillsList.innerHTML = '';
    
    videos.forEach(video => {
      const drillItem = document.createElement('div');
      drillItem.className = 'existing-drill-item';
      drillItem.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: var(--surface);';
      
      // Get thumbnail URL
      let thumbnailUrl = null;
      if (video.thumbnail_url) {
        thumbnailUrl = supabase.storage.from('solo-session-videos').getPublicUrl(video.thumbnail_url).data.publicUrl;
      }
      
      drillItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          ${thumbnailUrl ? `
            <img src="${thumbnailUrl}" 
                 style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;" 
                 alt="Thumbnail">
          ` : `
            <div style="width: 60px; height: 40px; background: var(--surface); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <i class="bx bx-video" style="font-size: 24px; color: var(--muted);"></i>
            </div>
          `}
          <div style="flex: 1;">
            <div style="font-weight: 500; color: var(--text);">${video.title}</div>
            ${video.description ? `<div style="font-size: 0.85rem; color: var(--muted); margin-top: 4px;">${video.description.substring(0, 50)}${video.description.length > 50 ? '...' : ''}</div>` : ''}
          </div>
        </div>
      `;
      
      drillItem.addEventListener('click', () => {
        // Auto-fill fields with existing drill data
        const customNameInput = modalElement.querySelector('#customNameInput');
        const coachingPointsInput = modalElement.querySelector('#coachingPointsInput');
        const skillFilterButtons = modalElement.querySelector('#skillFilterButtons');
        const subSkillSelect = modalElement.querySelector('#subSkillSelect');
        
        if (customNameInput) customNameInput.value = video.title;
        if (coachingPointsInput) coachingPointsInput.value = video.description || '';
        
        // Update skill filter button if skill exists
        if (skillFilterButtons && video.skill) {
          const skillBtn = skillFilterButtons.querySelector(`[data-skill="${video.skill}"]`);
          if (skillBtn) {
            // Update button states
            skillFilterButtons.querySelectorAll('.skill-filter-btn').forEach(btn => {
              btn.style.background = 'var(--surface)';
              btn.style.color = 'var(--text)';
              btn.style.borderColor = 'var(--border)';
            });
            skillBtn.style.background = 'var(--accent)';
            skillBtn.style.color = 'white';
            skillBtn.style.borderColor = 'var(--accent)';
            
            // Update current drill data and sub-skills
            currentDrillData.skill = video.skill;
            updateSubSkillDropdownInModal(video.skill, modalElement);
          } else {
            // If button doesn't exist, just update currentDrillData
            currentDrillData.skill = video.skill;
            updateSubSkillDropdownInModal(video.skill, modalElement);
          }
        }
        
        if (subSkillSelect && video.sub_skill) {
          // Wait a bit for sub-skill dropdown to update
          setTimeout(() => {
            if (subSkillSelect) subSkillSelect.value = video.sub_skill;
          }, 200);
        }
        
        // Update currentDrillData
        currentDrillData.customName = video.title;
        currentDrillData.coachingPoints = video.description || '';
        currentDrillData.skill = video.skill || '';
        currentDrillData.subSkill = video.sub_skill || '';
        currentDrillData.existingVideoId = video.id; // Mark as existing
        currentDrillData.keywords = video.keywords || []; // Load existing keywords
        // Clear file selection when using existing drill
        currentDrillData.file = null;
        
        // Auto-populate keywords: if drill has keywords, show them; otherwise auto-populate from skill
        if (video.keywords && video.keywords.length > 0) {
          // Display existing keywords
          if (currentCategory === 'tactical') {
            loadTacticalKeywords(modalElement, video.keywords);
          } else {
            displayKeywordsAsTags(modalElement, video.keywords);
          }
        } else if (video.skill && (currentCategory === 'technical' || currentCategory === 'physical' || currentCategory === 'mental')) {
          // Auto-populate from skill if no keywords exist
          autoPopulateKeywordsFromSkill(modalElement, video.skill);
        } else if (currentCategory === 'tactical') {
          loadTacticalKeywords(modalElement);
        }
        
        // Clear file input and uploaded files list
        const fileInput = modalElement.querySelector('#videoFileInput');
        const uploadedFilesList = modalElement.querySelector('#uploadedFilesList');
        if (fileInput) fileInput.value = '';
        if (uploadedFilesList) uploadedFilesList.style.display = 'none';
        
        // Update confirm button
        updateConfirmButton(modalElement);
        
        // Highlight selected item
        existingDrillsList.querySelectorAll('.existing-drill-item').forEach(item => {
          item.style.background = 'var(--surface)';
          item.style.borderColor = 'var(--border)';
        });
        drillItem.style.background = 'var(--hover)';
        drillItem.style.borderColor = 'var(--accent)';
      });
      
      drillItem.addEventListener('mouseenter', () => {
        if (drillItem.style.borderColor !== 'var(--accent)') {
          drillItem.style.background = 'var(--hover)';
        }
      });
      
      drillItem.addEventListener('mouseleave', () => {
        if (drillItem.style.borderColor !== 'var(--accent)') {
          drillItem.style.background = 'var(--surface)';
        }
      });
      
      existingDrillsList.appendChild(drillItem);
    });
    
  } catch (error) {
    console.error('Error loading existing drills:', error);
    const existingDrillsList = modalElement.querySelector('#existingDrillsList');
    if (existingDrillsList) hideLoader(existingDrillsList);
    existingDrillsSection.style.display = 'none';
  }
}

// Setup upload modal event listeners
function setupUploadModalListeners(modalElement) {
  const dropzone = modalElement.querySelector('#uploadDropzone');
  const fileInput = modalElement.querySelector('#videoFileInput');
  const chooseFilesBtn = modalElement.querySelector('.btn-choose-files');
  const closeBtn = modalElement.querySelector('.close-modal');
  const cancelBtn = modalElement.querySelector('#cancelUpload');
  const confirmBtn = modalElement.querySelector('#confirmUpload');
  const skillSelect = modalElement.querySelector('#skillSelect');
  const customNameInput = modalElement.querySelector('#customNameInput');
  const coachingPointsInput = modalElement.querySelector('#coachingPointsInput');
  const thumbnailInput = modalElement.querySelector('#thumbnailFileInput');
  const chooseThumbnailBtn = modalElement.querySelector('.btn-choose-thumbnail');
  const thumbnailPreview = modalElement.querySelector('#thumbnailPreview');
  const thumbnailPreviewImg = modalElement.querySelector('#thumbnailPreviewImg');
  const removeThumbnailBtn = modalElement.querySelector('.remove-thumbnail');

  // File input
  if (chooseFilesBtn && fileInput) {
    chooseFilesBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleFileSelect(e.target.files[0], modalElement);
    });
  }

  // Drag & drop
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        handleFileSelect(file, modalElement);
      }
    });
  }

  // Skill change
  if (skillSelect) {
    skillSelect.addEventListener('change', (e) => {
      currentDrillData.skill = e.target.value;
      updateSubSkillDropdownInModal(e.target.value, modalElement);
      updateConfirmButton(modalElement);
    });
  }

  // Sub-skill change
  const subSkillSelect = modalElement.querySelector('#subSkillSelect');
  if (subSkillSelect) {
    subSkillSelect.addEventListener('change', (e) => {
      currentDrillData.subSkill = e.target.value;
      
      // If sub-skill has a keyword mapping, auto-populate it
      // Note: Sub-skills might not have direct keyword mappings, but we can try
      if (e.target.value && (currentCategory === 'technical' || currentCategory === 'physical' || currentCategory === 'mental')) {
        const subSkillKeyword = getKeywordForSkill(currentCategory, e.target.value);
        if (subSkillKeyword) {
          // Add sub-skill keyword if not already present
          if (!currentDrillData.keywords) {
            currentDrillData.keywords = [];
          }
          const allSubSkillKeywords = [subSkillKeyword.keyword, ...subSkillKeyword.synonyms];
          allSubSkillKeywords.forEach(kw => {
            if (!currentDrillData.keywords.includes(kw)) {
              currentDrillData.keywords.push(kw);
            }
          });
          displayKeywordsAsTags(modalElement, currentDrillData.keywords);
        }
      }
    });
  }

  // Custom name change
  if (customNameInput) {
    customNameInput.addEventListener('input', (e) => {
      currentDrillData.customName = e.target.value;
      updateConfirmButton(modalElement);
    });
  }

  // Coaching points change
  if (coachingPointsInput) {
    coachingPointsInput.addEventListener('input', (e) => {
      currentDrillData.coachingPoints = e.target.value;
    });
  }

  // Thumbnail upload
  if (chooseThumbnailBtn && thumbnailInput) {
    chooseThumbnailBtn.addEventListener('click', () => {
      thumbnailInput.click();
    });
  }

  if (thumbnailInput) {
    thumbnailInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
          alert('Thumbnail size must be less than 5MB');
          return;
        }
        currentDrillData.thumbnailFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (thumbnailPreviewImg) {
            thumbnailPreviewImg.src = e.target.result;
          }
          if (thumbnailPreview) {
            thumbnailPreview.style.display = 'block';
          }
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select an image file');
      }
    });
  }

  // Remove thumbnail
  if (removeThumbnailBtn) {
    removeThumbnailBtn.addEventListener('click', () => {
      currentDrillData.thumbnailFile = null;
      if (thumbnailInput) {
        thumbnailInput.value = '';
      }
      if (thumbnailPreview) {
        thumbnailPreview.style.display = 'none';
      }
    });
  }

  // Close modal
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modalElement.remove();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      modalElement.remove();
    });
  }

  // Confirm upload
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      await handleVideoUpload(modalElement);
    });
  }

  // Update skill dropdown in modal
  updateSkillDropdownsInModal(modalElement);
  
  // Update upload hint based on category
  const uploadHint = modalElement.querySelector('#uploadHint');
  if (uploadHint) {
    if (currentCategory === 'tactical') {
      uploadHint.textContent = 'Only .mp4, .mov, .webm files. 150MB max file size.';
    } else {
      uploadHint.textContent = 'Only .mp4, .mov, .webm files. 100MB max file size.';
    }
  }
  
  // For tactical, hide skill/subskill/reps/sets fields and show only keywords
  if (currentCategory === 'tactical') {
    const uploadFormFields = modalElement.querySelector('.upload-form-fields');
    if (uploadFormFields) {
      // Hide skill, subskill, custom name fields
      const skillField = modalElement.querySelector('.form-field:has(#skillFilterButtons)');
      const subSkillField = modalElement.querySelector('#subSkillField');
      const customNameField = modalElement.querySelector('.form-field:has(#customNameInput)');
      
      if (skillField) skillField.style.display = 'none';
      if (subSkillField) subSkillField.style.display = 'none';
      if (customNameField) customNameField.style.display = 'none';
      
      // Show keywords field
      const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
      if (keywordsField) {
        keywordsField.style.display = 'block';
        // Load tactical keywords for the selected period
        loadTacticalKeywords(modalElement);
      }
    }
    
    // Update confirm button to only require file for tactical
    updateConfirmButton(modalElement);
  } else if (currentCategory === 'physical') {
    // For physical, hide skill field (skill is selected before opening modal)
    const skillField = modalElement.querySelector('.form-field:has(#skillSelect)');
    if (skillField) skillField.style.display = 'none';
    
    // Show keywords field for physical sessions (keywords will be loaded in openUploadModal)
    const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
    if (keywordsField) {
      keywordsField.style.display = 'block';
    }
  } else if (currentCategory === 'technical' || currentCategory === 'mental') {
    // Show keywords field for technical/mental sessions (keywords will be loaded in openUploadModal)
    const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
    if (keywordsField) {
      keywordsField.style.display = 'block';
    }
  }
}

// Handle file selection
async function handleFileSelect(file, modalElement) {
  if (!file || !file.type.startsWith('video/')) {
    alert('Please select a video file');
    return;
  }

  // Different file size limits for tactical vs other categories
  const maxFileSize = currentCategory === 'tactical' ? 150 * 1024 * 1024 : 100 * 1024 * 1024; // 150MB for tactical, 100MB for others
  const maxFileSizeMB = currentCategory === 'tactical' ? 150 : 100;
  
  if (file.size > maxFileSize) {
    alert(`File size must be less than ${maxFileSizeMB}MB`);
    return;
  }

  // For tactical videos, check minimum duration (1 minute)
  if (currentCategory === 'tactical') {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      const durationPromise = new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = reject;
        video.src = URL.createObjectURL(file);
      });
      
      const duration = await durationPromise;
      
      if (duration < 60) { // Less than 60 seconds (1 minute)
        alert('Tactical videos must be at least 1 minute in duration');
        return;
      }
    } catch (error) {
      console.warn('Could not verify video duration:', error);
      // Continue anyway, but warn user
      if (!confirm('Could not verify video duration. Please ensure the video is at least 1 minute long. Continue anyway?')) {
        return;
      }
    }
  }

  currentDrillData.file = file;
  // Clear existing drill selection when new file is selected
  currentDrillData.existingVideoId = null;
  
  // Clear selection highlight in existing drills list
  const existingDrillsList = modalElement.querySelector('#existingDrillsList');
  if (existingDrillsList) {
    existingDrillsList.querySelectorAll('.existing-drill-item').forEach(item => {
      item.style.background = 'var(--surface)';
      item.style.borderColor = 'var(--border)';
    });
  }
  
  // Show file in list
  showFileInList(file, modalElement);
  updateConfirmButton(modalElement);
}

// Show file in uploaded files list
function showFileInList(file, modalElement) {
  const uploadedFilesList = modalElement.querySelector('#uploadedFilesList');
  const filesList = modalElement.querySelector('#filesList');
  
  if (!uploadedFilesList || !filesList) return;

  uploadedFilesList.style.display = 'block';
  filesList.innerHTML = '';

  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.innerHTML = `
    <div class="file-info">
      <i class="bx bx-video file-icon"></i>
      <div class="file-details">
        <div class="file-name">${file.name}</div>
        <div class="file-status">Ready to upload</div>
        <div class="file-progress">
          <div class="file-progress-bar" style="width: 0%"></div>
        </div>
      </div>
    </div>
    <div class="file-actions">
      <button class="file-action-btn" type="button" aria-label="Remove">
        <i class="bx bx-trash"></i>
      </button>
    </div>
  `;

  // Remove file handler
  const removeBtn = fileItem.querySelector('.file-action-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentDrillData.file = null;
      fileItem.remove();
      if (filesList.children.length === 0) {
        uploadedFilesList.style.display = 'none';
      }
      updateConfirmButton(modalElement);
    });
  }

  filesList.appendChild(fileItem);
}

// Update confirm button state
function updateConfirmButton(modalElement) {
  const confirmBtn = modalElement.querySelector('#confirmUpload');
  if (!confirmBtn) return;

  // If using existing drill, enable button
  if (currentDrillData && currentDrillData.existingVideoId) {
    confirmBtn.disabled = false;
    return;
  }

  const hasFile = currentDrillData && currentDrillData.file;
  
  // For tactical, only require file
  if (currentCategory === 'tactical') {
    confirmBtn.disabled = !hasFile;
    return;
  }
  
  // For other categories, require file, skill, and custom name
  const hasSkill = currentDrillData && currentDrillData.skill;
  const hasCustomName = currentDrillData && currentDrillData.customName.trim();

  confirmBtn.disabled = !(hasFile && hasSkill && hasCustomName);
}

// Load keywords for physical/technical/mental categories (simple display)
function loadKeywordsForCategory(modalElement, existingKeywords = []) {
  const keywordsContainer = modalElement.querySelector('#keywordsContainer');
  if (!keywordsContainer) return;
  
  // Initialize currentDrillData.keywords if not set
  if (!currentDrillData.keywords) {
    currentDrillData.keywords = existingKeywords.length > 0 ? [...existingKeywords] : [];
  } else if (existingKeywords.length > 0) {
    // Merge existing keywords with current ones (avoid duplicates)
    existingKeywords.forEach(kw => {
      if (!currentDrillData.keywords.includes(kw)) {
        currentDrillData.keywords.push(kw);
      }
    });
  }
  
  // Clear container
  keywordsContainer.innerHTML = '';
  
  // Always show the keywords field when editing, even if empty
  const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
  if (keywordsField) {
    keywordsField.style.display = 'block';
  }
  
  if (existingKeywords.length === 0) {
    // Show input for adding keywords even if none exist
    const addKeywordInput = document.createElement('input');
    addKeywordInput.type = 'text';
    addKeywordInput.placeholder = 'Add keyword (press Enter)...';
    addKeywordInput.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 16px; font-size: 0.85rem; width: 100%;';
    addKeywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        const newKeyword = e.target.value.trim();
        if (!currentDrillData.keywords.includes(newKeyword)) {
          currentDrillData.keywords.push(newKeyword);
          loadKeywordsForCategory(modalElement, currentDrillData.keywords);
        }
        e.target.value = '';
      }
    });
    keywordsContainer.appendChild(addKeywordInput);
    return;
  }
  
  // Display keywords as editable tags
  const keywordsWrapper = document.createElement('div');
  keywordsWrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px;';
  
  existingKeywords.forEach((keyword, index) => {
    const keywordTag = document.createElement('div');
    keywordTag.className = 'keyword-tag';
    keywordTag.style.cssText = 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--accent); color: white; border-radius: 16px; font-size: 0.85rem;';
    
    const keywordText = document.createElement('span');
    keywordText.textContent = keyword;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="bx bx-x"></i>';
    removeBtn.style.cssText = 'background: transparent; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center;';
    removeBtn.addEventListener('click', () => {
      currentDrillData.keywords = currentDrillData.keywords.filter(k => k !== keyword);
      keywordTag.remove();
      if (currentDrillData.keywords.length === 0) {
        keywordsContainer.innerHTML = '<p class="keywords-hint">No keywords set. Keywords can be added when saving the drill.</p>';
      }
    });
    
    keywordTag.appendChild(keywordText);
    keywordTag.appendChild(removeBtn);
    keywordsWrapper.appendChild(keywordTag);
  });
  
  // Add input for new keywords
  const addKeywordInput = document.createElement('input');
  addKeywordInput.type = 'text';
  addKeywordInput.placeholder = 'Add keyword...';
  addKeywordInput.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 16px; font-size: 0.85rem; flex: 1; min-width: 150px;';
  addKeywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newKeyword = e.target.value.trim();
      if (!currentDrillData.keywords.includes(newKeyword)) {
        currentDrillData.keywords.push(newKeyword);
        loadKeywordsForCategory(modalElement, currentDrillData.keywords);
      }
      e.target.value = '';
    }
  });
  
  keywordsWrapper.appendChild(addKeywordInput);
  keywordsContainer.appendChild(keywordsWrapper);
  
  // Keywords field is already shown at the beginning of the function
}

// Load keywords for technical/physical/mental categories from drill-keywords.js
// This function now just initializes the keywords container (empty state)
function loadCategoryKeywords(modalElement, existingKeywords = []) {
  const keywordsContainer = modalElement.querySelector('#keywordsContainer');
  if (!keywordsContainer) {
    console.error('Keywords container not found');
    return;
  }
  
  if (!currentCategory) {
    console.error('Current category not set');
    return;
  }
  
  // Initialize currentDrillData.keywords if not set
  if (!currentDrillData.keywords) {
    currentDrillData.keywords = existingKeywords.length > 0 ? [...existingKeywords] : [];
  } else if (existingKeywords.length > 0) {
    // Merge existing keywords with current ones (avoid duplicates)
    existingKeywords.forEach(kw => {
      if (!currentDrillData.keywords.includes(kw)) {
        currentDrillData.keywords.push(kw);
      }
    });
  }
  
  // Show the keywords field
  const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
  if (keywordsField) {
    keywordsField.style.display = 'block';
  }
  
  // If we have existing keywords, display them
  if (currentDrillData.keywords && currentDrillData.keywords.length > 0) {
    displayKeywordsAsTags(modalElement, currentDrillData.keywords);
  } else {
    // Show empty state hint
    keywordsContainer.innerHTML = '<p class="keywords-hint">Keywords will be populated automatically when you select a skill</p>';
  }
}

// Auto-populate keywords based on selected skill
function autoPopulateKeywordsFromSkill(modalElement, skill) {
  if (!skill || !currentCategory) return;
  
  // Get keyword data for this skill
  const keywordData = getKeywordForSkill(currentCategory, skill);
  
  if (!keywordData) {
    console.log('No keyword data found for skill:', skill);
    return;
  }
  
  // Initialize keywords array if needed
  if (!currentDrillData.keywords) {
    currentDrillData.keywords = [];
  }
  
  // Add the main keyword and all synonyms (avoid duplicates)
  const allKeywords = [keywordData.keyword, ...keywordData.synonyms];
  allKeywords.forEach(kw => {
    if (!currentDrillData.keywords.includes(kw)) {
      currentDrillData.keywords.push(kw);
    }
  });
  
  // Display keywords as tags
  displayKeywordsAsTags(modalElement, currentDrillData.keywords);
}

// Display keywords as editable tags (similar to loadKeywordsForCategory)
function displayKeywordsAsTags(modalElement, keywords) {
  const keywordsContainer = modalElement.querySelector('#keywordsContainer');
  if (!keywordsContainer) return;
  
  // Clear container
  keywordsContainer.innerHTML = '';
  
  if (!keywords || keywords.length === 0) {
    keywordsContainer.innerHTML = '<p class="keywords-hint">Keywords will be populated automatically when you select a skill</p>';
    return;
  }
  
  // Create tags wrapper
  const tagsWrapper = document.createElement('div');
  tagsWrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;';
  
  keywords.forEach((keyword, index) => {
    const tag = document.createElement('div');
    tag.className = 'keyword-tag';
    tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--accent); color: white; border-radius: 16px; font-size: 0.85rem;';
    
    const tagText = document.createElement('span');
    tagText.textContent = keyword;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '<i class="bx bx-x"></i>';
    removeBtn.style.cssText = 'background: transparent; border: none; color: white; cursor: pointer; padding: 0; display: flex; align-items: center; font-size: 1rem;';
    removeBtn.addEventListener('click', () => {
      // Remove keyword from array
      currentDrillData.keywords = currentDrillData.keywords.filter(k => k !== keyword);
      // Re-render tags
      displayKeywordsAsTags(modalElement, currentDrillData.keywords);
    });
    
    tag.appendChild(tagText);
    tag.appendChild(removeBtn);
    tagsWrapper.appendChild(tag);
  });
  
  // Add input for adding new keywords
  const addKeywordInput = document.createElement('input');
  addKeywordInput.type = 'text';
  addKeywordInput.placeholder = 'Add keyword...';
  addKeywordInput.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border); border-radius: 16px; font-size: 0.85rem; flex: 1; min-width: 150px;';
  addKeywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newKeyword = e.target.value.trim();
      if (!currentDrillData.keywords.includes(newKeyword)) {
        currentDrillData.keywords.push(newKeyword);
        displayKeywordsAsTags(modalElement, currentDrillData.keywords);
      }
      e.target.value = '';
    }
  });
  
  keywordsContainer.appendChild(tagsWrapper);
  keywordsContainer.appendChild(addKeywordInput);
}

// Load tactical keywords for the selected period, organized by phase
function loadTacticalKeywords(modalElement, existingKeywords = []) {
  const keywordsContainer = modalElement.querySelector('#keywordsContainer');
  if (!keywordsContainer || !currentPeriod) return;
  
  // Get phases for the current period
  const phases = getPhasesForPeriod(currentPeriod);
  
  if (phases.length === 0) {
    keywordsContainer.innerHTML = '<p class="keywords-hint">No keywords available for this period</p>';
    return;
  }
  
  // Clear container
  keywordsContainer.innerHTML = '';
  
  // Initialize currentDrillData.keywords if not set
  if (!currentDrillData.keywords) {
    currentDrillData.keywords = existingKeywords.length > 0 ? [...existingKeywords] : [];
  } else if (existingKeywords.length > 0) {
    // Merge existing keywords with current ones (avoid duplicates)
    existingKeywords.forEach(kw => {
      if (!currentDrillData.keywords.includes(kw)) {
        currentDrillData.keywords.push(kw);
      }
    });
  }
  
  // Show the keywords field
  const keywordsField = modalElement.querySelector('.form-field:has(#keywordsContainer)');
  if (keywordsField) {
    keywordsField.style.display = 'block';
  }
  
  // Phase display names
  const phaseNames = {
    'attacking': 'Attacking',
    'defending': 'Defending',
    'transition-d-to-a': 'Transition: Defend → Attack',
    'transition-a-to-d': 'Transition: Attack → Defend'
  };
  
  // Create phase dropdown
  const phaseSelectWrapper = document.createElement('div');
  phaseSelectWrapper.className = 'keyword-phase-select-wrapper';
  phaseSelectWrapper.style.cssText = 'margin-bottom: 1rem;';
  
  const phaseSelect = document.createElement('select');
  phaseSelect.id = 'tacticalPhaseSelect';
  phaseSelect.className = 'form-select';
  phaseSelect.style.cssText = 'width: 100%; max-width: 300px;';
  
  // Add default option
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Phase';
  phaseSelect.appendChild(defaultOption);
  
  // Add phase options
  phases.forEach(phase => {
    const option = document.createElement('option');
    option.value = phase;
    option.textContent = phaseNames[phase] || phase;
    phaseSelect.appendChild(option);
  });
  
  // Keywords display area
  const keywordsDisplay = document.createElement('div');
  keywordsDisplay.id = 'keywordsDisplay';
  keywordsDisplay.className = 'keywords-display';
  
  // Function to render keywords for selected phase
  const renderKeywordsForPhase = (selectedPhase) => {
    keywordsDisplay.innerHTML = '';
    
    if (!selectedPhase) {
      keywordsDisplay.innerHTML = '<p class="keywords-hint">Select a phase to view keywords</p>';
      return;
    }
    
    const keywords = getKeywordsForPeriodAndPhase(currentPeriod, selectedPhase);
    
    if (keywords.length === 0) {
      keywordsDisplay.innerHTML = '<p class="keywords-hint">No keywords available for this phase</p>';
      return;
    }
    
    // Keywords grid
    const keywordsGrid = document.createElement('div');
    keywordsGrid.className = 'keyword-grid';
    
    // Create keyword checkboxes
    keywords.forEach(keywordObj => {
      const keywordItem = document.createElement('div');
      keywordItem.className = 'keyword-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `keyword-${selectedPhase}-${keywordObj.keyword.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '')}`;
      checkbox.value = keywordObj.keyword;
      
      // Check if this keyword is in the existing keywords
      const isChecked = currentDrillData.keywords.includes(keywordObj.keyword);
      checkbox.checked = isChecked;
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!currentDrillData.keywords) {
            currentDrillData.keywords = [];
          }
          if (!currentDrillData.keywords.includes(e.target.value)) {
            currentDrillData.keywords.push(e.target.value);
          }
        } else {
          currentDrillData.keywords = currentDrillData.keywords.filter(k => k !== e.target.value);
        }
        
        // Update visual state
        if (e.target.checked) {
          keywordItem.classList.add('checked');
        } else {
          keywordItem.classList.remove('checked');
        }
      });
      
      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = keywordObj.keyword;
      label.className = 'keyword-label';
      
      keywordItem.appendChild(checkbox);
      keywordItem.appendChild(label);
      keywordsGrid.appendChild(keywordItem);
      
      // Set initial visual state
      if (isChecked) {
        keywordItem.classList.add('checked');
      }
    });
    
    keywordsDisplay.appendChild(keywordsGrid);
  };
  
  // Phase dropdown change handler
  phaseSelect.addEventListener('change', (e) => {
    renderKeywordsForPhase(e.target.value);
  });
  
  // Initial render (no phase selected)
  renderKeywordsForPhase('');
  
  phaseSelectWrapper.appendChild(phaseSelect);
  keywordsContainer.appendChild(phaseSelectWrapper);
  keywordsContainer.appendChild(keywordsDisplay);
}

// Handle video upload
async function handleVideoUpload(modalElement) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    alert('Not logged in');
    return;
  }
  
  // Show loading overlay for upload
  showLoaderOverlay('Uploading video...');

  // Check if using existing drill (no file upload needed)
  if (currentDrillData && currentDrillData.existingVideoId) {
    // Get the existing video record
    const { data: videoRecord, error: dbError } = await supabase
      .from('solo_session_videos')
      .select('*')
      .eq('id', currentDrillData.existingVideoId)
      .single();
    
    if (dbError) {
      alert(`Error loading existing drill: ${dbError.message}`);
      return;
    }
    
    // Update video record if keywords, title, or description changed
    const updateData = {};
    if (currentDrillData.keywords && JSON.stringify(currentDrillData.keywords) !== JSON.stringify(videoRecord.keywords || [])) {
      updateData.keywords = currentDrillData.keywords;
    }
    if (currentDrillData.customName && currentDrillData.customName !== videoRecord.title) {
      updateData.title = currentDrillData.customName;
    }
    if (currentDrillData.coachingPoints !== undefined && currentDrillData.coachingPoints !== videoRecord.description) {
      updateData.description = currentDrillData.coachingPoints || null;
    }
    
    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('solo_session_videos')
        .update(updateData)
        .eq('id', currentDrillData.existingVideoId);
      
      if (updateError) {
        console.error('Error updating video record:', updateError);
        // Continue anyway - the drill will still be added
      }
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('solo-session-videos')
      .getPublicUrl(videoRecord.video_url);
    
    // Check if we're editing an existing drill in the section
    // If the drill already exists in the section, update it instead of adding a new one
    const existingDrillElement = findDrillInSection(currentDrillData.section, videoRecord.id);
    if (existingDrillElement) {
      // Update existing drill in section
      updateDrillInSection(currentDrillData.section, videoRecord.id, {
        id: videoRecord.id,
        name: currentDrillData.customName || videoRecord.title,
        path: videoRecord.video_url,
        videoUrl: publicUrl,
        keywords: currentDrillData.keywords || videoRecord.keywords || [],
        coachingPoints: currentDrillData.coachingPoints || videoRecord.description || ''
      });
    } else {
      // Add drill to section using existing video (for new additions)
      addDrillToSection(currentDrillData.section, {
        id: videoRecord.id,
        name: currentDrillData.customName || videoRecord.title,
        path: videoRecord.video_url,
        videoUrl: publicUrl,
        restTime: null,
        reps: null,
        sets: null,
        keywords: currentDrillData.keywords || videoRecord.keywords || []
      });
    }
    
    // Hide loading overlay
    hideLoaderOverlay();
    
    // Close modal
    setTimeout(() => {
      modalElement.remove();
    }, 500);
    
    return; // Exit early, no upload needed
  }

  // Verify user is coach/admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    alert('Only coaches and admins can upload videos');
    return;
  }

  const confirmBtn = modalElement.querySelector('#confirmUpload');
  const fileItem = modalElement.querySelector('.file-item');
  const progressBar = modalElement.querySelector('.file-progress-bar');
  const fileStatus = modalElement.querySelector('.file-status');

  if (confirmBtn) confirmBtn.disabled = true;
  if (fileStatus) fileStatus.textContent = 'Uploading...';
  if (fileStatus) fileStatus.className = 'file-status uploading';

  try {
    // Sanitize custom name - remove invalid characters for file paths
    const sanitizeFileName = (name) => {
      return name
        .trim()
        .toLowerCase()
        .replace(/[|?*"<>:/\\.]/g, '') // Remove invalid characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    };

    // For tactical, generate unique filename (no skill/subskill required)
    let customName, fileName, folderPath, fullPath;
    
    if (currentCategory === 'tactical') {
      // Generate unique filename using timestamp
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      customName = `tactical-${timestamp}-${randomId}`;
      fileName = `${customName}.mp4`;
      folderPath = `${currentDrillData.period || 'all'}/${currentDrillData.category}`;
      fullPath = `${folderPath}/${fileName}`;
    } else {
      customName = sanitizeFileName(currentDrillData.customName);
      
      if (!customName) {
        throw new Error('Custom name is required and must contain valid characters');
      }

      // Build folder path
      const subSkillPath = currentDrillData.subSkill ? `/${currentDrillData.subSkill}` : '';
      fileName = `${currentDrillData.period}-${currentDrillData.category}-${currentDrillData.skill}${currentDrillData.subSkill ? '-' + currentDrillData.subSkill : ''}-${customName}.mp4`;
      folderPath = `${currentDrillData.period}/${currentDrillData.category}/${currentDrillData.skill}${subSkillPath}`;
      fullPath = `${folderPath}/${fileName}`;
    }

    // Upload to Supabase Storage (folders will be created automatically)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('solo-session-videos')
      .upload(fullPath, currentDrillData.file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    if (progressBar) progressBar.style.width = '100%';
    if (fileStatus) fileStatus.textContent = 'Upload complete';

    // Upload thumbnail if provided
    let thumbnailUrl = null;
    if (currentDrillData.thumbnailFile) {
      const thumbnailFileName = `${customName}-thumbnail.png`;
      const thumbnailPath = `${folderPath}/${thumbnailFileName}`;
      
      const { data: thumbnailUploadData, error: thumbnailError } = await supabase.storage
        .from('solo-session-videos')
        .upload(thumbnailPath, currentDrillData.thumbnailFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (!thumbnailError) {
        thumbnailUrl = thumbnailPath;
      } else {
        console.warn('Thumbnail upload failed:', thumbnailError);
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('solo-session-videos')
      .getPublicUrl(fullPath);

    // Insert into database
    const insertData = {
      video_url: fullPath,
      thumbnail_url: thumbnailUrl,
      period: currentDrillData.period || 'all',
      category: currentDrillData.category,
      title: currentCategory === 'tactical' ? `Tactical Video - ${new Date().toLocaleDateString()}` : currentDrillData.customName,
      description: currentDrillData.coachingPoints || null,
      keywords: currentDrillData.keywords || [],
      difficulty_level: 'beginner', // Default, can be added to form later
      created_by: session.user.id
    };
    
    // Only add skill/sub_skill for non-tactical videos
    if (currentCategory !== 'tactical') {
      insertData.skill = currentDrillData.skill;
      insertData.sub_skill = currentDrillData.subSkill || null;
    }
    
    const { data: videoRecord, error: dbError } = await supabase
      .from('solo_session_videos')
      .insert(insertData)
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // Add drill to section
    // Note: For physical, duration/reps/sets are entered after adding the drill, not in the modal
    addDrillToSection(currentDrillData.section, {
      id: videoRecord.id,
      name: currentCategory === 'tactical' ? `Tactical Video - ${new Date().toLocaleDateString()}` : currentDrillData.customName,
      path: fullPath,
      videoUrl: publicUrl,
      restTime: null, // Will be set after drill is added
      reps: null, // Will be set after drill is added (not in modal for physical)
      sets: null, // Will be set after drill is added (not in modal for physical)
      keywords: currentDrillData.keywords || [] // Include keywords
    });

    // Hide loading overlay
    hideLoaderOverlay();
    
    // Close modal
    setTimeout(() => {
      modalElement.remove();
    }, 1000);

  } catch (error) {
    console.error('Upload error:', error);
    hideLoaderOverlay();
    if (fileStatus) {
      fileStatus.textContent = 'Upload failed';
      fileStatus.className = 'file-status failed';
    }
    if (confirmBtn) confirmBtn.disabled = false;
    alert(`Upload failed: ${error.message}`);
  }
}

// Add drill to section
function addDrillToSection(section, drillData) {
  // Handle physical drills (new structure with season + skill + sets)
  if (section === 'physical-drill') {
    const season = currentPeriod; // in-season or off-season
    const skill = currentDrillData.skill;
    const setId = currentDrillData.setId;
    
    if (season && skill && setId) {
      const storageKey = `${season}-${skill}`;
      if (!physicalSets[storageKey]) {
        physicalSets[storageKey] = [];
      }
      
      // Find the set and add drill to it
      const set = physicalSets[storageKey].find(s => s.id === setId);
      if (set) {
        if (!set.drills) set.drills = [];
        set.drills.push(drillData);
        // Re-render to show the new drill
        renderPhysicalContentWithFilters(season, skill);
      }
    }
    return;
  }
  
  // Handle physical sets (old structure - keeping for backward compatibility)
  if (section === 'physical-set' && currentDrillData.setId) {
    const setId = currentDrillData.setId;
    const season = currentPeriod; // in-season or off-season
    
    // Find the set and add drill to it
    if (physicalSets[currentPhysicalTab] && physicalSets[currentPhysicalTab][season]) {
      const set = physicalSets[currentPhysicalTab][season].find(s => s.id === setId);
      if (set) {
        set.drills.push(drillData);
        // Re-render the set to show the new drill
        renderPhysicalTabContent(currentPhysicalTab, season);
      }
    }
    return;
  }
  
  const sectionMap = {
    'warm-up': 'warmUpDrills',
    'main-exercises': 'mainExercisesDrills',
    'finishing-passing': 'finishingPassingDrills',
    'drills': 'simpleDrills'
  };

  const containerId = sectionMap[section];
  if (!containerId) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  const template = document.getElementById('drillItemTemplate');
  if (!template) return;

  const drillItem = template.content.cloneNode(true);
  const drillElement = drillItem.querySelector('.drill-item');
  const drillName = drillElement.querySelector('.drill-name');
  const drillPath = drillElement.querySelector('.drill-path');
  const removeBtn = drillElement.querySelector('.drill-remove');
  const editBtn = drillElement.querySelector('.drill-edit');
  const restInput = drillItem.querySelector('.drill-rest-input');
  const repsInput = drillItem.querySelector('.drill-reps-input');
  const setsInput = drillItem.querySelector('.drill-sets-input');

  drillName.textContent = drillData.name;
  drillPath.textContent = drillData.path;
  
  // Store drill data
  drillElement.dataset.drillId = drillData.id;
  drillElement.dataset.drillPath = drillData.path;
  
  // Hide drill parameters for tactical category (just videos, no reps/sets/rest time)
  const drillParameters = drillItem.querySelector('.drill-parameters');
  if (drillParameters && currentCategory === 'tactical') {
    drillParameters.style.display = 'none';
  }
  
  // Populate parameters if they exist
  if (restInput && drillData.restTime) restInput.value = drillData.restTime;
  if (repsInput && drillData.reps) repsInput.value = drillData.reps;
  if (setsInput && drillData.sets) setsInput.value = drillData.sets;

  // Edit button - open modal with drill data
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      // If drillData doesn't have keywords, fetch from database
      let fullDrillData = drillData;
      if (!drillData.keywords && drillData.id) {
        const { data: video } = await supabase
          .from('solo_session_videos')
          .select('*')
          .eq('id', drillData.id)
          .single();
        
        if (video) {
          fullDrillData = {
            ...drillData,
            keywords: video.keywords || [],
            coachingPoints: video.description || drillData.coachingPoints || '',
            skill: video.skill || drillData.skill || '',
            subSkill: video.sub_skill || drillData.subSkill || ''
          };
        }
      }
      await editDrillInSession(fullDrillData.id, section, fullDrillData);
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      drillElement.remove();
    });
  }

  container.appendChild(drillItem);
}

// Find drill element in section by ID
function findDrillInSection(section, drillId) {
  // Handle physical drills
  if (section === 'physical-drill') {
    const season = currentPeriod;
    const skill = currentDrillData.skill;
    const setId = currentDrillData.setId;
    
    if (season && skill && setId) {
      const storageKey = `${season}-${skill}`;
      const set = physicalSets[storageKey]?.find(s => s.id === setId);
      if (set && set.drills) {
        return set.drills.find(d => d.id === drillId);
      }
    }
    return null;
  }
  
  // Handle other sections
  const sectionMap = {
    'warm-up': 'warmUpDrills',
    'main-exercises': 'mainExercisesDrills',
    'finishing-passing': 'finishingPassingDrills',
    'drills': 'simpleDrills'
  };

  const containerId = sectionMap[section];
  if (!containerId) return null;

  const container = document.getElementById(containerId);
  if (!container) return null;

  // Find the existing drill element in DOM
  return container.querySelector(`[data-drill-id="${drillId}"]`);
}

// Update existing drill in section (instead of adding a new one)
function updateDrillInSection(section, drillId, updatedDrillData) {
  // Handle physical drills
  if (section === 'physical-drill') {
    const season = currentPeriod;
    const skill = currentDrillData.skill;
    const setId = currentDrillData.setId;
    
    if (season && skill && setId) {
      const storageKey = `${season}-${skill}`;
      const set = physicalSets[storageKey]?.find(s => s.id === setId);
      if (set && set.drills) {
        const drillIndex = set.drills.findIndex(d => d.id === drillId);
        if (drillIndex > -1) {
          // Update the drill data
          set.drills[drillIndex] = {
            ...set.drills[drillIndex],
            ...updatedDrillData
          };
          // Re-render to show updated drill
          renderPhysicalContentWithFilters(season, skill);
          return;
        }
      }
    }
    return;
  }
  
  // Handle other sections (warm-up, main-exercises, finishing-passing, drills)
  const sectionMap = {
    'warm-up': 'warmUpDrills',
    'main-exercises': 'mainExercisesDrills',
    'finishing-passing': 'finishingPassingDrills',
    'drills': 'simpleDrills'
  };

  const containerId = sectionMap[section];
  if (!containerId) return;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Find the existing drill element
  const existingDrillElement = container.querySelector(`[data-drill-id="${drillId}"]`);
  if (existingDrillElement) {
    // Update the drill name if it changed
    const drillName = existingDrillElement.querySelector('.drill-name');
    if (drillName && updatedDrillData.name) {
      drillName.textContent = updatedDrillData.name;
    }
    
    // Update the drill path if it changed
    const drillPath = existingDrillElement.querySelector('.drill-path');
    if (drillPath && updatedDrillData.path) {
      drillPath.textContent = updatedDrillData.path;
    }
    
    // Store updated keywords in dataset for future edits
    if (updatedDrillData.keywords) {
      existingDrillElement.dataset.keywords = JSON.stringify(updatedDrillData.keywords);
    }
    
    // Hide drill parameters for tactical category (just videos, no reps/sets/rest time)
    const drillParameters = existingDrillElement.querySelector('.drill-parameters');
    if (drillParameters && currentCategory === 'tactical') {
      drillParameters.style.display = 'none';
    }
    
    // Note: Rest time, reps, and sets are handled by the input fields directly
    // They don't need to be updated here as they're already in the DOM
  }
}

// Create drill element for physical sets
function createDrillElement(drill, section, setId) {
  const template = document.getElementById('drillItemTemplate');
  if (!template) return null;

  const drillItem = template.content.cloneNode(true);
  const drillElement = drillItem.querySelector('.drill-item');
  const drillName = drillElement.querySelector('.drill-name');
  const drillPath = drillElement.querySelector('.drill-path');
  const removeBtn = drillElement.querySelector('.drill-remove');
  const restInput = drillItem.querySelector('.drill-rest-input');
  const repsInput = drillItem.querySelector('.drill-reps-input');
  const setsInput = drillItem.querySelector('.drill-sets-input');

  drillName.textContent = drill.name;
  drillPath.textContent = drill.path;
  
  // Store drill data
  drillElement.dataset.drillId = drill.id;
  drillElement.dataset.drillPath = drill.path;
  
  // Populate parameters if they exist
  if (restInput && drill.restTime) restInput.value = drill.restTime;
  if (repsInput && drill.reps) repsInput.value = drill.reps;
  if (setsInput && drill.sets) setsInput.value = drill.sets;

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      // Remove from physicalSets data structure
      const season = currentPeriod;
      if (physicalSets[currentPhysicalTab] && physicalSets[currentPhysicalTab][season]) {
        const set = physicalSets[currentPhysicalTab][season].find(s => s.id === setId);
        if (set) {
          const drillIndex = set.drills.findIndex(d => d.id === drill.id);
          if (drillIndex > -1) {
            set.drills.splice(drillIndex, 1);
            renderPhysicalTabContent(currentPhysicalTab, season);
          }
        }
      }
    });
  }

  return drillItem;
}

// Collect current values from drill inputs before re-rendering
function collectCurrentDrillValues(season, skill) {
  const storageKey = `${season}-${skill}`;
  const sets = physicalSets[storageKey] || [];
  
  sets.forEach(set => {
    if (set.drills) {
      set.drills.forEach(drill => {
        // Find the drill element in the DOM
        const drillElement = document.querySelector(`[data-drill-id="${drill.id}"]`);
        if (drillElement) {
          const restInput = drillElement.querySelector('.drill-rest-input');
          const repsInput = drillElement.querySelector('.drill-reps-input');
          const setsInput = drillElement.querySelector('.drill-sets-input');
          
          // Update drill data with current input values
          if (restInput) drill.restTime = restInput.value ? parseFloat(restInput.value) : null;
          if (repsInput) drill.reps = repsInput.value ? parseInt(repsInput.value) : null;
          if (setsInput) drill.sets = setsInput.value ? parseInt(setsInput.value) : null;
        }
      });
    }
  });
}

// Clear all forms
function clearAllForms() {
  document.getElementById('warmUpDrills').innerHTML = '';
  document.getElementById('mainExercisesDrills').innerHTML = '';
  document.getElementById('finishingPassingDrills').innerHTML = '';
  document.getElementById('simpleDrills').innerHTML = '';
}

// Save session
async function saveSession() {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }
  
  // Show loading overlay
  showLoaderOverlay('Saving session...');

  // Check for period/season selection based on category
  if (currentCategory === 'physical') {
    const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
    
    if (!physicalSeasonSelect || !physicalSeasonSelect.value) {
      alert('Please select a season');
      return;
    }
    
    if (!currentPhysicalSkill) {
      alert('Please select a skill');
      return;
    }
    
    currentPeriod = physicalSeasonSelect.value; // in-season or off-season
    const selectedSkill = currentPhysicalSkill;
    
    // Check if drills exist for this season/skill combination (in sets)
    const storageKey = `${currentPeriod}-${selectedSkill}`;
    const sets = physicalSets[storageKey] || [];
    
    // Check if any set has drills
    let hasDrills = false;
    for (const set of sets) {
      if (set.drills && set.drills.length > 0) {
        hasDrills = true;
        break;
      }
    }
    
    if (!hasDrills) {
      alert('Please add at least one drill');
      return;
    }
  } else {
    // For tactical, period can be "all" or a specific period
    // If not set, default to "all" for tactical
    if (currentCategory === 'tactical' && !currentPeriod) {
      currentPeriod = 'all';
    } else if (currentCategory !== 'tactical' && !currentPeriod) {
      alert('Please select a period');
      return;
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    alert('Not logged in');
    return;
  }

  // Get difficulty level from form
  const difficultyLevelSelect = document.getElementById('difficultyLevelSelect');
  const difficultyLevel = difficultyLevelSelect?.value || 'beginner';

  // Collect all drills
  let sessionData = {
    coach_id: session.user.id,
    period: currentPeriod,
    category: currentCategory,
    difficulty_level: difficultyLevel
  };
  
  // Only set title if creating a new session (not updating)
  if (!isEditingSession || !currentEditingSessionId) {
    sessionData.title = `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Session - ${new Date().toLocaleDateString()}`;
  }
  
  if (currentCategory === 'technical') {
    // Collect from all three sections
    const warmUpDrills = Array.from(document.querySelectorAll('#warmUpDrills .drill-item'));
    const mainExercisesDrills = Array.from(document.querySelectorAll('#mainExercisesDrills .drill-item'));
    const finishingDrills = Array.from(document.querySelectorAll('#finishingPassingDrills .drill-item'));

    if (warmUpDrills.length === 0 && mainExercisesDrills.length === 0 && finishingDrills.length === 0) {
      alert('Please add at least one drill');
      return;
    }

    const mainExercises = mainExercisesDrills.map((drill, index) => {
      const restInput = drill.querySelector('.drill-rest-input');
      const repsInput = drill.querySelector('.drill-reps-input');
      const setsInput = drill.querySelector('.drill-sets-input');
      
      return {
        video_id: drill.dataset.drillId,
        order: index + 1,
        rest_time: restInput?.value ? parseFloat(restInput.value) : null, // Rest time in minutes
        reps: repsInput?.value ? parseInt(repsInput.value) : null,
        sets: setsInput?.value ? parseInt(setsInput.value) : null
      };
    });

    sessionData.warm_up_video_id = warmUpDrills[0]?.dataset.drillId || null;
    sessionData.main_exercises = mainExercises;
    sessionData.finishing_or_passing_video_id = finishingDrills[0]?.dataset.drillId || null;
    
    // Get skill from main exercises videos (the skill defines what the session focuses on)
    if (mainExercisesDrills.length > 0) {
      // Get the skill from the first main exercise video
      const firstMainDrillId = mainExercisesDrills[0]?.dataset.drillId;
      if (firstMainDrillId) {
        const { data: firstVideo } = await supabase
          .from('solo_session_videos')
          .select('skill, sub_skill')
          .eq('id', firstMainDrillId)
          .single();
        
        if (firstVideo) {
          sessionData.skill = firstVideo.skill;
          sessionData.sub_skill = firstVideo.sub_skill || null;
        }
      }
    }
  } else if (currentCategory === 'physical') {
    // Physical: Collect drills from season/skill combinations (with sets)
    const selectedSkill = currentPhysicalSkill;
    
    if (!selectedSkill) {
      alert('Please select a skill');
      return;
    }
    
    const storageKey = `${currentPeriod}-${selectedSkill}`;
    const sets = physicalSets[storageKey] || [];
    
    // Collect all drills from all sets (including reps, sets, and rest_time)
    const allMainExercises = [];
    sets.forEach((set, setIndex) => {
      if (set.drills && set.drills.length > 0) {
        set.drills.forEach((drill, drillIndex) => {
          allMainExercises.push({
            video_id: drill.id,
            order: allMainExercises.length + 1,
            set_number: setIndex + 1,
            rest_time: drill.restTime || null,
            reps: drill.reps || null,
            sets: drill.sets || null
          });
        });
      }
    });
    
    if (allMainExercises.length === 0) {
      alert('Please add at least one drill');
      return;
    }
    
    sessionData.main_exercises = allMainExercises;
    sessionData.skill = selectedSkill; // conditioning, lower-body, upper-body, etc.
  } else {
    // Simple form - collect all drills (for mental/tactical)
    const simpleDrills = Array.from(document.querySelectorAll('#simpleDrills .drill-item'));
    
    if (simpleDrills.length === 0) {
      alert('Please add at least one drill');
      return;
    }

    const mainExercises = simpleDrills.map((drill, index) => ({
      video_id: drill.dataset.drillId,
      order: index + 1
    }));

    sessionData.main_exercises = mainExercises;
    
    // Get skill from drills (for mental/tactical)
    // For tactical sessions, skill should be null (tactical doesn't use skills)
    if (currentCategory === 'tactical') {
      sessionData.skill = null;
      sessionData.sub_skill = null;
    } else if (simpleDrills.length > 0) {
      // For mental sessions, try to get skill from first video
      const firstDrillId = simpleDrills[0]?.dataset.drillId;
      if (firstDrillId) {
        const { data: firstVideo } = await supabase
          .from('solo_session_videos')
          .select('skill, sub_skill')
          .eq('id', firstDrillId)
          .single();
        
        if (firstVideo) {
          sessionData.skill = firstVideo.skill;
          sessionData.sub_skill = firstVideo.sub_skill || null;
        }
      }
    }
  }

  try {
    let sessionRecord;
    
    // Check editing state before save
    console.log('Before save - isEditingSession:', isEditingSession, 'currentEditingSessionId:', currentEditingSessionId);
    
    if (isEditingSession && currentEditingSessionId) {
      // Update existing session
      console.log('Updating session:', currentEditingSessionId, 'with data:', sessionData);
      const { data, error } = await supabase
        .from('solo_sessions')
        .update(sessionData)
        .eq('id', currentEditingSessionId)
        .select()
        .single();
      
      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      sessionRecord = data;
      console.log('Session updated successfully:', sessionRecord);
      alert('Session updated successfully!');
    } else {
      // Insert new session
      console.log('Creating new session with data:', sessionData);
      const { data, error } = await supabase
        .from('solo_sessions')
        .insert(sessionData)
        .select()
        .single();
      
      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      sessionRecord = data;
      console.log('Session created successfully:', sessionRecord);
      console.log('Session category:', sessionRecord.category, 'Period:', sessionRecord.period, 'Coach ID:', sessionRecord.coach_id);
      
      // Create notifications for all players
      await createSoloSessionNotifications(sessionRecord);
      
      alert('Session created successfully!');
    }

    // Reset editing state
    isEditingSession = false;
    currentEditingSessionId = null;
    
    // Reset save button text
    const saveBtn = document.getElementById('saveSession');
    if (saveBtn) {
      saveBtn.textContent = 'Save Session';
    }
    
    clearAllForms();
    showCategorySelection();
    
    // Hide loading overlay
    hideLoaderOverlay();

  } catch (error) {
    console.error('Error saving session:', error);
    hideLoaderOverlay();
    alert(`Error saving session: ${error.message}`);
  }
}

// ============================================
// Skill Thumbnail Management Functions
// ============================================

let currentThumbnailFile = null;

// Show thumbnail management view
function showThumbnailManagement() {
  const categorySelection = document.getElementById('categorySelection');
  const sessionForm = document.getElementById('sessionForm');
  const thumbnailManagement = document.getElementById('thumbnailManagement');
  
  if (categorySelection) categorySelection.style.display = 'none';
  if (sessionForm) sessionForm.style.display = 'none';
  if (thumbnailManagement) thumbnailManagement.style.display = 'block';
  
  // Reset form
  resetThumbnailForm();
}

// Hide thumbnail management view
function hideThumbnailManagement() {
  const categorySelection = document.getElementById('categorySelection');
  const thumbnailManagement = document.getElementById('thumbnailManagement');
  
  if (thumbnailManagement) thumbnailManagement.style.display = 'none';
  if (categorySelection) categorySelection.style.display = 'block';
  
  resetThumbnailForm();
}

// Setup thumbnail form event listeners
function setupThumbnailFormListeners() {
  const categorySelect = document.getElementById('thumbnailCategorySelect');
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');
  const skillSelect = document.getElementById('thumbnailSkillSelect');
  const subSkillSelect = document.getElementById('thumbnailSubSkillSelect');
  const fileInput = document.getElementById('skillThumbnailFileInput');
  const uploadZone = document.getElementById('thumbnailUploadZone');
  const chooseBtn = document.querySelector('.btn-choose-thumbnail-file');
  const saveBtn = document.getElementById('saveThumbnail');
  const cancelBtn = document.getElementById('cancelThumbnail');
  const removeBtn = document.querySelector('.remove-skill-thumbnail');

  // Category change
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const category = e.target.value;
      updateThumbnailSkillDropdowns(category);
      updateThumbnailSaveButton(); // Update save button when category changes
    });
  }

  // Period/Season change
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      updateThumbnailSkillDropdowns(categorySelect?.value);
    });
  }

  if (seasonSelect) {
    seasonSelect.addEventListener('change', () => {
      updateThumbnailSkillDropdowns(categorySelect?.value);
      updateThumbnailSaveButton(); // Ensure save button state is updated
    });
  }

  // Skill change
  if (skillSelect) {
    skillSelect.addEventListener('change', (e) => {
      updateThumbnailSubSkillDropdown(e.target.value);
      updateThumbnailSaveButton(); // Update save button when skill changes
    });
  }

  // File input
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      handleThumbnailFileSelect(e.target.files[0]);
    });
  }

  // Choose file button
  if (chooseBtn && fileInput) {
    chooseBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // Drag and drop
  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      // Accept image files (including GIFs) and MP4 videos
      const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
      const validVideoTypes = ['video/mp4'];
      const isValidImage = file && (file.type.startsWith('image/') || validImageTypes.includes(file.type));
      const isValidVideo = file && (file.type.startsWith('video/') || validVideoTypes.includes(file.type));
      if (isValidImage || isValidVideo) {
        handleThumbnailFileSelect(file);
      } else if (file) {
        alert('Please select an image file (PNG, JPG, GIF, WebP) or MP4 video');
      }
    });
  }

  // Remove thumbnail
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      currentThumbnailFile = null;
      const preview = document.getElementById('skillThumbnailPreview');
      const previewImg = document.getElementById('skillThumbnailPreviewImg');
      if (preview) preview.style.display = 'none';
      if (previewImg) previewImg.src = '';
      if (fileInput) fileInput.value = '';
      updateThumbnailSaveButton();
    });
  }

  // Save thumbnail
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      uploadSkillThumbnail();
    });
  }

  // Cancel
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      hideThumbnailManagement();
    });
  }
}

// Handle thumbnail file selection
function handleThumbnailFileSelect(file) {
  if (!file) return;

  // Accept image files (including GIFs) and MP4 videos
  const validImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  const validVideoTypes = ['video/mp4'];
  const isValidImage = file.type.startsWith('image/') || validImageTypes.includes(file.type);
  const isValidVideo = file.type.startsWith('video/') || validVideoTypes.includes(file.type);
  
  if (!isValidImage && !isValidVideo) {
    alert('Please select an image file (PNG, JPG, GIF, WebP) or MP4 video');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('File size must be less than 5MB');
    return;
  }

  currentThumbnailFile = file;

  // Show preview
  const preview = document.getElementById('skillThumbnailPreview');
  const previewImg = document.getElementById('skillThumbnailPreviewImg');
  const previewVideo = document.getElementById('skillThumbnailPreviewVideo');
  const previewVideoSource = document.getElementById('skillThumbnailPreviewVideoSource');

  if (isValidVideo) {
    // Handle video preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewVideoSource) {
        previewVideoSource.src = e.target.result;
        previewVideoSource.type = 'video/mp4';
      }
      if (previewVideo) {
        previewVideo.load(); // Reload video with new source
        previewVideo.style.display = 'block';
      }
      if (previewImg) previewImg.style.display = 'none';
      if (preview) preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    // Handle image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewImg) {
        previewImg.src = e.target.result;
        previewImg.style.display = 'block';
      }
      if (previewVideo) previewVideo.style.display = 'none';
      if (preview) preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  updateThumbnailSaveButton();
}

// Update thumbnail skill dropdowns based on category and period/season
function updateThumbnailSkillDropdowns(category) {
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');
  const skillSelect = document.getElementById('thumbnailSkillSelect');
  const periodSection = document.getElementById('thumbnailPeriodSection');
  const seasonSection = document.getElementById('thumbnailSeasonSection');
  const skillSection = document.getElementById('thumbnailSkillSection');

  if (!category || !skillSelect) return;

  // Show/hide period vs season based on category
  if (category === 'physical') {
    if (periodSection) periodSection.style.display = 'none';
    if (seasonSection) seasonSection.style.display = 'block';
  } else {
    if (periodSection) periodSection.style.display = 'block';
    if (seasonSection) seasonSection.style.display = 'none';
  }

  // Get period/season value
  const periodValue = category === 'physical' 
    ? (seasonSelect?.value || '')
    : (periodSelect?.value || '');

  if (!periodValue) {
    if (skillSection) skillSection.style.display = 'none';
    // Still update save button even if no period/season selected yet
    updateThumbnailSaveButton();
    return;
  }

  // Get skills for this category and period
  let skills = [];
  if (category === 'physical') {
    // Physical skills are the same across all periods/seasons
    // Use 'build-out' period to get physical skills (they're the same for all periods)
    const physicalSkills = getSkillsForPeriodAndCategory('build-out', 'physical');
    skills = physicalSkills || [];
    console.log('Physical skills loaded:', skills);
  } else if (periodValue === 'all') {
    // For "all" period, get skills from all periods
    const allPeriods = ['build-out', 'middle-third', 'final-third', 'wide-play'];
    const allSkills = new Set();
    allPeriods.forEach(period => {
      const periodSkills = getSkillsForPeriodAndCategory(period, category);
      periodSkills.forEach(skill => allSkills.add(skill));
    });
    skills = Array.from(allSkills);
  } else {
    skills = getSkillsForPeriodAndCategory(periodValue, category);
  }

  // For Technical category, only show the "big four" skills
  // Filter out juggling, passing, and finishing (they're included in sessions)
  if (category === 'technical') {
    const bigFourSkills = ['first-touch', 'escape-moves', 'turning', 'ball-mastery'];
    skills = skills.filter(skill => bigFourSkills.includes(skill));
  }

  // Populate skill dropdown
  skillSelect.innerHTML = '<option value="">Select Skill</option>';
  if (skills && skills.length > 0) {
    console.log('Populating skills dropdown with', skills.length, 'skills:', skills);
    skills.forEach(skill => {
      const option = document.createElement('option');
      option.value = skill;
      const displayName = skill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      option.textContent = displayName;
      skillSelect.appendChild(option);
    });
  } else {
    console.warn('No skills found for category:', category, 'periodValue:', periodValue);
  }

  if (skillSection) {
    skillSection.style.display = 'block';
    console.log('Skill section displayed');
  } else {
    console.warn('Skill section element not found!');
  }
  
  // Check if skill dropdown is visible and has options
  if (skillSelect) {
    console.log('Skill select element found, options count:', skillSelect.options.length);
    console.log('Skill select value:', skillSelect.value);
  }
  
  updateThumbnailSubSkillDropdown(skillSelect.value);
  updateThumbnailSaveButton();
}

// Update thumbnail sub-skill dropdown
function updateThumbnailSubSkillDropdown(skill) {
  const subSkillSelect = document.getElementById('thumbnailSubSkillSelect');
  const subSkillSection = document.getElementById('thumbnailSubSkillSection');
  const categorySelect = document.getElementById('thumbnailCategorySelect');
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');

  if (!subSkillSelect || !skill) {
    if (subSkillSection) subSkillSection.style.display = 'none';
    return;
  }

  const category = categorySelect?.value;
  if (!category) return;

  const periodValue = category === 'physical'
    ? (seasonSelect?.value || '')
    : (periodSelect?.value || '');

  if (!periodValue || periodValue === 'all') {
    // For "all" period, get sub-skills from all periods
    const allPeriods = ['build-out', 'middle-third', 'final-third', 'wide-play'];
    const allSubSkills = new Set();
    allPeriods.forEach(period => {
      const subSkills = getSubSkillsForSkill(period, category, skill);
      subSkills.forEach(subSkill => allSubSkills.add(subSkill));
    });
    const subSkills = Array.from(allSubSkills);
    
    subSkillSelect.innerHTML = '<option value="">No Sub-Skill (Skill-level thumbnail)</option>';
    subSkills.forEach(subSkill => {
      const option = document.createElement('option');
      option.value = subSkill;
      const displayName = subSkill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      option.textContent = displayName;
      subSkillSelect.appendChild(option);
    });
  } else {
    const subSkills = getSubSkillsForSkill(periodValue, category, skill);
    subSkillSelect.innerHTML = '<option value="">No Sub-Skill (Skill-level thumbnail)</option>';
    subSkills.forEach(subSkill => {
      const option = document.createElement('option');
      option.value = subSkill;
      const displayName = subSkill.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      option.textContent = displayName;
      subSkillSelect.appendChild(option);
    });
  }

  if (subSkillSection) subSkillSection.style.display = 'block';
  updateThumbnailSaveButton();
}

// Update save button state
function updateThumbnailSaveButton() {
  const saveBtn = document.getElementById('saveThumbnail');
  const categorySelect = document.getElementById('thumbnailCategorySelect');
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');
  const skillSelect = document.getElementById('thumbnailSkillSelect');
  
  if (!saveBtn) return;

  const category = categorySelect?.value;
  const hasCategory = !!category;
  const hasSkill = !!skillSelect?.value;
  const hasFile = currentThumbnailFile !== null;
  
  // For physical category, need season selected; for others, need period selected
  const hasPeriodOrSeason = category === 'physical' 
    ? !!seasonSelect?.value 
    : !!periodSelect?.value;

  // For physical category, skill is optional (can upload thumbnail for season itself)
  // For other categories, skill is required
  const skillRequired = category !== 'physical';
  const hasRequiredSkill = skillRequired ? hasSkill : true; // Always true for physical (skill optional)

  const shouldEnable = hasCategory && hasPeriodOrSeason && hasRequiredSkill && hasFile;
  
  // Debug logging
  console.log('Update thumbnail save button:', {
    category,
    hasCategory,
    hasPeriodOrSeason,
    period: periodSelect?.value,
    season: seasonSelect?.value,
    hasSkill,
    skill: skillSelect?.value,
    hasFile,
    shouldEnable
  });
  console.log('Button disabled state:', !shouldEnable, '| Requirements:', {
    'Category': hasCategory,
    'Period/Season': hasPeriodOrSeason,
    'Skill': hasSkill,
    'File': hasFile
  });

  saveBtn.disabled = !shouldEnable;
}

// Reset thumbnail form
function resetThumbnailForm() {
  currentThumbnailFile = null;
  
  const categorySelect = document.getElementById('thumbnailCategorySelect');
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');
  const skillSelect = document.getElementById('thumbnailSkillSelect');
  const subSkillSelect = document.getElementById('thumbnailSubSkillSelect');
  const fileInput = document.getElementById('skillThumbnailFileInput');
  const preview = document.getElementById('skillThumbnailPreview');
  const previewImg = document.getElementById('skillThumbnailPreviewImg');
  const previewVideo = document.getElementById('skillThumbnailPreviewVideo');
  const previewVideoSource = document.getElementById('skillThumbnailPreviewVideoSource');
  const periodSection = document.getElementById('thumbnailPeriodSection');
  const seasonSection = document.getElementById('thumbnailSeasonSection');
  const skillSection = document.getElementById('thumbnailSkillSection');
  const subSkillSection = document.getElementById('thumbnailSubSkillSection');

  if (categorySelect) categorySelect.value = '';
  if (periodSelect) periodSelect.value = '';
  if (seasonSelect) seasonSelect.value = '';
  if (skillSelect) skillSelect.innerHTML = '<option value="">Select Skill</option>';
  if (subSkillSelect) subSkillSelect.innerHTML = '<option value="">No Sub-Skill (Skill-level thumbnail)</option>';
  if (fileInput) fileInput.value = '';
  if (preview) preview.style.display = 'none';
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }
  if (previewVideo) {
    previewVideo.pause();
    previewVideo.style.display = 'none';
  }
  if (previewVideoSource) previewVideoSource.src = '';
  if (periodSection) periodSection.style.display = 'none';
  if (seasonSection) seasonSection.style.display = 'none';
  if (skillSection) skillSection.style.display = 'none';
  if (subSkillSection) subSkillSection.style.display = 'none';

  updateThumbnailSaveButton();
}

// Upload skill thumbnail
async function uploadSkillThumbnail() {
  if (!supabaseReady || !supabase) {
    alert('Database not ready');
    return;
  }

  if (!currentThumbnailFile) {
    alert('Please select an image file');
    return;
  }

  const categorySelect = document.getElementById('thumbnailCategorySelect');
  const periodSelect = document.getElementById('thumbnailPeriodSelect');
  const seasonSelect = document.getElementById('thumbnailSeasonSelect');
  const skillSelect = document.getElementById('thumbnailSkillSelect');
  const subSkillSelect = document.getElementById('thumbnailSubSkillSelect');

  const category = categorySelect?.value;
  const skill = skillSelect?.value || null; // Optional for physical
  const subSkill = subSkillSelect?.value || null;
  const period = category === 'physical'
    ? (seasonSelect?.value || null)
    : (periodSelect?.value || null);

  if (!category) {
    alert('Please select category');
    return;
  }
  
  // For non-physical categories, skill is required
  if (category !== 'physical' && !skill) {
    alert('Please select skill');
    return;
  }
  
  // For physical, need at least season selected
  if (category === 'physical' && !period) {
    alert('Please select season');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    alert('Not logged in');
    return;
  }

  try {
    // Sanitize filename
    const sanitizeFilename = (str) => {
      return str.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    };

    const periodSlug = period ? sanitizeFilename(period) : 'all';
    // Preserve original file extension (supports PNG, JPG, GIF, WebP, MP4)
    const fileExtension = currentThumbnailFile.name.split('.').pop().toLowerCase();
    // Ensure valid image/video extension
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4'];
    const finalExtension = validExtensions.includes(fileExtension) ? fileExtension : 'png';
    
    // For physical without skill, just use category-period-thumbnail
    // For physical with skill, use category-period-skill-subskill-thumbnail
    // For other categories, use category-period-skill-subskill-thumbnail
    let fileName;
    if (category === 'physical' && !skill) {
      // Season-level thumbnail (no skill)
      fileName = `${category}-${periodSlug}-thumbnail.${finalExtension}`;
    } else if (skill) {
      const skillSlug = sanitizeFilename(skill);
      const subSkillSlug = subSkill ? sanitizeFilename(subSkill) : 'skill';
      fileName = `${category}-${periodSlug}-${skillSlug}${subSkill ? '-' + subSkillSlug : ''}-thumbnail.${finalExtension}`;
    } else {
      // Fallback (shouldn't happen due to validation above)
      fileName = `${category}-${periodSlug}-thumbnail.${finalExtension}`;
    }
    const storagePath = `skill-thumbnails/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('solo-session-videos')
      .upload(storagePath, currentThumbnailFile, {
        cacheControl: '3600',
        upsert: true // Allow overwriting existing thumbnails
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('solo-session-videos')
      .getPublicUrl(storagePath);

    // Check if thumbnail already exists for this combination
    let query = supabase
      .from('skill_thumbnails')
      .select('id')
      .eq('category', category);
    
    // For physical without skill, match by period only (season-level thumbnail)
    if (category === 'physical' && !skill) {
      query = query.eq('period', period).is('skill', null);
      console.log('Checking for existing physical season-level thumbnail:', { category, period, skill: null });
    } else if (skill) {
      query = query.eq('skill', skill);
      if (subSkill) {
        query = query.eq('sub_skill', subSkill);
      } else {
        query = query.is('sub_skill', null);
      }
      if (period) {
        query = query.eq('period', period);
      } else {
        query = query.is('period', null);
      }
      console.log('Checking for existing thumbnail:', { category, skill, subSkill, period });
    } else {
      if (period) {
        query = query.eq('period', period);
      } else {
        query = query.is('period', null);
      }
    }
    
    const { data: existingThumbnail, error: checkError } = await query.maybeSingle();
    
    if (checkError) {
      console.warn('Error checking for existing thumbnail:', checkError);
    }
    
    console.log('Existing thumbnail found:', existingThumbnail);

    let thumbnailRecord;
    if (existingThumbnail) {
      // Update existing thumbnail
      console.log('Updating existing thumbnail:', existingThumbnail.id);
      const { data, error: dbError } = await supabase
        .from('skill_thumbnails')
        .update({
          thumbnail_url: storagePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingThumbnail.id)
        .select()
        .single();
      
      if (dbError) {
        console.error('Error updating thumbnail:', dbError);
        throw dbError;
      }
      console.log('Thumbnail updated successfully:', data);
      thumbnailRecord = data;
    } else {
      // Insert new thumbnail
      const insertData = {
        category: category,
        skill: skill, // Will be null for physical season-level thumbnails
        sub_skill: subSkill,
        period: period,
        thumbnail_url: storagePath,
        created_by: session.user.id
      };
      
      console.log('Inserting thumbnail with data:', insertData);
      
      const { data, error: dbError } = await supabase
        .from('skill_thumbnails')
        .insert(insertData)
        .select()
        .single();
      
      if (dbError) {
        console.error('Error inserting thumbnail:', dbError);
        throw dbError;
      }
      
      console.log('Thumbnail inserted successfully:', data);
      thumbnailRecord = data;
    }

    alert('Thumbnail uploaded successfully!');
    resetThumbnailForm();
    
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    alert('Failed to upload thumbnail: ' + error.message);
  }
}

// ============================================
// Edit Sessions Functions
// ============================================

let isEditingSession = false;
let currentEditingSessionId = null;

// Show edit sessions view
async function showEditSessionsView() {
  const categorySelection = document.getElementById('categorySelection');
  const sessionForm = document.getElementById('sessionForm');
  const thumbnailManagement = document.getElementById('thumbnailManagement');
  const editSessionsView = document.getElementById('editSessionsView');
  
  if (categorySelection) categorySelection.style.display = 'none';
  if (sessionForm) sessionForm.style.display = 'none';
  if (thumbnailManagement) thumbnailManagement.style.display = 'none';
  if (editSessionsView) editSessionsView.style.display = 'block';
  
  // Load sessions
  await loadSessionsForEdit();
}

// Hide edit sessions view
function hideEditSessionsView(resetEditingState = true) {
  const categorySelection = document.getElementById('categorySelection');
  const editSessionsView = document.getElementById('editSessionsView');
  
  if (editSessionsView) editSessionsView.style.display = 'none';
  if (categorySelection) categorySelection.style.display = 'block';
  
  // Only reset editing state if explicitly requested (default true for backward compatibility)
  if (resetEditingState) {
    isEditingSession = false;
    currentEditingSessionId = null;
    clearAllForms();
  }
}

// Setup edit sessions filter listeners
function setupEditSessionsFilters() {
  const categoryFilter = document.getElementById('sessionsCategoryFilter');
  const periodFilter = document.getElementById('sessionsPeriodFilter');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      loadSessionsForEdit();
    });
  }
  
  if (periodFilter) {
    periodFilter.addEventListener('change', () => {
      loadSessionsForEdit();
    });
  }
}

// Load sessions for edit view
async function loadSessionsForEdit() {
  if (!supabaseReady || !supabase) return;
  
  const sessionsList = document.getElementById('sessionsList');
  const loadingSessions = document.getElementById('loadingSessions');
  const noSessions = document.getElementById('noSessions');
  
  if (!sessionsList) {
    console.error('sessionsList element not found');
    return;
  }
  
  // Show loading indicator
  if (loadingSessions) {
    loadingSessions.style.display = 'block';
    showLoader(loadingSessions, 'Loading sessions...');
  }
  if (noSessions) noSessions.style.display = 'none';
  sessionsList.innerHTML = '';
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert('Not logged in');
      return;
    }
    
    // Get user role to check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    
    // Build query - include video relationships for preview
    let query = supabase
      .from('solo_sessions')
      .select(`
        *,
        warm_up_video:solo_session_videos!warm_up_video_id(*),
        finishing_video:solo_session_videos!finishing_or_passing_video_id(*)
      `)
      .order('created_at', { ascending: false });
    
    // For non-admins, only show their own sessions
    // For admins, show all sessions
    if (!isAdmin) {
      query = query.eq('coach_id', session.user.id);
    }
    
    // Only show active sessions (matching player view)
    query = query.eq('is_active', true);
    
    // Debug: Check for tactical sessions to help diagnose
    // First, check ALL tactical sessions (no filters) to see if any exist
    const { data: allTacticalSessionsUnfiltered, error: tacticalError } = await supabase
      .from('solo_sessions')
      .select('id, category, period, is_active, coach_id, created_at, main_exercises')
      .eq('category', 'tactical')
      .order('created_at', { ascending: false })
      .limit(20);
    
    console.log('=== TACTICAL SESSIONS DEBUG (unfiltered) ===');
    console.log('Query error:', tacticalError);
    console.log('Total tactical sessions found (unfiltered):', allTacticalSessionsUnfiltered?.length || 0);
    
    if (allTacticalSessionsUnfiltered && allTacticalSessionsUnfiltered.length > 0) {
      console.log('All tactical sessions (unfiltered):');
      allTacticalSessionsUnfiltered.forEach(s => {
        const mainExercisesCount = s.main_exercises?.length || 0;
        console.log(`  - ID: ${s.id.substring(0, 8)}..., Period: ${s.period}, Active: ${s.is_active}, Coach: ${s.coach_id?.substring(0, 8) || 'null'}..., Main exercises: ${mainExercisesCount}, Created: ${s.created_at}`);
      });
      
      // Filter by coach_id to match main query behavior
      const filteredTacticalSessions = allTacticalSessionsUnfiltered.filter(s => 
        isAdmin || s.coach_id === session.user.id
      );
      
      console.log(`Tactical sessions matching coach filter (isAdmin: ${isAdmin}, currentUser: ${session.user.id.substring(0, 8)}...):`, filteredTacticalSessions.length);
      if (filteredTacticalSessions.length > 0) {
        filteredTacticalSessions.forEach(s => {
          console.log(`  - ID: ${s.id.substring(0, 8)}..., Period: ${s.period}, Active: ${s.is_active}`);
        });
      } else {
        console.log('  → All tactical sessions belong to other coaches or are inactive');
      }
    } else {
      console.log('No tactical sessions found in database at all (unfiltered query)');
    }
    
    // Apply filters
    const categoryFilter = document.getElementById('sessionsCategoryFilter')?.value;
    const periodFilter = document.getElementById('sessionsPeriodFilter')?.value;
    
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    
    // Handle period filter
    // "all" means show all periods (don't filter)
    // For physical category, period might be "in-season" or "off-season"
    // For tactical sessions, they can have period = 'all', so we need to include those when filtering by specific period
    if (periodFilter && periodFilter !== 'all') {
      // If filtering by a specific period, include sessions with that period OR sessions with period = 'all'
      // This is especially important for tactical sessions which often use period = 'all'
      query = query.or(`period.eq.${periodFilter},period.eq.all`);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) {
      console.error('Error querying sessions:', error);
      throw error;
    }
    
    if (loadingSessions) {
      hideLoader(loadingSessions);
      loadingSessions.style.display = 'none';
    }
    
    console.log('Loaded sessions for edit:', sessions?.length || 0, sessions);
    
    // Debug: Log ALL sessions by category
    if (sessions) {
      console.log('=== ALL SESSIONS BY CATEGORY ===');
      sessions.forEach(s => {
        console.log(`Category: ${s.category}, ID: ${s.id.substring(0, 8)}, Period: ${s.period}, Active: ${s.is_active}, Skill: ${s.skill || 'null'}, Main exercises: ${s.main_exercises?.length || 0}`);
      });
      
      const physicalSessions = sessions.filter(s => s.category === 'physical');
      const tacticalSessions = sessions.filter(s => s.category === 'tactical');
      const technicalSessions = sessions.filter(s => s.category === 'technical');
      const mentalSessions = sessions.filter(s => s.category === 'mental');
      
      console.log('Physical sessions:', physicalSessions.length);
      physicalSessions.forEach(s => {
        console.log(`  - ID: ${s.id}, Skill: ${s.skill}, Sub-skill: ${s.sub_skill || 'null'}, Period: ${s.period}, Active: ${s.is_active}, Created: ${s.created_at}`);
      });
      
      console.log('Tactical sessions:', tacticalSessions.length);
      tacticalSessions.forEach(s => {
        const mainExercisesCount = s.main_exercises?.length || 0;
        console.log(`  - ID: ${s.id}, Period: ${s.period}, Main exercises: ${mainExercisesCount}, Active: ${s.is_active}, Coach ID: ${s.coach_id}`);
        if (s.main_exercises && s.main_exercises.length > 0) {
          console.log(`    First video_id: ${s.main_exercises[0].video_id}`);
        }
      });
      
      console.log('Technical sessions:', technicalSessions.length);
      console.log('Mental sessions:', mentalSessions.length);
      
      // Check if they're grouped the same way as player view
      const sessionsBySubSkill = {};
      physicalSessions.forEach(s => {
        const subSkill = s.sub_skill || 'general';
        if (!sessionsBySubSkill[subSkill]) {
          sessionsBySubSkill[subSkill] = [];
        }
        sessionsBySubSkill[subSkill].push(s);
      });
      console.log('Physical sessions grouped by sub_skill:', Object.keys(sessionsBySubSkill).map(key => `${key}: ${sessionsBySubSkill[key].length}`));
      
      // Check drill counts to see if they're duplicates
      physicalSessions.forEach(s => {
        const mainExercisesCount = s.main_exercises?.length || 0;
        const warmUpCount = s.warm_up_video ? 1 : 0;
        const finishingCount = s.finishing_video ? 1 : 0;
        console.log(`  - Session ${s.id.substring(0, 8)}: ${warmUpCount} warm-up, ${mainExercisesCount} main, ${finishingCount} finishing`);
      });
    }
    
    if (!sessions || sessions.length === 0) {
      if (noSessions) noSessions.style.display = 'block';
      return;
    }
    
    // Render sessions with video previews (like player view)
    for (const sessionData of sessions) {
      const sessionCard = await createSessionCard(sessionData, isAdmin);
      sessionsList.appendChild(sessionCard);
    }
    
  } catch (error) {
    console.error('Error loading sessions:', error);
    if (loadingSessions) loadingSessions.style.display = 'none';
    sessionsList.innerHTML = '<p style="color: var(--error);">Error loading sessions: ' + error.message + '</p>';
  }
}

// Create session card (like player view with video preview)
async function createSessionCard(session, isAdmin) {
  const card = document.createElement('div');
  card.className = 'session-card-edit';
  card.dataset.sessionId = session.id;
  
  const categoryDisplay = session.category ? session.category.charAt(0).toUpperCase() + session.category.slice(1) : 'Unknown';
  const periodDisplay = session.period ? session.period.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A';
  // For tactical sessions, skill is null, so show category instead
  const skillDisplay = session.skill 
    ? session.skill.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    : (session.category === 'tactical' ? 'Tactical' : 'N/A');
  const subSkillDisplay = session.sub_skill ? session.sub_skill.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
  
  const mainExercisesCount = session.main_exercises && Array.isArray(session.main_exercises) ? session.main_exercises.length : 0;
  const hasWarmUp = !!session.warm_up_video_id;
  const hasFinishing = !!session.finishing_or_passing_video_id;
  
  // Calculate session duration (estimated based on reps: 2-5 seconds per rep, average 3.5 seconds)
  // Formula: (reps * 3.5 seconds) * sets + rest_time * (sets - 1) for each exercise
  let totalMinutes = 0;
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
  // Add warm-up and finishing (5 minutes each if they exist)
  totalMinutes += (hasWarmUp ? 5 : 0) + (hasFinishing ? 5 : 0);
  
  // Get video URL for preview (use first main exercise video, or warm-up, or finishing)
  let previewVideoUrl = null;
  
  // Debug logging for tactical sessions
  if (session.category === 'tactical') {
    console.log('Tactical session preview:', {
      id: session.id,
      main_exercises: session.main_exercises,
      main_exercises_length: session.main_exercises?.length,
      first_video_id: session.main_exercises?.[0]?.video_id
    });
  }
  
  if (session.main_exercises && Array.isArray(session.main_exercises) && session.main_exercises.length > 0 && session.main_exercises[0].video_id) {
    try {
      const videoId = session.main_exercises[0].video_id;
      const { data: video, error: videoError } = await supabase
        .from('solo_session_videos')
        .select('video_url')
        .eq('id', videoId)
        .single();
      
      if (videoError) {
        console.error(`Error fetching video ${videoId} for session ${session.id}:`, videoError);
      } else if (video && video.video_url) {
        previewVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(video.video_url).data.publicUrl;
      } else {
        console.warn(`Video ${videoId} found but no video_url for session ${session.id}`);
      }
    } catch (error) {
      console.error('Error fetching preview video:', error);
    }
  } else if (session.category === 'tactical') {
    console.warn(`Tactical session ${session.id} has no main_exercises or video_id:`, {
      hasMainExercises: !!session.main_exercises,
      isArray: Array.isArray(session.main_exercises),
      length: session.main_exercises?.length,
      firstVideoId: session.main_exercises?.[0]?.video_id
    });
  }
  
  // Fallback to warm-up or finishing video if main exercise video not available
  if (!previewVideoUrl) {
    if (session.warm_up_video && session.warm_up_video.video_url) {
      previewVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(session.warm_up_video.video_url).data.publicUrl;
    } else if (session.finishing_video && session.finishing_video.video_url) {
      previewVideoUrl = supabase.storage.from('solo-session-videos').getPublicUrl(session.finishing_video.video_url).data.publicUrl;
    }
  }
  
  // Determine skill level (default to beginner if not set)
  const skillLevel = session.difficulty_level || 'beginner';
  
  const createdDate = new Date(session.created_at).toLocaleDateString();
  const isActive = session.is_active !== false; // Default to true if not set
  
  card.innerHTML = `
    <div class="session-card-edit-header">
      ${previewVideoUrl ? `
        <video class="session-hero-video" autoplay muted loop playsinline>
          <source src="${previewVideoUrl}" type="video/mp4">
        </video>
        <div class="session-hero-overlay"></div>
      ` : ''}
      <div class="session-card-edit-content">
        <div class="session-card-edit-top">
          <span class="session-hero-badge">${isActive ? 'Active' : 'Inactive'}</span>
          <span class="session-hero-subskill">${subSkillDisplay || skillDisplay}</span>
        </div>
        <div class="session-card-edit-bottom">
          <span class="session-hero-level">${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}</span>
          <span class="session-hero-duration">${Math.ceil(totalMinutes)} min</span>
        </div>
      </div>
    </div>
    <div class="session-card-edit-details">
      <div class="session-card-title">
        <h3>${session.title || `${categoryDisplay} Session`}</h3>
        <span class="session-card-date">Created: ${createdDate}</span>
      </div>
      <div class="session-card-info">
        <div class="info-item">
          <span class="info-label">Category:</span>
          <span class="info-value">${categoryDisplay}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Period:</span>
          <span class="info-value">${periodDisplay}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Skill:</span>
          <span class="info-value">${skillDisplay}${subSkillDisplay ? ` - ${subSkillDisplay}` : ''}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Drills:</span>
          <span class="info-value">${session.category === 'physical' 
            ? (() => {
                // For physical sessions, count unique sets
                if (session.main_exercises && Array.isArray(session.main_exercises)) {
                  const uniqueSets = new Set();
                  session.main_exercises.forEach(ex => {
                    if (ex.set_number) {
                      uniqueSets.add(ex.set_number);
                    }
                  });
                  const setCount = uniqueSets.size || 1;
                  return `${setCount} ${setCount === 1 ? 'Set' : 'Sets'}`;
                }
                return '0 Sets';
              })()
            : `${hasWarmUp ? '1' : '0'} Warm-up, ${mainExercisesCount} Main, ${hasFinishing ? '1' : '0'} Finishing`}</span>
        </div>
      </div>
    </div>
    <div class="session-card-edit-actions">
      <button class="edit-btn" data-session-id="${session.id}" type="button">
        <i class="bx bx-edit"></i>
        <span>Edit</span>
      </button>
      <button class="delete-btn" data-session-id="${session.id}" type="button">
        <i class="bx bx-trash"></i>
        <span>Delete</span>
      </button>
    </div>
  `;
  
  // Add event listeners
  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      editSession(session.id);
    });
  }
  
  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      deleteSession(session.id, session.title);
    });
  }
  
  return card;
}

// Edit a session
async function editSession(sessionId) {
  if (!supabaseReady || !supabase) return;
  
  // Show loading overlay
  showLoaderOverlay('Loading session...');
  
  try {
    const { data: session, error } = await supabase
      .from('solo_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) throw error;
    if (!session) {
      hideLoaderOverlay();
      alert('Session not found');
      return;
    }
    
    // Set editing state FIRST - before any other operations
    isEditingSession = true;
    currentEditingSessionId = sessionId;
    console.log('Edit session - Set editing state:', isEditingSession, 'sessionId:', currentEditingSessionId);
    
    // Hide edit sessions view and show form (but preserve editing state)
    hideEditSessionsView(false); // Don't reset editing state
    
    // Set category and show form
    currentCategory = session.category;
    selectCategory(session.category);
    
    // Re-confirm editing state after selectCategory (in case it was reset)
    if (!isEditingSession || currentEditingSessionId !== sessionId) {
      console.warn('Editing state was reset, restoring it');
      isEditingSession = true;
      currentEditingSessionId = sessionId;
    }
    
    // Set period/season
    if (session.category === 'physical') {
      const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
      if (physicalSeasonSelect && session.period) {
        physicalSeasonSelect.value = session.period;
        currentPeriod = session.period;
      }
    } else {
      const periodSelect = document.getElementById('periodSelect');
      if (periodSelect && session.period) {
        periodSelect.value = session.period;
        currentPeriod = session.period;
      }
    }
    
    // Load session drills into form
    await loadSessionIntoForm(session);
    
    // Update form title
    const formTitle = document.getElementById('formTitle');
    if (formTitle) {
      formTitle.textContent = `Edit ${session.category.charAt(0).toUpperCase() + session.category.slice(1)} Session`;
    }
    
    // Update save button text
    const saveBtn = document.getElementById('saveSession');
    if (saveBtn) {
      saveBtn.textContent = 'Update Session';
    }
    
    // Hide loading overlay
    hideLoaderOverlay();
    
  } catch (error) {
    console.error('Error loading session for edit:', error);
    hideLoaderOverlay();
    alert('Failed to load session: ' + error.message);
  }
}

// Load session data into form
async function loadSessionIntoForm(session) {
  if (!supabaseReady || !supabase) return;
  
  // Show loading overlay
  showLoaderOverlay('Loading session data...');
  
  try {
    // Clear existing drills
    clearAllForms();
    
    // Load warm-up video
    if (session.warm_up_video_id) {
      const { data: warmUpVideo } = await supabase
        .from('solo_session_videos')
        .select('*')
        .eq('id', session.warm_up_video_id)
        .single();
      
      if (warmUpVideo) {
        addDrillToSection('warm-up', {
          id: warmUpVideo.id,
          name: warmUpVideo.title,
          path: warmUpVideo.video_url,
          videoUrl: supabase.storage.from('solo-session-videos').getPublicUrl(warmUpVideo.video_url).data.publicUrl
        });
      }
    }
    
    // Load main exercises
    if (session.main_exercises && Array.isArray(session.main_exercises)) {
      // For physical sessions, group by set_number
      if (session.category === 'physical') {
        // Group exercises by set_number
        const exercisesBySet = {};
        for (const exercise of session.main_exercises) {
          const setNumber = exercise.set_number || 1;
          if (!exercisesBySet[setNumber]) {
            exercisesBySet[setNumber] = [];
          }
          exercisesBySet[setNumber].push(exercise);
        }
        
        // Get season and skill from session
        const season = session.period; // in-season or off-season
        const skill = session.skill; // upper-body, lower-body, etc.
        
        // Set physical form values
        const physicalSeasonSelect = document.getElementById('physicalSeasonSelect');
        const physicalSkillSelect = document.getElementById('physicalSkillSelect');
        if (physicalSeasonSelect && season) {
          physicalSeasonSelect.value = season;
        }
        if (skill) {
          currentPhysicalSkill = skill;
        }
        
        // Render physical content with filters
        if (season && skill) {
          const storageKey = `${season}-${skill}`;
          if (!physicalSets[storageKey]) {
            physicalSets[storageKey] = [];
          }
          
          // Clear existing sets and create new ones based on data
          physicalSets[storageKey] = [];
          
          // Create sets and load drills
          const setNumbers = Object.keys(exercisesBySet).sort((a, b) => parseInt(a) - parseInt(b));
          
          for (let i = 0; i < setNumbers.length; i++) {
            const setNumber = parseInt(setNumbers[i]);
            const exercises = exercisesBySet[setNumber];
            
            // Create new set
            const set = { id: Date.now() + i, name: `Set ${setNumber}`, drills: [] };
            
            // Load drills into this set
            for (const exercise of exercises) {
              if (exercise.video_id) {
                const { data: video } = await supabase
                  .from('solo_session_videos')
                  .select('*')
                  .eq('id', exercise.video_id)
                  .single();
                
                if (video) {
                  const drillData = {
                    id: video.id,
                    name: video.title,
                    path: video.video_url,
                    videoUrl: supabase.storage.from('solo-session-videos').getPublicUrl(video.video_url).data.publicUrl,
                    restTime: exercise.rest_time || null,
                    reps: exercise.reps || null,
                    sets: exercise.sets || null,
                    keywords: video.keywords || [],
                    coachingPoints: video.description || '',
                    skill: video.skill || '',
                    subSkill: video.sub_skill || ''
                  };
                  
                  set.drills.push(drillData);
                }
              }
            }
            
            physicalSets[storageKey].push(set);
          }
          
          // Render physical content with loaded drills
          renderPhysicalContentWithFilters(season, skill);
        }
      } else {
        // For non-physical sessions, determine the correct section
        const targetSection = (session.category === 'tactical' || session.category === 'mental') ? 'drills' : 'main-exercises';
        
        for (const exercise of session.main_exercises) {
          if (exercise.video_id) {
            const { data: video } = await supabase
              .from('solo_session_videos')
              .select('*')
              .eq('id', exercise.video_id)
              .single();
            
            if (video) {
              addDrillToSection(targetSection, {
                id: video.id,
                name: video.title,
                path: video.video_url,
                videoUrl: supabase.storage.from('solo-session-videos').getPublicUrl(video.video_url).data.publicUrl,
                restTime: exercise.rest_time,
                reps: exercise.reps,
                sets: exercise.sets,
                keywords: video.keywords || [], // Preserve keywords for editing
                coachingPoints: video.description || '',
                skill: video.skill || '',
                subSkill: video.sub_skill || ''
              });
            }
          }
        }
      }
    }
    
    // Load finishing/passing video
    if (session.finishing_or_passing_video_id) {
      const { data: finishingVideo } = await supabase
        .from('solo_session_videos')
        .select('*')
        .eq('id', session.finishing_or_passing_video_id)
        .single();
      
      if (finishingVideo) {
        addDrillToSection('finishing-passing', {
          id: finishingVideo.id,
          name: finishingVideo.title,
          path: finishingVideo.video_url,
          videoUrl: supabase.storage.from('solo-session-videos').getPublicUrl(finishingVideo.video_url).data.publicUrl
        });
      }
    }
    
    // Ensure all tactical drill parameters are hidden (in case they were loaded before)
    if (session.category === 'tactical') {
      const simpleDrillsContainer = document.getElementById('simpleDrills');
      if (simpleDrillsContainer) {
        const tacticalDrills = simpleDrillsContainer.querySelectorAll('.drill-item');
        tacticalDrills.forEach(drill => {
          const params = drill.querySelector('.drill-parameters');
          if (params) params.style.display = 'none';
        });
      }
    }
    
  } catch (error) {
    console.error('Error loading session into form:', error);
    hideLoaderOverlay();
    alert('Failed to load session data: ' + error.message);
  } finally {
    // Hide loading overlay
    hideLoaderOverlay();
  }
}

// Delete a session (coaches can delete their own, admins can delete any)
async function deleteSession(sessionId, sessionTitle) {
  if (!supabaseReady || !supabase) return;
  
  const confirmMessage = `Are you sure you want to delete "${sessionTitle || 'this session'}"?\n\nNote: All drills (videos) will be preserved and can be reused in other sessions. This action cannot be undone.`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Show loading overlay
  showLoaderOverlay('Deleting session...');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert('Not logged in');
      return;
    }
    
    // Get user role and check session ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    
    // Get the session to check ownership
    const { data: sessionToDelete, error: fetchError } = await supabase
      .from('solo_sessions')
      .select('coach_id')
      .eq('id', sessionId)
      .single();
    
    if (fetchError) {
      alert('Session not found');
      return;
    }
    
    // Check if user can delete this session (must be admin or the session's coach)
    if (!isAdmin && sessionToDelete.coach_id !== session.user.id) {
      alert('You can only delete your own sessions');
      return;
    }
    
    // Delete session (soft delete by setting is_active to false)
    // Videos are preserved since they're in a separate table
    const { error } = await supabase
      .from('solo_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    
    if (error) throw error;
    
    alert('Session deleted successfully. All drills have been preserved and can be reused.');
    
    // Hide loading overlay
    hideLoaderOverlay();
    
    // Reload sessions list
    await loadSessionsForEdit();
    
  } catch (error) {
    console.error('Error deleting session:', error);
    hideLoaderOverlay();
    alert('Failed to delete session: ' + error.message);
  }
}

// Create notifications for all players when a solo session is created
async function createSoloSessionNotifications(soloSession) {
  if (!supabaseReady || !supabase) return;

  try {
    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'player');

    if (playersError || !players || players.length === 0) {
      console.error('Error loading players for notifications:', playersError);
      return;
    }

    // Calculate duration
    let duration = 30; // Default
    if (soloSession.main_exercises && Array.isArray(soloSession.main_exercises)) {
      duration = 5; // Warm-up
      soloSession.main_exercises.forEach(ex => {
        const exerciseDuration = ex.duration || 3;
        const restTime = ex.rest_time || 1;
        const sets = ex.sets || 1;
        duration += (exerciseDuration * sets) + (restTime * (sets - 1));
      });
      duration += 5; // Finishing/Passing
    }

    // Create notification data
    const sessionData = {
      solo_session_id: soloSession.id,
      title: soloSession.title,
      period: soloSession.period,
      category: soloSession.category,
      skill: soloSession.skill,
      duration: Math.ceil(duration)
    };

    // Create notifications for all players
    const notifications = players.map(player => ({
      recipient_id: player.id,
      recipient_role: 'player',
      notification_type: 'solo_session_created',
      title: 'New Solo Session Available',
      message: `A new ${soloSession.category} solo session has been created: ${soloSession.title} (${Math.ceil(duration)} min)`,
      data: sessionData,
      related_entity_type: 'solo_session',
      related_entity_id: soloSession.id
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      await supabase.from('notifications').insert(batch);
    }

    // Also notify parents
    const { data: relationships } = await supabase
      .from('parent_player_relationships')
      .select('parent_id, player_id, player:profiles!parent_player_relationships_player_id_fkey(first_name, last_name)');

    if (relationships && relationships.length > 0) {
      const parentNotifications = relationships
        .filter(rel => players.some(p => p.id === rel.player_id))
        .map(rel => ({
          recipient_id: rel.parent_id,
          recipient_role: 'parent',
          notification_type: 'solo_session_created',
          title: `New Solo Session for ${rel.player?.first_name || ''} ${rel.player?.last_name || ''}`,
          message: `A new ${soloSession.category} solo session has been created for ${rel.player?.first_name || 'your player'}: ${soloSession.title}`,
          data: { ...sessionData, player_id: rel.player_id },
          related_entity_type: 'solo_session',
          related_entity_id: soloSession.id
        }));

      // Insert parent notifications in batches
      for (let i = 0; i < parentNotifications.length; i += batchSize) {
        const batch = parentNotifications.slice(i, i + batchSize);
        await supabase.from('notifications').insert(batch);
      }
    }
  } catch (error) {
    console.error('Error creating solo session notifications:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
