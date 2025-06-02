
        document.addEventListener('DOMContentLoaded', function() {
            // DOM Elements
            const taskModal = document.getElementById('task-modal');
            const addTaskBtn = document.getElementById('add-task-btn');
            const closeModalBtn = document.getElementById('close-modal');
            const cancelTaskBtn = document.getElementById('cancel-task');
            const saveTaskBtn = document.getElementById('save-task');
            const taskForm = document.getElementById('task-form');
            const taskList = document.getElementById('task-list');
            const emptyState = document.getElementById('empty-state');
            const emptyAddTaskBtn = document.getElementById('empty-add-task');
            const filterButtons = document.querySelectorAll('.filter-btn');
            const sortSelect = document.getElementById('sort-tasks');
            const listTitle = document.getElementById('list-title');
            const themeToggle = document.getElementById('theme-toggle');
            
            // Stats elements
            const totalTasksEl = document.getElementById('total-tasks');
            const completedTasksEl = document.getElementById('completed-tasks');
            const pendingTasksEl = document.getElementById('pending-tasks');
            const overdueTasksEl = document.getElementById('overdue-tasks');
            const completionPercentageEl = document.getElementById('completion-percentage');
            const progressRing = document.querySelector('.progress-ring__circle');
            
            // Initialize tasks from localStorage or empty array
            let tasks = JSON.parse(localStorage.getItem('nexusflow-tasks')) || [];
            let currentFilter = 'all';
            let currentSort = 'date-added';
            let isEditing = false;
            let currentEditId = null;
            
            // Initialize the app
            function init() {
                renderTasks();
                updateStats();
                setupEventListeners();
                setupDragAndDrop();
                
                // Set default due date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('task-due-date').value = today;
                document.getElementById('task-due-date').min = today;
                
                // Set progress ring circumference
                if (progressRing) {
                    const radius = progressRing.r.baseVal.value;
                    const circumference = radius * 2 * Math.PI;
                    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
                    progressRing.style.strokeDashoffset = circumference;
                }
            }
            
            // Set up event listeners
            function setupEventListeners() {
                // Task modal
                addTaskBtn.addEventListener('click', () => openTaskModal());
                emptyAddTaskBtn.addEventListener('click', () => openTaskModal());
                closeModalBtn.addEventListener('click', () => closeTaskModal());
                cancelTaskBtn.addEventListener('click', () => closeTaskModal());
                
                // Save task
                saveTaskBtn.addEventListener('click', () => {
                    if (isEditing) {
                        updateTask();
                    } else {
                        addTask();
                    }
                });
                
                // Filter buttons
                filterButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const filter = button.dataset.filter;
                        setFilter(filter);
                    });
                });
                
                // Sort select
                sortSelect.addEventListener('change', () => {
                    currentSort = sortSelect.value;
                    renderTasks();
                });
                
                // Theme toggle
                themeToggle.addEventListener('click', toggleTheme);
                
                // Check for saved theme preference
                if (localStorage.getItem('nexusflow-theme') === 'dark') {
                    document.documentElement.classList.add('dark');
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
            
            // Set up drag and drop
            function setupDragAndDrop() {
                let draggedItem = null;
                
                taskList.addEventListener('dragstart', (e) => {
                    if (e.target.classList.contains('task-card')) {
                        draggedItem = e.target;
                        e.target.classList.add('dragging');
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/html', e.target.innerHTML);
                    }
                });
                
                taskList.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const afterElement = getDragAfterElement(taskList, e.clientY);
                    if (afterElement == null) {
                        taskList.appendChild(draggedItem);
                    } else {
                        taskList.insertBefore(draggedItem, afterElement);
                    }
                });
                
                taskList.addEventListener('dragend', (e) => {
                    if (e.target.classList.contains('task-card')) {
                        e.target.classList.remove('dragging');
                        
                        // Update task order in the array
                        const taskElements = Array.from(taskList.querySelectorAll('.task-card'));
                        const newTasks = [];
                        
                        taskElements.forEach(el => {
                            const taskId = parseInt(el.dataset.id);
                            const task = tasks.find(t => t.id === taskId);
                            if (task) newTasks.push(task);
                        });
                        
                        tasks = newTasks;
                        saveTasks();
                    }
                });
                
                function getDragAfterElement(container, y) {
                    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
                    
                    return draggableElements.reduce((closest, child) => {
                        const box = child.getBoundingClientRect();
                        const offset = y - box.top - box.height / 2;
                        
                        if (offset < 0 && offset > closest.offset) {
                            return { offset: offset, element: child };
                        } else {
                            return closest;
                        }
                    }, { offset: Number.NEGATIVE_INFINITY }).element;
                }
            }
            
            // Toggle dark/light theme
            function toggleTheme() {
                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('nexusflow-theme', 'light');
                    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                } else {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('nexusflow-theme', 'dark');
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }
            
            // Open task modal
            function openTaskModal(editId = null) {
                isEditing = editId !== null;
                currentEditId = editId;
                
                const modalTitle = document.getElementById('modal-title');
                const taskIdInput = document.getElementById('task-id');
                const taskTitleInput = document.getElementById('task-title');
                const taskDescInput = document.getElementById('task-description');
                const taskPriorityInput = document.getElementById('task-priority');
                const taskDueDateInput = document.getElementById('task-due-date');
                const taskCategoryInput = document.getElementById('task-category');
                const taskTagsInput = document.getElementById('task-tags');
                
                if (isEditing) {
                    modalTitle.textContent = 'Edit Task';
                    const task = tasks.find(t => t.id === editId);
                    
                    if (task) {
                        taskIdInput.value = task.id;
                        taskTitleInput.value = task.title;
                        taskDescInput.value = task.description || '';
                        taskPriorityInput.value = task.priority;
                        taskDueDateInput.value = task.dueDate || '';
                        taskCategoryInput.value = task.category || '';
                        taskTagsInput.value = task.tags ? task.tags.join(', ') : '';
                    }
                } else {
                    modalTitle.textContent = 'Add New Task';
                    taskIdInput.value = '';
                    taskTitleInput.value = '';
                    taskDescInput.value = '';
                    taskPriorityInput.value = 'medium';
                    taskDueDateInput.value = new Date().toISOString().split('T')[0];
                    taskCategoryInput.value = '';
                    taskTagsInput.value = '';
                }
                
                taskModal.classList.remove('hidden');
                taskTitleInput.focus();
            }
            
            // Close task modal
            function closeTaskModal() {
                taskModal.classList.add('hidden');
                isEditing = false;
                currentEditId = null;
            }
            
            // Add a new task
            function addTask() {
                const title = document.getElementById('task-title').value.trim();
                if (!title) return;
                
                const newTask = {
                    id: Date.now(),
                    title: title,
                    description: document.getElementById('task-description').value.trim(),
                    priority: document.getElementById('task-priority').value,
                    dueDate: document.getElementById('task-due-date').value,
                    category: document.getElementById('task-category').value.trim(),
                    tags: document.getElementById('task-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
                    completed: false,
                    createdAt: new Date().toISOString(),
                    order: tasks.length
                };
                
                tasks.push(newTask);
                saveTasks();
                closeTaskModal();
                renderTasks();
                updateStats();
                
                // Scroll to the new task
                setTimeout(() => {
                    const newTaskElement = document.querySelector(`[data-id="${newTask.id}"]`);
                    if (newTaskElement) {
                        newTaskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 300);
            }
            
            // Update an existing task
            function updateTask() {
                const taskId = parseInt(document.getElementById('task-id').value);
                const task = tasks.find(t => t.id === taskId);
                
                if (task) {
                    task.title = document.getElementById('task-title').value.trim();
                    task.description = document.getElementById('task-description').value.trim();
                    task.priority = document.getElementById('task-priority').value;
                    task.dueDate = document.getElementById('task-due-date').value;
                    task.category = document.getElementById('task-category').value.trim();
                    task.tags = document.getElementById('task-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    
                    saveTasks();
                    closeTaskModal();
                    renderTasks();
                    updateStats();
                }
            }
            
            // Delete a task
            function deleteTask(id) {
                if (confirm('Are you sure you want to delete this task?')) {
                    tasks = tasks.filter(task => task.id !== id);
                    saveTasks();
                    renderTasks();
                    updateStats();
                }
            }
            
            // Toggle task completion status
            function toggleTaskComplete(id, isCompleted) {
                const task = tasks.find(task => task.id === id);
                if (task) {
                    task.completed = isCompleted;
                    saveTasks();
                    renderTasks();
                    updateStats();
                }
            }
            
            // Set current filter
            function setFilter(filter) {
                currentFilter = filter;
                
                // Update active filter button
                filterButtons.forEach(button => {
                    if (button.dataset.filter === filter) {
                        button.classList.remove('text-gray-600', 'hover:bg-gray-50');
                        button.classList.add('bg-indigo-50', 'text-indigo-700');
                    } else {
                        button.classList.remove('bg-indigo-50', 'text-indigo-700');
                        button.classList.add('text-gray-600', 'hover:bg-gray-50');
                    }
                });
                
                // Update list title
                switch(filter) {
                    case 'all':
                        listTitle.textContent = 'All Tasks';
                        break;
                    case 'today':
                        listTitle.textContent = 'Today\'s Tasks';
                        break;
                    case 'upcoming':
                        listTitle.textContent = 'Upcoming Tasks';
                        break;
                    case 'completed':
                        listTitle.textContent = 'Completed Tasks';
                        break;
                }
                
                renderTasks();
            }
            
            // Sort tasks
            function sortTasks(tasksToSort) {
                switch(currentSort) {
                    case 'date-added':
                        return tasksToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    case 'due-date':
                        return tasksToSort.sort((a, b) => {
                            if (!a.dueDate && !b.dueDate) return 0;
                            if (!a.dueDate) return 1;
                            if (!b.dueDate) return -1;
                            return new Date(a.dueDate) - new Date(b.dueDate);
                        });
                    case 'priority':
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        return tasksToSort.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
                    default:
                        return tasksToSort;
                }
            }
            
            // Filter tasks
            function filterTasks() {
                const today = new Date().toISOString().split('T')[0];
                
                switch(currentFilter) {
                    case 'all':
                        return tasks;
                    case 'today':
                        return tasks.filter(task => task.dueDate === today);
                    case 'upcoming':
                        return tasks.filter(task => task.dueDate && task.dueDate > today);
                    case 'completed':
                        return tasks.filter(task => task.completed);
                    default:
                        return tasks;
                }
            }
            
            // Render tasks
            function renderTasks() {
                taskList.innerHTML = '';
                
                let filteredTasks = filterTasks();
                filteredTasks = sortTasks(filteredTasks);
                
                if (filteredTasks.length === 0) {
                    taskList.appendChild(emptyState);
                    emptyState.classList.remove('hidden');
                } else {
                    emptyState.classList.add('hidden');
                    
                    filteredTasks.forEach(task => {
                        const taskElement = createTaskElement(task);
                        taskList.appendChild(taskElement);
                    });
                }
            }
            
            // Create a task element
            function createTaskElement(task) {
                const li = document.createElement('li');
                li.className = `task-card bg-white rounded-xl shadow-sm p-4 fade-in ${task.completed ? 'opacity-75' : ''} priority-${task.priority}`;
                li.dataset.id = task.id;
                li.draggable = true;
                
                // Check if task is overdue
                const today = new Date().toISOString().split('T')[0];
                const isOverdue = task.dueDate && !task.completed && task.dueDate < today;
                
                // Format due date
                let dueDateText = 'No due date';
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate);
                    dueDateText = dueDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    if (task.dueDate === today) {
                        dueDateText = 'Today';
                    }
                }
                
                // Priority badge
                let priorityBadge = '';
                if (task.priority === 'high') {
                    priorityBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mr-2">High</span>';
                } else if (task.priority === 'medium') {
                    priorityBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">Medium</span>';
                } else {
                    priorityBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mr-2">Low</span>';
                }
                
                // Tags
                let tagsHtml = '';
                if (task.tags && task.tags.length > 0) {
                    tagsHtml = task.tags.map(tag => 
                        `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-1">${tag}</span>`
                    ).join('');
                }
                
                li.innerHTML = `
                    <div class="flex items-start">
                        <div class="flex items-center h-5 mr-3 mt-1">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                                   class="checkbox h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start">
                                <div class="flex-1 min-w-0">
                                    <p class="task-text text-sm md:text-base font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'} truncate">
                                        ${task.title}
                                    </p>
                                    ${task.description ? `<p class="text-sm text-gray-500 mt-1">${task.description}</p>` : ''}
                                </div>
                                <div class="flex space-x-2 ml-2">
                                    <button class="edit-btn p-1 text-gray-400 hover:text-indigo-600 rounded-full">
                                        <i class="fas fa-pencil-alt text-xs"></i>
                                    </button>
                                    <button class="delete-btn p-1 text-gray-400 hover:text-red-600 rounded-full">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mt-3 flex flex-wrap items-center text-xs">
                                ${priorityBadge}
                                ${tagsHtml}
                                
                                <span class="text-gray-500 ${isOverdue ? 'text-red-500 font-medium' : ''}">
                                    <i class="far fa-calendar-alt mr-1"></i> ${dueDateText}
                                    ${isOverdue ? ' (Overdue)' : ''}
                                </span>
                                
                                ${task.category ? `<span class="ml-2 text-gray-500"><i class="fas fa-tag mr-1"></i> ${task.category}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                // Add event listeners
                const checkbox = li.querySelector('.checkbox');
                const editBtn = li.querySelector('.edit-btn');
                const deleteBtn = li.querySelector('.delete-btn');
                
                checkbox.addEventListener('change', () => toggleTaskComplete(task.id, checkbox.checked));
                editBtn.addEventListener('click', () => openTaskModal(task.id));
                deleteBtn.addEventListener('click', () => deleteTask(task.id));
                
                return li;
            }
            
            // Update stats
            function updateStats() {
                const total = tasks.length;
                const completed = tasks.filter(task => task.completed).length;
                const pending = total - completed;
                
                // Calculate overdue tasks
                const today = new Date().toISOString().split('T')[0];
                const overdue = tasks.filter(task => 
                    task.dueDate && !task.completed && task.dueDate < today
                ).length;
                
                // Update DOM
                totalTasksEl.textContent = total;
                completedTasksEl.textContent = completed;
                pendingTasksEl.textContent = pending;
                overdueTasksEl.textContent = overdue;
                
                // Update completion percentage and progress ring
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                completionPercentageEl.textContent = `${percentage}%`;
                
                if (progressRing) {
                    const radius = progressRing.r.baseVal.value;
                    const circumference = radius * 2 * Math.PI;
                    const offset = circumference - (percentage / 100) * circumference;
                    progressRing.style.strokeDashoffset = offset;
                }
            }
            
            // Save tasks to localStorage
            function saveTasks() {
                localStorage.setItem('nexusflow-tasks', JSON.stringify(tasks));
            }
            
            // Initialize the app
            init();
        });