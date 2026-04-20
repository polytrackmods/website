async function loadMenu() {
  try {
    const response = await fetch('/menu.json');
    const data = await response.json();
    const menuContent = document.querySelector('.menu-content ul');

    if (!menuContent) return;

    menuContent.innerHTML = '';
    data.items.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      menuContent.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load menu:', error);
  }
}

loadMenu();
