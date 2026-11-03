import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, ArrowRight, Check, RotateCcw } from "lucide-react";
import { elda, eldaWebsite, anticipyWebsite, anticipationLabsWebsite, anticipySnapshot, anticipyStatus, anticipyNarrative, careerJourney, connectorSteps, alsoWork, anticipyArtifact, illustrativeBrief, illustrativeNote, leadStories } from "./content";
import "./portfolio-v4.css";

export function LabsFeature() {
  return <section className="pv4-feature" aria-labelledby="labs-feature-title" id="current-work">
    <div className="pv-shell pv4-feature-grid">
      <div className="pv4-feature-copy">
        <p className="pv-eyebrow">Current work / Anticipation Labs</p>
        <h2 id="labs-feature-title" tabIndex={-1}>Elda.<br/><em>{elda.title}</em></h2>
        <span className="pv4-status">{elda.status}</span>
        <p className="pv4-feature-lead">{elda.intro}</p><p>{elda.part}</p>
        <div className="pv4-feature-actions">
          <Link className="pv4-feature-link" href="/case-studies/elda" id="read-elda-feature">My work on Elda <ArrowUpRight size={20}/></Link>
          <a className="pv4-product-link" href={eldaWebsite} target="_blank" rel="noreferrer">Visit Elda <ArrowUpRight size={17} aria-hidden="true"/></a>
          <a className="pv4-product-link" href={anticipationLabsWebsite} target="_blank" rel="noreferrer">Visit Anticipation Labs <ArrowUpRight size={17} aria-hidden="true"/></a>
        </div>
      </div>
      <figure className="pv4-elda-concept"><img src={`${import.meta.env.BASE_URL}${elda.image}`} alt={elda.imageAlt} width="712" height="368" loading="lazy" decoding="async"/><figcaption>{elda.caption}</figcaption></figure>
      <aside className="pv4-related-product" aria-label="Another product from Anticipation Labs">
        <div><p className="pv-eyebrow">Also from Anticipation Labs / Earlier product</p><h3>Anticipy</h3><p>An AI pendant and connected apps. I led account-connection repairs, private AI workflows and prototype testing.</p></div>
        <div><Link className="pv4-product-link" href="/case-studies/anticipy" id="read-anticipy-feature">My work on Anticipy <ArrowUpRight size={17}/></Link><a className="pv4-product-link" href={anticipyWebsite} target="_blank" rel="noreferrer">Visit Anticipy <ArrowUpRight size={17} aria-hidden="true"/></a></div>
      </aside>
    </div>
  </section>;
}

export function CareerJourney() {
  return <section className="pv4-career pv-shell" aria-labelledby="career-title" id="journey"><header className="pv4-career-heading"><p className="pv-eyebrow">A few places along the way</p><h2 id="career-title">Where I’ve<br/><em>worked.</em></h2><p>Products, teams and a research question that took me somewhere new.</p></header><ol className="pv4-career-list">{careerJourney.map((item) => <li key={item.slug}><span className="pv4-career-period">{item.period}</span><div><h3><Link href={`/case-studies/${item.slug}`}>{item.title}<ArrowUpRight size={18}/></Link></h3><p className="pv4-career-role">{item.role}</p><p>{item.body}</p></div></li>)}</ol></section>;
}

function ConnectorWalkthrough() {
  const [step, setStep] = useState(0);
  const current = connectorSteps[step];
  const nodes = ["User", "Consent", "Saved attempt", "Provider", "Sign-in"];
  return <div className="pv4-demo" aria-label="Connector journey walkthrough"><p className="pv4-demo-label">Illustration</p><div className="pv4-selector" aria-label="Choose a connection checkpoint">{connectorSteps.map((item, index) => <button key={item.label} aria-pressed={step === index} onClick={() => setStep(index)}>{item.label}</button>)}</div><ol className="pv4-connection-flow" aria-label="Connection path">{nodes.map((node, index) => <li key={node} data-reached={index <= current.active}><span aria-hidden="true">{index < current.active ? <Check size={16}/> : String(index + 1).padStart(2, "0")}</span><strong>{node}</strong>{index < nodes.length - 1 && <ArrowRight className="pv4-flow-arrow" size={17} aria-hidden="true"/>}</li>)}</ol><div className="pv4-demo-result" aria-live="polite" aria-atomic="true"><span className="pv4-status">{current.state}</span><h4>{current.heading}</h4><p>{current.body}</p></div></div>;
}

function PrivateBriefWalkthrough() {
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"source" | "prepared" | "cancelled">("source");
  const [citation, setCitation] = useState<number | null>(null);
  const prepare = () => { if (consent) { setPhase("prepared"); setCitation(null); } };
  const reset = () => { setConsent(false); setPhase("source"); setCitation(null); };
  return <div className="pv4-demo pv4-brief-demo" aria-label="Private preparation walkthrough"><p className="pv4-demo-label">Illustration</p><div className="pv4-brief-grid"><div><p className="pv4-small-label">01 / One selected source</p><h4>Launch review note</h4><blockquote>{illustrativeNote}</blockquote></div><div><p className="pv4-small-label">02 / Deliberate processing</p><label className="pv4-consent"><input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); if (!event.target.checked) { setPhase("source"); setCitation(null); } }}/><span>Use only this sample note to show the illustrative brief.</span></label><div className="pv4-demo-actions"><button className="pv4-action" disabled={!consent || phase === "prepared"} onClick={prepare}>Prepare example <ArrowRight size={16}/></button><button onClick={reset} aria-label="Reset private brief walkthrough"><RotateCcw size={15}/> Reset</button></div></div></div><div className="pv4-brief-output" aria-live="polite" aria-atomic="false"><p className="pv4-small-label">03 / Inspect the result</p>{phase === "prepared" ? <><ul>{illustrativeBrief.map((line, index) => <li key={line.text}><span>{line.text}</span><button aria-pressed={citation === index} onClick={() => setCitation(citation === index ? null : index)} aria-label={`Inspect source for: ${line.text}`}>Source {index + 1}</button></li>)}</ul>{citation !== null && <p className="pv4-citation"><strong>Selected source:</strong> “{illustrativeBrief[citation].source}”</p>}<button className="pv4-cancel" onClick={() => { setPhase("cancelled"); setCitation(null); }}>Cancel and clear this result</button></> : <p>{phase === "cancelled" ? "Cancelled. The result is cleared. Select Prepare example to start again." : "Select consent to prepare an example from this sample note."}</p>}</div></div>;
}

function PrivacyWalkthrough() {
  const [view, setView] = useState<"page" | "payload">("page");
  return <div className="pv4-demo" aria-label="Privacy boundary illustration"><p className="pv4-demo-label">Illustration</p><div className="pv4-selector" aria-label="Choose privacy illustration view"><button aria-pressed={view === "page"} onClick={() => setView("page")}>The sample page</button><button aria-pressed={view === "payload"} onClick={() => setView("payload")}>The outgoing information</button></div><div className="pv4-privacy-grid"><div className="pv4-synthetic-form"><p className="pv4-small-label">Invented page information</p><dl><div><dt>Task</dt><dd>Review a draft</dd></div><div><dt>Protected value</dt><dd className="pv4-protected-value">{view === "page" ? "FAKE-SAMPLE-ONLY" : "[value withheld]"}</dd></div><div><dt>Control</dt><dd>Continue</dd></div></dl></div><div className="pv4-demo-result" aria-live="polite" aria-atomic="true"><span className="pv4-status">{view === "page" ? "Before the capture boundary" : "At the model-input boundary"}</span><h4>{view === "page" ? "Useful context and protected values coexist." : "Keep the task. Withhold the protected value."}</h4><p>{view === "page" ? "The test needs to check what the browser collects and what gets included in the model request." : "The protected value stays out of the request."}</p></div></div></div>;
}

export function AnticipyDeepDive() {
  return <div className="pv4-case-body pv-shell">
    <section id="context" className="pv4-case-context"><div><p className="pv-eyebrow">01 / Context</p><h2>From intention<br/><em>to action.</em></h2></div><p>{anticipyNarrative.context} {anticipyNarrative.team}</p></section>
    <section className="pv4-snapshot" aria-label="Anticipy work at a glance">{anticipySnapshot.map(item => <a key={item.id} href={`#${item.id}`}><span>{item.title}</span><h3>{item.result}</h3><small>{item.status}</small><ArrowRight size={18} aria-hidden="true"/></a>)}</section>
    <figure className="pv4-product-artifact" id="artifact"><div className="pv-artifact-label"><span>Anticipy / Product website</span><a href={anticipyArtifact.source} target="_blank" rel="noreferrer">Visit anticipy.ai ↗</a></div><picture><source media="(max-width: 600px)" srcSet={`${import.meta.env.BASE_URL}${anticipyArtifact.mobile}`}/><img src={`${import.meta.env.BASE_URL}${anticipyArtifact.desktop}`} alt={anticipyArtifact.alt} width="1440" height="960" loading="lazy" decoding="async"/></picture><figcaption>{anticipyArtifact.caption}</figcaption></figure>
    <section id="contribution" className="pv4-collaboration" aria-labelledby="collaboration-title"><p className="pv-eyebrow">02 / What I built</p><h2 id="collaboration-title">The work behind the promise.</h2><p>{anticipyNarrative.personal}</p></section>
    <div id="decision"><p className="pv-eyebrow">03 / The hard part</p>{leadStories.map((story, index) => <section className="pv4-story" id={story.id} key={story.id}><header><p className="pv-eyebrow">{story.number} / {story.category}</p><h2>{story.title}</h2><span className="pv4-status">{story.status}</span></header><div className="pv4-story-prose"><p className="pv4-story-intro">{story.intro}</p><div><p>{story.role}</p><p>{story.decision}</p></div></div>{index === 0 ? <ConnectorWalkthrough/> : index === 1 ? <PrivateBriefWalkthrough/> : <PrivacyWalkthrough/>}<div className="pv4-story-outcome"><div><h3>Result</h3><p>{story.outcome}</p></div></div></section>)}</div>
    <section className="pv4-contribution-index" aria-labelledby="breadth-title"><header><h2 id="breadth-title">Also along the way.</h2></header><ul className="pv-contributions">{alsoWork.map(item => <li key={item}>{item}</li>)}</ul></section>
    <section id="outcome" className="pv4-evidence-section"><div><p className="pv-eyebrow">04 / Result</p><h2>Where it stands.</h2></div><ol className="pv4-evidence-ladder">{anticipyStatus.map(item => <li key={item.title} data-complete={item.complete}><span aria-hidden="true">{item.complete ? "✓" : "○"}</span><div><strong>{item.title}</strong><p>{item.result}</p></div></li>)}</ol></section>
    <section className="pv4-company-note" id="lesson"><p className="pv-eyebrow">05 / What I’d change</p><h2>Test the whole journey sooner.</h2><p>{anticipyNarrative.personalLesson}</p></section>
    <section id="sources" className="pv4-sources"><p className="pv-eyebrow">06 / Links</p><h2>Explore Anticipy.</h2><ul>{anticipyNarrative.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}<ArrowUpRight size={17}/></a><p>{source.note}</p></li>)}</ul></section>
  </div>;
}
