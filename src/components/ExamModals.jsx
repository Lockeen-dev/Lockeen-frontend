import React, { useRef, useState } from 'react';

import { FileText, Icon, Trash, Trash2 } from '../lib/icons';
import { EXTRA_SUBJECT_COLORS, getSubjectPalette, inferSubjectFromName } from '../data/mockData';
import { SUBJECT_EMOJI, getExamEmoji } from '../lib/examUi';
import { EmojiPickerButton, GradeValue, PrioritySelector, gradeS } from './common/ExamControls';

function DeleteExamModal({ exam, onClose, onConfirm, saving = false, error = null }) {
  return (
    <div style={uploadS.overlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div style={{ ...uploadS.card, maxWidth:400, textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:999, background:'#FEE2E2', display:'grid', placeItems:'center', margin:'0 auto 16px' }}>
          <Trash2 size={22} color="#EF4444" />
        </div>
        <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700, color:'var(--ink)' }}>Elimina esame</h3>
        <p style={{ margin:'0 0 6px', color:'var(--gray)', fontSize:14 }}>Stai per eliminare:</p>
        <p style={{ margin:'0 0 20px', fontWeight:700, fontSize:15, color:'var(--ink)' }}>"{exam.name}"</p>
        <p style={{ margin:'0 0 24px', color:'var(--gray)', fontSize:13 }}>Questa azione è irreversibile. Tutti i capitoli e i dati dell'esame saranno persi.</p>
        {error && <div style={uploadS.errorText}>{error}</div>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:600, fontSize:14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>
            Annulla
          </button>
          <button onClick={onConfirm} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:12, border:'none', background:'#EF4444', color:'#fff', fontWeight:700, fontSize:14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .7 : 1 }}>
            {saving ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditExamModal({ exam, onClose, onSave, saving = false, error = null }) {
  const [name, setName] = useState(exam.name || '');
  const [nameTouched, setNameTouched] = useState(false);
  const [targetGrade, setTargetGrade] = useState(exam.targetGrade || 27);
  const [emoji, setEmoji] = useState(getExamEmoji(exam));
  const [priority, setPriority] = useState(exam.priority || 3);
  const parsedDate = exam.date ? new Date(exam.date + 'T12:00:00') : new Date();
  const [day, setDay]     = useState(parsedDate.getDate());
  const [month, setMonth] = useState(parsedDate.getMonth() + 1);
  const [year, setYear]   = useState(parsedDate.getFullYear());

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years  = [2025, 2026, 2027, 2028];
  const pad    = (n) => (n < 10 ? '0' + n : '' + n);
  const palette = getSubjectPalette(exam.subject, {}, false);
  const targetPct = ((targetGrade - 18) / 12) * 100;

  const submit = (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setNameTouched(true);
      return;
    }
    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(Number(day), lastDay);
    onSave({ name: name.trim(), date: `${year}-${pad(month)}-${pad(safeDay)}`, targetGrade, priority, emoji });
  };

  return (
    <div style={uploadS.overlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <form onSubmit={submit} style={{ ...uploadS.card, maxWidth:520 }}>
        <button type="button" onClick={onClose} disabled={saving} style={uploadS.closeBtn}><XIcon size={16} /></button>
        <h3 style={uploadS.title}>Modifica esame</h3>

        <div style={uploadS.field}>
          <label style={uploadS.label}>Nome esame</label>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <EmojiPickerButton
              emoji={emoji}
              dot={palette.dot}
              bg={palette.bg}
              size={48}
              onPick={setEmoji}
            />
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setNameTouched(true)} disabled={saving} style={{ ...uploadS.input, flex:1, margin:0 }} autoFocus />
          </div>
          {nameTouched && !name.trim() && <div style={uploadS.validationText}>Nome esame richiesto.</div>}
        </div>

        <div style={uploadS.field}>
          <label style={uploadS.label}>Priorità</label>
          <PrioritySelector value={priority} onChange={setPriority} />
        </div>

        <div style={uploadS.field}>
          <label style={dateS.label}>Data esame</label>
          <div style={dateS.row}>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} disabled={saving} style={dateS.select}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} disabled={saving} style={dateS.select}>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={saving} style={dateS.select}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={uploadS.field}>
          <label style={dateS.label}>Voto target 🎯</label>
          <div style={gradeS.sliderRow}>
            <div style={gradeS.sliderValue}>
              <GradeValue value={targetGrade} color={palette.dot} size={26} />
            </div>
            <div style={gradeS.sliderTrackCol}>
              <input type="range" className="grade-range" min="18" max="30" step="1" value={targetGrade}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
                disabled={saving}
                style={{ ...gradeS.range, '--grade-color': palette.dot, accentColor: palette.dot, background: `linear-gradient(90deg, ${palette.dot} 0%, ${palette.dot} ${targetPct}%, var(--border) ${targetPct}%, var(--border) 100%)` }} />
              <div style={gradeS.ticks}>
                {[18, 21, 24, 27, 30].map((t) => (
                  <span key={t} style={{ color: targetGrade === t ? palette.dot : 'var(--gray-2)', fontWeight: targetGrade === t ? 800 : 500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <div style={uploadS.errorText}>{error}</div>}
        <div style={{ display:'flex', gap:10, marginTop:8 }}>
          <button type="button" onClick={onClose} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:12, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--ink)', fontWeight:600, fontSize:14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>
            Annulla
          </button>
          <button type="submit" disabled={!name.trim() || saving} style={{ flex:2, padding:'11px', borderRadius:12, border:'none', background: name.trim() && !saving ? 'var(--indigo)' : '#CBD5E1', color:'#fff', fontWeight:700, fontSize:14, cursor: name.trim() && !saving ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateExamModal({ onClose, onCreate, saving = false, error = null }) {
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [targetGrade, setTargetGrade] = useState(27);
  const today = new Date();
  const [day, setDay]     = useState(today.getDate());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear]   = useState(today.getFullYear());
  const [emojiOverride, setEmojiOverride] = useState(null);
  const [priority, setPriority] = useState(3);
  const PRIORITIES = [
    { val:1, label:'Bassa',     color:'#10B981' },
    { val:2, label:'Media',     color:'#3B82F6' },
    { val:3, label:'Alta',      color:'#F59E0B' },
    { val:4, label:'Molto Alta',color:'#F97316' },
    { val:5, label:'Critica',   color:'#EF4444' },
  ];

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years  = [2025, 2026, 2027, 2028];
  const pad    = (n) => (n < 10 ? '0' + n : '' + n);
  const subjectName = name.trim();
  const inferredSubject = inferSubjectFromName(subjectName);
  const subjectPalette = getSubjectPalette(inferredSubject, EXTRA_SUBJECT_COLORS.Other);
  const targetPct = ((targetGrade - 18) / 12) * 100;
  const autoEmoji = SUBJECT_EMOJI[inferredSubject] || SUBJECT_EMOJI.default;
  const displayEmoji = emojiOverride || autoEmoji;

  const submit = (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setNameTouched(true);
      return;
    }
    const lastDay = new Date(year, month, 0).getDate();
    const safeDay = Math.min(Number(day), lastDay);
    const iso = `${year}-${pad(month)}-${pad(safeDay)}`;
    onCreate({
      id: Date.now(),
      name: name.trim(),
      subject: name.trim(),
      date: iso,
      updated: 'Just now',
      targetGrade,
      priority,
      emoji: displayEmoji,
      color: subjectPalette.bg,
      dot: subjectPalette.dot,
      chapters: []
    });
  };

  const canSubmit = name.trim();

  return (
    <div style={uploadS.overlay} onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose && onClose(); }}>
      <form onSubmit={submit} style={{ ...uploadS.card, maxWidth: 520 }}>
        <button type="button" onClick={onClose} disabled={saving} aria-label="Close" style={uploadS.closeBtn}><XIcon size={16} /></button>
        <h3 style={uploadS.title}>Create New Exam</h3>
        <p style={uploadS.subtitle}>Give your exam a name to get started</p>

        <div style={uploadS.field}>
          <label style={uploadS.label}>Exam name</label>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <EmojiPickerButton
              emoji={displayEmoji}
              dot={subjectPalette.dot}
              bg={subjectPalette.bg}
              size={48}
              onPick={(e) => { if (!saving) setEmojiOverride(e); }}
            />
            <input value={name} onChange={(e) => { setName(e.target.value); setEmojiOverride(null); }} onBlur={() => setNameTouched(true)} disabled={saving} placeholder="es. Biologia 2024" style={{ ...uploadS.input, flex:1, margin:0 }} autoFocus />
          </div>
          {nameTouched && !name.trim() && <div style={uploadS.validationText}>Exam name is required.</div>}
          {!emojiOverride && name.trim() && (
            <div style={{ fontSize:11, color:'var(--gray)', marginTop:4 }}>Emoji rilevata automaticamente · clicca per cambiare</div>
          )}
        </div>

        <div style={uploadS.field}>
          <label style={dateS.label}>Exam date</label>
          <div style={dateS.row}>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} disabled={saving} style={dateS.select} aria-label="Day">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} disabled={saving} style={dateS.select} aria-label="Month">
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={saving} style={dateS.select} aria-label="Year">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={uploadS.field}>
          <label style={dateS.label}>Voto target 🎯</label>
          <div style={gradeS.sliderRow}>
            <div style={gradeS.sliderValue}>
              <GradeValue value={targetGrade} color={subjectPalette.dot} size={26} />
            </div>
            <div style={gradeS.sliderTrackCol}>
              <input
                type="range"
                className="grade-range"
                min="18"
                max="30"
                step="1"
                value={targetGrade}
                onChange={(e) => setTargetGrade(Number(e.target.value))}
                disabled={saving}
                style={{
                  ...gradeS.range,
                  '--grade-color': subjectPalette.dot,
                  accentColor: subjectPalette.dot,
                  background: `linear-gradient(90deg, ${subjectPalette.dot} 0%, ${subjectPalette.dot} ${targetPct}%, var(--border) ${targetPct}%, var(--border) 100%)`
                }}
                aria-label="Voto target"
              />
              <div style={gradeS.ticks}>
                {[18, 21, 24, 27, 30].map((t) => (
                  <span key={t} style={{ color: targetGrade === t ? subjectPalette.dot : 'var(--gray-2)', fontWeight: targetGrade === t ? 800 : 500 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={uploadS.field}>
          <label style={dateS.label}>Priorità esame</label>
          <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
            {PRIORITIES.map(p => (
              <button key={p.val} type="button" onClick={() => setPriority(p.val)} disabled={saving}
                style={{ flex:1, minWidth:0, padding:'8px 4px', borderRadius:10, border:`2px solid ${priority===p.val ? p.color : 'var(--border)'}`, background: priority===p.val ? p.color : 'var(--surface)', color: priority===p.val ? '#fff' : 'var(--gray)', fontWeight:700, fontSize:11, cursor: saving ? 'not-allowed' : 'pointer', transition:'all .15s', display:'flex', flexDirection:'column', alignItems:'center', gap:3, opacity: saving ? .65 : 1 }}>
                <span style={{ fontSize:14 }}>{['🟢','🔵','🟡','🟠','🔴'][p.val-1]}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={uploadS.errorText}>{error}</div>}
        <div style={uploadS.actions}>
          <button type="button" onClick={onClose} disabled={saving} style={{ ...uploadS.cancelBtn, ...(saving ? uploadS.submitBtnDisabled : null) }}>Cancel</button>
          <button type="submit" disabled={!canSubmit || saving}
            style={{ ...uploadS.submitBtn, ...((!canSubmit || saving) ? uploadS.submitBtnDisabled : null) }}>
            {saving ? 'Creating...' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
}


const dateS = {
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 },
  row: { display: 'flex', gap: 10 },
  select: {
    flex: 1,
    padding: '10px 14px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 12,
    fontSize: 14,
    color: 'var(--ink)',
    background: 'var(--surface)',
    outline: 'none',
    fontFamily: 'inherit',
    fontWeight: 500,
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundImage: 'linear-gradient(45deg, transparent 50%, #6B7280 50%), linear-gradient(135deg, #6B7280 50%, transparent 50%)',
    backgroundPosition: 'calc(100% - 16px) 50%, calc(100% - 11px) 50%',
    backgroundSize: '5px 5px, 5px 5px',
    backgroundRepeat: 'no-repeat',
    paddingRight: 32,
    cursor: 'pointer',
  },
};


/* ===================== UPLOAD NOTE MODAL ===================== */
const CloudUpload = (p) => <Icon {...p}><path d="M20 16.5a4 4 0 0 0-1.6-7.66A6 6 0 0 0 6.5 8.5 4.5 4.5 0 0 0 7 17.5h11a3 3 0 0 0 2-1z"/><polyline points="12 12 12 19"/><polyline points="9 15 12 12 15 15"/></Icon>;
const XIcon      = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;

function UploadChapterModal({ existingChapters, onClose, onUpload }) {
  const [files, setFiles] = useState([]);
  // selection: chapter id (number) for existing, or '__new' for a new chapter
  const initialSelection = existingChapters && existingChapters.length ? existingChapters[0].id : '__new';
  const [selection, setSelection] = useState(initialSelection);
  const [newName, setNewName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const idRef = useRef(1);

  const stripExt = (name) => name.replace(/\.[^.]+$/, '');

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    setFiles((prev) => {
      const next = [...prev];
      arr.forEach((f) => { next.push({ id: idRef.current++, name: f.name, size: f.size, file: f }); });
      return next;
    });
    setNewName((cur) => (selection === '__new' ? (cur || stripExt(arr[0].name)) : cur));
  };

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const onPick = (e) => { addFiles(e.target.files); e.target.value = ''; };
  const browse = () => inputRef.current && inputRef.current.click();

  const isNew = selection === '__new';
  const canSubmit = files.length > 0 && (!isNew || newName.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || uploading) return;
    setUploading(true);
    setUploadStep('Reading files...');
    setError('');
    setProgress(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / 1400) * 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else {
        setUploadStep('Uploading files. Practice will finish in background...');
        const payload = {
          chapterId: isNew ? null : selection,
          chapterName: isNew ? newName.trim().slice(0, 80) : null,
          fileCount: files.length,
          files: files.map((f) => f.file).filter(Boolean),
        };
        Promise.resolve(onUpload(payload)).then(() => {
          setUploadStep('Done.');
        }).catch((err) => {
          setError(err?.message || 'Unable to save chapter.');
          setUploading(false);
          setUploadStep('');
          setProgress(0);
        });
      }
    };
    requestAnimationFrame(tick);
  };

  return (
    <div style={uploadS.overlay} onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose && onClose(); }}>
      <div style={uploadS.card}>
        <button onClick={() => !uploading && onClose && onClose()} aria-label="Close" style={uploadS.closeBtn}><XIcon size={16} /></button>
        <h3 style={uploadS.title}>New Chapter</h3>
        <p style={uploadS.subtitle}>Upload your files to generate quizzes, flashcards and summaries instantly</p>

        <div
          style={{ ...uploadS.dropzone, ...(dragOver ? uploadS.dropzoneHover : null) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div style={uploadS.cloudIcon}><CloudUpload size={26} /></div>
          <div style={uploadS.dropTitle}>Drag &amp; drop your files here</div>
          <div style={uploadS.dropOr}>or</div>
          <button type="button" onClick={browse} style={uploadS.browseBtn}>Browse Files</button>
          <div style={uploadS.dropHint}>Supports PDF, TXT, PNG, JPG • Max 10MB per file</div>
          <input ref={inputRef} type="file" multiple onChange={onPick} style={{ display: 'none' }} accept=".pdf,.txt,.png,.jpg,.jpeg,application/pdf,text/plain,image/png,image/jpeg" />
        </div>

        {files.length > 0 && (
          <div style={uploadS.pills}>
            {files.map((f) => (
              <span key={f.id} style={uploadS.pill}>
                <span style={uploadS.pillIcon}><FileText size={12} /></span>
                <span style={uploadS.pillName} title={f.name}>{f.name}</span>
                <button onClick={() => removeFile(f.id)} aria-label={'Remove ' + f.name} style={uploadS.pillX} disabled={uploading}><XIcon size={12} /></button>
              </span>
            ))}
          </div>
        )}

        <div style={uploadS.field}>
          <label style={uploadS.label}>Chapter name</label>
          <select
            value={selection}
            onChange={(e) => {
              const v = e.target.value;
              setSelection(v === '__new' ? '__new' : Number(v));
            }}
            style={{ ...uploadS.input, appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'linear-gradient(45deg, transparent 50%, #6B7280 50%), linear-gradient(135deg, #6B7280 50%, transparent 50%)', backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 13px) 50%', backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat', paddingRight: 36, cursor: 'pointer' }}
            disabled={uploading}
          >
            {(existingChapters || []).map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
            <option value="__new">+ New chapter</option>
          </select>
          {isNew && (
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Cellular Respiration"
              style={{ ...uploadS.input, marginTop: 10 }}
              disabled={uploading}
              autoFocus
            />
          )}
        </div>

        {uploading && (
          <div style={uploadS.loading}>
            <div style={uploadS.loadingRow}>
              <div style={uploadS.spinner} />
              <div>
                <div style={uploadS.loadingTitle}>{uploadStep || 'Uploading...'}</div>
                <div style={uploadS.loadingText}>This closes after upload. Quiz + flashcards keep generating after.</div>
              </div>
            </div>
            <div style={uploadS.progressTrack}><div style={{ ...uploadS.progressFill, width: Math.max(progress, 12) + '%' }} /></div>
          </div>
        )}

        {error && <div style={uploadS.errorText}>{error}</div>}

        <div style={uploadS.actions}>
          <button onClick={() => !uploading && onClose && onClose()} style={uploadS.cancelBtn} disabled={uploading}>Cancel</button>
          <button
            onClick={submit}
            disabled={!canSubmit || uploading}
            style={{ ...uploadS.submitBtn, ...((!canSubmit || uploading) ? uploadS.submitBtnDisabled : null) }}
          >
            {uploading ? 'Working...' : 'Upload & Generate (' + files.length + ' ' + (files.length === 1 ? 'file' : 'files') + ')'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditChapterModal({ chapter, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(chapter.title || '');
  const [confirmDel, setConfirmDel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const runAction = async (action) => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err?.message || 'Unable to save chapter.');
      setSaving(false);
    }
  };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,16,53,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 18, padding: 24, boxShadow: '0 20px 60px -20px rgba(15,16,53,.4)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Edit Chapter</h3>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--gray)' }}>Rename or remove this chapter.</p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Chapter title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Cellular Respiration"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)', fontSize: 14, color: 'var(--ink)', background: 'var(--surface)', boxSizing: 'border-box', marginBottom: 18 }}
        />
        {confirmDel ? (
          <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 12, marginBottom: 14 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#991B1B', fontWeight: 600 }}>Delete this chapter? This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => runAction(onDelete)} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, background: '#EF4444', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>{saving ? 'Deleting...' : 'Yes, delete'}</button>
              <button onClick={() => setConfirmDel(false)} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, background: 'transparent', color: '#991B1B', border: '1px solid #FCA5A5', fontWeight: 600, fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>Cancel</button>
            </div>
          </div>
        ) : null}
        {error && <div style={uploadS.errorText}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={() => setConfirmDel(true)} disabled={saving} style={{ padding: '10px 14px', borderRadius: 10, background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? .65 : 1 }}>
            <Trash size={13} /> Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1 }}>Cancel</button>
            <button onClick={() => runAction(() => onSave(title))} disabled={!title.trim() || saving} style={{ padding: '10px 16px', borderRadius: 10, background: 'var(--indigo)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 13, cursor: title.trim() && !saving ? 'pointer' : 'not-allowed', opacity: title.trim() && !saving ? 1 : .5 }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const uploadS = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(7,11,45,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16, animation: 'fadein .2s ease' },
  card: { position: 'relative', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', padding: 28, boxShadow: '0 30px 80px -20px rgba(15,16,53,.35)' },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 999, background: '#F4F5FF', color: 'var(--ink)', display: 'grid', placeItems: 'center' },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' },
  subtitle: { margin: '6px 0 18px', fontSize: 13, color: 'var(--gray)', lineHeight: 1.5 },
  dropzone: { border: '2px dashed #E5E7EB', borderRadius: 16, background: '#F8F9FF', padding: '24px 16px', textAlign: 'center', transition: 'border-color .15s, background .15s' },
  dropzoneHover: { borderColor: 'var(--indigo)', background: '#EEF2FF' },
  cloudIcon: { width: 52, height: 52, borderRadius: 14, background: '#EEF2FF', color: 'var(--indigo)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' },
  dropTitle: { fontSize: 15, fontWeight: 700, color: 'var(--ink)' },
  dropOr: { fontSize: 13, color: 'var(--gray)', margin: '6px 0' },
  browseBtn: { padding: '9px 18px', borderRadius: 999, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 13, boxShadow: '0 8px 22px -10px rgba(55,48,232,.55)' },
  dropHint: { fontSize: 12, color: 'var(--gray)', marginTop: 12 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, maxWidth: '100%' },
  pillIcon: { fontSize: 14, lineHeight: 1 },
  pillName: { fontSize: 13, color: 'var(--ink)', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  pillX: { width: 20, height: 20, borderRadius: 999, color: 'var(--gray)', display: 'grid', placeItems: 'center' },
  field: { marginTop: 18 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 },
  input: { width: '100%', padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--ink)', background: 'var(--input-bg)', outline: 'none' },
  subjPills: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  subjPill: { padding: '8px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 13, transition: 'all .15s' },
  subjPillActive: { background: 'var(--indigo)', color: '#fff', borderColor: 'var(--indigo)', boxShadow: '0 8px 18px -10px rgba(55,48,232,.55)' },
  loading: { marginTop: 18, padding: 14, borderRadius: 16, border: '1px solid #C7D2FE', background: '#EEF2FF' },
  loadingRow: { display: 'flex', alignItems: 'center', gap: 12 },
  spinner: { width: 28, height: 28, borderRadius: 999, border: '3px solid rgba(79,70,229,.18)', borderTopColor: 'var(--indigo)', animation: 'spin-once .8s linear infinite', flexShrink: 0 },
  loadingTitle: { fontSize: 14, fontWeight: 800, color: 'var(--ink)' },
  progressTrack: { height: 6, background: '#FFFFFF', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, var(--indigo), var(--purple))', borderRadius: 999, transition: 'width .1s linear' },
  loadingText: { fontSize: 12, color: 'var(--gray)', marginTop: 3, lineHeight: 1.4 },
  validationText: { marginTop: 6, color: '#B91C1C', fontSize: 12, fontWeight: 700 },
  errorText: { margin: '14px 0 0', padding: '10px 12px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 12, fontWeight: 600, lineHeight: 1.4 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  cancelBtn: { padding: '11px 18px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--ink)', fontWeight: 600, fontSize: 14 },
  submitBtn: { padding: '11px 18px', borderRadius: 12, background: 'var(--indigo)', color: '#fff', fontWeight: 600, fontSize: 14, boxShadow: '0 10px 26px -10px rgba(55,48,232,.55)', transition: 'opacity .15s' },
  submitBtnDisabled: { background: '#C7C9F0', boxShadow: 'none', cursor: 'not-allowed' },
};


export { DeleteExamModal, EditExamModal, CreateExamModal, UploadChapterModal, EditChapterModal };
