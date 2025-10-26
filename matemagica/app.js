require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

var usersRouter = require('./routes/users');
var classroomsRouter = require('./routes/classrooms');
var tasksRouter = require('./routes/tasks');
var taskProgressRouter = require('./routes/task_progress');

var app = express();

app.use(helmet());
app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', usersRouter);
app.use('/classrooms', classroomsRouter);
app.use('/tasks', tasksRouter);
app.use('/progress', taskProgressRouter);

module.exports = app;
