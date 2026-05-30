
/*
  MAIN.JSX PATCH

  1) Add this Recharts import AFTER the lucide-react import block and BEFORE:
     import "./styles.css";
*/

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";

/*
  2) Replace the whole old "What this company does" card:

        <div className="story-card big">
          <div className="section-title">
            <Building2 size={17} /> What this company does
          </div>
          <p>{data.websiteAbout || data.companyDescription || data.profile?.description || data.profile?.about || "No company about section was returned for this ticker."}</p>
        </div>

     with this:
*/

<PowerTrendChart trend={data.historicalPowerTrend} symbol={data.symbol} />

/*
  3) Paste this component ABOVE:
     function MiniStat(...)
*/

function PowerTrendChart({ trend, symbol }) {
  const points = Array.isArray(trend?.points) ? trend.points : [];

  const trendDirection = useMemo(() => {
    if (points.length < 2) return null;

    const first = Number(points[0]?.score);
    const last = Number(points[points.length - 1]?.score);

    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;

    const change = Number((last - first).toFixed(1));

    return {
      change,
      label:
        change > 0
          ? `up ${Math.abs(change).toFixed(1)}`
          : change < 0
          ? `down ${Math.abs(change).toFixed(1)}`
          : "flat",
    };
  }, [points]);

  return (
    <div className="story-card big power-trend-card">
      <div className="power-trend-head">
        <div>
          <div className="section-title">
            <LineChart size={17} /> 10-Week Eval Score Trend
          </div>
          <p>
            Weekly Eval Score snapshot for {symbol}, measured every Monday around
            the same reference time.
          </p>
        </div>

        {trendDirection && <div className="trend-pill">{trendDirection.label}</div>}
      </div>

      {points.length >= 2 ? (
        <div className="power-trend-chart">
          <ResponsiveContainer width="100%" height={318}>
            <RechartsLineChart
              data={points}
              margin={{ top: 18, right: 26, bottom: 28, left: 2 }}
            >
              <ReferenceArea y1={0} y2={6.4} fill="rgba(255,95,115,.13)" />
              <ReferenceArea y1={6.4} y2={7.4} fill="rgba(255,214,107,.13)" />
              <ReferenceArea y1={7.4} y2={10} fill="rgba(133,215,19,.13)" />

              <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="4 8" />

              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(248,251,255,.68)", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,.14)" }}
                tickLine={false}
                interval={0}
                minTickGap={8}
                label={{
                  value: "Week Starting",
                  position: "insideBottom",
                  offset: -18,
                  fill: "rgba(248,251,255,.52)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              />

              <YAxis
                domain={[0, 10]}
                tick={{ fill: "rgba(248,251,255,.68)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={34}
                label={{
                  value: "Eval Score",
                  angle: -90,
                  position: "insideLeft",
                  fill: "rgba(248,251,255,.52)",
                  fontSize: 12,
                  fontWeight: 800,
                  offset: 10,
                }}
              />

              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,.35)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;

                  const point = payload[0].payload;

                  return (
                    <div className="trend-tooltip">
                      <span>{point.label}</span>
                      <strong>{Number(point.score).toFixed(1)}</strong>
                      <small>Week starting {point.date}</small>
                    </div>
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="score"
                stroke="#ffffff"
                strokeWidth={4}
                dot={{
                  r: 5,
                  fill: "#ffffff",
                  stroke: "rgba(255,255,255,.35)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 8,
                  fill: "#ffffff",
                  stroke: "rgba(255,255,255,.55)",
                  strokeWidth: 3,
                }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="trend-empty">
          Not enough historical price data was returned for this ticker.
        </div>
      )}

      <div className="trend-zone-key">
        <span className="red">Weak ≤ 6.4</span>
        <span className="yellow">Mixed 6.5–7.4</span>
        <span className="green">Strong ≥ 7.5</span>
      </div>
    </div>
  );
}
