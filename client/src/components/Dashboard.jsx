import { useEffect, useState } from 'react';
import { getDashboard } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading dashboard…</p>;

  const maxServings = Math.max(1, ...data.daily.map((day) => day.servings));

  return (
    <section>
      <h2>Dashboard</h2>
      <div className="stats">
        <div className="stat">
          <span className="stat-number">{data.meals_served}</span>
          <span>Meals served</span>
        </div>
        <div className="stat">
          <span className="stat-number">{Number(data.kg_saved).toFixed(1)} kg</span>
          <span>Food saved</span>
        </div>
        <div className="stat">
          <span className="stat-number">{data.rescued_count}</span>
          <span>Listings rescued</span>
        </div>
        <div className="stat">
          <span className="stat-number">{data.lost_count}</span>
          <span>Listings expired / lost</span>
        </div>
        <div className="stat">
          <span className="stat-number">{data.available_count}</span>
          <span>Available now</span>
        </div>
      </div>

      <h3>Completed servings — last 7 days</h3>
      <div className="chart">
        {data.daily.map((day) => (
          <div className="bar-column" key={day.date}>
            <div
              className="bar"
              style={{ height: `${Math.round((day.servings / maxServings) * 120)}px` }}
              title={`${day.date}: ${day.servings} servings`}
            />
            <span className="bar-value">{day.servings}</span>
            <span className="bar-label">{day.date.slice(5)}</span>
          </div>
        ))}
      </div>
      <p className="muted">Bars show completed servings per day, from pickup history.</p>
    </section>
  );
}
