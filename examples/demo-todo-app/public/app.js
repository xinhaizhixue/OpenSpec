// @spec REQ-TODO-001
// @spec REQ-TODO-002
// @spec REQ-TODO-003

const state = {
  todos: [],
};

const form = document.getElementById('todo-form');
const input = document.getElementById('new-todo-input');
const list = document.getElementById('todo-list');

function renderTodos() {
  list.innerHTML = '';

  for (const todo of state.todos) {
    const item = document.createElement('li');
    item.className = 'todo-item';
    item.dataset.testid = 'todo-item';
    item.dataset.todoTitle = todo.title;
    item.dataset.completed = String(todo.completed);

    const label = document.createElement('label');
    label.className = 'todo-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `Toggle ${todo.title}`);
    checkbox.addEventListener('change', () => {
      todo.completed = checkbox.checked;
      renderTodos();
    });

    const title = document.createElement('span');
    title.className = 'todo-title';
    title.textContent = todo.title;

    label.append(checkbox, title);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${todo.title}`);
    remove.addEventListener('click', () => {
      state.todos = state.todos.filter((entry) => entry !== todo);
      renderTodos();
    });

    item.append(label, remove);
    list.append(item);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) {
    return;
  }

  state.todos.push({
    title,
    completed: false,
  });
  input.value = '';
  renderTodos();
});

renderTodos();
