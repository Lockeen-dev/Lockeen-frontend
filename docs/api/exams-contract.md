# Exams Service Contract

## Scope

Day 2 service layer for exams and chapters.

Current mode: mock-first.
Real backend: not implemented yet.

## API mode

`VITE_API_MODE=mock` uses local mock data through `src/services/exams.js`.

Future real mode will keep same function signatures and return shape.

## Return shape

Success:

```js
{ data, error: null }
Failure:

{ data: null, error: { code, message } }
Functions
listExams()
Input: none.

Returns:

{ data: Exam[], error: null }
getExam(id)
Input:

id: string | number
Returns single exam or EXAM_NOT_FOUND.

createExam(input)
Input:

{
  name: string,
  subject?: string,
  date?: string,
  color?: string,
  chapters?: Chapter[]
}
Returns created exam.

Validation:

name required
updateExam(id, patch)
Input:

id: string | number
patch: Partial<Exam>
Returns updated exam or EXAM_NOT_FOUND.

deleteExam(id)
Input:

id: string | number
Returns deleted exam or EXAM_NOT_FOUND.

listChapters(examId)
Input:

examId: string | number
Returns chapter list or EXAM_NOT_FOUND.

createChapter(examId, input)
Input:

examId: string | number
input: Partial<Chapter>
Returns created chapter.

updateChapter(examId, chapterId, patch)
Input:

examId: string | number
chapterId: string | number
patch: Partial<Chapter>
Returns updated chapter or CHAPTER_NOT_FOUND.

deleteChapter(examId, chapterId)
Input:

examId: string | number
chapterId: string | number
Returns deleted chapter or CHAPTER_NOT_FOUND.

Mock behavior
Service imports seed data from src/data/mockData.js.
Service clones seed data before use.
Service returns cloned data to callers.
Service mutates only internal mock memory, not imported seed data.
Browser refresh resets mock memory.
Known gaps Day 2
No Supabase calls.
No persistence after refresh.
No auth ownership.
No RLS.
No network retry.
No pagination.
