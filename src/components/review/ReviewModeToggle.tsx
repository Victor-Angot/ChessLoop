import { BookOpen, ShieldAlert } from 'lucide-react'
import type { ReviewMode } from '../../stores/chess/storeTypes'
import { SegmentedControl } from '../ui/SegmentedControl'

export function ReviewModeToggle({
  value,
  onChange,
}: {
  value: ReviewMode
  onChange: (m: ReviewMode) => void
}) {
  return (
    <div className="field w-full max-w-md">
      <span className="label" id="review-mode-label">
        Review mode
      </span>
      <SegmentedControl
        className="w-full"
        value={value}
        onChange={onChange}
        ariaLabelledBy="review-mode-label"
        options={[
          {
            value: 'continue',
            label: (
              <>
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">Continue</span>
              </>
            ),
          },
          {
            value: 'hard_fail',
            label: (
              <>
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">Hard fail</span>
              </>
            ),
          },
        ]}
      />
    </div>
  )
}
