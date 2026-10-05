import { engineeringNotes } from "./notesContent";
import "./engineering-notes.css";

export default function EngineeringNotes() {
  return <section className="engineering-notes pv-shell" id="engineering-notes" aria-labelledby="notes-title">
    <header><p className="pv-eyebrow">Small builds / concrete decisions</p><h2 id="notes-title">On the workbench.</h2><p>Two projects that show how I think about boundaries.</p></header>
    <div className="engineering-notes-grid">{engineeringNotes.map(note => <article key={note.id} id={note.id}>
      <p className="pv-eyebrow">{note.stage}</p><h3>{note.title}</h3><p>{note.body}</p><p>{note.decision}</p>
      <p className="engineering-note-credit">{note.credit}</p>
      <a className="pv-text-link" href={note.href} target="_blank" rel="noreferrer">{note.linkLabel} ↗</a>
    </article>)}</div>
  </section>;
}
