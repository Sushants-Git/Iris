import { Tweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import 'react-tweet/theme.css'
import { Suspense } from 'react'

interface Props {
  tweetId: string
}

function TweetEmbed({ tweetId }: Props) {
  return (
    <div
      className="tweet-light [&_.react-tweet-theme]:!m-0 [&_.react-tweet-theme]:!max-w-none [&_.react-tweet-theme]:!rounded-none [&_.react-tweet-theme]:!border-0 [&_.react-tweet-theme]:!shadow-none"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Tweet
        id={tweetId}
        fallback={<TweetSkeleton />}
        onError={() => <TweetNotFound />}
      />
    </div>
  )
}

export function TwitterCard({ tweetId }: Props) {
  return (
    <Suspense fallback={<TweetSkeleton />}>
      <TweetEmbed tweetId={tweetId} />
    </Suspense>
  )
}
