"use strict";

/* =========================================================
   iLiveSolution HR REMINDER SYSTEM
   Admin + User + User Tasks
   Existing Reminder Data Preserved
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "ilivesolution_hr_reminders_v2";
const THEME_KEY = "ilivesolution_theme";


/* =========================================================
   STATE
========================================================= */

let reminders = [];
let editingId = null;

let specialFilter = "all";

let alarmInterval = null;
let lastAlarmId = null;

let toastTimer = null;

let currentUser = null;

let users = [];
let userTasks = [];

let taskView = "all";
let userView = "all";

let editingUserId = null;
let editingTaskId = null;


/* =========================================================
   DOM
========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");

const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const logoutBtn = document.getElementById("logoutBtn");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const currentUserName = document.getElementById("currentUserName");
const currentUserRole = document.getElementById("currentUserRole");
const currentUserAvatar = document.getElementById("currentUserAvatar");

const adminNavigation = document.getElementById("adminNavigation");
const userNavigation = document.getElementById("userNavigation");

const notificationBtn = document.getElementById("notificationBtn");
const notificationIndicator = document.getElementById("notificationIndicator");

const themeSelect = document.getElementById("themeSelect");

const addReminderBtn = document.getElementById("addReminderBtn");
const addReminderBtn2 = document.getElementById("addReminderBtn2");

const quickAddEmployeeBtn =
    document.getElementById("quickAddEmployeeBtn");

const quickAddTaskBtn =
    document.getElementById("quickAddTaskBtn");

const viewAllBtn =
    document.getElementById("viewAllBtn");

const dashboardDate =
    document.getElementById("dashboardDate");

const totalReminders =
    document.getElementById("totalReminders");

const pendingReminders =
    document.getElementById("pendingReminders");

const todayReminders =
    document.getElementById("todayReminders");

const overdueReminders =
    document.getElementById("overdueReminders");

const upcomingList =
    document.getElementById("upcomingList");

const dueNowCard =
    document.getElementById("dueNowCard");

const dueNowTitle =
    document.getElementById("dueNowTitle");

const dueNowDescription =
    document.getElementById("dueNowDescription");

const stopAlarmBtn =
    document.getElementById("stopAlarmBtn");


/* =========================================================
   REMINDER DOM
========================================================= */

const reminderModal =
    document.getElementById("reminderModal");

const reminderForm =
    document.getElementById("reminderForm");

const reminderId =
    document.getElementById("reminderId");

const modalTitle =
    document.getElementById("modalTitle");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelReminderBtn =
    document.getElementById("cancelReminderBtn");

const employeeFields =
    document.getElementById("employeeFields");

const employeeName =
    document.getElementById("employeeName");

const employeeId =
    document.getElementById("employeeId");

const department =
    document.getElementById("department");

const reminderText =
    document.getElementById("reminderText");

const reminderDate =
    document.getElementById("reminderDate");

const reminderTime =
    document.getElementById("reminderTime");

const reminderNotes =
    document.getElementById("reminderNotes");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const departmentFilter =
    document.getElementById("departmentFilter");

const remindersTableBody =
    document.getElementById("remindersTableBody");

const exportCsvBtn =
    document.getElementById("exportCsvBtn");


/* =========================================================
   USER DOM
========================================================= */

const usersSection =
    document.getElementById("usersSection");

const usersTableBody =
    document.getElementById("usersTableBody");

const addUserBtn =
    document.getElementById("addUserBtn");

const userModal =
    document.getElementById("userModal");

const userModalTitle =
    document.getElementById("userModalTitle");

const userForm =
    document.getElementById("userForm");

const userId =
    document.getElementById("userId");

const userDisplayName =
    document.getElementById("userDisplayName");

const username =
    document.getElementById("username");

const userRole =
    document.getElementById("userRole");

const userStatus =
    document.getElementById("userStatus");

const userPassword =
    document.getElementById("userPassword");

const userPasswordGroup =
    document.getElementById("userPasswordGroup");

const closeUserModalBtn =
    document.getElementById("closeUserModalBtn");

const cancelUserBtn =
    document.getElementById("cancelUserBtn");


/* =========================================================
   TASK DOM
========================================================= */

const userTasksSection =
    document.getElementById("userTasksSection");

const userTasksTitle =
    document.getElementById("userTasksTitle");

const userTasksSubtitle =
    document.getElementById("userTasksSubtitle");

const userTasksTableBody =
    document.getElementById("userTasksTableBody");

const addUserTaskBtn =
    document.getElementById("addUserTaskBtn");

const taskSearchInput =
    document.getElementById("taskSearchInput");

const taskStatusFilter =
    document.getElementById("taskStatusFilter");

const taskUserFilter =
    document.getElementById("taskUserFilter");

const userTaskModal =
    document.getElementById("userTaskModal");

const userTaskModalTitle =
    document.getElementById("userTaskModalTitle");

const userTaskForm =
    document.getElementById("userTaskForm");

const userTaskId =
    document.getElementById("userTaskId");

const taskAssignedUser =
    document.getElementById("taskAssignedUser");

const taskTitle =
    document.getElementById("taskTitle");

const taskDescription =
    document.getElementById("taskDescription");

const taskDate =
    document.getElementById("taskDate");

const taskTime =
    document.getElementById("taskTime");

const closeUserTaskModalBtn =
    document.getElementById("closeUserTaskModalBtn");

const cancelUserTaskBtn =
    document.getElementById("cancelUserTaskBtn");


/* =========================================================
   TOAST
========================================================= */

const toast =
    document.getElementById("toast");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", init);


async function init() {

    loadTheme();

    loadReminders();

    setupNavigation();

    setupReminderEvents();

    setupUserEvents();

    setupTaskEvents();

    setupNotifications();

    setupTheme();

    setDashboardDate();

    renderDashboard();

    renderRemindersTable();

    populateDepartments();

    startAlarmChecker();

    await checkExistingSession();

}


/* =========================================================
   AUTH
========================================================= */

async function checkExistingSession() {

    try {

        const response = await fetch("/api/me", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {

            showLogin();

            return;
        }

        const data = await response.json();

        if (data && data.success && data.user) {

            currentUser = data.user;

            showApplication();

            await loadUserData();

        } else {

            showLogin();

        }

    } catch (error) {

        /*
         If backend is unavailable, keep the existing
         local reminder application available.
        */

        currentUser = {
            id: null,
            username: "local",
            display_name: "Local User",
            role: "admin"
        };

        showApplication();

        applyRoleUI();

    }

}


/* =========================================================
   LOGIN
========================================================= */

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const usernameValue =
            loginUsername.value.trim();

        const passwordValue =
            loginPassword.value;

        if (!usernameValue || !passwordValue) {

            showLoginError(
                "Please enter username and password."
            );

            return;
        }


        loginBtn.disabled = true;
        loginBtn.textContent = "Signing In...";

        hideLoginError();


        try {

            const response = await fetch("/api/login", {

                method: "POST",

                credentials: "same-origin",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    username: usernameValue,
                    password: passwordValue

                })

            });


            const data = await response.json();


            if (!response.ok || !data.success) {

                showLoginError(
                    data.message ||
                    "Invalid username or password."
                );

                return;
            }


            currentUser = data.user;

            loginForm.reset();

            showApplication();

            await loadUserData();

            showToast(
                "Welcome",
                "Login successful."
            );


        } catch (error) {

            showLoginError(
                "Unable to connect to the server."
            );

        } finally {

            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";

        }

    });

}

function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = "block";
    }
}

function hideLoginError() {
    if (loginError) {
        loginError.textContent = "";
        loginError.style.display = "none";
    }
}


/* =========================================================
   SHOW / HIDE APP
========================================================= */

function showLogin() {

    if (loginScreen) {
        loginScreen.style.display = "flex";
    }

    if (appShell) {
        appShell.style.display = "none";
    }

}


function showApplication() {

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (appShell) {
        appShell.style.display = "flex";
    }

    applyRoleUI();

}


/* =========================================================
   ROLE UI
========================================================= */

function applyRoleUI() {

    const isAdmin =
        currentUser &&
        currentUser.role === "admin";


    if (adminNavigation) {

        adminNavigation.style.display =
            isAdmin ? "block" : "none";

    }


    if (userNavigation) {

        userNavigation.style.display =
            isAdmin ? "none" : "block";

    }


    if (addReminderBtn) {

        addReminderBtn.style.display =
            isAdmin ? "" : "none";

    }


    if (addReminderBtn2) {

        addReminderBtn2.style.display =
            isAdmin ? "" : "none";

    }


    if (quickAddEmployeeBtn) {

        quickAddEmployeeBtn.style.display =
            isAdmin ? "" : "none";

    }


    if (quickAddTaskBtn) {

        quickAddTaskBtn.style.display =
            isAdmin ? "" : "none";

    }


    if (addUserBtn) {

        addUserBtn.style.display =
            isAdmin ? "" : "none";

    }


    if (addUserTaskBtn) {

        addUserTaskBtn.style.display =
            isAdmin ? "" : "none";

    }


    if (taskUserFilter) {

        taskUserFilter.style.display =
            isAdmin ? "" : "none";

    }


    if (currentUserName) {

        currentUserName.textContent =
            currentUser?.display_name ||
            currentUser?.username ||
            "User";

    }


    if (currentUserRole) {

        currentUserRole.textContent =
            currentUser?.role ||
            "user";

    }


    if (currentUserAvatar) {

        const name =
            currentUser?.display_name ||
            currentUser?.username ||
            "U";

        currentUserAvatar.textContent =
            name.charAt(0).toUpperCase();

    }


    if (!isAdmin) {

        pageSubtitle.textContent =
            "View your reminders and complete assigned tasks.";

    } else {

        pageSubtitle.textContent =
            "Manage your HR reminders and daily tasks.";

    }

}


/* =========================================================
   LOGOUT
========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener("click", async function () {

        try {

            await fetch("/api/logout", {

                method: "POST",

                credentials: "same-origin"

            });

        } catch (error) {
            // Continue logout locally.
        }


        currentUser = null;

        showLogin();

        showToast(
            "Logged Out",
            "You have been logged out."
        );

    });

}


/* =========================================================
   LOAD USER DATA
========================================================= */

async function loadUserData() {

    applyRoleUI();

    if (!currentUser) {
        return;
    }


    if (currentUser.role === "admin") {

        await loadUsers();

        await loadTasks();

    } else {

        await loadTasks();

    }

}


/* =========================================================
   API HELPER
========================================================= */

async function apiRequest(
    url,
    options = {}
) {

    const config = {

        credentials: "same-origin",

        ...options,

        headers: {

            ...(options.headers || {})

        }

    };


    const response =
        await fetch(url, config);


    let data = {};

    try {

        data =
            await response.json();

    } catch (error) {

        data = {};

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Request failed (${response.status})`
        );

    }


    return data;

}


/* =========================================================
   USERS
========================================================= */

async function loadUsers() {

    if (!currentUser ||
        currentUser.role !== "admin") {

        return;

    }


    try {

        const data =
            await apiRequest(
                "/api/admin/users"
            );


        users =
            Array.isArray(data.users)
                ? data.users
                : [];


        renderUsers();

        populateTaskUsers();

    } catch (error) {

        showToast(
            "Users",
            error.message
        );

    }

}


function renderUsers() {

    if (!usersTableBody) {
        return;
    }


    if (!users.length) {

        usersTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="table-empty"
                >
                    No users found.
                </td>

            </tr>

        `;

        return;

    }


    usersTableBody.innerHTML =
        users.map(function (user) {

            const name =
                user.display_name ||
                user.name ||
                user.username ||
                "User";

            const role =
                user.role ||
                "user";

            const active =
                user.active !== false &&
                user.active !== 0;


            const created =
                user.created_at
                    ? formatDateTime(user.created_at)
                    : "-";


            return `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(name)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(user.username || "-")}
                    </td>

                    <td>
                        ${escapeHtml(role)}
                    </td>

                    <td>

                        <span class="status-badge ${
                            active
                                ? "status-active"
                                : "status-inactive"
                        }">

                            ${active ? "Active" : "Inactive"}

                        </span>

                    </td>

                    <td>
                        ${escapeHtml(created)}
                    </td>

                    <td>

                        <div class="action-group">

                            <button
                                type="button"
                                class="table-action-btn edit"
                                onclick="editUser(${user.id})"
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                class="table-action-btn"
                                onclick="resetUserPassword(${user.id})"
                            >
                                Reset Password
                            </button>

                            <button
                                type="button"
                                class="table-action-btn ${
                                    active
                                        ? "delete"
                                        : "complete"
                                }"
                                onclick="toggleUser(${user.id})"
                            >
                                ${
                                    active
                                        ? "Deactivate"
                                        : "Activate"
                                }
                            </button>

                        </div>

                    </td>

                </tr>

            `;

        }).join("");

}


/* =========================================================
   USER MODAL
========================================================= */

function openUserModal(user = null) {

    if (!userModal) {
        return;
    }


    editingUserId =
        user ? user.id : null;


    if (user) {

        userModalTitle.textContent =
            "Edit User";

        userId.value =
            user.id || "";

        userDisplayName.value =
            user.display_name ||
            user.name ||
            "";

        username.value =
            user.username ||
            "";

        userRole.value =
            user.role ||
            "user";

        userStatus.value =
            (
                user.active !== false &&
                user.active !== 0
            )
                ? "1"
                : "0";

        userPassword.value = "";

        if (userPasswordGroup) {

            userPasswordGroup.style.display =
                "none";

        }

    } else {

        userModalTitle.textContent =
            "Add User";

        userForm.reset();

        userId.value = "";

        userRole.value = "user";

        userStatus.value = "1";

        if (userPasswordGroup) {

            userPasswordGroup.style.display =
                "block";

        }

    }


    userModal.style.display = "flex";

}


function closeUserModal() {

    if (userModal) {

        userModal.style.display =
            "none";

    }

    editingUserId = null;

}


if (addUserBtn) {

    addUserBtn.addEventListener(
        "click",
        function () {
            openUserModal();
        }
    );

}


if (closeUserModalBtn) {

    closeUserModalBtn.addEventListener(
        "click",
        closeUserModal
    );

}


if (cancelUserBtn) {

    cancelUserBtn.addEventListener(
        "click",
        closeUserModal
    );

}


if (userForm) {

    userForm.addEventListener(
        "submit",
        saveUser
    );

}


async function saveUser(event) {

    event.preventDefault();


    if (!currentUser ||
        currentUser.role !== "admin") {

        return;

    }


    const id =
        userId.value.trim();


    const payload = {

        display_name:
            userDisplayName.value.trim(),

        username:
            username.value.trim(),

        role:
            userRole.value,

        active:
            userStatus.value === "1"

    };


    if (!id) {

        payload.password =
            userPassword.value;

    }


    if (!payload.display_name ||
        !payload.username) {

        showToast(
            "User",
            "Please fill all required fields."
        );

        return;

    }


    if (!id &&
        !payload.password) {

        showToast(
            "User",
            "Password is required."
        );

        return;

    }


    try {

        let data;


        if (id) {

            data =
                await apiRequest(
                    `/api/admin/users/${id}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );

        } else {

            data =
                await apiRequest(
                    "/api/admin/users",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(payload)
                    }
                );

        }


        closeUserModal();

        await loadUsers();

        showToast(
            "User Saved",
            data.message ||
            "User saved successfully."
        );


    } catch (error) {

        showToast(
            "User Error",
            error.message
        );

    }

}


/* =========================================================
   EDIT USER
========================================================= */

window.editUser = function (id) {

    if (!currentUser ||
        currentUser.role !== "admin") {

        return;

    }


    const user =
        users.find(
            item => Number(item.id) === Number(id)
        );


    if (!user) {
        return;
    }


    openUserModal(user);

};


/* =========================================================
   RESET PASSWORD
========================================================= */

window.resetUserPassword = async function (id) {

    if (!currentUser ||
        currentUser.role !== "admin") {

        return;

    }


    const user =
        users.find(
            item => Number(item.id) === Number(id)
        );


    if (!user) {
        return;
    }


    const newPassword =
        prompt(
            `Enter new password for ${user.username}:`
        );


    if (newPassword === null) {
        return;
    }


    if (!newPassword.trim()) {

        showToast(
            "Password",
            "Password cannot be empty."
        );

        return;

    }


    try {

        const data =
            await apiRequest(
                `/api/admin/users/${id}/reset-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            password:
                                newPassword
                        })
                }
            );


        showToast(
            "Password Updated",
            data.message ||
            "Password reset successfully."
        );


    } catch (error) {

        showToast(
            "Password Error",
            error.message
        );

    }

};


/* =========================================================
   ACTIVATE / DEACTIVATE USER
========================================================= */

window.toggleUser = async function (id) {

    if (!currentUser ||
        currentUser.role !== "admin") {

        return;

    }


    const user =
        users.find(
            item => Number(item.id) === Number(id)
        );


    if (!user) {
        return;
    }


    const active =
        user.active !== false &&
        user.active !== 0;


    try {

        const data =
            await apiRequest(
                `/api/admin/users/${id}/toggle`,
                {
                    method: "POST"
                }
            );


        await loadUsers();

        showToast(
            "User Status",
            data.message ||
            (
                active
                    ? "User deactivated."
                    : "User activated."
            )
        );


    } catch (error) {

        showToast(
            "User Error",
            error.message
        );

    }

};


/* =========================================================
   TASKS
========================================================= */

async function loadTasks() {

    if (!currentUser) {
        return;
    }


    try {

        const data =
            await apiRequest(
                "/api/tasks"
            );


        userTasks =
            Array.isArray(data.tasks)
                ? data.tasks
                : [];


        renderTasks();

    } catch (error) {

        showToast(
            "Tasks",
            error.message
        );

    }

}


function populateTaskUsers() {

    if (!taskAssignedUser) {
        return;
    }


    const activeUsers =
        users.filter(function (user) {

            return (
                user.active !== false &&
                user.active !== 0 &&
                user.role !== "admin"
            );

        });


    taskAssignedUser.innerHTML = `

        <option value="">
            Select User
        </option>

    `;


    activeUsers.forEach(function (user) {

        const option =
            document.createElement("option");

        option.value =
            user.id;

        option.textContent =
            user.display_name ||
            user.username;

        taskAssignedUser.appendChild(option);

    });


    if (taskUserFilter) {

        taskUserFilter.innerHTML = `

            <option value="">
                All Users
            </option>

        `;


        activeUsers.forEach(function (user) {

            const option =
                document.createElement("option");

            option.value =
                user.id;

            option.textContent =
                user.display_name ||
                user.username;

            taskUserFilter.appendChild(option);

        });

    }

}


function getTaskUserName(task) {

    return (
        task.assigned_to_name ||
        task.user_name ||
        task.username ||
        task.assigned_to_username ||
        findUserName(task.user_id) ||
        findUserName(task.assigned_to) ||
        "-"
    );

}


function findUserName(id) {

    if (!id) {
        return "";
    }


    const user =
        users.find(
            item =>
                Number(item.id) === Number(id)
        );


    return user
        ? (
            user.display_name ||
            user.username ||
            ""
        )
        : "";

}


function getTaskStatus(task) {
    if (task.completed || task.status === "completed") {
        return "completed";
    }
    
    const dateStr = task.date || task.task_date;
    const timeStr = task.time || task.task_time || "23:59";
    
    if (dateStr) {
        const dueDateTime = new Date(`${dateStr}T${timeStr}`);
        if (!isNaN(dueDateTime.getTime()) && dueDateTime < new Date()) {
            return "overdue";
        }
    }
    
    return "pending";
}


function renderTasks() {

    if (!userTasksTableBody) {
        return;
    }


    const search =
        (taskSearchInput?.value || "")
            .trim()
            .toLowerCase();


    const status =
        taskStatusFilter?.value ||
        "all";


    const selectedUser =
        taskUserFilter?.value ||
        "";


    let filtered =
        [...userTasks];


    if (currentUser?.role !== "admin") {

        filtered =
            filtered.filter(function (task) {

                return (
                    Number(
                        task.user_id ??
                        task.assigned_to ??
                        task.assigned_user_id
                    ) ===
                    Number(currentUser.id)
                );

            });

    }


    if (status !== "all") {

        filtered =
            filtered.filter(function (task) {

                return getTaskStatus(task) === status;

            });

    }


    if (selectedUser &&
        currentUser?.role === "admin") {

        filtered =
            filtered.filter(function (task) {

                return (
                    Number(
                        task.user_id ??
                        task.assigned_to ??
                        task.assigned_user_id
                    ) ===
                    Number(selectedUser)
                );

            });

    }


    if (search) {

        filtered =
            filtered.filter(function (task) {

                const haystack = [

                    task.title,
                    task.task,
                    task.text,
                    task.description,
                    task.notes,
                    getTaskUserName(task)

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                return haystack.includes(search);

            });

    }


    if (!filtered.length) {

        userTasksTableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="table-empty"
                >
                    No tasks found.
                </td>

            </tr>

        `;

        return;

    }


    userTasksTableBody.innerHTML =
        filtered.map(function (task) {

            const status =
                getTaskStatus(task);


            const title =
                task.title ||
                task.task ||
                task.text ||
                "Untitled Task";


            const date =
                task.date ||
                task.task_date ||
                "-";


            const time =
                task.time ||
                task.task_time ||
                "-";


            const isAdmin =
                currentUser?.role === "admin";


            let actions = "";


            if (isAdmin) {

                actions = `

                    <div class="action-group">

                        <button
                            type="button"
                            class="table-action-btn edit"
                            onclick="editTask(${task.id})"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="table-action-btn ${
                                status === "completed"
                                    ? "pending"
                                    : "complete"
                            }"
                            onclick="toggleTaskStatus(${task.id})"
                        >
                            ${
                                status === "completed"
                                    ? "Mark Pending"
                                    : "Mark Complete"
                            }
                        </button>

                        <button
                            type="button"
                            class="table-action-btn delete"
                            onclick="deleteTask(${task.id})"
                        >
                            Delete
                        </button>

                    </div>

                `;

            } else {

                actions = `

                    <div class="action-group">

                        <button
                            type="button"
                            class="table-action-btn ${
                                status === "completed"
                                    ? "pending"
                                    : "complete"
                            }"
                            onclick="toggleTaskStatus(${task.id})"
                        >
                            ${
                                status === "completed"
                                    ? "Mark Pending"
                                    : "Mark Complete"
                            }
                        </button>

                    </div>

                `;

            }


            return `

                <tr>

                    <td>
                        <strong>${escapeHtml(title)}</strong>
                        ${
                            task.description || task.notes
                                ? `<br><small class="text-muted">${escapeHtml(task.description || task.notes)}</small>`
                                : ""
                        }
                    </td>

                    <td>
                        ${escapeHtml(getTaskUserName(task))}
                    </td>

                    <td>
                        ${escapeHtml(date)} ${escapeHtml(time)}
                    </td>

                    <td>

                        <span class="status-badge status-${status}">

                            ${
                                status.charAt(0).toUpperCase() +
                                status.slice(1)
                            }

                        </span>

                    </td>

                    <td>
                        ${
                            task.completed_at
                                ? escapeHtml(formatDateTime(task.completed_at))
                                : "-"
                        }
                    </td>

                    <td>
                        ${actions}
                    </td>

                </tr>

            `;

        }).join("");

}


/* =========================================================
   TASK EVENTS & MODAL
========================================================= */

function setupTaskEvents() {

    if (addUserTaskBtn) {
        addUserTaskBtn.addEventListener("click", function () {
            openTaskModal();
        });
    }

    if (closeUserTaskModalBtn) {
        closeUserTaskModalBtn.addEventListener("click", closeTaskModal);
    }

    if (cancelUserTaskBtn) {
        cancelUserTaskBtn.addEventListener("click", closeTaskModal);
    }

    if (userTaskForm) {
        userTaskForm.addEventListener("submit", saveTask);
    }

    if (taskSearchInput) {
        taskSearchInput.addEventListener("input", renderTasks);
    }

    if (taskStatusFilter) {
        taskStatusFilter.addEventListener("change", renderTasks);
    }

    if (taskUserFilter) {
        taskUserFilter.addEventListener("change", renderTasks);
    }

}


function openTaskModal(task = null) {

    if (!userTaskModal) {
        return;
    }

    editingTaskId = task ? task.id : null;

    if (task) {

        if (userTaskModalTitle) {
            userTaskModalTitle.textContent = "Edit Task";
        }

        if (userTaskId) userTaskId.value = task.id || "";
        if (taskAssignedUser) taskAssignedUser.value = task.user_id || task.assigned_to || "";
        if (taskTitle) taskTitle.value = task.title || task.task || task.text || "";
        if (taskDescription) taskDescription.value = task.description || task.notes || "";
        if (taskDate) taskDate.value = task.date || task.task_date || "";
        if (taskTime) taskTime.value = task.time || task.task_time || "";

    } else {

        if (userTaskModalTitle) {
            userTaskModalTitle.textContent = "Assign New Task";
        }

        if (userTaskForm) userTaskForm.reset();
        if (userTaskId) userTaskId.value = "";

    }

    userTaskModal.style.display = "flex";

}


function closeTaskModal() {

    if (userTaskModal) {
        userTaskModal.style.display = "none";
    }

    editingTaskId = null;

}


async function saveTask(event) {

    event.preventDefault();

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    const id = userTaskId?.value.trim();

    const payload = {
        user_id: taskAssignedUser?.value,
        title: taskTitle?.value.trim(),
        description: taskDescription?.value.trim(),
        date: taskDate?.value,
        time: taskTime?.value
    };

    if (!payload.user_id || !payload.title || !payload.date) {
        showToast("Task Error", "Please fill in all required fields.");
        return;
    }

    try {

        let data;

        if (id) {
            data = await apiRequest(`/api/tasks/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            data = await apiRequest("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        closeTaskModal();
        await loadTasks();

        showToast("Task Saved", data.message || "Task saved successfully.");

    } catch (error) {
        showToast("Task Error", error.message);
    }

}


window.editTask = function (id) {

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    const task = userTasks.find(item => Number(item.id) === Number(id));

    if (!task) {
        return;
    }

    openTaskModal(task);

};


window.toggleTaskStatus = async function (id) {

    const task = userTasks.find(item => Number(item.id) === Number(id));

    if (!task) {
        return;
    }

    const currentStatus = getTaskStatus(task);
    const newStatus = currentStatus === "completed" ? "pending" : "completed";

    try {

        const data = await apiRequest(`/api/tasks/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        await loadTasks();

        showToast("Task Updated", data.message || `Task marked as ${newStatus}.`);

    } catch (error) {
        showToast("Task Error", error.message);
    }

};


window.deleteTask = async function (id) {

    if (!currentUser || currentUser.role !== "admin") {
        return;
    }

    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {

        const data = await apiRequest(`/api/tasks/${id}`, {
            method: "DELETE"
        });

        await loadTasks();

        showToast("Task Deleted", data.message || "Task deleted successfully.");

    } catch (error) {
        showToast("Task Error", error.message);
    }

};


/* =========================================================
   REMINDERS (LOCALSTORAGE + UI)
========================================================= */

function loadReminders() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        reminders = stored ? JSON.parse(stored) : [];
    } catch (e) {
        reminders = [];
    }
}

function saveReminders() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
        showToast("Storage Error", "Unable to save reminders locally.");
    }
}

function setupReminderEvents() {

    if (addReminderBtn) {
        addReminderBtn.addEventListener("click", () => openReminderModal());
    }

    if (addReminderBtn2) {
        addReminderBtn2.addEventListener("click", () => openReminderModal());
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", closeReminderModal);
    }

    if (cancelReminderBtn) {
        cancelReminderBtn.addEventListener("click", closeReminderModal);
    }

    if (reminderForm) {
        reminderForm.addEventListener("submit", saveReminder);
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderRemindersTable);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", renderRemindersTable);
    }

    if (departmentFilter) {
        departmentFilter.addEventListener("change", renderRemindersTable);
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener("click", exportRemindersCsv);
    }

    if (stopAlarmBtn) {
        stopAlarmBtn.addEventListener("click", stopAlarm);
    }

}

function openReminderModal(reminder = null) {

    if (!reminderModal) return;

    editingId = reminder ? reminder.id : null;

    if (reminder) {

        if (modalTitle) modalTitle.textContent = "Edit Reminder";

        if (reminderId) reminderId.value = reminder.id || "";
        if (employeeName) employeeName.value = reminder.employeeName || "";
        if (employeeId) employeeId.value = reminder.employeeId || "";
        if (department) department.value = reminder.department || "";
        if (reminderText) reminderText.value = reminder.text || "";
        if (reminderDate) reminderDate.value = reminder.date || "";
        if (reminderTime) reminderTime.value = reminder.time || "";
        if (reminderNotes) reminderNotes.value = reminder.notes || "";

    } else {

        if (modalTitle) modalTitle.textContent = "Add HR Reminder";

        if (reminderForm) reminderForm.reset();
        if (reminderId) reminderId.value = "";

    }

    reminderModal.style.display = "flex";

}

function closeReminderModal() {
    if (reminderModal) {
        reminderModal.style.display = "none";
    }
    editingId = null;
}

function saveReminder(event) {

    event.preventDefault();

    const id = reminderId?.value;

    const payload = {
        id: id ? Number(id) : Date.now(),
        employeeName: employeeName?.value.trim() || "",
        employeeId: employeeId?.value.trim() || "",
        department: department?.value || "",
        text: reminderText?.value.trim() || "",
        date: reminderDate?.value || "",
        time: reminderTime?.value || "",
        notes: reminderNotes?.value.trim() || "",
        completed: id ? (reminders.find(r => Number(r.id) === Number(id))?.completed || false) : false,
        createdAt: id ? (reminders.find(r => Number(r.id) === Number(id))?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (!payload.text || !payload.date || !payload.time) {
        showToast("Validation Error", "Please provide a reminder text, date, and time.");
        return;
    }

    if (id) {
        const index = reminders.findIndex(r => Number(r.id) === Number(id));
        if (index !== -1) {
            reminders[index] = payload;
        }
    } else {
        reminders.push(payload);
    }

    saveReminders();
    closeReminderModal();
    populateDepartments();
    renderDashboard();
    renderRemindersTable();

    showToast("Reminder Saved", "HR Reminder saved successfully.");

}

window.editReminder = function (id) {
    const reminder = reminders.find(r => Number(r.id) === Number(id));
    if (reminder) {
        openReminderModal(reminder);
    }
};

window.toggleReminderStatus = function (id) {
    const reminder = reminders.find(r => Number(r.id) === Number(id));
    if (reminder) {
        reminder.completed = !reminder.completed;
        saveReminders();
        renderDashboard();
        renderRemindersTable();
        showToast("Status Updated", `Reminder marked as ${reminder.completed ? "Completed" : "Pending"}.`);
    }
};

window.deleteReminder = function (id) {
    if (!confirm("Are you sure you want to delete this reminder?")) return;

    reminders = reminders.filter(r => Number(r.id) !== Number(id));
    saveReminders();
    populateDepartments();
    renderDashboard();
    renderRemindersTable();

    showToast("Deleted", "Reminder deleted successfully.");
};

function getReminderStatus(reminder) {
    if (reminder.completed) return "completed";

    const dueDateTime = new Date(`${reminder.date}T${reminder.time}`);
    if (!isNaN(dueDateTime.getTime()) && dueDateTime < new Date()) {
        return "overdue";
    }

    return "pending";
}

function renderRemindersTable() {

    if (!remindersTableBody) return;

    const search = (searchInput?.value || "").trim().toLowerCase();
    const status = statusFilter?.value || "all";
    const dept = departmentFilter?.value || "all";

    let filtered = [...reminders];

    if (status !== "all") {
        filtered = filtered.filter(r => getReminderStatus(r) === status);
    }

    if (dept !== "all") {
        filtered = filtered.filter(r => r.department === dept);
    }

    if (specialFilter === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        filtered = filtered.filter(r => r.date === todayStr);
    }

    if (search) {
        filtered = filtered.filter(r => {
            const haystack = [
                r.employeeName,
                r.employeeId,
                r.department,
                r.text,
                r.notes
            ].filter(Boolean).join(" ").toLowerCase();

            return haystack.includes(search);
        });
    }

    if (!filtered.length) {
        remindersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">No reminders found.</td>
            </tr>
        `;
        return;
    }

    const isAdmin = currentUser?.role === "admin";

    remindersTableBody.innerHTML = filtered.map(r => {

        const rStatus = getReminderStatus(r);

        let actions = `
            <div class="action-group">
                <button type="button" class="table-action-btn ${rStatus === "completed" ? "pending" : "complete"}" onclick="toggleReminderStatus(${r.id})">
                    ${rStatus === "completed" ? "Mark Pending" : "Mark Complete"}
                </button>
        `;

        if (isAdmin) {
            actions += `
                <button type="button" class="table-action-btn edit" onclick="editReminder(${r.id})">Edit</button>
                <button type="button" class="table-action-btn delete" onclick="deleteReminder(${r.id})">Delete</button>
            `;
        }

        actions += `</div>`;

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(r.employeeName || "General")}</strong>
                    ${r.employeeId ? `<br><small class="text-muted">ID: ${escapeHtml(r.employeeId)}</small>` : ""}
                </td>
                <td>${escapeHtml(r.department || "-")}</td>
                <td>
                    ${escapeHtml(r.text)}
                    ${r.notes ? `<br><small class="text-muted">${escapeHtml(r.notes)}</small>` : ""}
                </td>
                <td>${escapeHtml(r.date)} ${escapeHtml(r.time)}</td>
                <td>
                    <span class="status-badge status-${rStatus}">
                        ${rStatus.charAt(0).toUpperCase() + rStatus.slice(1)}
                    </span>
                </td>
                <td>${actions}</td>
            </tr>
        `;

    }).join("");

}

function populateDepartments() {

    if (!departmentFilter) return;

    const depts = Array.from(new Set(reminders.map(r => r.department).filter(Boolean)));

    departmentFilter.innerHTML = `<option value="all">All Departments</option>`;

    depts.forEach(d => {
        const option = document.createElement("option");
        option.value = d;
        option.textContent = d;
        departmentFilter.appendChild(option);
    });

}

function exportRemindersCsv() {

    if (!reminders.length) {
        showToast("Export CSV", "No reminders available to export.");
        return;
    }

    const headers = ["ID", "Employee Name", "Employee ID", "Department", "Reminder Text", "Date", "Time", "Status", "Notes"];

    const rows = reminders.map(r => [
        r.id,
        `"${(r.employeeName || "").replace(/"/g, '""')}"`,
        `"${(r.employeeId || "").replace(/"/g, '""')}"`,
        `"${(r.department || "").replace(/"/g, '""')}"`,
        `"${(r.text || "").replace(/"/g, '""')}"`,
        r.date,
        r.time,
        getReminderStatus(r),
        `"${(r.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);

    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HR_Reminders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);

}


/* =========================================================
   DASHBOARD
========================================================= */

function setDashboardDate() {
    if (dashboardDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dashboardDate.textContent = new Date().toLocaleDateString(undefined, options);
    }
}

function renderDashboard() {

    let total = reminders.length;
    let pending = 0;
    let todayCount = 0;
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    reminders.forEach(r => {
        const status = getReminderStatus(r);
        if (status === "pending") pending++;
        if (status === "overdue") overdueCount++;
        if (r.date === todayStr && !r.completed) todayCount++;
    });

    if (totalReminders) totalReminders.textContent = total;
    if (pendingReminders) pendingReminders.textContent = pending;
    if (todayReminders) todayReminders.textContent = todayCount;
    if (overdueReminders) overdueReminders.textContent = overdueCount;

    renderUpcomingList();

}

function renderUpcomingList() {

    if (!upcomingList) return;

    const pendingList = reminders
        .filter(r => !r.completed)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
        .slice(0, 5);

    if (!pendingList.length) {
        upcomingList.innerHTML = `<li class="empty-list">No upcoming reminders.</li>`;
        return;
    }

    upcomingList.innerHTML = pendingList.map(r => `
        <li class="upcoming-item">
            <div class="upcoming-info">
                <strong>${escapeHtml(r.text)}</strong>
                <small>${escapeHtml(r.employeeName || "General")} - ${escapeHtml(r.date)} ${escapeHtml(r.time)}</small>
            </div>
            <span class="status-badge status-${getReminderStatus(r)}">${getReminderStatus(r)}</span>
        </li>
    `).join("");

}


/* =========================================================
   ALARM & NOTIFICATIONS
========================================================= */

function startAlarmChecker() {
    if (alarmInterval) clearInterval(alarmInterval);
    alarmInterval = setInterval(checkAlarms, 10000); // Check every 10 sec
}

function checkAlarms() {

    const now = new Date();

    reminders.forEach(r => {

        if (r.completed) return;

        const dueDateTime = new Date(`${r.date}T${r.time}`);

        // Trigger alarm if within current minute window
        if (!isNaN(dueDateTime.getTime())) {
            const diffMs = now - dueDateTime;
            if (diffMs >= 0 && diffMs < 60000 && lastAlarmId !== r.id) {
                triggerAlarm(r);
            }
        }

    });

}

function triggerAlarm(reminder) {

    lastAlarmId = reminder.id;

    if (dueNowCard) {
        dueNowCard.style.display = "block";
    }

    if (dueNowTitle) {
        dueNowTitle.textContent = reminder.text;
    }

    if (dueNowDescription) {
        dueNowDescription.textContent = `Assigned to: ${reminder.employeeName || "General"} | Due Time: ${reminder.time}`;
    }

    showToast("REMINDER DUE!", reminder.text);

}

function stopAlarm() {

    if (dueNowCard) {
        dueNowCard.style.display = "none";
    }

}

function setupNotifications() {
    if (notificationBtn) {
        notificationBtn.addEventListener("click", () => {
            showToast("Notifications", "All system alerts are active.");
        });
    }
}


/* =========================================================
   NAVIGATION & SECTION SWITCHING
========================================================= */

function setupNavigation() {

    const navLinks = document.querySelectorAll("[data-section]");

    navLinks.forEach(link => {

        link.addEventListener("click", function (e) {

            e.preventDefault();

            const targetSection = this.getAttribute("data-section");

            showSection(targetSection);

            navLinks.forEach(l => l.classList.remove("active"));
            this.classList.add("active");

        });

    });

}

function showSection(sectionId) {

    const dashboardSec = document.getElementById("dashboardSection");
    const remindersSec = document.getElementById("remindersSection");
    const usersSec = document.getElementById("usersSection");
    const tasksSec = document.getElementById("userTasksSection");

    if (dashboardSec) dashboardSec.style.display = "none";
    if (remindersSec) remindersSec.style.display = "none";
    if (usersSec) usersSec.style.display = "none";
    if (tasksSec) tasksSec.style.display = "none";

    specialFilter = "all";

    if (sectionId === "dashboard" && dashboardSec) {
        dashboardSec.style.display = "block";
        if (pageTitle) pageTitle.textContent = "Dashboard";
    } else if (sectionId === "reminders" && remindersSec) {
        remindersSec.style.display = "block";
        if (pageTitle) pageTitle.textContent = "HR Reminders";
        renderRemindersTable();
    } else if (sectionId === "users" && usersSec) {
        usersSec.style.display = "block";
        if (pageTitle) pageTitle.textContent = "User Management";
    } else if (sectionId === "tasks" && tasksSec) {
        tasksSec.style.display = "block";
        if (pageTitle) pageTitle.textContent = "User Tasks";
        renderTasks();
    }

}


/* =========================================================
   THEME
========================================================= */

function setupTheme() {

    if (themeSelect) {

        themeSelect.addEventListener("change", function () {

            const selectedTheme = this.value;
            document.body.setAttribute("data-theme", selectedTheme);
            localStorage.setItem(THEME_KEY, selectedTheme);

        });

    }

}

function loadTheme() {

    const savedTheme = localStorage.getItem(THEME_KEY) || "light";

    document.body.setAttribute("data-theme", savedTheme);

    if (themeSelect) {
        themeSelect.value = savedTheme;
    }

}


/* =========================================================
   UTILITIES
========================================================= */

function showToast(title, message) {

    if (!toast) return;

    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;

    toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);

}

function escapeHtml(str) {

    if (typeof str !== "string") return str;

    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

function formatDateTime(isoString) {

    if (!isoString) return "-";

    try {
        const date = new Date(isoString);
        return date.toLocaleString();
    } catch (e) {
        return isoString;
    }

}