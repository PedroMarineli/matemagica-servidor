const db = require('../db');

async function getTeacherDashboard(teacher_id, classroom_id) {
    let classroomFilter = '';
    let params = [teacher_id];
    
    if (classroom_id) {
        classroomFilter = ' AND c.id = $2';
        params.push(classroom_id);
    }
    
    const statsQuery = `
        SELECT 
            COUNT(DISTINCT u.id) as total_students,
            COUNT(DISTINCT c.id) as total_classrooms,
            COUNT(DISTINCT t.id) as total_tasks,
            COUNT(CASE WHEN tp.status IN ('Submitted', 'Graded') THEN 1 END) as completed_tasks,
            COUNT(CASE WHEN tp.status IN ('Not Started', 'In Progress') THEN 1 END) as pending_tasks,
            ROUND(AVG(CASE WHEN tp.score IS NOT NULL THEN tp.score END), 2) as average_score
         FROM classroom c
         LEFT JOIN users u ON u.classroom_id = c.id AND u.type = 'student'
         LEFT JOIN tasks t ON t.classroom_id = c.id
         LEFT JOIN task_progress tp ON tp.task_id = t.id AND tp.student_id = u.id
         WHERE c.teacher_id = $1${classroomFilter}`;
    
    const studentPerformanceQuery = `
        SELECT 
            u.id,
            u.username,
            ROUND(AVG(tp.score), 2) as average_score,
            COUNT(CASE WHEN tp.status IN ('Submitted', 'Graded') THEN 1 END) as completed_tasks
         FROM users u
         JOIN task_progress tp ON u.id = tp.student_id
         JOIN tasks t ON tp.task_id = t.id
         JOIN classroom c ON t.classroom_id = c.id
         WHERE u.type = 'student' AND c.teacher_id = $1${classroomFilter}
         GROUP BY u.id, u.username
         ORDER BY average_score DESC NULLS LAST`;

    const taskPerformanceQuery = `
        SELECT 
            t.id,
            t.title,
            ROUND(AVG(tp.score), 2) as average_score,
            COUNT(CASE WHEN tp.status IN ('Submitted', 'Graded') THEN 1 END) as completions,
            COUNT(tp.id) as total_assigned
         FROM tasks t
         JOIN task_progress tp ON t.id = tp.task_id
         JOIN classroom c ON t.classroom_id = c.id
         WHERE c.teacher_id = $1${classroomFilter}
         GROUP BY t.id, t.title
         ORDER BY average_score ASC NULLS FIRST`;

    const [stats, studentPerformance, taskPerformance] = await Promise.all([
        db.query(statsQuery, params),
        db.query(studentPerformanceQuery, params),
        db.query(taskPerformanceQuery, params)
    ]);

    return {
        generalStats: stats.rows[0],
        studentPerformance: studentPerformance.rows,
        taskPerformance: taskPerformance.rows
    };
}

module.exports = {
    getTeacherDashboard
};
