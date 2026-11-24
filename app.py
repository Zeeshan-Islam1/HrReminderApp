from flask import Flask, request, jsonify, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from pathlib import Path
import sqlite3
from datetime import datetime
import re

# ============================================================
# iLiveSolution HR Reminder System
# Flask + SQLite Backend
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ilivesolution_hr.db"

app = Flask(
    __name__,
    static_folder=str(BASE_DIR),
    static_url_path=""
)

# IMPORTANT:
# Change this secret key for your own installation.
app.secret_key = "iLiveSolution-HR-CHANGE-THIS-SECRET-KEY"

# ============================================================
# DATABASE
# ============================================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def now():
    return datetime.now().isoformat(timespec="seconds")


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # --------------------------------------------------------
    # USERS
    # --------------------------------------------------------

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # --------------------------------------------------------
    # USER TASKS
    # --------------------------------------------------------

    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assigned_to INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            task_date TEXT DEFAULT '',
            task_time TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_by INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (assigned_to) REFERENCES users(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)

    # --------------------------------------------------------
    # DEFAULT ADMIN
    #
    # IMPORTANT:
    # Admin is created ONLY if no admin exists.
    # Existing database/users are NOT deleted.
    # --------------------------------------------------------

    admin = cur.execute("""
        SELECT id
        FROM users
        WHERE role = 'admin'
        LIMIT 1
    """).fetchone()

    if not admin:

        cur.execute("""
            INSERT INTO users
            (
                username,
                display_name,
                password_hash,
                role,
                active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            "admin",
            "System Administrator",
            generate_password_hash("Admin@123"),
            "admin",
            1,
            now(),
            now()
        ))

        print()
        print("Default Admin Created:")
        print("Username: admin")
        print("Password: Admin@123")
        print()

    conn.commit()
    conn.close()


# ============================================================
# EMAIL VALIDATION
# ============================================================

def valid_email(email):
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(pattern, email) is not None


# ============================================================
# AUTHENTICATION
# ============================================================

def current_user():

    user_id = session.get("user_id")

    if not user_id:
        return None

    conn = get_db()

    user = conn.execute("""
        SELECT
            id,
            username,
            display_name,
            role,
            active,
            created_at
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    conn.close()

    if not user:
        session.clear()
        return None

    if not user["active"]:
        session.clear()
        return None

    return dict(user)


def login_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        user = current_user()

        if not user:
            return jsonify({
                "success": False,
                "message": "Login required."
            }), 401

        return func(*args, **kwargs)

    return wrapper


def admin_required(func):

    @wraps(func)
    def wrapper(*args, **kwargs):

        user = current_user()

        if not user:
            return jsonify({
                "success": False,
                "message": "Login required."
            }), 401

        if user["role"] != "admin":
            return jsonify({
                "success": False,
                "message": "Admin access required."
            }), 403

        return func(*args, **kwargs)

    return wrapper


# ============================================================
# FRONTEND
# ============================================================

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def serve_frontend_file(filename):

    file_path = BASE_DIR / filename

    if file_path.is_file():

        return send_from_directory(
            BASE_DIR,
            filename
        )

    return jsonify({
        "success": False,
        "message": "File not found."
    }), 404


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/login")
def api_login():

    data = request.get_json(silent=True) or {}

    username = str(
        data.get("username", "")
    ).strip()

    password = str(
        data.get("password", "")
    )

    if not username or not password:

        return jsonify({
            "success": False,
            "message": "Username and password are required."
        }), 400

    conn = get_db()

    user = conn.execute("""
        SELECT *
        FROM users
        WHERE username = ?
    """, (username,)).fetchone()

    conn.close()

    if not user:

        return jsonify({
            "success": False,
            "message": "Invalid username or password."
        }), 401

    if not user["active"]:

        return jsonify({
            "success": False,
            "message": "This user account is inactive."
        }), 403

    if not check_password_hash(
        user["password_hash"],
        password
    ):

        return jsonify({
            "success": False,
            "message": "Invalid username or password."
        }), 401

    session.clear()

    session["user_id"] = user["id"]

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
            "active": bool(user["active"])
        }
    })


# ============================================================
# LOGOUT
# ============================================================

@app.post("/api/logout")
@login_required
def api_logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# ============================================================
# CURRENT USER
# ============================================================

@app.get("/api/me")
def api_me():

    user = current_user()

    if not user:

        return jsonify({
            "success": False,
            "logged_in": False
        })

    return jsonify({
        "success": True,
        "logged_in": True,
        "user": user
    })


# ============================================================
# ADMIN - GET USERS
# ============================================================

@app.get("/api/admin/users")
@admin_required
def get_users():

    conn = get_db()

    users = conn.execute("""
        SELECT
            id,
            username,
            display_name,
            role,
            active,
            created_at,
            updated_at
        FROM users
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "users": [
            dict(user)
            for user in users
        ]
    })


# ============================================================
# ADMIN - CREATE USER
# ============================================================

@app.post("/api/admin/users")
@admin_required
def create_user():

    data = request.get_json(silent=True) or {}

    username = str(
        data.get("username", "")
    ).strip().lower()

    display_name = str(
        data.get("display_name", "")
    ).strip()

    password = str(
        data.get("password", "")
    )

    role = str(
        data.get("role", "user")
    ).strip().lower()

    # --------------------------------------------------------
    # Required fields
    # --------------------------------------------------------

    if not username:

        return jsonify({
            "success": False,
            "message": "Email / username is required."
        }), 400

    if not display_name:

        return jsonify({
            "success": False,
            "message": "Display name is required."
        }), 400

    if not password:

        return jsonify({
            "success": False,
            "message": "Password is required."
        }), 400

    # --------------------------------------------------------
    # EMAIL FORMAT
    # --------------------------------------------------------

    if not valid_email(username):

        return jsonify({
            "success": False,
            "message": "Username must be a valid email address."
        }), 400

    # --------------------------------------------------------
    # PASSWORD
    # --------------------------------------------------------

    if len(password) < 6:

        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400

    # --------------------------------------------------------
    # ROLE
    # --------------------------------------------------------

    if role not in ("admin", "user"):
        role = "user"

    conn = get_db()

    try:

        conn.execute("""
            INSERT INTO users
            (
                username,
                display_name,
                password_hash,
                role,
                active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            username,
            display_name,
            generate_password_hash(password),
            role,
            1,
            now(),
            now()
        ))

        conn.commit()

    except sqlite3.IntegrityError:

        conn.close()

        return jsonify({
            "success": False,
            "message": "This email / username already exists."
        }), 409

    conn.close()

    return jsonify({
        "success": True,
        "message": "User created successfully."
    }), 201


# ============================================================
# ADMIN - UPDATE USER
# ============================================================

@app.put("/api/admin/users/<int:user_id>")
@admin_required
def update_user(user_id):

    data = request.get_json(silent=True) or {}

    display_name = str(
        data.get("display_name", "")
    ).strip()

    role = str(
        data.get("role", "user")
    ).strip().lower()

    active = data.get(
        "active",
        True
    )

    if not display_name:

        return jsonify({
            "success": False,
            "message": "Display name is required."
        }), 400

    if role not in ("admin", "user"):
        role = "user"

    active = 1 if bool(active) else 0

    conn = get_db()

    existing = conn.execute("""
        SELECT id, role
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    if not existing:

        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    # --------------------------------------------------------
    # Prevent accidentally removing the last Admin
    # --------------------------------------------------------

    if existing["role"] == "admin" and role != "admin":

        admin_count = conn.execute("""
            SELECT COUNT(*) AS total
            FROM users
            WHERE role = 'admin'
            AND active = 1
        """).fetchone()["total"]

        if admin_count <= 1:

            conn.close()

            return jsonify({
                "success": False,
                "message": "At least one active Admin must remain."
            }), 400

    conn.execute("""
        UPDATE users
        SET
            display_name = ?,
            role = ?,
            active = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        display_name,
        role,
        active,
        now(),
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "User updated successfully."
    })


# ============================================================
# ADMIN - RESET PASSWORD
# ============================================================

@app.post("/api/admin/users/<int:user_id>/reset-password")
@admin_required
def reset_password(user_id):

    data = request.get_json(silent=True) or {}

    password = str(
        data.get("password", "")
    )

    if len(password) < 6:

        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400

    conn = get_db()

    existing = conn.execute("""
        SELECT id
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    if not existing:

        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    conn.execute("""
        UPDATE users
        SET
            password_hash = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        generate_password_hash(password),
        now(),
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Password reset successfully."
    })


# ============================================================
# ADMIN - ACTIVATE / DEACTIVATE USER
# ============================================================

@app.post("/api/admin/users/<int:user_id>/toggle")
@admin_required
def toggle_user(user_id):

    current = current_user()

    conn = get_db()

    user = conn.execute("""
        SELECT
            id,
            role,
            active
        FROM users
        WHERE id = ?
    """, (user_id,)).fetchone()

    if not user:

        conn.close()

        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    # --------------------------------------------------------
    # Prevent Admin from deactivating himself
    # --------------------------------------------------------

    if user["id"] == current["id"] and user["active"]:

        conn.close()

        return jsonify({
            "success": False,
            "message": "You cannot deactivate your own account."
        }), 400

    # --------------------------------------------------------
    # Prevent last active Admin from being deactivated
    # --------------------------------------------------------

    if user["role"] == "admin" and user["active"]:

        admin_count = conn.execute("""
            SELECT COUNT(*) AS total
            FROM users
            WHERE role = 'admin'
            AND active = 1
        """).fetchone()["total"]

        if admin_count <= 1:

            conn.close()

            return jsonify({
                "success": False,
                "message": "At least one active Admin must remain."
            }), 400

    new_status = 0 if user["active"] else 1

    conn.execute("""
        UPDATE users
        SET
            active = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        new_status,
        now(),
        user_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "User status updated.",
        "active": bool(new_status)
    })


# ============================================================
# USER TASKS - GET
# ============================================================

@app.get("/api/tasks")
@login_required
def get_tasks():

    user = current_user()

    conn = get_db()

    # --------------------------------------------------------
    # ADMIN = ALL TASKS
    # --------------------------------------------------------

    if user["role"] == "admin":

        tasks = conn.execute("""
            SELECT
                t.id,
                t.assigned_to,
                u.display_name AS assigned_user,
                u.username AS assigned_username,
                t.title,
                t.description,
                t.task_date,
                t.task_time,
                t.status,
                t.created_by,
                creator.display_name AS created_by_name,
                t.created_at,
                t.updated_at
            FROM user_tasks t
            JOIN users u
                ON u.id = t.assigned_to
            JOIN users creator
                ON creator.id = t.created_by
            ORDER BY
                CASE
                    WHEN t.status = 'pending' THEN 0
                    ELSE 1
                END,
                t.task_date ASC,
                t.task_time ASC,
                t.id DESC
        """).fetchall()

    # --------------------------------------------------------
    # USER = ONLY OWN TASKS
    # --------------------------------------------------------

    else:

        tasks = conn.execute("""
            SELECT
                t.id,
                t.assigned_to,
                u.display_name AS assigned_user,
                u.username AS assigned_username,
                t.title,
                t.description,
                t.task_date,
                t.task_time,
                t.status,
                t.created_by,
                creator.display_name AS created_by_name,
                t.created_at,
                t.updated_at
            FROM user_tasks t
            JOIN users u
                ON u.id = t.assigned_to
            JOIN users creator
                ON creator.id = t.created_by
            WHERE t.assigned_to = ?
            ORDER BY
                CASE
                    WHEN t.status = 'pending' THEN 0
                    ELSE 1
                END,
                t.task_date ASC,
                t.task_time ASC,
                t.id DESC
        """, (
            user["id"],
        )).fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "tasks": [
            dict(task)
            for task in tasks
        ]
    })


# ============================================================
# ADMIN - CREATE TASK
# ============================================================

@app.post("/api/admin/tasks")
@admin_required
def create_task():

    user = current_user()

    data = request.get_json(silent=True) or {}

    assigned_to = data.get("assigned_to")

    title = str(
        data.get("title", "")
    ).strip()

    description = str(
        data.get("description", "")
    ).strip()

    task_date = str(
        data.get("task_date", "")
    ).strip()

    task_time = str(
        data.get("task_time", "")
    ).strip()

    if not assigned_to:

        return jsonify({
            "success": False,
            "message": "Assigned user is required."
        }), 400

    if not title:

        return jsonify({
            "success": False,
            "message": "Task title is required."
        }), 400

    try:

        assigned_to = int(assigned_to)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Invalid assigned user."
        }), 400

    conn = get_db()

    assigned_user = conn.execute("""
        SELECT
            id,
            active
        FROM users
        WHERE id = ?
    """, (
        assigned_to,
    )).fetchone()

    if not assigned_user:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Assigned user does not exist."
        }), 404

    if not assigned_user["active"]:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Cannot assign task to an inactive user."
        }), 400

    conn.execute("""
        INSERT INTO user_tasks
        (
            assigned_to,
            title,
            description,
            task_date,
            task_time,
            status,
            created_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        assigned_to,
        title,
        description,
        task_date,
        task_time,
        "pending",
        user["id"],
        now(),
        now()
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Task assigned successfully."
    }), 201


# ============================================================
# ADMIN - UPDATE TASK
# ============================================================

@app.put("/api/admin/tasks/<int:task_id>")
@admin_required
def update_task(task_id):

    data = request.get_json(silent=True) or {}

    assigned_to = data.get("assigned_to")

    title = str(
        data.get("title", "")
    ).strip()

    description = str(
        data.get("description", "")
    ).strip()

    task_date = str(
        data.get("task_date", "")
    ).strip()

    task_time = str(
        data.get("task_time", "")
    ).strip()

    status = str(
        data.get("status", "pending")
    ).strip().lower()

    if not assigned_to or not title:

        return jsonify({
            "success": False,
            "message": "Assigned user and task title are required."
        }), 400

    if status not in ("pending", "completed"):
        status = "pending"

    try:

        assigned_to = int(assigned_to)

    except (TypeError, ValueError):

        return jsonify({
            "success": False,
            "message": "Invalid assigned user."
        }), 400

    conn = get_db()

    task = conn.execute("""
        SELECT id
        FROM user_tasks
        WHERE id = ?
    """, (
        task_id,
    )).fetchone()

    if not task:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Task not found."
        }), 404

    assigned_user = conn.execute("""
        SELECT
            id,
            active
        FROM users
        WHERE id = ?
    """, (
        assigned_to,
    )).fetchone()

    if not assigned_user:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Assigned user does not exist."
        }), 404

    if not assigned_user["active"]:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Cannot assign task to an inactive user."
        }), 400

    conn.execute("""
        UPDATE user_tasks
        SET
            assigned_to = ?,
            title = ?,
            description = ?,
            task_date = ?,
            task_time = ?,
            status = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        assigned_to,
        title,
        description,
        task_date,
        task_time,
        status,
        now(),
        task_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Task updated successfully."
    })


# ============================================================
# ADMIN - DELETE TASK
# ============================================================

@app.delete("/api/admin/tasks/<int:task_id>")
@admin_required
def delete_task(task_id):

    conn = get_db()

    task = conn.execute("""
        SELECT id
        FROM user_tasks
        WHERE id = ?
    """, (
        task_id,
    )).fetchone()

    if not task:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Task not found."
        }), 404

    conn.execute("""
        DELETE FROM user_tasks
        WHERE id = ?
    """, (
        task_id,
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Task deleted successfully."
    })


# ============================================================
# ADMIN - COMPLETE / REOPEN TASK
# ============================================================

@app.post("/api/admin/tasks/<int:task_id>/toggle")
@admin_required
def toggle_task(task_id):

    conn = get_db()

    task = conn.execute("""
        SELECT
            id,
            status
        FROM user_tasks
        WHERE id = ?
    """, (
        task_id,
    )).fetchone()

    if not task:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Task not found."
        }), 404

    new_status = (
        "completed"
        if task["status"] == "pending"
        else "pending"
    )

    conn.execute("""
        UPDATE user_tasks
        SET
            status = ?,
            updated_at = ?
        WHERE id = ?
    """, (
        new_status,
        now(),
        task_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Task status updated.",
        "status": new_status
    })


# ============================================================
# USER - COMPLETE OWN TASK
# ============================================================

@app.post("/api/tasks/<int:task_id>/complete")
@login_required
def complete_own_task(task_id):

    user = current_user()

    conn = get_db()

    task = conn.execute("""
        SELECT
            id,
            assigned_to,
            status
        FROM user_tasks
        WHERE id = ?
    """, (
        task_id,
    )).fetchone()

    if not task:

        conn.close()

        return jsonify({
            "success": False,
            "message": "Task not found."
        }), 404

    # --------------------------------------------------------
    # SECURITY:
    # Normal User can ONLY complete own assigned task.
    # --------------------------------------------------------

    if (
        user["role"] != "admin"
        and task["assigned_to"] != user["id"]
    ):

        conn.close()

        return jsonify({
            "success": False,
            "message": "You can only complete your own assigned tasks."
        }), 403

    # --------------------------------------------------------
    # User cannot reopen a completed task.
    # --------------------------------------------------------

    if task["status"] == "completed":

        conn.close()

        return jsonify({
            "success": False,
            "message": "This task is already completed."
        }), 400

    conn.execute("""
        UPDATE user_tasks
        SET
            status = 'completed',
            updated_at = ?
        WHERE id = ?
    """, (
        now(),
        task_id
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Task completed successfully.",
        "status": "completed"
    })


# ============================================================
# STATUS
# ============================================================

@app.get("/api/status")
def api_status():

    return jsonify({
        "success": True,
        "application": "iLiveSolution HR Reminder System",
        "backend": "Flask",
        "database": "SQLite",
        "registration": "Admin Only",
        "status": "online"
    })


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    init_db()

    print("=" * 60)
    print("       iLiveSolution HR Reminder System")
    print("=" * 60)
    print()
    print("Backend is starting...")
    print()
    print("Open in Chrome:")
    print("http://127.0.0.1:5000")
    print()
    print("Default Admin Login:")
    print("Username: admin")
    print("Password: Admin@123")
    print()
    print("IMPORTANT:")
    print("Only Admin can create new users.")
    print("Public Sign-Up is NOT available.")
    print()
    print("Existing database will NOT be deleted.")
    print("=" * 60)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )