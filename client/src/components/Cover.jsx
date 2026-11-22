const SMALL = new Set(["xxs", "xs"]);

/**
 * Game cover image. Small sizes load the 150px file; larger ones let the browser
 * pick between 150px and 300px (`sizes` = rendered width).
 * `alt` defaults to "" because the title is almost always printed next to the cover.
 */
export function CoverImg({ game, size = "", alt = "", sizes = "(max-width: 600px) 45vw, 240px", eager = false }) {
  const { cover, coverSm } = game.img;
  const responsive = !SMALL.has(size) && coverSm !== cover; // imported games have one Steam image
  return (
    <img
      className="cover__img"
      src={SMALL.has(size) ? coverSm : cover}
      srcSet={responsive ? `${coverSm} 150w, ${cover} 300w` : undefined}
      sizes={responsive ? sizes : undefined}
      alt={alt}
      width="300"
      height="450"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

/** Cover in its frame (`.cover`); extra props go to the wrapper. */
export default function Cover({ game, size = "", className, alt, sizes, eager, ...rest }) {
  return (
    <div className={className || "cover " + (size ? "cover--" + size : "")} {...rest}>
      <CoverImg game={game} size={size} alt={alt ?? `${game.title} cover`} sizes={sizes} eager={eager} />
    </div>
  );
}
