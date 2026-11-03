export default function AboutStory({ content }) {
  return (
    <section className="about-section about-story">
      <figure className="about-story-image">
        <img src={content.image.src} alt={content.image.alt} loading="lazy" />
      </figure>

      <div className="about-story-copy">
        <p className="eyebrow">{content.eyebrow}</p>
        <h2>{content.title}</h2>
        {content.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </section>
  );
}
