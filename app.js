const STORAGE_KEY = 'todos-v2';

let todos = loadTodos();
let currentFilter = 'all';

const form    = document.getElementById('todo-form');
const input   = document.getElementById('todo-input');
const list    = document.getElementById('todo-list');
const counter = document.getElementById('remaining-count');
const clearBtn = document.getElementById('clear-completed');

// ── イベント登録 ──────────────────────────────────────────

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  addTodo(text);
  input.value = '';
  input.focus();
});

// フィルターはイベント委任で一括処理
document.querySelector('.filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  currentFilter = btn.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach((b) =>
    b.classList.toggle('active', b === btn)
  );
  render();
});

clearBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  render();
});

// ── CRUD ─────────────────────────────────────────────────

function addTodo(text) {
  const item = { id: Date.now(), text, completed: false };
  todos.unshift(item); // 新しいタスクを先頭へ
  saveTodos();
  render();
}

function toggleTodo(id) {
  const t = todos.find((t) => t.id === id);
  if (!t) return;
  t.completed = !t.completed;
  saveTodos();
  render();
}

// 削除はアニメーション後に状態を更新
function deleteTodo(id) {
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!li) return;
  li.classList.add('leaving');
  li.addEventListener('animationend', () => {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    render();
  }, { once: true });
}

// ── レンダリング ─────────────────────────────────────────

function visibleTodos() {
  if (currentFilter === 'active')    return todos.filter((t) => !t.completed);
  if (currentFilter === 'completed') return todos.filter((t) => t.completed);
  return todos;
}

function render() {
  const items = visibleTodos();

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-state">タスクはありません</li>';
  } else {
    list.innerHTML = '';
    items.forEach((todo) => list.appendChild(createItem(todo)));
  }

  const activeCount = todos.filter((t) => !t.completed).length;
  counter.textContent = `${activeCount} 件残り`;
}

function createItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  li.innerHTML = `
    <label class="checkbox-wrap" aria-label="${todo.completed ? '未完了に戻す' : '完了にする'}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''}>
      <span class="checkmark">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
             stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="2,6 5,9 10,3"/>
        </svg>
      </span>
    </label>
    <span class="todo-text">${escapeHtml(todo.text)}</span>
    <button class="delete-btn" aria-label="タスクを削除">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTodo(todo.id));
  li.querySelector('.delete-btn').addEventListener('click', () => deleteTodo(todo.id));

  return li;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── 永続化 ───────────────────────────────────────────────

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // プライベートブラウジングなどでは無視
  }
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ── 起動 ─────────────────────────────────────────────────
render();
