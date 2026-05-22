# Read Models

## Scope

Day 5 propagates exams data into dashboard and calendar views.

Goal: one exam created in Notes/Exam flow appears in multiple product views.

## Source of truth

`src/services/exams.js` remains source service for exam domain.

Read models derive from `listExams()`.

No new `calendar_events` table in Week 1.

## Dashboard service

File:

```text
src/services/dashboard.js
Functions:

getDashboardSummary()
listUpcomingExams(limit)
getDashboardSummary() returns:

{
  totalExams,
  upcomingExams,
  nextExam,
  examsWithoutDate
}
listUpcomingExams(limit) returns date-sorted upcoming exams.

Calendar service
File:

src/services/calendar.js
Functions:

listCalendarEvents()
listExamEvents()
Exam event shape:

{
  id,
  type: 'exam',
  title,
  date,
  examId,
  subject,
  color
}
Mock and real behavior
Both services work in mock and real mode because both call listExams().

Mode stays controlled by:

VITE_API_MODE
Manual test
Create exam with date.
Confirm it appears in NotesView.
Confirm dashboard receives upcoming exam.
Confirm calendar receives exam event.
Delete exam.
Confirm it disappears from NotesView, DashboardHome, CalendarView.
Refresh and confirm data stays coherent.
Known gaps
No independent calendar event model.
No recurring events.
No reminders.
No timezone normalization beyond date parsing.
Dashboard metrics remain minimal.
