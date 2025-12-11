// Schedule page scripts

(function() {
  'use strict';

  // Initialize dropdown functionality
  const onFieldOption = document.getElementById('onFieldOption');
  const onFieldHeader = document.getElementById('onFieldHeader');
  const onFieldDropdown = document.getElementById('onFieldDropdown');
  
  const virtualOption = document.getElementById('virtualOption');
  const virtualHeader = document.getElementById('virtualHeader');
  const virtualDropdown = document.getElementById('virtualDropdown');

  // Toggle On-Field dropdown
  if (onFieldHeader && onFieldDropdown) {
    onFieldHeader.addEventListener('click', () => {
      const isOpen = onFieldOption.classList.contains('is-open');
      
      // Close virtual if it's open
      if (virtualOption.classList.contains('is-open')) {
        virtualOption.classList.remove('is-open');
      }
      
      // Toggle on-field
      if (isOpen) {
        onFieldOption.classList.remove('is-open');
      } else {
        onFieldOption.classList.add('is-open');
      }
    });
  }

  // Toggle Virtual dropdown
  if (virtualHeader && virtualDropdown) {
    virtualHeader.addEventListener('click', () => {
      const isOpen = virtualOption.classList.contains('is-open');
      
      // Close on-field if it's open
      if (onFieldOption.classList.contains('is-open')) {
        onFieldOption.classList.remove('is-open');
      }
      
      // Toggle virtual
      if (isOpen) {
        virtualOption.classList.remove('is-open');
      } else {
        virtualOption.classList.add('is-open');
      }
    });
  }

  // Handle option item clicks
  const optionItems = document.querySelectorAll('.option-item');
  optionItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent dropdown from closing
      const optionName = item.querySelector('span').textContent;
      console.log('Selected option:', optionName);
      // TODO: Add functionality for when an option is selected
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!onFieldOption.contains(e.target) && !virtualOption.contains(e.target)) {
      onFieldOption.classList.remove('is-open');
      virtualOption.classList.remove('is-open');
    }
  });
})();
