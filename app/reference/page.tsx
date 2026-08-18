import Link from "next/link";

const tools = [
  ["Separate facts from predictions", "What has actually happened? What am I predicting? What proof would it take to change my mind?"],
  ["Control", "Worry only about what you can control. You don't control what happens; you control how you respond."],
  ["5 Why's", "When something feels wrong or stuck, ask why repeatedly until you reach the underlying issue you can actually act on."],
  ["Worst-case scenario", "Define the feared outcome instead of letting the mind keep it vague. Then ask: what is actually likely, what could I do if it happened, and what can I do today?"],
  ["Third-person perspective", "Step outside the emotional frame. What would you tell someone you love if they were dealing with exactly this?"],
  ["Second arrow", "The first arrow is what happened. The second arrow is the additional suffering created by your reaction. Don't add a second problem to the first."],
  ["State change", "Change your physical state before demanding that your mind solve a difficult problem: stand up, breathe slowly, relax your jaw, open your chest, and move."],
  ["Present moment", "If you are distressed by something external, examine your estimate of it. Return attention to what is happening now and to the next controllable action."],
  ["Action", "Done is better than perfect. Complexity is the enemy of execution. If you change nothing, nothing will change."],
  ["Perspective", "The past does not equal the future. It is not your fault, but it is your responsibility. Base decisions on love, not fear."],
];

const questions = [
  "HOW CAN I USE THIS?", "Is this essential?", "What would a healthy, ambitious, confident person do?", "What would you do to accomplish your 5-year goals in the next 6 months if you had a gun to your head?", "How do I get no/low risk and huge rewards?", "What are you deeply passionate about?", "What can you be the best in the world at?", "What drives your economic engine?", "What would you do if you were to start over?", "Less, but better.", "Go first.", "What is my most generous interpretation of what just happened?", "How do I add value for people around me?", "What is the next useful action?",
];

const reminders = [
  "Easy choices… hard life; hard choices… easy life.", "You have power over your mind — not outside events. Realize this, and you will find strength.", "PAIN × RESISTANCE = SUFFERING.", "Worrying means you suffer twice.", "A man who suffers before it is necessary, suffers more than is necessary.", "Be tolerant with others and strict with yourself.", "Associate only with people who improve you.", "Less, but better.", "Live while you're alive — no one will survive.", "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.", "Success comes from uncertainty, not comfort.", "No growth in comfort.", "Novelty slows down time.", "We are dying.", "Be so secure in yourself that you can't be offended by other people.", "Treat every relationship like it's the beginning of the relationship.", "Someday is a disease that'll take your dreams to the grave with you.", "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.", "What one man can do, another man can do.",
];

export default function ReferencePage() {
  return (
    <main className="reference-page">
      <div className="reference-wrap">
        <Link href="/" className="back-link">← Today</Link>
        <header className="reference-header">
          <div className="eyebrow">PERSONAL COACH · REFERENCE</div>
          <h1>Tools for thinking clearly.</h1>
          <p>This is your quick-reference library. Use it when you're stuck, anxious, angry, overwhelmed, or simply need a better question.</p>
        </header>

        <section className="reference-section" style={{ marginBottom: 18 }}>
          <div className="eyebrow">MEDITATION</div>
          <h2>Guided meditation</h2>
          <p className="section-intro" style={{ marginBottom: 14 }}>A curated practice resource for mindfulness, awareness, and working skillfully with thoughts and emotions.</p>
          <a href="https://insighttimer.com/josephgoldstein/guided-meditations" target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none", color: "inherit", background: "#F4F1E9", border: "1px solid #E5E0D6", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <strong style={{ fontSize: 18 }}>Joseph Goldstein on Insight Timer</strong>
                <div style={{ marginTop: 4, color: "#666", lineHeight: 1.4 }}>Guided meditation library →</div>
              </div>
              <span aria-hidden="true" style={{ fontSize: 20 }}>↗</span>
            </div>
          </a>
        </section>

        <section className="reference-section estimate-principle">
          <div className="eyebrow">CORE PRINCIPLE</div>
          <h2>The Estimate Principle</h2>
          <blockquote>“If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.”</blockquote>
          <p className="section-intro">The event and your interpretation of the event are not the same thing. When distress spikes, separate what happened from what you are telling yourself it means, then decide what response is useful.</p>
          <div className="reference-grid">
            <article className="reference-card"><h3>EVENT</h3><p>What actually happened?</p></article>
            <article className="reference-card"><h3>ESTIMATE</h3><p>What am I telling myself it means?</p></article>
            <article className="reference-card"><h3>REVOKE</h3><p>Is that interpretation accurate, necessary, useful, and within my control?</p></article>
            <article className="reference-card"><h3>RESPONSE</h3><p>Given the facts, what do I choose to do next?</p></article>
          </div>
        </section>

        <section className="reference-section"><div className="eyebrow">THINKING TOOLS</div><h2>Use these when your mind starts running.</h2><div className="reference-list">{tools.map(([title, body]) => <article className="reference-row" key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>
        <section className="reference-section"><div className="eyebrow">QUESTIONS</div><h2>Questions that change the frame.</h2><div className="question-list">{questions.map(q => <div key={q}>{q}</div>)}</div></section>
        <section className="reference-section"><div className="eyebrow">REMINDERS</div><h2>Read one. Then act.</h2><div className="reminder-grid">{reminders.map(q => <div key={q} className="reminder">{q}</div>)}</div></section>
        <section className="reference-footer"><strong>Rule:</strong> Don't use the reference library to think forever. Use it to get clear, choose the next useful action, and return to your life.</section>
      </div>
    </main>
  );
}
