# API Quick Reference - Matemágica Server

## Quick Endpoint List (22 total endpoints)

### 🔐 Authentication & User Management (8 endpoints)

| Method | Endpoint | Description | RF |
|--------|----------|-------------|-----|
| POST | `/users/login` | Login with email or username | RF01 |
| POST | `/users/register/teacher` | Register new teacher | RF02 |
| POST | `/users/register/student` | Register student (by teacher) | RF03 |
| POST | `/users` | Register generic user | - |
| GET | `/users` | List all users | - |
| GET | `/users/:id` | Get user by ID | - |
| PUT | `/users/:id` | Update user | - |
| DELETE | `/users/:id` | Delete user | - |

### 🏫 Classroom Management (5 endpoints)

| Method | Endpoint | Description | RF |
|--------|----------|-------------|-----|
| POST | `/classrooms` | Create classroom | RF04 |
| GET | `/classrooms` | List all classrooms | RF04 |
| GET | `/classrooms/:id` | Get classroom by ID | RF04 |
| PUT | `/classrooms/:id` | Update classroom | RF04 |
| DELETE | `/classrooms/:id` | Delete classroom | RF04 |

### 📝 Task Management (5 endpoints)

| Method | Endpoint | Description | RF |
|--------|----------|-------------|-----|
| POST | `/tasks` | Create task with content & difficulty | RF05 |
| GET | `/tasks` | List all tasks (filter by classroom) | RF05 |
| GET | `/tasks/:id` | Get task by ID | RF05 |
| PUT | `/tasks/:id` | Update task | RF05 |
| DELETE | `/tasks/:id` | Delete task | RF05 |

### 📊 Progress & Performance (4 endpoints)

| Method | Endpoint | Description | RF |
|--------|----------|-------------|-----|
| GET | `/progress/student/:student_id` | Student task list (pending/completed) | RF06 |
| GET | `/progress/task/:task_id` | Task progress for all students | - |
| GET | `/progress/teacher/:teacher_id/dashboard` | Teacher dashboard with stats | RF07 |
| PUT | `/progress/update` | Update task progress | RF06 |

---

## Quick Start Examples

### Login as Teacher
```bash
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prof@escola.com","password":"senha123"}'
```

### Register Student
```bash
curl -X POST http://localhost:3000/users/register/student \
  -H "Content-Type: application/json" \
  -d '{
    "username":"aluno_maria",
    "password":"senha456",
    "teacher_id":1,
    "classroom_id":1,
    "photo_url":"https://..."
  }'
```

### Create Task
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Adição Básica",
    "type":"addition",
    "content":"Resolva: 5+3, 10+7",
    "difficulty":"easy",
    "classroom_id":1,
    "teacher_id":1
  }'
```

### View Student Tasks (Pending)
```bash
curl "http://localhost:3000/progress/student/10?status=pending"
```

### Teacher Dashboard
```bash
curl "http://localhost:3000/progress/teacher/1/dashboard?classroom_id=1"
```

---

## Response Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required fields, invalid data |
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database or server error |

---

## Query Parameters

### `/tasks`
- `classroom_id` - Filter tasks by classroom

### `/progress/student/:id`
- `status=pending` - Show only pending tasks (Not Started, In Progress)
- `status=completed` - Show only completed tasks (Submitted, Graded)

### `/progress/teacher/:id/dashboard`
- `classroom_id` - Filter statistics by classroom

---

## Field Requirements

### User Registration (Teacher)
- ✅ `username` (required, unique)
- ✅ `email` (required, unique)
- ✅ `password` (required)

### User Registration (Student)
- ✅ `username` (required, unique)
- ✅ `password` (required)
- ✅ `teacher_id` (required)
- ⭕ `classroom_id` (optional)
- ⭕ `photo_url` (optional, for avatar generation)

### Classroom Creation
- ✅ `name` (required)
- ✅ `teacher_id` (required)
- ⭕ `description` (optional)

### Task Creation
- ✅ `title` (required)
- ✅ `type` (required)
- ✅ `classroom_id` (required)
- ✅ `teacher_id` (required)
- ⭕ `content` (optional, recommended)
- ⭕ `difficulty` (optional: easy, medium, hard)

### Progress Update
- ✅ `student_id` (required)
- ✅ `task_id` (required)
- ⭕ `status` (optional: Not Started, In Progress, Submitted, Graded)
- ⭕ `score` (optional: 0-100)

---

## Database Setup

Before using the API, run the migration:

```bash
psql -U postgres -d matemagica-bd -f matemagica/migrations/add_missing_fields.sql
```

This adds:
- `users.photo_url` - For student photos (RF08)
- `users.avatar_url` - For generated avatars (RF08)
- `tasks.content` - Task description (RF05)
- `tasks.difficulty` - Task difficulty level (RF05)

---

## Security Notes

⚠️ **Production Considerations:**

1. **Passwords**: Currently stored in plain text. Implement bcrypt hashing!
2. **Authentication**: Add JWT tokens for session management
3. **Validation**: Add input validation middleware (Joi/Yup)
4. **Rate Limiting**: Implement to prevent abuse
5. **CORS**: Configure properly for frontend integration
6. **HTTPS**: Use SSL/TLS in production

---

## See Also

- **REQUIREMENTS_COMPLIANCE.md** - Detailed requirements analysis
- **EXAMPLES.md** - Complete usage examples with responses
- **README.md** - Full API documentation

---

**Server**: Express.js on Node.js  
**Database**: PostgreSQL  
**Port**: 3000 (default)  
**Status**: ✅ All 8 functional requirements implemented
