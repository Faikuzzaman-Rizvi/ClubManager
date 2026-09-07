/** Shared section header: kicker, title, and an optional trailing action. */
export default function SectionHeading({ kicker, title, action }) {
  return (
    <div className="ld-section-head">
      <div>
        {kicker && <p className="ld-eyebrow">{kicker}</p>}
        <h2 className="ld-section-title" data-reveal>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
