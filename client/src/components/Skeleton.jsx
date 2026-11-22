// Loading placeholders shaped like the real content, so nothing jumps when data arrives.

/** One grey shimmering block. */
export const Skeleton = ({ w, h, r, className = "" }) => (
  <span className={"skel " + className} style={{ width: w, height: h, borderRadius: r }} />
);

/** Announces the loading state to screen readers once; the shapes themselves are hidden. */
export function Loading({ label = "Loading…", children, className }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function CardGridSkeleton({ count = 5, four = false }) {
  return (
    <div className={"grid-cards" + (four ? " grid-cards--4" : "")}>
      {Array.from({ length: count }, (_, i) => (
        <div className="gcard skel-card" key={i}>
          <span className="cover skel" />
          <div className="skel-card__body">
            <Skeleton w="55%" h={11} />
            <Skeleton w="85%" h={18} />
            <Skeleton w="38%" h={22} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rows of the price-change feed / my list. */
export function RowsSkeleton({ count = 4, h = 68 }) {
  return (
    <div className="skel-rows">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} h={h} r="var(--r-lg)" />
      ))}
    </div>
  );
}

function HeadSkeleton() {
  return (
    <div className="page-head">
      <Skeleton w={140} h={12} />
      <Skeleton w="min(420px, 80%)" h={40} className="skel--title" />
    </div>
  );
}

/** Generic page placeholder (lazy route fallback, search page). */
export function PageSkeleton() {
  return (
    <main id="main" className="wrap">
      <Loading label="Loading the page…">
        <HeadSkeleton />
        <CardGridSkeleton count={8} four />
      </Loading>
    </main>
  );
}

/** Game page: hero, decision card, first panel. */
export function GameSkeleton() {
  return (
    <main id="main" className="jeu-page">
      <Loading label="Loading the game…">
        <div className="wrap skel-hero">
          <Skeleton w={220} h={12} />
          <div className="skel-hero__grid">
            <span className="cover skel" />
            <div className="skel-hero__info">
              <Skeleton w="30%" h={22} />
              <Skeleton w="70%" h={44} />
              <Skeleton w="50%" h={14} />
              <Skeleton w="90%" h={14} />
            </div>
            <Skeleton h={300} r="var(--r-xl)" className="skel-hero__decide" />
          </div>
        </div>
        <div className="wrap">
          <Skeleton h={320} r="var(--r-xl)" />
        </div>
      </Loading>
    </main>
  );
}

/** My list: KPIs + rows. */
export function ListSkeleton() {
  return (
    <main id="main" className="wrap list-page">
      <Loading label="Loading your list…">
        <HeadSkeleton />
        <div className="kpis">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={84} r="var(--r-lg)" />
          ))}
        </div>
        <RowsSkeleton count={4} h={88} />
      </Loading>
    </main>
  );
}
