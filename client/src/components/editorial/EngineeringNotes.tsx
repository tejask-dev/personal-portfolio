import { Link } from "wouter";
import { moreProjects } from "./notesContent";

export default function EngineeringNotes() {
  return <section className="eh-more-projects" aria-labelledby="more-projects-title">
    <header><p className="pv-eyebrow">And a few more</p><h3 id="more-projects-title">Built along the way.</h3></header>
    <div>{moreProjects.map(project => <article className="eh-project-compact" key={project.id}>
      <div><h4>{project.title}</h4><p className="pv-eyebrow">{project.stage}</p></div><p>{project.body}</p>
      {project.href.startsWith("/") ? <Link id={`read-${project.id}`} className="pv-text-link" href={project.href}>{project.linkLabel} <span aria-hidden="true">↗</span></Link> : <a id={`read-${project.id}`} className="pv-text-link" href={project.href} {...(project.href.startsWith("https:") ? { target: "_blank", rel: "noreferrer" } : {})}>{project.linkLabel} <span aria-hidden="true">↗</span></a>}
    </article>)}</div>
  </section>;
}
