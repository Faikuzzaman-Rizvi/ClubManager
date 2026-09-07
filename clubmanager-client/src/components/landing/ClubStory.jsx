import { Link } from 'react-router-dom';

/**
 * The one purely editorial beat on the page. Built from type and CSS light
 * rather than stock photography - there are no image assets in this project,
 * and filler images would cost weight without adding meaning.
 */
export default function ClubStory() {
  return (
    <section className="ld-story" aria-labelledby="story-title">
      <div className="ld-story-bg" aria-hidden="true">
        <span className="ld-story-beam" />
        <span className="ld-story-lines" />
      </div>

      <div className="ld-story-inner">
        <h2 className="ld-story-title" id="story-title" data-reveal>
          More than a club.
        </h2>
        <p className="ld-story-copy" data-reveal>
          Every match tells a story. Every goal becomes history.
        </p>
        <Link to="/standings" className="ld-btn ld-btn-primary" data-reveal>
          Follow the season
        </Link>
      </div>
    </section>
  );
}
