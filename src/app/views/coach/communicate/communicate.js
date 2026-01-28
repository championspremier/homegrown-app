// Coach Communicate page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { CURRICULUM_BACKBONE } from '../../../utils/curriculum-backbone.js';
import { initLucideIcons } from '../../../utils/lucide-icons.js';

let supabase;
let supabaseReady = false;
let currentCoachId = null;
let allPlayers = [];
let selectedPlayerId = null;
let correctAnswerIndex = null; // For quiz
let messageRateLimit = 3;
let objectivesRateLimit = true;
let pendingAttachment = null; // { type: 'photo'|'video', file, localUrl } for compose preview

// Announcement type icon + color (Info=yellow, Cancellation=red, Merch=blue, Pro player=green, Time=red, Veo=green)
const ANNOUNCEMENT_TYPE_ICONS = {
  information: 'bx-info-circle',
  time_change: 'bx-alarm',
  cancellation: 'bx-block',
  popup_session: 'bx-calendar-check',
  veo_link: 'bx-video',
  merch: 'bx-purchase-tag'
};

function updateAnnouncementTypeIcon() {
  const wrap = document.getElementById('announcementTypeIconWrap');
  const sel = document.getElementById('announcementType');
  if (!wrap || !sel) return;
  const type = (sel.value || 'information');
  const bx = ANNOUNCEMENT_TYPE_ICONS[type] || 'bx-info-circle';
  wrap.innerHTML = `<i class="bx ${bx} announcement-type-icon announcement-type-icon--${type}"></i>`;
}

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    
    // Get current coach ID
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      currentCoachId = session.user.id;
      
      // Load initial data
      await loadPlayers();
      await loadMessages();
      await checkRateLimits();
      setupEventListeners();
      
      // Initialize Lucide icons
      initLucideIcons();
    } else {
      console.error('No session found');
    }
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Message sending
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const messageInput = document.getElementById('messageInput');
  
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', handleSendMessage);
  }
  
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
    messageInput.addEventListener('input', updateComposeAttachmentPreview);
    messageInput.addEventListener('paste', () => setTimeout(updateComposeAttachmentPreview, 0));
  }

  // Plus dropdown: Photo, Video, Link
  setupPlusAttachDropdown();

  // Announcement type: update colored icon when type changes
  const announcementTypeSelect = document.getElementById('announcementType');
  if (announcementTypeSelect) {
    updateAnnouncementTypeIcon();
    announcementTypeSelect.addEventListener('change', updateAnnouncementTypeIcon);
  }

  // Player search for objectives (event delegation so it works even if DOM isn't ready yet)
  if (!window.__communicatePlayerSearchDelegation) {
    window.__communicatePlayerSearchDelegation = true;
    document.body.addEventListener('input', (e) => {
      if (e.target.id === 'playerSearch') {
        handlePlayerSearch(e);
      }
    });
    document.body.addEventListener('focus', (e) => {
      if (e.target.id === 'playerSearch' && e.target.value.trim()) {
        handlePlayerSearch({ target: e.target });
      }
    }, true);
  }

  // Remove selected player
  const removePlayerBtn = document.getElementById('removePlayerBtn');
  if (removePlayerBtn) {
    removePlayerBtn.addEventListener('click', () => {
      selectedPlayerId = null;
      document.getElementById('selectedPlayer').style.display = 'none';
      document.getElementById('playerSearch').value = '';
      updateSendObjectivesButton();
    });
  }

  // Objectives inputs
  const inPossessionInput = document.getElementById('inPossessionObjective');
  const outPossessionInput = document.getElementById('outPossessionObjective');
  
  if (inPossessionInput) {
    inPossessionInput.addEventListener('input', updateSendObjectivesButton);
  }
  if (outPossessionInput) {
    outPossessionInput.addEventListener('input', updateSendObjectivesButton);
  }

  // Send objectives
  const sendObjectivesBtn = document.getElementById('sendObjectivesBtn');
  if (sendObjectivesBtn) {
    sendObjectivesBtn.addEventListener('click', handleSendObjectives);
  }

  // Quiz form
  const quizQuestion = document.getElementById('quizQuestion');
  const quizAnswersContainer = document.getElementById('quizAnswersContainer');
  const addAnswerBtn = document.getElementById('addAnswerBtn');
  const sendQuizBtn = document.getElementById('sendQuizBtn');

  if (quizQuestion) {
    quizQuestion.addEventListener('input', updateSendQuizButton);
  }

  // Correct answer buttons
  document.querySelectorAll('.correct-answer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.answerIndex);
      setCorrectAnswer(index);
    });
  });

  // Add answer option
  if (addAnswerBtn) {
    addAnswerBtn.addEventListener('click', addAnswerOption);
  }

  // Quiz answer inputs
  if (quizAnswersContainer) {
    quizAnswersContainer.addEventListener('input', (e) => {
      if (e.target.classList.contains('quiz-answer-input')) {
        updateSendQuizButton();
      }
    });
  }

  // Send quiz
  if (sendQuizBtn) {
    sendQuizBtn.addEventListener('click', handleSendQuiz);
  }

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    const searchContainer = document.getElementById('playerSearchResults');
    const searchInput = document.getElementById('playerSearch');
    if (searchContainer && !searchContainer.contains(e.target) && !searchInput?.contains(e.target)) {
      searchContainer.style.display = 'none';
    }
  });
}

// Load all players for search
async function loadPlayers() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: players, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'player')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error loading players:', error);
      return;
    }

    allPlayers = players || [];
  } catch (error) {
    console.error('Error in loadPlayers:', error);
  }
}

// Handle player search
function handlePlayerSearch(e) {
  const query = e.target.value.trim().toLowerCase();
  const resultsContainer = document.getElementById('playerSearchResults');
  
  if (!resultsContainer) return;

  if (query.length === 0) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Filter players
  const filtered = allPlayers.filter(player => {
    const firstName = (player.first_name || '').toLowerCase();
    const lastName = (player.last_name || '').toLowerCase();
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return fullName.includes(query) || firstName.includes(query) || lastName.includes(query);
  });

  // Display results
  if (filtered.length === 0) {
    resultsContainer.innerHTML = '<div class="player-search-result-item">No players found</div>';
    resultsContainer.style.display = 'block';
    return;
  }

  resultsContainer.innerHTML = filtered.map(player => {
    const name = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
    return `
      <div class="player-search-result-item" data-player-id="${player.id}">
        ${name}
      </div>
    `;
  }).join('');

  // Add click listeners
  resultsContainer.querySelectorAll('.player-search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const playerId = item.dataset.playerId;
      const player = allPlayers.find(p => p.id === playerId);
      if (player) {
        selectPlayer(player);
      }
    });
  });

  resultsContainer.style.display = 'block';
}

// Select a player
function selectPlayer(player) {
  selectedPlayerId = player.id;
  const name = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown Player';
  
  document.getElementById('selectedPlayerName').textContent = name;
  document.getElementById('selectedPlayer').style.display = 'flex';
  document.getElementById('playerSearch').value = '';
  document.getElementById('playerSearchResults').style.display = 'none';
  
  updateSendObjectivesButton();
}

// Update send objectives button state
function updateSendObjectivesButton() {
  const btn = document.getElementById('sendObjectivesBtn');
  if (!btn) return;

  const inPossession = document.getElementById('inPossessionObjective')?.value.trim();
  const outPossession = document.getElementById('outPossessionObjective')?.value.trim();
  
  const hasContent = (inPossession && inPossession.length > 0) || (outPossession && outPossession.length > 0);
  const hasPlayer = selectedPlayerId !== null;
  const canSend = objectivesRateLimit && hasContent && hasPlayer;

  btn.disabled = !canSend;
}

// Check rate limits
async function checkRateLimits() {
  if (!supabaseReady || !supabase || !currentCoachId) return;

  try {
    // Check message rate limit
    const { data: messageLimit, error: msgError } = await supabase.rpc('check_message_rate_limit', {
      p_coach_id: currentCoachId
    });

    if (!msgError && messageLimit !== null) {
      messageRateLimit = messageLimit ? 3 : 0;
      updateMessageRateLimitDisplay();
    }

    // Objectives rate limit is checked per player when sending
  } catch (error) {
    console.error('Error checking rate limits:', error);
  }
}

// Update message rate limit display
function updateMessageRateLimitDisplay() {
  const display = document.getElementById('messageRateLimit');
  if (display) {
    if (messageRateLimit > 0) {
      display.textContent = `${messageRateLimit} messages remaining today`;
      display.style.color = 'var(--text)';
    } else {
      display.textContent = 'Rate limit reached (3 per day)';
      display.style.color = '#EF4444';
    }
  }
}

// Load messages
async function loadMessages() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: messages, error } = await supabase
      .from('coach_messages')
      .select('*, coach:profiles!coach_messages_coach_id_fkey(first_name, last_name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50); // Show last 50 messages

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    renderMessages(messages || []);
  } catch (error) {
    console.error('Error in loadMessages:', error);
  }
}

// Render messages
function renderMessages(messages) {
  const container = document.getElementById('messagesHistory');
  if (!container) return;

  if (messages.length === 0) {
    container.innerHTML = `
      <div class="messages-empty-state">
        <i class="bx bx-message"></i>
        <p>Announcements are sent here</p>
      </div>
    `;
    return;
  }

  // Remove empty state
  const emptyState = container.querySelector('.messages-empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Render messages (newest first, but display oldest first)
  const messagesHtml = messages.reverse().map(msg => {
    const coachName = msg.coach ? 
      `${msg.coach.first_name || ''} ${msg.coach.last_name || ''}`.trim() || 'Coach' : 
      'Coach';
    const date = new Date(msg.created_at);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msg.attachment_url) {
      return `
        <div class="message-bubble has-attachment">
          <div class="message-attachment">
            <i class="bx bx-file message-attachment-icon"></i>
            <div class="message-attachment-info">
              <div class="message-attachment-name">${escapeHtml(msg.attachment_name || 'Attachment')}</div>
              <div class="message-attachment-size">${formatFileSize(msg.attachment_size || 0)}</div>
            </div>
            <a href="${msg.attachment_url}" download="${msg.attachment_name || 'file'}" class="message-attachment-download">
              <i class="bx bx-download"></i>
            </a>
          </div>
          <div class="message-meta">${escapeHtml(coachName)} • ${dateStr}</div>
        </div>
      `;
    }

    return `
      <div class="message-bubble">
        <div>${escapeHtml(msg.message_text)}</div>
        <div class="message-meta">${escapeHtml(coachName)} • ${dateStr}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = messagesHtml;
  container.scrollTop = container.scrollHeight; // Scroll to bottom
}

// Plus dropdown: Photo, Video, Link (sent to all accounts' notification bottom sheets)
function setupPlusAttachDropdown() {
  const plusBtn = document.getElementById('plusAttachBtn');
  const dropdown = document.getElementById('plusAttachDropdown');
  const photoInput = document.getElementById('photoInput');
  const videoInput = document.getElementById('videoInput');
  const messageInput = document.getElementById('messageInput');
  if (!plusBtn || !dropdown) return;

  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('is-open');
    dropdown.setAttribute('aria-hidden', dropdown.classList.contains('is-open') ? 'false' : 'true');
  });

  function closeDropdown() {
    plusBtn?.focus();
    dropdown.classList.remove('is-open');
    dropdown.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', () => {
    if (dropdown.classList.contains('is-open')) closeDropdown();
  });
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  dropdown.querySelectorAll('.plus-attach-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const type = opt.dataset.type;
      closeDropdown();
      if (type === 'photo' && photoInput) {
        photoInput.click();
      } else if (type === 'video' && videoInput) {
        videoInput.click();
      } else if (type === 'link' && messageInput) {
        const url = prompt('Enter link URL:');
        if (url && url.trim()) {
          const text = messageInput.value.trim();
          messageInput.value = text ? `${text}\n${url.trim()}` : url.trim();
        }
      }
    });
  });

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      handleFileSelect(e);
      photoInput.value = '';
    });
  }
  if (videoInput) {
    videoInput.addEventListener('change', (e) => {
      handleFileSelect(e);
      videoInput.value = '';
    });
  }
}

// Update the compose-area preview (photo/link/video at flex-end)
function updateComposeAttachmentPreview() {
  const el = document.getElementById('composeAttachmentPreview');
  const messageInput = document.getElementById('messageInput');
  if (!el) return;

  if (pendingAttachment) {
    if (pendingAttachment.type === 'photo' && pendingAttachment.localUrl) {
      el.innerHTML = `<img src="${pendingAttachment.localUrl}" alt="" class="preview-thumb" />`;
      el.style.display = 'flex';
    } else if (pendingAttachment.type === 'video') {
      el.innerHTML = `<div class="preview-video-wrap" title="Video"><i class="bx bx-video"></i></div>`;
      el.style.display = 'flex';
    } else {
      el.innerHTML = '';
      el.style.display = 'none';
    }
    return;
  }

  const url = messageInput?.value ? extractFirstUrl(messageInput.value) : null;
  if (url) {
    el.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="preview-link-wrap" title="Link"><i class="bx bx-link"></i></a>`;
    el.style.display = 'flex';
  } else {
    el.innerHTML = '';
    el.style.display = 'none';
  }
}

// Handle file selection
async function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (pendingAttachment?.localUrl) {
    URL.revokeObjectURL(pendingAttachment.localUrl);
  }
  const type = (file.type || '').startsWith('video') ? 'video' : 'photo';
  pendingAttachment = {
    type,
    file,
    localUrl: type === 'photo' ? URL.createObjectURL(file) : null
  };
  updateComposeAttachmentPreview();
}

const MESSAGE_ATTACHMENTS_BUCKET = 'coach-message-attachments';

// Sanitize filename for storage path (keep extension, safe chars)
function sanitizeAttachmentFilename(name) {
  const base = (name || 'file').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
  const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
  const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
  return (stem || 'file') + ext;
}

// Upload pending attachment to storage; returns { attachment_url, attachment_type, attachment_name, attachment_size } or null
async function uploadPendingAttachment() {
  if (!pendingAttachment?.file || !currentCoachId || !supabase) return null;
  const file = pendingAttachment.file;
  const type = pendingAttachment.type; // 'photo' | 'video'
  const path = `${currentCoachId}/${Date.now()}_${sanitizeAttachmentFilename(file.name)}`;

  const { error } = await supabase.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) {
    console.error('Attachment upload failed:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from(MESSAGE_ATTACHMENTS_BUCKET)
    .getPublicUrl(path);

  return {
    attachment_url: publicUrl,
    attachment_type: type,
    attachment_name: file.name,
    attachment_size: file.size
  };
}

// Handle send message
async function handleSendMessage() {
  if (!supabaseReady || !supabase || !currentCoachId) return;
  if (messageRateLimit <= 0) {
    alert('Rate limit reached. You can send 3 messages per day.');
    return;
  }

  const messageInput = document.getElementById('messageInput');
  const recipientType = document.getElementById('recipientType')?.value || 'all';
  const announcementType = document.getElementById('announcementType')?.value || 'information';
  const messageText = messageInput?.value.trim();

  if (!messageText || messageText.length === 0) {
    return;
  }

  try {
    // Check rate limit
    const { data: canSend, error: limitError } = await supabase.rpc('check_message_rate_limit', {
      p_coach_id: currentCoachId
    });

    if (limitError || !canSend) {
      alert('Rate limit reached. You can send 3 messages per day.');
      messageRateLimit = 0;
      updateMessageRateLimitDisplay();
      return;
    }

    // Upload attachment first if present (coach_messages has attachment_url, attachment_name, attachment_size only)
    let attachmentPayload = {};
    let attachmentTypeForNotifications = null;
    if (pendingAttachment?.file) {
      try {
        const att = await uploadPendingAttachment();
        if (att) {
          attachmentPayload = {
            attachment_url: att.attachment_url,
            attachment_name: att.attachment_name,
            attachment_size: att.attachment_size
          };
          attachmentTypeForNotifications = att.attachment_type;
        }
      } catch (err) {
        alert('Failed to upload attachment. Send without it?');
        return;
      }
    }

    const insertPayload = {
      coach_id: currentCoachId,
      message_text: messageText,
      recipient_type: recipientType,
      announcement_type: announcementType,
      ...attachmentPayload
    };

    // Create message (announcement_type: time_change, cancellation, popup_session, information, veo_link)
    const { data: message, error } = await supabase
      .from('coach_messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
      return;
    }

    // Ensure message has attachment fields for createMessageNotifications (table has no attachment_type; we infer it)
    if (attachmentPayload.attachment_url && !message.attachment_url) {
      message.attachment_url = attachmentPayload.attachment_url;
      message.attachment_name = attachmentPayload.attachment_name;
    }
    if (attachmentTypeForNotifications) {
      message.attachment_type = attachmentTypeForNotifications;
    }

    // Create notifications for recipients (use announcement_type as notification_type for correct icon)
    await createMessageNotifications(message, recipientType, announcementType);

    // Clear input and pending attachment preview
    messageInput.value = '';
    if (pendingAttachment?.localUrl) {
      URL.revokeObjectURL(pendingAttachment.localUrl);
    }
    pendingAttachment = null;
    updateComposeAttachmentPreview();

    // Reload messages
    await loadMessages();
    await checkRateLimits();
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    alert('Failed to send message');
  }
}

// Extract first URL from text (for link/attachment preview in notifications)
function extractFirstUrl(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/https?:\/\/[^\s<>"\u201c\u201d]+/i);
  return m ? m[0].replace(/[.,;:!?)]+$/, '') : null;
}

// Create notifications for message recipients (notification_type = announcement_type for icon)
async function createMessageNotifications(message, recipientType, announcementType) {
  if (!supabaseReady || !supabase) return;
  const type = announcementType || 'information';

  try {
    const { data: session } = await supabase.auth.getSession();
    let coachName = '';
    if (session?.session?.user?.id) {
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name').eq('id', session.session.user.id).maybeSingle();
      if (profile) coachName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
    }

    let recipientIds = [];
    let recipientRole = 'player';

    if (recipientType === 'all') {
      const { data: players } = await supabase.from('profiles').select('id').eq('role', 'player');
      const { data: parents } = await supabase.from('profiles').select('id').eq('role', 'parent');
      recipientIds = [
        ...(players || []).map(p => ({ id: p.id, role: 'player' })),
        ...(parents || []).map(p => ({ id: p.id, role: 'parent' }))
      ];
    } else if (recipientType === 'players') {
      const { data: players } = await supabase.from('profiles').select('id').eq('role', 'player');
      recipientIds = (players || []).map(p => ({ id: p.id, role: 'player' }));
    } else if (recipientType === 'parents') {
      const { data: parents } = await supabase.from('profiles').select('id').eq('role', 'parent');
      recipientIds = (parents || []).map(p => ({ id: p.id, role: 'parent' }));
    } else if (recipientType === 'coaches') {
      const { data: coaches } = await supabase.from('profiles').select('id').in('role', ['coach', 'admin']);
      recipientIds = (coaches || []).map(p => ({ id: p.id, role: 'coach' }));
    }

    const linkUrl = (message.link_url || extractFirstUrl(message.message_text)) || null;
    const attachmentUrl = message.attachment_url || null;
    const attachmentType = message.attachment_type || (message.attachment_name && /\.(mp4|webm|mov|avi)(\?|$)/i.test(message.attachment_name) ? 'video' : message.attachment_url ? 'photo' : null) || null;

    if (recipientIds.length > 0) {
      const notifications = recipientIds.map(recipient => ({
        recipient_id: recipient.id,
        recipient_role: recipient.role,
        notification_type: type,
        title: 'New Announcement',
        message: message.message_text.substring(0, 100) + (message.message_text.length > 100 ? '...' : ''),
        data: {
          message_id: message.id,
          announcement_type: type,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          link_url: linkUrl,
          coach_name: coachName
        },
        related_entity_type: 'message',
        related_entity_id: message.id
      }));

      // Insert in batches to avoid payload size issues
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from('notifications').insert(batch);
      }
    }
  } catch (error) {
    console.error('Error creating message notifications:', error);
  }
}

// Handle send objectives
async function handleSendObjectives() {
  if (!supabaseReady || !supabase || !currentCoachId || !selectedPlayerId) return;

  const inPossession = document.getElementById('inPossessionObjective')?.value.trim();
  const outPossession = document.getElementById('outPossessionObjective')?.value.trim();

  if ((!inPossession || inPossession.length === 0) && (!outPossession || outPossession.length === 0)) {
    alert('Please enter at least one objective.');
    return;
  }

  try {
    // Check rate limit
    const { data: canSend, error: limitError } = await supabase.rpc('check_objectives_rate_limit', {
      p_coach_id: currentCoachId,
      p_player_id: selectedPlayerId
    });

    if (limitError || !canSend) {
      alert('Rate limit reached. You can send objectives once per week per player.');
      return;
    }

    // Deactivate previous objectives for this player
    await supabase
      .from('player_objectives')
      .update({ is_active: false })
      .eq('player_id', selectedPlayerId)
      .eq('is_active', true);

    // Create new objectives
    const { data: objective, error } = await supabase
      .from('player_objectives')
      .insert({
        coach_id: currentCoachId,
        player_id: selectedPlayerId,
        in_possession_objective: inPossession || null,
        out_of_possession_objective: outPossession || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending objectives:', error);
      alert('Failed to send objectives: ' + error.message);
      return;
    }

    // Create notification
    await supabase.rpc('create_objectives_notification', {
      p_objective_id: objective.id
    });

    // Clear form
    document.getElementById('inPossessionObjective').value = '';
    document.getElementById('outPossessionObjective').value = '';
    selectedPlayerId = null;
    document.getElementById('selectedPlayer').style.display = 'none';
    document.getElementById('playerSearch').value = '';
    updateSendObjectivesButton();

    alert('Objectives sent successfully!');
  } catch (error) {
    console.error('Error in handleSendObjectives:', error);
    alert('Failed to send objectives');
  }
}

// Quiz functions
function setCorrectAnswer(index) {
  correctAnswerIndex = index;
  
  // Update button styles
  document.querySelectorAll('.correct-answer-btn').forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('correct');
    } else {
      btn.classList.remove('correct');
    }
  });

  updateSendQuizButton();
}

function addAnswerOption() {
  const container = document.getElementById('quizAnswersContainer');
  if (!container) return;

  const currentAnswers = container.querySelectorAll('.quiz-answer-item');
  const nextIndex = currentAnswers.length;
  const answerLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const answerLetter = answerLetters[nextIndex] || String(nextIndex + 1);

  const answerItem = document.createElement('div');
  answerItem.className = 'quiz-answer-item';
  answerItem.dataset.answerIndex = nextIndex;
  answerItem.innerHTML = `
    <input 
      type="text" 
      class="quiz-answer-input" 
      placeholder="Answer ${answerLetter}"
      data-answer="${answerLetter.toLowerCase()}"
    />
    <button class="correct-answer-btn" data-answer-index="${nextIndex}" title="Mark as correct answer">
      <i class="bx bx-check"></i>
    </button>
  `;

  // Add click listener to new button
  const btn = answerItem.querySelector('.correct-answer-btn');
  btn.addEventListener('click', (e) => {
    const index = parseInt(e.currentTarget.dataset.answerIndex);
    setCorrectAnswer(index);
  });

  container.appendChild(answerItem);
}

function updateSendQuizButton() {
  const btn = document.getElementById('sendQuizBtn');
  if (!btn) return;

  const question = document.getElementById('quizQuestion')?.value.trim();
  const answerInputs = document.querySelectorAll('.quiz-answer-input');
  const hasAnswers = Array.from(answerInputs).some(input => input.value.trim().length > 0);
  const hasCorrectAnswer = correctAnswerIndex !== null;

  btn.disabled = !question || !hasAnswers || !hasCorrectAnswer;
}

// Handle send quiz
async function handleSendQuiz() {
  if (!supabaseReady || !supabase || !currentCoachId) return;

  const question = document.getElementById('quizQuestion')?.value.trim();
  const period = document.getElementById('quizPeriod')?.value;
  const category = document.getElementById('quizCategory')?.value;
  const keywordsInput = document.getElementById('quizKeywords')?.value.trim();
  
  if (!question) {
    alert('Please enter a question.');
    return;
  }

  const answerInputs = document.querySelectorAll('.quiz-answer-input');
  const answers = Array.from(answerInputs)
    .map(input => input.value.trim())
    .filter(answer => answer.length > 0);

  if (answers.length < 2) {
    alert('Please enter at least 2 answer options.');
    return;
  }

  if (correctAnswerIndex === null || correctAnswerIndex >= answers.length) {
    alert('Please mark the correct answer.');
    return;
  }

  try {
    // Parse keywords
    const keywords = keywordsInput ? 
      keywordsInput.split(',').map(k => k.trim()).filter(k => k.length > 0) : 
      [];

    // Create quiz question
    const { data: quizQuestion, error: quizError } = await supabase
      .from('quiz_questions')
      .insert({
        coach_id: currentCoachId,
        question: question,
        options: answers,
        correct_answer: correctAnswerIndex,
        period: period || null,
        category: category || null,
        keywords: keywords.length > 0 ? keywords : null
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating quiz:', quizError);
      alert('Failed to create quiz: ' + quizError.message);
      return;
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'player');

    if (playersError) {
      console.error('Error loading players:', playersError);
      alert('Failed to load players');
      return;
    }

    // Create quiz assignments for all players
    if (players && players.length > 0) {
      const assignments = players.map(player => ({
        quiz_question_id: quizQuestion.id,
        player_id: player.id,
        assigned_by: currentCoachId
      }));

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        await supabase.from('quiz_assignments').insert(batch);
      }

      // Create notifications directly
      const notifications = players.map(player => ({
        recipient_id: player.id,
        recipient_role: 'player',
        notification_type: 'quiz_assigned',
        title: 'New Quiz Available',
        message: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
        data: { quiz_question_id: quizQuestion.id },
        related_entity_type: 'quiz',
        related_entity_id: quizQuestion.id
      }));

      // Insert notifications in batches
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        await supabase.from('notifications').insert(batch);
      }
    }

    // Clear form
    document.getElementById('quizQuestion').value = '';
    document.getElementById('quizPeriod').value = '';
    document.getElementById('quizCategory').value = '';
    document.getElementById('quizKeywords').value = '';
    correctAnswerIndex = null;
    
    // Reset answer inputs (keep A and B, remove others)
    const container = document.getElementById('quizAnswersContainer');
    const answerItems = container.querySelectorAll('.quiz-answer-item');
    answerItems.forEach((item, index) => {
      if (index < 2) {
        item.querySelector('.quiz-answer-input').value = '';
        item.querySelector('.correct-answer-btn').classList.remove('correct');
      } else {
        item.remove();
      }
    });

    updateSendQuizButton();

    alert('Quiz sent to all players successfully!');
  } catch (error) {
    console.error('Error in handleSendQuiz:', error);
    alert('Failed to send quiz');
  }
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
