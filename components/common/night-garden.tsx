export function NightGarden({ compact = false }: { compact?: boolean }) {
  return <div className={`night-garden ${compact ? "compact" : ""}`} role="img" aria-label="抽象插画：月光下的首尔夜景，窗边有一枝花">
    <div className="night-grain" /><div className="night-moon" /><span className="night-star star-one">✧</span><span className="night-star star-two">✦</span><span className="night-star star-three">✧</span>
    <div className="night-hill hill-one" /><div className="night-hill hill-two" />
    <div className="skyline">{[40, 62, 32, 85, 55, 100, 43, 72, 50].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
    <div className="window-frame" /><div className="night-branch"><i /><i /><i /><i /><span>✽</span></div>
    <span className="art-caption">SEOUL, BEFORE DAWN.</span><span className="art-time">04:27</span>
  </div>;
}
