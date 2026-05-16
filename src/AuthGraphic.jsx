import { CheckCircle2, Clock, ListTodo, Sparkles } from 'lucide-react';

export default function AuthGraphic() {
  return (
    <div className="auth-graphic" aria-hidden="true">
      <svg className="grid-lines" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dotgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      <span className="sparkle s1" />
      <span className="sparkle s2" />
      <span className="sparkle s3" />
      <span className="sparkle s4" />

      <div className="float-card c1">
        <span className="dot" />
        <div className="float-body">
          <div className="float-title">Ship landing page</div>
          <div className="float-meta"><CheckCircle2 size={12} /> Done</div>
        </div>
      </div>
      <div className="float-card c2">
        <span className="dot" />
        <div className="float-body">
          <div className="float-title">Review PRs</div>
          <div className="float-meta"><Clock size={12} /> Due today</div>
        </div>
      </div>
      <div className="float-card c3">
        <span className="dot" />
        <div className="float-body">
          <div className="float-title">Design system v2</div>
          <div className="float-meta"><ListTodo size={12} /> In progress</div>
        </div>
      </div>
      <div className="float-card c4">
        <span className="dot" />
        <div className="float-body">
          <div className="float-title">Plan Q3 roadmap</div>
          <div className="float-meta"><Sparkles size={12} /> High priority</div>
        </div>
      </div>
    </div>
  );
}
