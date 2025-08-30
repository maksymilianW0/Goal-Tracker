const addBtn = document.getElementById("addGoalBtn");
const modalBg = document.getElementById("modalBg");
const saveGoal = document.getElementById("saveGoal");
const grid = document.getElementById("goalGrid");

const modalTitle = document.getElementById("modalTitle");
const titleInput = document.getElementById("goalTitle");
const descInput = document.getElementById("goalDesc");
const categorySelect = document.getElementById("goalCategory");
const newCategoryInput = document.getElementById("newCategoryInput");
const progressMode = document.getElementById("progressMode");
const progressSection = document.getElementById("progressSection");
const goalProgress = document.getElementById("goalProgress");
const progressValue = document.getElementById("progressValue");

// let goals = JSON.parse(localStorage.getItem("goals")) || [];
// let categories = JSON.parse(localStorage.getItem("categories")) || [];
let goals = [];
let categories = [];
let editIndex = null; // null = dodawanie, liczba = edycja

function saveData() {
    localStorage.setItem("goals", JSON.stringify(goals));
    localStorage.setItem("categories", JSON.stringify(categories));
}

// wczytywanie danych (localStorage lub w przyszłości API)
function loadData() {
    const storedGoals = localStorage.getItem("goals");
    const storedCategories = localStorage.getItem("categories");

    goals = storedGoals ? JSON.parse(storedGoals) : [];
    categories = storedCategories ? JSON.parse(storedCategories) : [];
}

function refreshCategories(selected="") {
    categorySelect.innerHTML = `<option value="">(brak)</option>`;
    categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selected) opt.selected = true;
    categorySelect.appendChild(opt);
    });
    const addOpt = document.createElement("option");
    addOpt.value = "__new";
    addOpt.textContent = "➕ Dodaj nową kategorię";
    categorySelect.appendChild(addOpt);
}

function renderGoals() {
    grid.innerHTML = "";
    goals.forEach((goal, i) => {
    const card = document.createElement("div");
    card.className = "card";

    if(goal.done) {
        card.classList.add("card-done");
    }

    const title = document.createElement("h3");
    title.textContent = goal.title;

    const desc = document.createElement("p");
    desc.textContent = goal.desc;

    const category = document.createElement("div");
    category.className = "category";
    category.textContent = goal.category || "(brak kategorii)";

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(category);

    if (goal.isProgress) {
        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";

        const fill = document.createElement("div");
        fill.className = "progress-fill";
        fill.style.width = goal.progress + "%";

        progressBar.appendChild(fill);

        const status = document.createElement("div");
        status.className = "status";
        status.textContent = "Postęp: " + goal.progress + "%";

        card.appendChild(progressBar);
        card.appendChild(status);
    } else {
        const status = document.createElement("div");
        status.className = "status";
        status.textContent = goal.done ? "✅ Ukończone" : "❌ Nieukończone";
        card.appendChild(status);
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    // hasjfhausf
    const done = document.createElement("button");
    done.textContent = goals[i].done ? "✅" : "☑️";
    done.onclick = () => {
        goals[i].done = !goals[i].done;
        saveData();
        renderGoals();
    };

    const edit = document.createElement("button");
    edit.textContent = "✏️";
    edit.onclick = () => openModal(i);

    const del = document.createElement("button");
    del.textContent = "🗑️";
    del.onclick = () => {
        goals.splice(i,1);
        saveData();
        renderGoals();
    };

    actions.appendChild(done);
    actions.appendChild(edit);
    actions.appendChild(del);

    card.appendChild(actions);
    grid.appendChild(card);
    });
}

function openModal(index=null) {
    editIndex = index;
    modalBg.style.display = "flex";

    if (index === null) {
    modalTitle.textContent = "Dodaj cel";
    titleInput.value = "";
    descInput.value = "";
    refreshCategories();
    newCategoryInput.classList.add("hidden");
    progressMode.checked = false;
    progressSection.classList.add("hidden");
    goalProgress.value = 0;
    progressValue.textContent = "0%";
    } else {
    const goal = goals[index];
    modalTitle.textContent = "Edytuj cel";
    titleInput.value = goal.title;
    descInput.value = goal.desc;
    refreshCategories(goal.category);
    progressMode.checked = goal.isProgress;
    progressSection.classList.toggle("hidden", !goal.isProgress);
    goalProgress.value = goal.progress || 0;
    progressValue.textContent = goal.isProgress ? goal.progress+"%" : "0%";
    }
}

addBtn.onclick = () => openModal();

modalBg.onclick = (e) => {
    if (e.target === modalBg) modalBg.style.display = "none";
};

categorySelect.onchange = () => {
    if (categorySelect.value === "__new") {
    newCategoryInput.classList.remove("hidden");
    newCategoryInput.focus();
    } else {
    newCategoryInput.classList.add("hidden");
    }
};

progressMode.onchange = () => {
    progressSection.classList.toggle("hidden", !progressMode.checked);
};
goalProgress.oninput = () => {
    progressValue.textContent = goalProgress.value + "%";
};

saveGoal.onclick = () => {
    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    let category = categorySelect.value;
    if (category === "__new") {
    category = newCategoryInput.value.trim();
    if (category && !categories.includes(category)) {
        categories.push(category);
    }
    }
    const isProgress = progressMode.checked;
    const progress = parseInt(goalProgress.value);

    if (title) {
    const newGoal = {
        title, desc, category, isProgress,
        progress: isProgress ? progress : 0,
        done: !isProgress ? (goals[editIndex]?.done || false) : undefined
    };

    if (editIndex === null) {
        goals.push(newGoal);
    } else {
        goals[editIndex] = newGoal;
    }
    saveData();
    renderGoals();
    modalBg.style.display = "none";
    }
};


const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.onclick = () => {
    alert("Wylogowano!"); // tymczasowo alert

    // Robocze wyczyszczenie pamięci
    localStorage.clear();
    window.location.reload();

    // w przyszłości tutaj można np. redirect do /login
};


loadData();
refreshCategories();
renderGoals();