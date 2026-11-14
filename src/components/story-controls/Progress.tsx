import { useStoryStore } from '../../stores/story.store';
import './Progress.css';

export function Progress() {
  const completed = useStoryStore((state) => state.completedInteractions);
  const total = 3;

  const completedCount = completed.filter((id) => ['rock-a', 'rock-b', 'rock-c'].includes(id)).length;

  return (
    <div className="progress">
      <span className="progress__label" aria-hidden="true">
        Inspected
      </span>
      <span className="progress__count" aria-label={`Progress: ${completedCount} of ${total} rocks inspected`}>
        {completedCount} / {total}
      </span>
    </div>
  );
}
